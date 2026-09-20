/** @packageDocumentation
 * Confidential broker for OAuth token exchange, refresh, and revocation.
 *
 * This server-side/broker component owns secret-bearing interactions with GitHub
 * and enforces strict separation from the browser bundle.
 */

import { z } from "zod";
import { TokenResponse, TokenResponseSchema } from "./types.ts";

/**
 * Request schema for token exchange.
 */
export const TokenExchangeRequestSchema = z.object({
  code: z.string(),
  code_verifier: z.string(),
  redirect_uri: z.string(),
});

export type TokenExchangeRequest = z.infer<typeof TokenExchangeRequestSchema>;

/**
 * Exchanges an authorization code for an access token.
 *
 * @param clientId - GitHub App client ID.
 * @param clientSecret - GitHub App client secret.
 * @param payload - Exchange request payload containing code and verifier.
 * @returns The token response from GitHub.
 */
export async function exchangeCodeForToken(
  clientId: string,
  clientSecret: string,
  payload: TokenExchangeRequest
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: payload.code,
    code_verifier: payload.code_verifier,
    redirect_uri: payload.redirect_uri,
  });

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${response.statusText}`);
  }

  const data = await response.json();
  return TokenResponseSchema.parse(data);
}
