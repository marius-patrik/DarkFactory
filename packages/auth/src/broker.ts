/** @packageDocumentation
 * Confidential GitHub App user-token broker.
 *
 * This module is server-side only. It owns token exchange, refresh, revocation and secret-bearing session records.
 */

import { Buffer } from "node:buffer";
import {
	type BrokerTokenRecord,
	type BrowserSession,
	type GitHubTokenResponse,
	parseGitHubTokenResponse,
} from "./types.ts";

/** Confidential GitHub App OAuth broker credentials. */
interface AuthBrokerConfig {
	clientId: string;
	clientSecret: string;
	/** Maximum browser session lifetime independent of GitHub token lifetime. */
	sessionTtlMs?: number;
	/** Explicit redirect allowlist for confidential deployments. */
	redirectUris?: readonly string[];
}

/** One-time browser callback material accepted by the confidential broker. */
interface TokenExchangeRequest {
	code: string;
	codeVerifier: string;
	redirectUri: string;
}

/** Broker-owned secret token storage contract. */
interface AuthTokenStore {
	get(sessionId: string): Promise<BrokerTokenRecord | undefined>;
	set(sessionId: string, record: BrokerTokenRecord): Promise<void>;
	delete(sessionId: string): Promise<void>;
}

/** In-memory broker token store for tests and single-process deployments. */
export class MemoryAuthTokenStore implements AuthTokenStore {
	readonly #records = new Map<string, BrokerTokenRecord>();

	async get(sessionId: string): Promise<BrokerTokenRecord | undefined> {
		const record = this.#records.get(sessionId);
		return record ? structuredClone(record) : undefined;
	}

	async set(sessionId: string, record: BrokerTokenRecord): Promise<void> {
		this.#records.set(sessionId, structuredClone(record));
	}

	async delete(sessionId: string): Promise<void> {
		this.#records.delete(sessionId);
	}
}

/** Per-store session locks prevent refresh-token reuse, post-revocation resurrection and lost rotation. */
const storeQueues = new WeakMap<AuthTokenStore, Map<string, Promise<void>>>();

async function withSessionLock<T>(store: AuthTokenStore, sessionId: string, run: () => Promise<T>): Promise<T> {
	let queues = storeQueues.get(store);
	if (!queues) {
		queues = new Map();
		storeQueues.set(store, queues);
	}
	const predecessor = queues.get(sessionId);
	let release!: () => void;
	const completion = new Promise<void>((resolve) => {
		release = resolve;
	});
	queues.set(sessionId, completion);
	await predecessor;
	try {
		return await run();
	} finally {
		release();
		if (queues.get(sessionId) === completion) queues.delete(sessionId);
	}
}

function validateExchange(config: AuthBrokerConfig, payload: TokenExchangeRequest): void {
	if (!config.clientId || !config.clientSecret) throw new Error("Confidential OAuth client credentials are missing");
	if (!payload.code.trim() || !/^[A-Za-z0-9._~-]{43,128}$/u.test(payload.codeVerifier))
		throw new Error("Invalid OAuth authorization code or PKCE verifier");
	let redirect: URL;
	try {
		redirect = new URL(payload.redirectUri);
	} catch {
		throw new Error("Invalid OAuth redirect");
	}
	if (redirect.protocol !== "https:" || redirect.username || redirect.password || redirect.hash)
		throw new Error("Confidential OAuth redirect must be HTTPS");
	if (config.redirectUris && !config.redirectUris.includes(redirect.href))
		throw new Error("OAuth redirect is not authorized for this broker");
	if (config.sessionTtlMs !== undefined && (!Number.isSafeInteger(config.sessionTtlMs) || config.sessionTtlMs <= 0))
		throw new Error("Invalid broker session lifetime");
}

async function tokenRequest(params: URLSearchParams): Promise<GitHubTokenResponse> {
	const response = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: params.toString(),
		redirect: "error",
		cache: "no-store",
	});
	if (!response.ok) throw new Error(`GitHub OAuth token request failed with status ${response.status}`);
	return parseGitHubTokenResponse(await response.json());
}

function recordFromToken(token: GitHubTokenResponse, now: number, userId?: string): BrokerTokenRecord {
	return {
		token,
		...(token.expires_in !== undefined ? { accessExpiresAt: now + token.expires_in * 1_000 } : {}),
		...(token.refresh_token_expires_in !== undefined
			? { refreshExpiresAt: now + token.refresh_token_expires_in * 1_000 }
			: {}),
		...(userId ? { userId } : {}),
	};
}

function sessionFromRecord(
	sessionId: string,
	record: BrokerTokenRecord,
	config: AuthBrokerConfig,
	now: number,
): BrowserSession {
	const configuredExpiry = record.sessionExpiresAt ?? now + (config.sessionTtlMs ?? 8 * 60 * 60 * 1_000);
	const expiresAt =
		record.accessExpiresAt === undefined ? configuredExpiry : Math.min(configuredExpiry, record.accessExpiresAt);
	return { id: sessionId, expiresAt, ...(record.userId ? { userId: record.userId } : {}) };
}

/** Exchanges an authorization code for GitHub user tokens. The returned token must remain broker-side. */
function exchangeCodeForToken(config: AuthBrokerConfig, payload: TokenExchangeRequest): Promise<GitHubTokenResponse> {
	return tokenRequest(
		new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			code: payload.code,
			code_verifier: payload.codeVerifier,
			redirect_uri: payload.redirectUri,
		}),
	);
}

/** Refreshes a GitHub user token. The returned token must remain broker-side. */
function refreshAccessToken(config: AuthBrokerConfig, refreshToken: string): Promise<GitHubTokenResponse> {
	return tokenRequest(
		new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			grant_type: "refresh_token",
			refresh_token: refreshToken,
		}),
	);
}

/** Revokes a GitHub user access token using the confidential application credential. */
async function revokeAccessToken(config: AuthBrokerConfig, accessToken: string): Promise<void> {
	const response = await fetch(`https://api.github.com/applications/${encodeURIComponent(config.clientId)}/token`, {
		method: "DELETE",
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
			"Content-Type": "application/json",
			"X-GitHub-Api-Version": "2022-11-28",
		},
		body: JSON.stringify({ access_token: accessToken }),
	});
	if (!response.ok) throw new Error(`GitHub OAuth revocation failed with status ${response.status}`);
}

/** Exchanges callback material, stores tokens broker-side and returns only an opaque browser session. */
export async function createBrokerSession(
	config: AuthBrokerConfig,
	payload: TokenExchangeRequest,
	store: AuthTokenStore,
	options: { sessionId?: string; userId?: string; now?: number } = {},
): Promise<BrowserSession> {
	validateExchange(config, payload);
	const now = options.now ?? Date.now();
	const token = await exchangeCodeForToken(config, payload);
	const record = {
		...recordFromToken(token, now, options.userId),
		sessionExpiresAt: now + (config.sessionTtlMs ?? 8 * 60 * 60 * 1_000),
	};
	const sessionId = options.sessionId ?? crypto.randomUUID();
	await store.set(sessionId, record);
	return sessionFromRecord(sessionId, record, config, now);
}

/** Refreshes one broker-owned session and returns an updated opaque browser descriptor. */
export async function refreshBrokerSession(
	config: AuthBrokerConfig,
	sessionId: string,
	store: AuthTokenStore,
	now = Date.now(),
): Promise<BrowserSession> {
	return withSessionLock(store, sessionId, async () => {
		const current = await store.get(sessionId);
		if (!current) throw new Error("Unknown authentication session");
		if (!current.token.refresh_token) throw new Error("Authentication session is not refreshable");
		if (current.sessionExpiresAt === undefined || current.sessionExpiresAt <= now)
			throw new Error("Authentication session has expired");
		if (current.refreshExpiresAt !== undefined && current.refreshExpiresAt <= now)
			throw new Error("Authentication refresh token has expired");
		const token = await refreshAccessToken(config, current.token.refresh_token);
		const record = {
			...recordFromToken(token, now, current.userId),
			sessionExpiresAt: current.sessionExpiresAt,
		};
		await store.set(sessionId, record);
		return sessionFromRecord(sessionId, record, config, now);
	});
}

/** Revokes one broker-owned session. Local broker state is deleted only after remote revocation succeeds. */
export async function revokeBrokerSession(
	config: AuthBrokerConfig,
	sessionId: string,
	store: AuthTokenStore,
): Promise<void> {
	await withSessionLock(store, sessionId, async () => {
		const current = await store.get(sessionId);
		if (!current) return;
		await revokeAccessToken(config, current.token.access_token);
		await store.delete(sessionId);
	});
}
