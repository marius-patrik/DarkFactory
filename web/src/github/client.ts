import { GITHUB_API_VERSION } from "./config";

export type GithubUser = {
  login: string;
  avatar_url: string;
  html_url: string;
};

export type GithubRepository = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  owner: { login: string };
  permissions?: { admin?: boolean; maintain?: boolean; push?: boolean; triage?: boolean; pull?: boolean };
};

export type GithubTreeEntry = {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
  url?: string;
};

export type GithubTree = {
  sha: string;
  truncated: boolean;
  tree: GithubTreeEntry[];
};

export type GithubCommit = {
  sha: string;
  commit: {
    tree: { sha: string };
  };
};

export type GithubRef = {
  name: string;
  sha: string;
  kind: "branch" | "tag";
};

async function githubFetch<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const response = await fetch(path.startsWith("http") ? path : `https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message || `GitHub request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function getGithubUser(token: string) {
  return githubFetch<GithubUser>("/user", token);
}

export function listGithubRepositories(token: string) {
  return githubFetch<GithubRepository[]>(
    "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
    token,
  );
}

export function getGithubRepository(fullName: string, token: string | null) {
  return githubFetch<GithubRepository>(`/repos/${fullName}`, token);
}

export function getGithubCommit(fullName: string, ref: string, token: string | null) {
  return githubFetch<GithubCommit>(
    `/repos/${fullName}/commits/${encodeURIComponent(ref)}`,
    token,
  );
}

export function getGithubTree(fullName: string, ref: string, token: string | null) {
  return githubFetch<GithubTree>(
    `/repos/${fullName}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    token,
  );
}

export async function listGithubRefs(fullName: string, token: string | null) {
  const [branches, tags] = await Promise.all([
    githubFetch<Array<{ name: string; commit: { sha: string } }>>(
      `/repos/${fullName}/branches?per_page=100`,
      token,
    ),
    githubFetch<Array<{ name: string; commit: { sha: string } }>>(
      `/repos/${fullName}/tags?per_page=100`,
      token,
    ),
  ]);
  return [
    ...branches.map((branch): GithubRef => ({ name: branch.name, sha: branch.commit.sha, kind: "branch" })),
    ...tags.map((tag): GithubRef => ({ name: tag.name, sha: tag.commit.sha, kind: "tag" })),
  ];
}

function decodeBase64Utf8(content: string) {
  const binary = atob(content.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function getGithubBlob(fullName: string, sha: string, token: string | null) {
  const payload = await githubFetch<{ content: string; encoding: string }>(
    `/repos/${fullName}/git/blobs/${sha}`,
    token,
  );
  if (payload.encoding !== "base64") throw new Error(`Unsupported GitHub blob encoding: ${payload.encoding}`);
  return decodeBase64Utf8(payload.content);
}
