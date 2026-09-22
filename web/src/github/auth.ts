import { GITHUB_CLIENT_ID, githubAuthConfigured, githubRedirectUri } from "./config";

const TOKEN_KEY = "workbench-github-token";
const STATE_KEY = "workbench-github-oauth-state";
const VERIFIER_KEY = "workbench-github-oauth-verifier";

function randomBase64Url(bytes = 32) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  for (const value of values) binary += String.fromCharCode(value);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Base64Url(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function getGithubToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearGithubToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function beginGithubSignIn() {
  if (!githubAuthConfigured()) {
    throw new Error("GitHub authentication is not configured for this deployment.");
  }
  const state = randomBase64Url(24);
  const verifier = randomBase64Url(64);
  const challenge = await sha256Base64Url(verifier);
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", githubRedirectUri());
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  window.location.assign(url);
}

function cleanCallbackUrl() {
  const url = new URL(window.location.href);
  for (const key of ["code", "state", "error", "error_description", "error_uri"]) {
    url.searchParams.delete(key);
  }
  window.history.replaceState(null, "", url);
}

export async function completeGithubSignIn() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error) {
    const description = url.searchParams.get("error_description") || error;
    cleanCallbackUrl();
    throw new Error(description);
  }
  if (!code) return getGithubToken();

  const state = url.searchParams.get("state");
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!state || !expectedState || state !== expectedState || !verifier) {
    cleanCallbackUrl();
    throw new Error("GitHub sign-in callback state was invalid or expired.");
  }
  if (!githubAuthConfigured()) {
    cleanCallbackUrl();
    throw new Error("GitHub authentication is not configured for this deployment.");
  }

  const body = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    code,
    redirect_uri: githubRedirectUri(),
    code_verifier: verifier,
  });
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  cleanCallbackUrl();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "GitHub sign-in failed.");
  }
  sessionStorage.setItem(TOKEN_KEY, payload.access_token);
  return payload.access_token;
}
