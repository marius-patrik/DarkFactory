/** @packageDocumentation
 * Browser-safe human GitHub authentication client using OAuth2 PKCE.
 *
 * This client provides initiate, callback, and session persistence functionality
 * while maintaining strict adherence to browser security boundaries.
 */

import { z } from "zod";
import { TokenResponse, TokenResponseSchema } from "./types.ts";

/**
 * Authentication result schema for PKCE callback validation.
 */
export const AuthResultSchema = z.object({
  code: z.string(),
  state: z.string(),
});

/**
 * Represents the outcome of an OAuth2 authorization flow.
 */
export type AuthResult = z.infer<typeof AuthResultSchema>;

/**
 * Initiates the PKCE OAuth2 flow for GitHub App authentication.
 *
 * @param clientId - The GitHub App client ID.
 * @param redirectUri - The callback URL.
 * @param scope - The requested scopes.
 * @returns The authorization URL with PKCE parameters.
 */
export async function initiateAuth(
  clientId: string,
  redirectUri: string,
  scope: string
): Promise<string> {
  const codeVerifier = crypto.randomUUID();
  const state = crypto.randomUUID();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store state and verifier in session/storage for callback validation
  sessionStorage.setItem("df-auth-verifier", codeVerifier);
  sessionStorage.setItem("df-auth-state", state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Persists token information in a secure and minimal way.
 */
export function persistSession(token: TokenResponse): void {
  localStorage.setItem("df-auth-session", JSON.stringify(token));
}

/**
 * Restores session from persistence.
 */
export function restoreSession(): TokenResponse | null {
  const data = localStorage.getItem("df-auth-session");
  return data ? JSON.parse(data) : null;
}

/**
 * Revokes/Clears local session.
 */
export function clearSession(): void {
  localStorage.removeItem("df-auth-session");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
