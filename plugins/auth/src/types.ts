/** Browser-safe opaque session descriptor returned by the confidential auth broker. */
export interface BrowserSession {
	/** Opaque broker-owned session identifier. */
	id: string;
	/** Absolute epoch-millisecond expiry for the browser session. */
	expiresAt: number;
	/** Authenticated GitHub login when already resolved by the broker. */
	userId?: string;
}

/** GitHub OAuth token response retained only inside the confidential broker boundary. */
export interface GitHubTokenResponse {
	access_token: string;
	token_type: string;
	refresh_token?: string;
	expires_in?: number;
	refresh_token_expires_in?: number;
	scope?: string;
}

/** Secret-bearing broker record. Never expose this type through browser entrypoints. */
export interface BrokerTokenRecord {
	token: GitHubTokenResponse;
	accessExpiresAt?: number;
	refreshExpiresAt?: number;
	userId?: string;
}

function record(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

/** Parses and validates a GitHub OAuth token response inside the broker boundary. */
export function parseGitHubTokenResponse(value: unknown): GitHubTokenResponse {
	const input = record(value);
	if (!input || typeof input.access_token !== "string" || typeof input.token_type !== "string")
		throw new Error("GitHub token response is missing required fields");
	return {
		access_token: input.access_token,
		token_type: input.token_type,
		...(typeof input.refresh_token === "string" ? { refresh_token: input.refresh_token } : {}),
		...(typeof input.expires_in === "number" && Number.isFinite(input.expires_in)
			? { expires_in: input.expires_in }
			: {}),
		...(typeof input.refresh_token_expires_in === "number" && Number.isFinite(input.refresh_token_expires_in)
			? { refresh_token_expires_in: input.refresh_token_expires_in }
			: {}),
		...(typeof input.scope === "string" ? { scope: input.scope } : {}),
	};
}

/** Parses browser persistence and rejects secret-bearing or malformed session shapes. */
export function parseBrowserSession(value: unknown): BrowserSession {
	const input = record(value);
	if (
		!input ||
		typeof input.id !== "string" ||
		!input.id ||
		typeof input.expiresAt !== "number" ||
		!Number.isFinite(input.expiresAt)
	)
		throw new Error("Invalid browser auth session");
	return {
		id: input.id,
		expiresAt: input.expiresAt,
		...(typeof input.userId === "string" && input.userId ? { userId: input.userId } : {}),
	};
}
