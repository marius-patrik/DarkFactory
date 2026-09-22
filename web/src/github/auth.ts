const TOKEN_KEY = "workbench-github-token";

export function getGithubToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setGithubToken(token: string) {
  const value = token.trim();
  if (!value) throw new Error("GitHub token cannot be empty.");
  sessionStorage.setItem(TOKEN_KEY, value);
}

export function clearGithubToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}
