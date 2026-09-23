const TOKEN_KEY = "workbench-github-token";
const AUTH_TRANSACTION_KEY = "workbench-github-auth-transaction";
const AUTH_RESULT_KEY = "workbench-github-auth-result";
const AUTH_TTL_MS = 10 * 60 * 1000;

export type GithubAuthPhase = "signed-out" | "pending" | "success" | "expired" | "denied" | "error";

export type GithubAuthResult = {
  phase: GithubAuthPhase;
  message?: string;
};

type GithubCredential = {
  token: string;
  expiresAt?: number;
};

type GithubAuthTransaction = {
  state: string;
  verifier: string;
  redirectUri: string;
  createdAt: number;
};

type GithubAuthConfiguration = {
  clientId: string;
  brokerUrl: string;
  configured: boolean;
};

type GithubTokenResponse = {
  access_token?: string;
  token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

function storage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

function setAuthResult(result: GithubAuthResult) {
  storage()?.setItem(AUTH_RESULT_KEY, JSON.stringify(result));
  window.dispatchEvent(new CustomEvent("workbench-github-auth", { detail: result }));
}

function readCredential(): GithubCredential | null {
  const raw = storage()?.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GithubCredential>;
    if (typeof parsed.token === "string" && parsed.token) {
      return { token: parsed.token, expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : undefined };
    }
  } catch {
    return { token: raw };
  }
  return null;
}

export function getGithubToken() {
  const credential = readCredential();
  if (!credential) return null;
  if (credential.expiresAt && credential.expiresAt <= Date.now()) {
    storage()?.removeItem(TOKEN_KEY);
    setAuthResult({ phase: "expired", message: "Your GitHub session expired. Sign in again to continue private or remote-write workflows." });
    return null;
  }
  return credential.token;
}

export function setGithubToken(token: string, expiresAt?: number) {
  const value = token.trim();
  if (!value) throw new Error("GitHub credential cannot be empty.");
  const existing = readCredential();
  storage()?.setItem(TOKEN_KEY, JSON.stringify({
    token: value,
    expiresAt: expiresAt ?? (existing?.token === value ? existing.expiresAt : undefined),
  } satisfies GithubCredential));
}

export function clearGithubToken() {
  storage()?.removeItem(TOKEN_KEY);
  storage()?.removeItem(AUTH_TRANSACTION_KEY);
  setAuthResult({ phase: "signed-out" });
}

export function getGithubAuthResult(): GithubAuthResult {
  const raw = storage()?.getItem(AUTH_RESULT_KEY);
  if (!raw) return { phase: "signed-out" };
  try {
    const parsed = JSON.parse(raw) as Partial<GithubAuthResult>;
    if (["signed-out", "pending", "success", "expired", "denied", "error"].includes(parsed.phase ?? "")) {
      return { phase: parsed.phase as GithubAuthPhase, message: typeof parsed.message === "string" ? parsed.message : undefined };
    }
  } catch {
  }
  return { phase: "signed-out" };
}

export function getGithubAuthConfiguration(): GithubAuthConfiguration {
  const clientId = import.meta.env.PUBLIC_GITHUB_OAUTH_CLIENT_ID?.trim() ?? "";
  const brokerUrl = import.meta.env.PUBLIC_GITHUB_AUTH_BROKER_URL?.trim() ?? "";
  return { clientId, brokerUrl, configured: Boolean(clientId && brokerUrl) };
}

function randomUrlSafe(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function challengeFor(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function callbackUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  url.hash = "";
  return url.toString();
}

function readTransaction(): GithubAuthTransaction | null {
  const raw = storage()?.getItem(AUTH_TRANSACTION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GithubAuthTransaction>;
    if (
      typeof parsed.state === "string" &&
      typeof parsed.verifier === "string" &&
      typeof parsed.redirectUri === "string" &&
      typeof parsed.createdAt === "number"
    ) return parsed as GithubAuthTransaction;
  } catch {
  }
  return null;
}

function stripCallbackParameters() {
  const url = new URL(window.location.href);
  for (const key of ["code", "state", "error", "error_description"]) url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function hasGithubAuthCallback() {
  const url = new URL(window.location.href);
  return url.searchParams.has("code") || url.searchParams.has("error");
}

export async function beginGithubSignIn() {
  const config = getGithubAuthConfiguration();
  if (!config.configured) throw new Error("GitHub sign-in is not configured for this deployment.");

  const state = randomUrlSafe();
  const verifier = randomUrlSafe(48);
  const redirectUri = callbackUrl();
  const challenge = await challengeFor(verifier);
  const transaction: GithubAuthTransaction = { state, verifier, redirectUri, createdAt: Date.now() };
  storage()?.setItem(AUTH_TRANSACTION_KEY, JSON.stringify(transaction));
  setAuthResult({ phase: "pending", message: "Waiting for GitHub authorization." });

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", config.clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  window.location.assign(authorize.toString());
}

export async function completeGithubSignIn(): Promise<string | null> {
  if (!hasGithubAuthCallback()) return null;

  const url = new URL(window.location.href);
  const transaction = readTransaction();
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description") || undefined;

  if (error) {
    storage()?.removeItem(AUTH_TRANSACTION_KEY);
    stripCallbackParameters();
    const denied = error === "access_denied";
    setAuthResult({
      phase: denied ? "denied" : "error",
      message: errorDescription || (denied ? "GitHub authorization was denied." : `GitHub authorization failed: ${error}`),
    });
    return null;
  }

  if (!transaction || Date.now() - transaction.createdAt > AUTH_TTL_MS) {
    storage()?.removeItem(AUTH_TRANSACTION_KEY);
    stripCallbackParameters();
    setAuthResult({ phase: "expired", message: "The GitHub authorization request expired. Start sign-in again." });
    return null;
  }

  const returnedState = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!code || returnedState !== transaction.state) {
    storage()?.removeItem(AUTH_TRANSACTION_KEY);
    stripCallbackParameters();
    setAuthResult({ phase: "error", message: "GitHub authorization state could not be verified." });
    return null;
  }

  const config = getGithubAuthConfiguration();
  if (!config.configured) {
    stripCallbackParameters();
    setAuthResult({ phase: "error", message: "The GitHub auth broker is not configured for this deployment." });
    return null;
  }

  setAuthResult({ phase: "pending", message: "Authorization received. Verifying your GitHub account…" });
  try {
    const response = await fetch(config.brokerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "omit",
      body: JSON.stringify({ provider: "github", code, codeVerifier: transaction.verifier, redirectUri: transaction.redirectUri }),
    });
    const payload = await response.json().catch(() => ({})) as GithubTokenResponse;
    if (!response.ok) throw new Error(payload.error_description || payload.error || `GitHub token exchange failed (${response.status}).`);
    const token = (payload.access_token || payload.token || "").trim();
    if (!token) throw new Error("The auth broker did not return a GitHub access token.");
    const expiresAt = typeof payload.expires_in === "number" && payload.expires_in > 0
      ? Date.now() + payload.expires_in * 1000
      : undefined;
    setGithubToken(token, expiresAt);
    storage()?.removeItem(AUTH_TRANSACTION_KEY);
    stripCallbackParameters();
    return token;
  } catch (reason) {
    storage()?.removeItem(AUTH_TRANSACTION_KEY);
    stripCallbackParameters();
    setAuthResult({ phase: "error", message: reason instanceof Error ? reason.message : String(reason) });
    return null;
  }
}

export function markGithubSignInSuccess() {
  setAuthResult({ phase: "success", message: "GitHub authorization completed successfully." });
}

export function markGithubSignInError(reason: unknown) {
  setAuthResult({ phase: "error", message: reason instanceof Error ? reason.message : String(reason) });
}
