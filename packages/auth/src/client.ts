/** @packageDocumentation
 * Browser-safe GitHub App user authorization and opaque session persistence.
 *
 * Access tokens, refresh tokens, client secrets and App private keys never cross this module.
 */

import { type BrowserSession, parseBrowserSession } from "./types.ts";

const VERIFIER_KEY = "df-auth-verifier";
const STATE_KEY = "df-auth-state";
const SESSION_KEY = "df-auth-session";

/** Validated one-time PKCE callback material sent to the confidential broker. */
export interface AuthCallbackCompletion {
	code: string;
	codeVerifier: string;
}

function base64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
}

function randomVerifier(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return base64Url(bytes);
}

async function codeChallenge(verifier: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
	return base64Url(new Uint8Array(digest));
}

function callbackParams(input: string | URLSearchParams): URLSearchParams {
	if (input instanceof URLSearchParams) return input;
	if (input.includes("?")) return new URL(input, "https://darkfactory.invalid").searchParams;
	return new URLSearchParams(input);
}

/** Initiates GitHub App user authorization using PKCE and a one-time CSRF state value. */
export async function initiateAuth(clientId: string, redirectUri: string, scope: string): Promise<string> {
	const verifier = randomVerifier();
	const state = crypto.randomUUID();
	sessionStorage.setItem(VERIFIER_KEY, verifier);
	sessionStorage.setItem(STATE_KEY, state);

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		scope,
		state,
		response_type: "code",
		code_challenge: await codeChallenge(verifier),
		code_challenge_method: "S256",
	});
	return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Validates and consumes one OAuth callback.
 *
 * State and verifier are removed before validation completes, so a mismatch or replay cannot reuse them.
 */
export function completeAuthCallback(input: string | URLSearchParams): AuthCallbackCompletion {
	const params = callbackParams(input);
	const expectedState = sessionStorage.getItem(STATE_KEY);
	const verifier = sessionStorage.getItem(VERIFIER_KEY);
	sessionStorage.removeItem(STATE_KEY);
	sessionStorage.removeItem(VERIFIER_KEY);

	const state = params.get("state");
	const code = params.get("code");
	if (!expectedState || !verifier) throw new Error("No pending authentication flow");
	if (!state || state !== expectedState) throw new Error("Authentication state mismatch");
	if (!code) throw new Error("Authentication callback is missing code");
	return { code, codeVerifier: verifier };
}

/** Persists only the opaque browser session descriptor returned by the broker. */
export function persistSession(session: BrowserSession): void {
	localStorage.setItem(SESSION_KEY, JSON.stringify(parseBrowserSession(session)));
}

/** Restores an unexpired opaque browser session, clearing malformed or expired persistence. */
export function restoreSession(now = Date.now()): BrowserSession | null {
	const raw = localStorage.getItem(SESSION_KEY);
	if (!raw) return null;
	try {
		const session = parseBrowserSession(JSON.parse(raw) as unknown);
		if (session.expiresAt <= now) {
			localStorage.removeItem(SESSION_KEY);
			return null;
		}
		return session;
	} catch {
		localStorage.removeItem(SESSION_KEY);
		return null;
	}
}

/** Clears the browser-side opaque session descriptor. Broker revocation is a separate server-side action. */
export function clearSession(): void {
	localStorage.removeItem(SESSION_KEY);
}

/**
 * Restores the opaque browser session and refreshes it through the confidential broker when expired.
 *
 * The refresh callback is expected to call the server-side auth broker using only the opaque session id.
 * Any refresh failure clears browser persistence and fails closed.
 */
export async function restoreSessionWithRefresh(
	refresh: (sessionId: string) => Promise<BrowserSession>,
	now = Date.now(),
): Promise<BrowserSession | null> {
	const raw = localStorage.getItem(SESSION_KEY);
	if (!raw) return null;
	let session: BrowserSession;
	try {
		session = parseBrowserSession(JSON.parse(raw) as unknown);
	} catch {
		localStorage.removeItem(SESSION_KEY);
		return null;
	}
	if (session.expiresAt > now) return session;
	try {
		const refreshed = parseBrowserSession(await refresh(session.id));
		if (refreshed.expiresAt <= now) throw new Error("Refreshed session is already expired");
		persistSession(refreshed);
		return refreshed;
	} catch {
		localStorage.removeItem(SESSION_KEY);
		return null;
	}
}
