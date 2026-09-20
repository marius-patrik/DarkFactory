/** @packageDocumentation
 * Confidential token-exchange and refresh broker for DarkFactory human auth.
 *
 * Runs exclusively on authentication/broker infrastructure. Operates on behalf of the DarkFactory
 * GitHub App, safely housing client secrets that must never be embedded in static web pages.
 */

import type { GitHubTokenResponse } from "./browser.ts";

/** Input parameters for confidential code exchange. */
export interface CodeExchangeParams {
	/** Authorization code from GitHub OAuth callback. */
	code: string;
	/** Stored PKCE code verifier retrieved from browser storage. */
	codeVerifier: string;
	/** GitHub App OAuth Client ID. */
	clientId: string;
	/** GitHub App OAuth Client Secret. Must never ship in Pages. */
	clientSecret: string;
	/** Optional Redirect URI that was supplied to the authorize endpoint. */
	redirectUri?: string;
}

/** Input parameters for refreshing an OAuth access token. */
export interface RefreshTokenParams {
	/** Expired session's refresh token. */
	refreshToken: string;
	/** GitHub App OAuth Client ID. */
	clientId: string;
	/** GitHub App OAuth Client Secret. */
	clientSecret: string;
}

/** Input parameters for revoking (deleting) an OAuth grant/token. */
export interface RevokeTokenParams {
	/** Access token or refresh token to revoke. */
	token: string;
	/** GitHub App OAuth Client ID. */
	clientId: string;
	/** GitHub App OAuth Client Secret. */
	clientSecret: string;
}

/**
 * Confidential broker function to exchange an authorization code & PKCE code verifier
 * for access and refresh tokens.
 *
 * @param params - The exchange parameters containing code, codeVerifier, clientId and clientSecret.
 * @returns Token response payload from GitHub.
 */
export async function exchangeCode(params: CodeExchangeParams): Promise<GitHubTokenResponse> {
	const body: Record<string, string> = {
		client_id: params.clientId,
		client_secret: params.clientSecret,
		code: params.code,
		code_verifier: params.codeVerifier,
		grant_type: "authorization_code",
	};

	if (params.redirectUri) {
		body.redirect_uri = params.redirectUri;
	}

	const res = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`GitHub token exchange failed with status ${res.status}: ${text}`);
	}

	const data = (await res.json()) as GitHubTokenResponse & { error?: string; error_description?: string };

	if (data.error) {
		throw new Error(`GitHub API OAuth exchange error: ${data.error_description || data.error}`);
	}

	return {
		access_token: data.access_token,
		expires_in: data.expires_in,
		refresh_token: data.refresh_token,
		refresh_token_expires_in: data.refresh_token_expires_in,
		scope: data.scope,
		token_type: data.token_type,
	};
}

/**
 * Confidential broker function to refresh an expiring OAuth access token using a refresh token.
 *
 * @param params - The refresh parameters containing refreshToken, clientId, and clientSecret.
 * @returns Fresh token response payload from GitHub.
 */
export async function refreshAccessToken(params: RefreshTokenParams): Promise<GitHubTokenResponse> {
	const body = {
		client_id: params.clientId,
		client_secret: params.clientSecret,
		refresh_token: params.refreshToken,
		grant_type: "refresh_token",
	};

	const res = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`GitHub token refresh failed with status ${res.status}: ${text}`);
	}

	const data = (await res.json()) as GitHubTokenResponse & { error?: string; error_description?: string };

	if (data.error) {
		throw new Error(`GitHub API OAuth refresh error: ${data.error_description || data.error}`);
	}

	return {
		access_token: data.access_token,
		expires_in: data.expires_in,
		refresh_token: data.refresh_token,
		refresh_token_expires_in: data.refresh_token_expires_in,
		scope: data.scope,
		token_type: data.token_type,
	};
}

/**
 * Revokes (deauthorises) a token for the App. This can be used on logout
 * to ensure tokens are securely invalidated immediately on the authorization plane.
 *
 * @param params - Token revocation parameters containing token, clientId, and clientSecret.
 */
export async function revokeToken(params: RevokeTokenParams): Promise<void> {
	// Format credentials for Basic Authentication
	const credentials = btoa(`${params.clientId}:${params.clientSecret}`);

	const res = await fetch(`https://api.github.com/applications/${params.clientId}/grant`, {
		method: "DELETE",
		headers: {
			Authorization: `Basic ${credentials}`,
			Accept: "application/vnd.github+json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			access_token: params.token,
		}),
	});

	if (!res.ok && res.status !== 404) {
		const text = await res.text();
		throw new Error(`GitHub token revocation failed with status ${res.status}: ${text}`);
	}
}
