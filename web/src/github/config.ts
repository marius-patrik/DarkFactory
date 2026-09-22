export const GITHUB_API_VERSION = "2026-03-10";
export const GITHUB_CLIENT_ID = import.meta.env.PUBLIC_GITHUB_CLIENT_ID?.trim() || "";

export function githubAuthConfigured() {
  return Boolean(GITHUB_CLIENT_ID);
}

export function githubRedirectUri() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}
