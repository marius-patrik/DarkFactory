/** @packageDocumentation
 * Browser-safe human GitHub authentication and session boundary for DarkFactory Web.
 *
 * Machine credentials and GitHub App private-key operations belong to keychain custody and are never exposed here.
 */

export interface AuthSession {
  /** The authenticated GitHub user login. */
  login: string;
  /** The GitHub user access token (short-lived or proxy handle). */
  accessToken: string;
  /** The expiry time for the access token. */
  expiresAt: Date;
}

export { generateCodeVerifier, generateCodeChallenge, generateState } from "./pkce.ts";

/** Configuration for the authentication flow. */
export interface AuthConfig {
  /** The OAuth client ID of the GitHub App. */
  clientId: string;
  /** The base URL of the authentication broker. */
  brokerUrl: string;
  /** The redirect URI after successful authentication. */
  redirectUri: string;
}

/** Handles human authentication and session management. */
export class AuthClient {
  constructor(private config: AuthConfig) {}

  /** Initiates the GitHub App user authorization flow. */
  async initiateLogin(): Promise<{ url: string; state: string; codeVerifier: string }> {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("scope", "user:email read:org repo");

    return { url: url.toString(), state, codeVerifier };
  }

  /** Completes the authentication flow after callback by exchanging code with the broker. */
  async completeLogin(code: string, state: string, expectedState: string, codeVerifier: string): Promise<AuthSession> {
    if (state !== expectedState) {
      throw new Error("State mismatch: possible CSRF attack");
    }

    const response = await fetch(`${this.config.brokerUrl}/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      login: string;
      access_token: string;
      expires_in?: number;
    };

    const expiresAt = new Date(Date.now() + (data.expires_in ?? 28800) * 1000);

    return {
      login: data.login,
      accessToken: data.access_token,
      expiresAt,
    };
  }

  /** Refreshes an existing user session token via the broker. */
  async refreshSession(accessToken: string): Promise<AuthSession> {
    const response = await fetch(`${this.config.brokerUrl}/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      login: string;
      access_token: string;
      expires_in?: number;
    };

    const expiresAt = new Date(Date.now() + (data.expires_in ?? 28800) * 1000);

    return {
      login: data.login,
      accessToken: data.access_token,
      expiresAt,
    };
  }

  /** Logs out and revokes the session via the broker. */
  async logout(accessToken: string): Promise<void> {
    await fetch(`${this.config.brokerUrl}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }).catch(() => {
      // Ignore network errors on logout revocation
    });
  }

  /**
   * Checks repository visibility and action availability based on GitHub user and installation permissions.
   */
  async checkPermissions(accessToken: string, owner: string, repo: string): Promise<{ canWrite: boolean; isAdmin: boolean }> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      return { canWrite: false, isAdmin: false };
    }

    const data = (await response.json()) as {
      permissions?: {
        admin?: boolean;
        push?: boolean;
        pull?: boolean;
      };
    };

    return {
      canWrite: !!data.permissions?.push || !!data.permissions?.admin,
      isAdmin: !!data.permissions?.admin,
    };
  }


}
