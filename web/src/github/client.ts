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

export type GithubGitRef = {
  ref: string;
  object: { sha: string; type: string; url: string };
};

export type GithubCreatedBlob = { sha: string };
export type GithubCreatedTree = { sha: string; tree: GithubTreeEntry[] };
export type GithubCreatedCommit = { sha: string; tree: { sha: string } };

export type GithubTreeMutation = {
  path: string;
  mode: string;
  type: "blob";
  sha: string | null;
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

export async function getGithubBlob(fullName: string, sha: string, token: string | null) {
  const bytes = await getGithubBlobBytes(fullName, sha, token);
  return new TextDecoder().decode(bytes);
}


function encodedRefPath(branch: string) {
  return branch.split("/").map(encodeURIComponent).join("/");
}

function requireToken(token: string | null) {
  if (!token) throw new Error("A GitHub token is required for remote writes.");
  return token;
}

export function getGithubBranchRef(fullName: string, branch: string, token: string | null) {
  return githubFetch<GithubGitRef>(
    `/repos/${fullName}/git/ref/heads/${encodedRefPath(branch)}`,
    token,
  );
}

export function createGithubBlob(fullName: string, content: string, token: string | null) {
  return githubFetch<GithubCreatedBlob>(
    `/repos/${fullName}/git/blobs`,
    requireToken(token),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, encoding: "utf-8" }),
    },
  );
}

export function createGithubTree(
  fullName: string,
  baseTree: string,
  tree: GithubTreeMutation[],
  token: string | null,
) {
  return githubFetch<GithubCreatedTree>(
    `/repos/${fullName}/git/trees`,
    requireToken(token),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_tree: baseTree, tree }),
    },
  );
}

export function createGithubCommit(
  fullName: string,
  message: string,
  tree: string,
  parents: string[],
  token: string | null,
) {
  return githubFetch<GithubCreatedCommit>(
    `/repos/${fullName}/git/commits`,
    requireToken(token),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, tree, parents }),
    },
  );
}

export function updateGithubBranchRef(
  fullName: string,
  branch: string,
  sha: string,
  token: string | null,
) {
  return githubFetch<GithubGitRef>(
    `/repos/${fullName}/git/refs/heads/${encodedRefPath(branch)}`,
    requireToken(token),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha, force: false }),
    },
  );
}

export function createGithubBranchRef(
  fullName: string,
  branch: string,
  sha: string,
  token: string | null,
) {
  return githubFetch<GithubGitRef>(
    `/repos/${fullName}/git/refs`,
    requireToken(token),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
    },
  );
}

export async function getGithubBlobBytes(fullName: string, sha: string, token: string | null) {
  const payload = await githubFetch<{ content: string; encoding: string }>(
    `/repos/${fullName}/git/blobs/${sha}`,
    token,
  );
  if (payload.encoding !== "base64") throw new Error(`Unsupported GitHub blob encoding: ${payload.encoding}`);
  const binary = atob(payload.content.replace(/\n/g, ""));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
