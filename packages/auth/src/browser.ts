/** @packageDocumentation
 * Browser-safe GitHub authentication and session management using PKCE.
 *
 * This module is designed to run in browser environments (or tests) and has NO imports of
 * keychain, private-key or server-confidential secrets.
 */

/** Schema/interface for GitHub token response payload from broker or GitHub backchannel. */
export interface GitHubTokenResponse {
	access_token: string;
	expires_in?: number;
	refresh_token?: string;
	refresh_token_expires_in?: number;
	scope?: string;
	token_type?: string;
}

/** User profile information retrieved from GitHub using user token. */
export interface GitHubUserProfile {
	login: string;
	id: number;
	avatar_url: string;
	name: string | null;
	email: string | null;
}

/** Schema/interface for evaluating repository permissions. */
export interface RepositoryPermissions {
	admin: boolean;
	maintain?: boolean;
	push: boolean;
	triage?: boolean;
	pull: boolean;
}

/** Evaluated permissions for the user in the context of a given repository and installation. */
export interface UserAuthority {
	/** Logged-in user profile. */
	user: GitHubUserProfile;
	/** Repository specific permissions, derived directly from GitHub. */
	permissions: RepositoryPermissions;
	/** Whether the user has write/push permission to create canonical intents. */
	canWrite: boolean;
	/** Whether the App is installed on this repository. */
	isInstalled: boolean;
}

/** Abstract Storage interface to support both browser sessionStorage and testing environments. */
export interface AuthStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

/** Simple memory-based storage fallback for tests and non-browser runtimes. */
export class MemoryAuthStorage implements AuthStorage {
	private store = new Map<string, string>();

	getItem(key: string): string | null {
		return this.store.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.store.set(key, value);
	}

	removeItem(key: string): void {
		this.store.delete(key);
	}
}

/** Helper to resolve the storage to use. Defaults to window.sessionStorage if available. */
function getStorage(customStorage?: AuthStorage): AuthStorage {
	if (customStorage) return customStorage;
	if (typeof window !== "undefined" && window.sessionStorage) {
		return window.sessionStorage;
	}
	return new MemoryAuthStorage();
}

/** Generates a high-entropy string using web crypto. */
function generateRandomString(length: number): string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
	const values = new Uint32Array(length);
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		crypto.getRandomValues(values);
	} else {
		// Fallback for extremely sparse test environments
		for (let i = 0; i < length; i++) {
			values[i] = Math.floor(Math.random() * 4294967296);
		}
	}
	let result = "";
	for (let i = 0; i < length; i++) {
		result += charset[values[i] % charset.length];
	}
	return result;
}

/** Converts an ArrayBuffer to a browser-safe base64url string. */
function base64url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	const base64 = typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
	return base64
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

/** Computes the SHA-256 hash of a string. */
async function sha256(plain: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	if (typeof crypto !== "undefined" && crypto.subtle) {
		return await crypto.subtle.digest("SHA-256", data);
	}
	// Fallback/Shim for environment where crypto.subtle might not be loaded synchronously in older runtimes
	const cryptoNode = await import("node:crypto");
	const hash = cryptoNode.createHash("sha256");
	hash.update(data);
	return hash.digest().buffer;
}

/** PKCE Materials generated for initiating authorization flow. */
export interface PKCEMaterials {
	/** Cryptographic random token to prevent CSRF. */
	state: string;
	/** High-entropy secret verifier. */
	codeVerifier: string;
	/** SHA-256 code challenge used in browser-side authorization. */
	codeChallenge: string;
}

/**
 * Generates PKCE authorization materials (state, codeVerifier, and codeChallenge).
 *
 * @returns An object containing `state`, `codeVerifier`, and `codeChallenge`.
 */
export async function generatePKCE(): Promise<PKCEMaterials> {
	const state = generateRandomString(32);
	const codeVerifier = generateRandomString(64);
	const hash = await sha256(codeVerifier);
	const codeChallenge = base64url(hash);

	return { state, codeVerifier, codeChallenge };
}

/** Options for configuring the GitHub user login flow. */
export interface LoginFlowOptions {
	/** Requested OAuth scopes (e.g., 'repo', 'read:user'). */
	scope?: string;
	/** Optional redirect URL after GitHub authorises. */
	redirectUri?: string;
	/** Custom storage implementation to bypass window.sessionStorage. */
	storage?: AuthStorage;
}

/**
 * Initiates the PKCE-based GitHub App user auth flow.
 * Stores materials in sessionStorage and returns the Authorization URL to redirect to.
 *
 * @param clientId - The GitHub App client ID.
 * @param options - Configuration options for scope, redirect, and storage.
 * @returns The target authorize URL to redirect the user to.
 */
export async function createGitHubAuthorizeUrl(
	clientId: string,
	options: LoginFlowOptions = {},
): Promise<string> {
	const { state, codeVerifier, codeChallenge } = await generatePKCE();
	const storage = getStorage(options.storage);

	// Persist PKCE materials in session storage
	storage.setItem("df_oauth_state", state);
	storage.setItem("df_oauth_code_verifier", codeVerifier);

	const url = new URL("https://github.com/login/oauth/authorize");
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("state", state);
	url.searchParams.set("code_challenge", codeChallenge);
	url.searchParams.set("code_challenge_method", "S256");

	if (options.scope) {
		url.searchParams.set("scope", options.scope);
	}
	if (options.redirectUri) {
		url.searchParams.set("redirect_uri", options.redirectUri);
	}

	return url.toString();
}

/** Options for callback and exchange process. */
export interface CallbackExchangeOptions {
	/** Custom storage override. */
	storage?: AuthStorage;
	/** Abort signal for the broker network request. */
	signal?: AbortSignal;
}

/**
 * Validates the callback query parameters against stored PKCE state and exchanges code
 * with the token-exchange broker.
 *
 * @param code - Authorization code retrieved from callback URL.
 * @param state - Anti-CSRF state token retrieved from callback URL.
 * @param brokerUrl - URL endpoint of the confidential token-exchange broker.
 * @param options - Additional options including custom storage or abort signal.
 * @returns The retrieved GitHub tokens.
 * @throws Error if state mismatch or validation fails.
 */
export async function handleAuthCallback(
	code: string,
	state: string,
	brokerUrl: string,
	options: CallbackExchangeOptions = {},
): Promise<GitHubTokenResponse> {
	const storage = getStorage(options.storage);
	const storedState = storage.getItem("df_oauth_state");
	const storedVerifier = storage.getItem("df_oauth_code_verifier");

	// Clean up storage right away to prevent reuse
	storage.removeItem("df_oauth_state");
	storage.removeItem("df_oauth_code_verifier");

	if (!storedState || state !== storedState) {
		throw new Error("CSRF/State validation failed: State parameter mismatch or expired session.");
	}

	if (!storedVerifier) {
		throw new Error("PKCE Code Verifier not found in session storage.");
	}

	// Request exchange from the broker
	const response = await fetch(brokerUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			code,
			code_verifier: storedVerifier,
		}),
		signal: options.signal,
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Token exchange broker request failed (${response.status}): ${text}`);
	}

	const tokenData = (await response.json()) as GitHubTokenResponse;

	// Persist retrieved session token for restoration
	if (tokenData.access_token) {
		storage.setItem("df_auth_access_token", tokenData.access_token);
		if (tokenData.refresh_token) {
			storage.setItem("df_auth_refresh_token", tokenData.refresh_token);
		}
	}

	return tokenData;
}

/**
 * Evaluates the actual permissions of the authenticated user.
 * Derives authority from the GitHub User API and repository settings.
 *
 * @param accessToken - The authenticated user's access token.
 * @param repoOwner - Repository owner name.
 * @param repoName - Repository name.
 * @returns UserAuthority detailing user and their permissions on the repository.
 */
export async function fetchUserAuthority(
	accessToken: string,
	repoOwner: string,
	repoName: string,
): Promise<UserAuthority> {
	// 1. Fetch user profile
	const userRes = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/vnd.github+json",
		},
	});

	if (!userRes.ok) {
		throw new Error(`Failed to fetch GitHub user profile: ${userRes.statusText}`);
	}

	const user = (await userRes.json()) as GitHubUserProfile;

	// 2. Fetch repo access information to check permissions and installation
	const repoRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/vnd.github+json",
		},
	});

	let permissions: RepositoryPermissions = { admin: false, push: false, pull: true };
	let isInstalled = false;

	if (repoRes.ok) {
		const repoData = await repoRes.json();
		permissions = repoData.permissions || permissions;
		// If repo is returned and readable by the user's token, isInstalled is true or evaluated
		isInstalled = true;
	} else if (repoRes.status === 404) {
		// Private repo or App has no installation
		isInstalled = false;
	}

	return {
		user,
		permissions,
		canWrite: permissions.push || permissions.admin,
		isInstalled,
	};
}

/**
 * Restores a stored session from storage, and optionally refreshes the token via broker.
 *
 * @param brokerRefreshUrl - Broker endpoint URL to refresh a token.
 * @param storageOverride - Optional custom storage implementation.
 * @returns The recovered access token, or null if no valid session/tokens exist.
 */
export async function restoreSession(
	brokerRefreshUrl: string,
	storageOverride?: AuthStorage,
): Promise<string | null> {
	const storage = getStorage(storageOverride);
	const accessToken = storage.getItem("df_auth_access_token");
	const refreshToken = storage.getItem("df_auth_refresh_token");

	if (accessToken) {
		return accessToken;
	}

	if (refreshToken) {
		try {
			// Trigger a token refresh via the broker
			const response = await fetch(brokerRefreshUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					refresh_token: refreshToken,
				}),
			});

			if (response.ok) {
				const data = (await response.json()) as GitHubTokenResponse;
				if (data.access_token) {
					storage.setItem("df_auth_access_token", data.access_token);
					if (data.refresh_token) {
						storage.setItem("df_auth_refresh_token", data.refresh_token);
					}
					return data.access_token;
				}
			}
		} catch (error) {
			console.error("Session restoration token refresh failed:", error);
		}
	}

	return null;
}

/**
 * Logs out the user by clearing all authentication materials and session tokens from storage.
 *
 * @param storageOverride - Optional custom storage implementation.
 */
export function logout(storageOverride?: AuthStorage): void {
	const storage = getStorage(storageOverride);
	storage.removeItem("df_oauth_state");
	storage.removeItem("df_oauth_code_verifier");
	storage.removeItem("df_auth_access_token");
	storage.removeItem("df_auth_refresh_token");
}
