/** Opaque-session operator authentication. The confidential broker owns all token exchange and mutation authority. */
import {
	clearSession, completeAuthCallback, initiateAuth, persistSession, projectAuthority,
	restoreSessionWithRefresh,
} from "../../auth/src/index.ts";
import type { BrowserSession } from "../../auth/src/types.ts";
import type { OperatorReadSource } from "./operator-data.ts";

export interface EffectiveAuthority { canRead: boolean; canMutate: boolean; isAdmin: boolean; userId: string }
export interface BrokerAuthority {
	userPermissions: { admin: boolean; push: boolean; pull: boolean };
	appAuthority: { installed: boolean; repositorySelected: boolean; canRead: boolean; canWrite: boolean; canAdminister?: boolean };
	userId: string;
}
export interface OperatorBroker {
	/** Returns opaque session only, never GitHub OAuth tokens. */
	complete(code: string, codeVerifier: string): Promise<BrowserSession>;
	refresh(sessionId: string): Promise<BrowserSession>;
	revoke(sessionId: string): Promise<void>;
	authority(sessionId: string, repository: string): Promise<BrokerAuthority>;
	/** Server must check current user, issue version, App scope, gate rules and idempotency. */
	comment(input: {
		sessionId: string; repository: string; issue: number; body: string;
		expectedUpdatedAt: string; idempotencyKey: string;
	}): Promise<{ id: number }>;
}
export interface BrowserLoginConfig { clientId: string; redirectUri: string; scope: string; broker: OperatorBroker }
export interface AuthState {
	status: "signed-out" | "signed-in" | "loading" | "error" | "unavailable";
	session?: BrowserSession;
	authority?: EffectiveAuthority;
	config?: BrowserLoginConfig;
	error?: string;
}
/**
 * Contract for a trusted confidential broker. Browser never sees its GitHub access token;
 * this client supplies only an opaque session descriptor.
 * The server routes are deployment requirements, NOT supplied by the current auth package.
 */
export function createHttpOperatorBroker(baseUrl: string, fetcher: typeof fetch = globalThis.fetch): OperatorBroker {
	const base = new URL(baseUrl);
	if (base.protocol !== "https:" && !(base.hostname === "localhost" && base.protocol === "http:")) {
		throw new Error("Auth broker must use HTTPS");
	}
	if (base.username || base.password || base.hash || base.search) throw new Error("Invalid auth broker URL");
	async function request<T>(method: string, path: string, body: unknown): Promise<T> {
		const result = await fetcher(new URL(path, base).href, {
			method, redirect: "error", cache: "no-store", credentials: "omit",
			headers: { "Content-Type": "application/json", "Accept": "application/json" },
			body: JSON.stringify(body),
		});
		if (!result.ok) throw new Error(`Authentication broker returned HTTP ${result.status}`);
		return result.json() as Promise<T>;
	}
	return {
		complete: (code, codeVerifier) => request("POST", "v1/auth/callback", { code, codeVerifier }),
		refresh: (sessionId) => request("POST", "v1/auth/refresh", { sessionId }),
		revoke: (sessionId) => request("POST", "v1/auth/logout", { sessionId }),
		authority: (sessionId, repository) => request("POST", "v1/operator/authority", { sessionId, repository }),
		comment: (input) => request("POST", "v1/operator/comment", input),
	};
}
export async function beginOperatorLogin(config: BrowserLoginConfig): Promise<string> {
	return initiateAuth(config.clientId, config.redirectUri, config.scope);
}
export async function finishOperatorLogin(config: BrowserLoginConfig, params: URLSearchParams): Promise<BrowserSession> {
	const { code, codeVerifier } = completeAuthCallback(params);
	const session = await config.broker.complete(code, codeVerifier);
	persistSession(session);
	return session;
}
export async function operatorSession(config: BrowserLoginConfig): Promise<BrowserSession | null> {
	return restoreSessionWithRefresh((id) => config.broker.refresh(id));
}
export async function resolveAuthority(
	broker: OperatorBroker, session: BrowserSession, repository: string,
): Promise<EffectiveAuthority> {
	const actual = await broker.authority(session.id, repository);
	if (actual.userId !== session.userId && session.userId !== undefined) {
		throw new Error("Broker returned a different authenticated user");
	}
	return projectAuthority(actual.userPermissions, actual.appAuthority, actual.userId);
}
export async function logoutOperator(config: BrowserLoginConfig, session: BrowserSession): Promise<void> {
	// Clear locally first. A failed server revocation is an explicit error and cannot restore the session.
	clearSession();
	await config.broker.revoke(session.id);
}
export class OperatorWriteError extends Error {}

/** Mutation success is established by an independently observed GitHub comment readback. */
export async function postVerifiedIssueComment(
	source: OperatorReadSource,
	broker: OperatorBroker,
	session: BrowserSession,
	authority: EffectiveAuthority,
	repository: string,
	issue: number,
	body: string,
	expectedUpdatedAt: string,
): Promise<{ id: number; url: string }> {
	if (!authority.canMutate || !authority.canRead || !authority.userId)
		throw new OperatorWriteError("Mutation denied: effective user/App authority is insufficient.");
	if (!Number.isSafeInteger(issue) || issue < 1 || !body.trim() || !expectedUpdatedAt)
		throw new OperatorWriteError("Issue, comment and immutable expected version are required.");
	if (!source.issueComments) throw new OperatorWriteError("Readback interface is unavailable.");
	const result = await broker.comment({
		sessionId: session.id, repository, issue, body: body.trim(), expectedUpdatedAt,
		idempotencyKey: crypto.randomUUID(),
	});
	if (!Number.isSafeInteger(result.id) || result.id <= 0)
		throw new OperatorWriteError("Broker did not return a valid mutation identity.");
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const comments = await source.issueComments(issue);
			const readback = comments.items.find((item) =>
				item.id === result.id && item.body === body.trim() && item.subtitle === authority.userId);
			if (readback) return { id: result.id, url: readback.url };
		} catch {
			// A failed readback is not evidence of success. Retry boundedly to account for eventual consistency.
		}
		if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
	}
	throw new OperatorWriteError("Write outcome unverified: GitHub readback did not confirm the attributed comment. Reconcile before retry.");
}
