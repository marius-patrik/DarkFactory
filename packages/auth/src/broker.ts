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
export interface AuthBrokerConfig {
	clientId: string;
	clientSecret: string;
	/** Maximum browser session lifetime independent of GitHub token lifetime. */
	sessionTtlMs?: number;
}

/** One-time browser callback material accepted by the confidential broker. */
export interface TokenExchangeRequest {
	code: string;
	codeVerifier: string;
	redirectUri: string;
}

/** Broker-owned secret token storage contract. */
export interface AuthTokenStore {
	get(sessionId: string): Promise<BrokerTokenRecord | undefined>;
	set(sessionId: string, record: BrokerTokenRecord): Promise<void>;
	delete(sessionId: string): Promise<void>;
}

/** In-memory broker token store for tests and single-process deployments. */
export class MemoryAuthTokenStore implements AuthTokenStore {
	readonly #records = new Map<string, BrokerTokenRecord>();

	async get(sessionId: string): Promise<BrokerTokenRecord | undefined> {
		return this.#records.get(sessionId);
	}

	async set(sessionId: string, record: BrokerTokenRecord): Promise<void> {
		this.#records.set(sessionId, record);
	}

	async delete(sessionId: string): Promise<void> {
		this.#records.delete(sessionId);
	}
}

async function tokenRequest(params: URLSearchParams): Promise<GitHubTokenResponse> {
	const response = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: params.toString(),
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

function sessionFromRecord(sessionId: string, record: BrokerTokenRecord, config: AuthBrokerConfig, now: number): BrowserSession {
	const configuredExpiry = now + (config.sessionTtlMs ?? 8 * 60 * 60 * 1_000);
	const expiresAt = record.accessExpiresAt === undefined ? configuredExpiry : Math.min(configuredExpiry, record.accessExpiresAt);
	return { id: sessionId, expiresAt, ...(record.userId ? { userId: record.userId } : {}) };
}

/** Exchanges an authorization code for GitHub user tokens. The returned token must remain broker-side. */
export function exchangeCodeForToken(config: AuthBrokerConfig, payload: TokenExchangeRequest): Promise<GitHubTokenResponse> {
	return tokenRequest(new URLSearchParams({
		client_id: config.clientId,
		client_secret: config.clientSecret,
		code: payload.code,
		code_verifier: payload.codeVerifier,
		redirect_uri: payload.redirectUri,
	}));
}

/** Refreshes a GitHub user token. The returned token must remain broker-side. */
export function refreshAccessToken(config: AuthBrokerConfig, refreshToken: string): Promise<GitHubTokenResponse> {
	return tokenRequest(new URLSearchParams({
		client_id: config.clientId,
		client_secret: config.clientSecret,
		grant_type: "refresh_token",
		refresh_token: refreshToken,
	}));
}

/** Revokes a GitHub user access token using the confidential application credential. */
export async function revokeAccessToken(config: AuthBrokerConfig, accessToken: string): Promise<void> {
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
	const now = options.now ?? Date.now();
	const token = await exchangeCodeForToken(config, payload);
	const record = recordFromToken(token, now, options.userId);
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
	const current = await store.get(sessionId);
	if (!current) throw new Error("Unknown authentication session");
	if (!current.token.refresh_token) throw new Error("Authentication session is not refreshable");
	if (current.refreshExpiresAt !== undefined && current.refreshExpiresAt <= now)
		throw new Error("Authentication refresh token has expired");
	const token = await refreshAccessToken(config, current.token.refresh_token);
	const record = recordFromToken(token, now, current.userId);
	await store.set(sessionId, record);
	return sessionFromRecord(sessionId, record, config, now);
}

/** Revokes one broker-owned session. Local broker state is deleted only after remote revocation succeeds. */
export async function revokeBrokerSession(
	config: AuthBrokerConfig,
	sessionId: string,
	store: AuthTokenStore,
): Promise<void> {
	const current = await store.get(sessionId);
	if (!current) return;
	await revokeAccessToken(config, current.token.access_token);
	await store.delete(sessionId);
}
