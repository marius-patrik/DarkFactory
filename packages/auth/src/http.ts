/** @packageDocumentation
 * Confidential HTTP endpoint for the operator Web. Deploy in a server-only runtime:
 * the frontend never imports this module or receives GitHub/provider tokens.
 *
 * Authority and GitHub mutation transports must be independently authenticated.
 * No production default is supplied for the mandatory durable receipt journal.
 */
import { createHash } from "node:crypto";
import {
	createBrokerSession,
	refreshBrokerSession,
	revokeBrokerSession,
	type AuthBrokerConfig,
	type AuthTokenStore,
} from "./broker.ts";
import { projectAuthority } from "./permissions.ts";
import type { BrokerTokenRecord } from "./types.ts";

/** Fully scoped authority, independently resolved from GitHub's user and App grants. */
export interface ScopedRepositoryAuthority {
	userId: string;
	userPermissions: { admin: boolean; push: boolean; pull: boolean };
	appAuthority: {
		installed: boolean;
		repositorySelected: boolean;
		canRead: boolean;
		canWrite: boolean;
		canAdminister?: boolean;
	};
}

/** Exact source-backed mutation receipt; not proof until independently read back. */
export interface VerifiedCommentReceipt {
	id: number;
	body: string;
	repository: string;
	issue: number;
}

/** Server-owned transport: must use verified GitHub user identity and scoped App credentials. */
export interface GitHubBrokerTransport {
	authority(input: {
		userToken: string;
		userId: string;
		repository: string;
	}): Promise<ScopedRepositoryAuthority>;
	issueUpdatedAt(input: {
		repository: string;
		issue: number;
		userId: string;
	}): Promise<string>;
	createComment(input: {
		repository: string;
		issue: number;
		body: string;
		userId: string;
	}): Promise<{ id: number }>;
	readComment(input: {
		repository: string;
		issue: number;
		commentId: number;
		userId: string;
	}): Promise<VerifiedCommentReceipt | undefined>;
}

/**
 * Production implementation MUST atomically reserve a key, bind the intent hash, and
 * durably save the verified receipt. Uncertain or failed remote writes remain blocked
 * until reconciled; do not blindly replay a possibly successful GitHub mutation.
 */
export interface MutationReceiptJournal {
	once(key: string, intentHash: string, run: () => Promise<VerifiedCommentReceipt>): Promise<VerifiedCommentReceipt>;
}

/** Strictly test/single-process journal. Production broker MUST provide a durable distributed journal. */
export class MemoryMutationReceiptJournal implements MutationReceiptJournal {
	readonly #entries = new Map<string, { hash: string; pending: Promise<VerifiedCommentReceipt> }>();

	once(key: string, hash: string, run: () => Promise<VerifiedCommentReceipt>): Promise<VerifiedCommentReceipt> {
		const prior = this.#entries.get(key);
		if (prior) {
			if (prior.hash !== hash) throw new BrokerRejection(409, "Idempotency key reused for a different intent");
			return prior.pending;
		}
		// Reserve synchronously, before any await. A rejected promise is deliberately
		// retained: the remote write may have happened before the error was observed.
		const pending = Promise.resolve().then(run);
		this.#entries.set(key, { hash, pending });
		return pending;
	}
}

class BrokerRejection extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
	}
}

export interface ConfidentialBrokerOptions {
	client: AuthBrokerConfig;
	store: AuthTokenStore;
	transport: GitHubBrokerTransport;
	journal: MutationReceiptJournal;
	/** Exact browser origin allowlist, without a wildcard. */
	allowedOrigins: readonly string[];
	/** Exact OAuth redirect URIs on the GitHub App. */
	redirectUris: readonly string[];
	fetcher?: typeof fetch;
}

function bodyObject(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new BrokerRejection(400, "Invalid broker request");
	return value as Record<string, unknown>;
}
function requiredString(value: unknown, name: string, max = 1024): string {
	if (typeof value !== "string" || !value.trim() || value.length > max)
		throw new BrokerRejection(400, `Invalid ${name}`);
	return value;
}
function repositorySlug(value: unknown): string {
	const repository = requiredString(value, "repository", 200);
	if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository) || repository.includes(".."))
		throw new BrokerRejection(400, "Invalid repository");
	return repository;
}
function validIssue(value: unknown): number {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
		throw new BrokerRejection(400, "Invalid issue");
	return value;
}
function response(body: unknown, status: number, origin: string): Response {
	return new Response(body === undefined ? null : JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
			"Referrer-Policy": "no-referrer",
			"Access-Control-Allow-Origin": origin,
			"Vary": "Origin",
		},
	});
}
async function verifiedUser(token: string, fetcher: typeof fetch): Promise<string> {
	const reply = await fetcher("https://api.github.com/user", {
		headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
		redirect: "error",
		cache: "no-store",
	});
	if (!reply.ok) throw new BrokerRejection(401, "GitHub identity verification failed");
	const user = bodyObject(await reply.json());
	if (typeof user.login !== "string" || !user.login || !Number.isSafeInteger(user.id))
		throw new BrokerRejection(401, "GitHub identity verification failed");
	return user.login;
}

/**
 * An HTTP Request handler (no framework dependency). The deployment owner must
 * configure HTTPS, a private session store, a distributed journal and scoped App
 * transport; never mount this handler in GitHub Pages or any client bundle.
 */
export function createConfidentialBrokerHandler(options: ConfidentialBrokerOptions): (request: Request) => Promise<Response> {
	if (!options.allowedOrigins.length || !options.redirectUris.length || !options.journal)
		throw new Error("Confidential broker requires origin/redirect allowlists and a durable journal");
	if (options.allowedOrigins.some((origin) => {
		try {
			const url = new URL(origin);
			return url.protocol !== "https:" || url.origin !== origin;
		} catch {
			return true;
		}
	})) throw new Error("Invalid confidential broker origin allowlist");
	const config: AuthBrokerConfig = { ...options.client, redirectUris: options.redirectUris };
	const fetcher = options.fetcher ?? globalThis.fetch;

	async function session(id: string): Promise<{ userId: string; record: BrokerTokenRecord }> {
		const record = await options.store.get(id);
		const now = Date.now();
		if (!record || !record.userId || !record.sessionExpiresAt || record.sessionExpiresAt <= now ||
			(record.accessExpiresAt !== undefined && record.accessExpiresAt <= now))
			throw new BrokerRejection(401, "Authentication session expired or unavailable");
		return { userId: record.userId, record };
	}
	async function authority(id: string, repository: string): Promise<ScopedRepositoryAuthority> {
		const { record, userId } = await session(id);
		const permissions = await options.transport.authority({
			userToken: record.token.access_token,
			userId,
			repository,
		});
		if (permissions.userId !== userId)
			throw new BrokerRejection(403, "Repository identity mismatch");
		return permissions;
	}
	return async (request: Request): Promise<Response> => {
		const origin = request.headers.get("Origin") ?? "";
		if (!options.allowedOrigins.includes(origin))
			return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
		if (request.method === "OPTIONS") return new Response(null, {
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": origin,
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
				"Vary": "Origin",
				"Cache-Control": "no-store",
			},
		});
		if (request.method !== "POST" || !request.headers.get("Content-Type")?.startsWith("application/json"))
			return response({ error: "Unsupported broker request" }, 405, origin);
		try {
			const size = Number(request.headers.get("Content-Length") ?? "0");
			if (!Number.isSafeInteger(size) || size > 16_384)
				throw new BrokerRejection(413, "Broker request exceeds size limit");
			const input = bodyObject(await request.json());
			const path = new URL(request.url).pathname.replace(/\/$/u, "");
			if (path.endsWith("/oauth/exchange")) {
				const code = requiredString(input.code, "authorization code");
				const codeVerifier = requiredString(input.codeVerifier, "PKCE verifier", 128);
				const redirectUri = requiredString(input.redirectUri, "redirect URI");
				const issued = await createBrokerSession(config, { code, codeVerifier, redirectUri }, options.store);
				try {
					const record = await options.store.get(issued.id);
					if (!record) throw new BrokerRejection(503, "Authentication session unavailable");
					const userId = await verifiedUser(record.token.access_token, fetcher);
					await options.store.set(issued.id, { ...record, userId });
					return response({ id: issued.id, expiresAt: issued.expiresAt, userId }, 200, origin);
				} catch (error) {
					await options.store.delete(issued.id);
					throw error;
				}
			}
			const sessionId = requiredString(input.sessionId, "session");
			if (path.endsWith("/session/refresh")) {
				const previous = await session(sessionId);
				const refreshed = await refreshBrokerSession(config, sessionId, options.store);
				if (refreshed.userId !== previous.userId)
					throw new BrokerRejection(403, "Authentication session identity mismatch");
				return response(refreshed, 200, origin);
			}
			if (path.endsWith("/session/revoke")) {
				await revokeBrokerSession(config, sessionId, options.store);
				return response({}, 200, origin);
			}
			const repository = repositorySlug(input.repository);
			const access = await authority(sessionId, repository);
			if (path.endsWith("/authority"))
				return response(access, 200, origin);
			if (path.endsWith("/issues/comment")) {
				const permissions = projectAuthority(access.userPermissions, access.appAuthority, access.userId);
				if (!permissions.canMutate || !permissions.canRead)
					throw new BrokerRejection(403, "Repository mutation not permitted");
				const issue = validIssue(input.issue);
				const body = requiredString(input.body, "comment body", 60_000);
				const expectedUpdatedAt = requiredString(input.expectedUpdatedAt, "issue revision", 64);
				const idempotencyKey = requiredString(input.idempotencyKey, "idempotency key", 128);
				if (!/^[A-Za-z0-9._-]{16,128}$/u.test(idempotencyKey) ||
					!Number.isFinite(Date.parse(expectedUpdatedAt)))
					throw new BrokerRejection(400, "Invalid mutation precondition");
				const key = `${access.userId}:${sessionId}:${repository}:${idempotencyKey}`;
				const intentHash = createHash("sha256").update(JSON.stringify({
					repository, issue, body, expectedUpdatedAt, userId: access.userId,
				})).digest("hex");
				const receipt = await options.journal.once(key, intentHash, async () => {
					// Revalidate authority and the source revision inside the exclusive receipt scope.
					const rechecked = await authority(sessionId, repository);
					const effective = projectAuthority(rechecked.userPermissions, rechecked.appAuthority, rechecked.userId);
					if (!effective.canRead || !effective.canMutate)
						throw new BrokerRejection(403, "Repository mutation not permitted");
					const updated = await options.transport.issueUpdatedAt({ repository, issue, userId: access.userId });
					if (updated !== expectedUpdatedAt)
						throw new BrokerRejection(409, "Issue revision changed");
					const posted = await options.transport.createComment({ repository, issue, body, userId: access.userId });
					if (!Number.isSafeInteger(posted.id) || posted.id < 1)
						throw new BrokerRejection(502, "GitHub mutation receipt invalid");
					const observed = await options.transport.readComment({
						repository, issue, commentId: posted.id, userId: access.userId,
					});
					if (!observed || observed.id !== posted.id || observed.body !== body ||
						observed.repository !== repository || observed.issue !== issue)
						throw new BrokerRejection(502, "GitHub mutation not verified");
					return observed;
				});
				return response({ id: receipt.id }, 200, origin);
			}
			return response({ error: "Unknown broker endpoint" }, 404, origin);
		} catch (error) {
			// Never serialize exception messages from transport, fetch, credentials or JSON parser.
			if (error instanceof BrokerRejection) return response({ error: error.message }, error.status, origin);
			return response({ error: "Confidential broker operation unavailable" }, 503, origin);
		}
	};
}
