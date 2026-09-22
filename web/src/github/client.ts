import { GITHUB_API_VERSION } from "./config";

export type GithubUser = {
  login: string;
  avatar_url: string;
  html_url: string;
};

export type GithubActor = {
  login: string;
  avatar_url?: string;
  html_url?: string;
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
  html_url?: string;
  commit: {
    message?: string;
    author?: { name?: string; email?: string; date?: string };
    committer?: { name?: string; email?: string; date?: string };
    tree: { sha: string };
  };
  parents: Array<{ sha: string }>;
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
};

export type GithubIssue = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  state_reason?: string | null;
  html_url: string;
  user: GithubActor | null;
  labels: Array<{ name?: string; color?: string } | string>;
  comments: number;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
};

export type GithubIssueComment = {
  id: number;
  body: string | null;
  html_url: string;
  user: GithubActor | null;
  created_at: string;
  updated_at: string;
};

export type GithubPullRequest = {
  id?: number;
  number: number;
  title?: string;
  body?: string | null;
  state?: "open" | "closed";
  draft?: boolean;
  merged?: boolean;
  mergeable?: boolean | null;
  html_url?: string;
  user?: GithubActor | null;
  labels?: Array<{ name?: string; color?: string }>;
  created_at?: string;
  updated_at?: string;
  base: { sha: string; ref: string; repo?: { full_name: string } };
  head: { sha: string; ref: string; repo?: { full_name: string } };
};

export type GithubWorkflow = {
  id: number;
  name: string;
  path: string;
  state: string;
  html_url: string;
};

export type GithubWorkflowRun = {
  id: number;
  name?: string;
  display_title?: string;
  run_number: number;
  event: string;
  status: string | null;
  conclusion: string | null;
  head_branch: string | null;
  head_sha: string;
  html_url: string;
  created_at: string;
  updated_at: string;
};

export type GithubWorkflowJob = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at?: string;
  completed_at?: string;
  html_url?: string;
};

export type GithubCheckRun = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type GithubPullRequestFile = {
  sha: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  blob_url: string;
};

export type GithubArtifact = {
  id: number;
  name: string;
  size_in_bytes: number;
  expired: boolean;
  archive_download_url: string;
  expires_at: string | null;
};

export type GithubReleaseAsset = {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  content_type: string;
};

export type GithubRelease = {
  id: number;
  tag_name: string;
  target_commitish: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  html_url: string;
  created_at: string;
  published_at: string | null;
  assets: GithubReleaseAsset[];
};

export type GithubProject = {
  id: string;
  number: number;
  title: string;
  shortDescription: string | null;
  closed: boolean;
  url: string;
};

export type GithubProjectItem = {
  id: string;
  type: string;
  title: string;
  url?: string;
  number?: number;
};

export type GithubSearchItem = {
  name: string;
  path: string;
  sha: string;
  html_url: string;
  repository: { full_name: string };
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
  const text = await response.text();
  if (!response.ok) {
    let message = "";
    try {
      message = (JSON.parse(text) as { message?: string }).message || "";
    } catch {
      message = text;
    }
    throw new Error(message || `GitHub request failed (${response.status})`);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

async function githubGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string | null,
): Promise<T> {
  if (!token) throw new Error("A GitHub token is required for Projects.");
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json() as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };
  if (!response.ok || payload.errors?.length || !payload.data) {
    throw new Error(payload.errors?.map((error) => error.message).filter(Boolean).join("; ") || "GitHub GraphQL request failed.");
  }
  return payload.data;
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

export function getGithubPullRequest(fullName: string, number: number, token: string | null) {
  return githubFetch<GithubPullRequest>(
    `/repos/${fullName}/pulls/${number}`,
    token,
  );
}

async function getGithubTreeNode(fullName: string, sha: string, token: string | null) {
  return githubFetch<GithubTree>(
    `/repos/${fullName}/git/trees/${encodeURIComponent(sha)}`,
    token,
  );
}

async function walkGithubTree(
  fullName: string,
  sha: string,
  token: string | null,
  prefix = "",
): Promise<GithubTreeEntry[]> {
  const node = await getGithubTreeNode(fullName, sha, token);
  const entries: GithubTreeEntry[] = [];
  for (const entry of node.tree) {
    const path = prefix ? `${prefix}/${entry.path}` : entry.path;
    entries.push({ ...entry, path });
    if (entry.type === "tree") {
      entries.push(...await walkGithubTree(fullName, entry.sha, token, path));
    }
  }
  return entries;
}

export async function getGithubTree(fullName: string, ref: string, token: string | null) {
  const recursive = await githubFetch<GithubTree>(
    `/repos/${fullName}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    token,
  );
  if (!recursive.truncated) return recursive;
  return {
    sha: recursive.sha,
    truncated: false,
    tree: await walkGithubTree(fullName, recursive.sha, token),
  } satisfies GithubTree;
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


function requireWriteToken(token: string | null) {
  if (!token) throw new Error("Connect a GitHub token before using this write action.");
  return token;
}

export async function listGithubIssues(fullName: string, token: string | null, state: "open" | "closed" | "all" = "open") {
  const issues = await githubFetch<GithubIssue[]>(
    `/repos/${fullName}/issues?state=${state}&per_page=100&sort=updated&direction=desc`,
    token,
  );
  return issues.filter((issue) => !issue.pull_request);
}

export function getGithubIssue(fullName: string, number: number, token: string | null) {
  return githubFetch<GithubIssue>(`/repos/${fullName}/issues/${number}`, token);
}

export function listGithubIssueComments(fullName: string, number: number, token: string | null) {
  return githubFetch<GithubIssueComment[]>(
    `/repos/${fullName}/issues/${number}/comments?per_page=100`,
    token,
  );
}

export function createGithubIssue(
  fullName: string,
  title: string,
  body: string,
  token: string | null,
) {
  return githubFetch<GithubIssue>(
    `/repos/${fullName}/issues`,
    requireWriteToken(token),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    },
  );
}

export function updateGithubIssue(
  fullName: string,
  number: number,
  patch: { title?: string; body?: string; state?: "open" | "closed" },
  token: string | null,
) {
  return githubFetch<GithubIssue>(
    `/repos/${fullName}/issues/${number}`,
    requireWriteToken(token),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
}

export function createGithubIssueComment(
  fullName: string,
  number: number,
  body: string,
  token: string | null,
) {
  return githubFetch<GithubIssueComment>(
    `/repos/${fullName}/issues/${number}/comments`,
    requireWriteToken(token),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    },
  );
}

export function listGithubPullRequests(fullName: string, token: string | null, state: "open" | "closed" | "all" = "open") {
  return githubFetch<GithubPullRequest[]>(
    `/repos/${fullName}/pulls?state=${state}&per_page=100&sort=updated&direction=desc`,
    token,
  );
}

export function createGithubPullRequest(
  fullName: string,
  input: { title: string; body: string; head: string; base: string; draft?: boolean },
  token: string | null,
) {
  return githubFetch<GithubPullRequest>(
    `/repos/${fullName}/pulls`,
    requireWriteToken(token),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export function updateGithubPullRequest(
  fullName: string,
  number: number,
  patch: { title?: string; body?: string; state?: "open" | "closed"; base?: string },
  token: string | null,
) {
  return githubFetch<GithubPullRequest>(
    `/repos/${fullName}/pulls/${number}`,
    requireWriteToken(token),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
}

export function listGithubPullRequestCommits(
  fullName: string,
  number: number,
  token: string | null,
) {
  return githubFetch<GithubCommit[]>(
    `/repos/${fullName}/pulls/${number}/commits?per_page=100`,
    token,
  );
}

export function listGithubPullRequestFiles(
  fullName: string,
  number: number,
  token: string | null,
) {
  return githubFetch<GithubPullRequestFile[]>(
    `/repos/${fullName}/pulls/${number}/files?per_page=100`,
    token,
  );
}

export async function listGithubCheckRuns(
  fullName: string,
  ref: string,
  token: string | null,
) {
  const result = await githubFetch<{ total_count: number; check_runs: GithubCheckRun[] }>(
    `/repos/${fullName}/commits/${encodeURIComponent(ref)}/check-runs?per_page=100`,
    token,
  );
  return result.check_runs;
}

export function createGithubPullRequestReview(
  fullName: string,
  number: number,
  event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
  body: string,
  token: string | null,
) {
  return githubFetch<{ id: number; state: string; body: string | null }>(
    `/repos/${fullName}/pulls/${number}/reviews`,
    requireWriteToken(token),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, body }),
    },
  );
}

export function mergeGithubPullRequest(
  fullName: string,
  number: number,
  token: string | null,
) {
  return githubFetch<{ sha: string; merged: boolean; message: string }>(
    `/repos/${fullName}/pulls/${number}/merge`,
    requireWriteToken(token),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
}

export function listGithubWorkflows(fullName: string, token: string | null) {
  return githubFetch<{ total_count: number; workflows: GithubWorkflow[] }>(
    `/repos/${fullName}/actions/workflows?per_page=100`,
    token,
  );
}

export function listGithubWorkflowRuns(fullName: string, token: string | null) {
  return githubFetch<{ total_count: number; workflow_runs: GithubWorkflowRun[] }>(
    `/repos/${fullName}/actions/runs?per_page=100`,
    token,
  );
}

export function getGithubWorkflowRun(fullName: string, id: number, token: string | null) {
  return githubFetch<GithubWorkflowRun>(`/repos/${fullName}/actions/runs/${id}`, token);
}

export function listGithubWorkflowJobs(fullName: string, id: number, token: string | null) {
  return githubFetch<{ total_count: number; jobs: GithubWorkflowJob[] }>(
    `/repos/${fullName}/actions/runs/${id}/jobs?per_page=100`,
    token,
  );
}

export function listGithubWorkflowArtifacts(fullName: string, id: number, token: string | null) {
  return githubFetch<{ total_count: number; artifacts: GithubArtifact[] }>(
    `/repos/${fullName}/actions/runs/${id}/artifacts?per_page=100`,
    token,
  );
}

export function dispatchGithubWorkflow(
  fullName: string,
  workflowId: number,
  ref: string,
  token: string | null,
) {
  return githubFetch<{ workflow_run_id?: number; html_url?: string } | undefined>(
    `/repos/${fullName}/actions/workflows/${workflowId}/dispatches`,
    requireWriteToken(token),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref }),
    },
  );
}

export function rerunGithubWorkflowRun(fullName: string, id: number, token: string | null) {
  return githubFetch<undefined>(
    `/repos/${fullName}/actions/runs/${id}/rerun`,
    requireWriteToken(token),
    { method: "POST" },
  );
}

export function cancelGithubWorkflowRun(fullName: string, id: number, token: string | null) {
  return githubFetch<undefined>(
    `/repos/${fullName}/actions/runs/${id}/cancel`,
    requireWriteToken(token),
    { method: "POST" },
  );
}

async function githubDownload(
  path: string,
  token: string | null,
): Promise<Uint8Array> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    redirect: "follow",
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `GitHub download failed (${response.status})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export function downloadGithubJobLogs(
  fullName: string,
  jobId: number,
  token: string | null,
) {
  return githubDownload(`/repos/${fullName}/actions/jobs/${jobId}/logs`, token);
}

export function downloadGithubArtifact(
  fullName: string,
  artifactId: number,
  token: string | null,
) {
  return githubDownload(
    `/repos/${fullName}/actions/artifacts/${artifactId}/zip`,
    token,
  );
}

export function listGithubReleases(fullName: string, token: string | null) {
  return githubFetch<GithubRelease[]>(`/repos/${fullName}/releases?per_page=100`, token);
}

export function getGithubRelease(fullName: string, id: number, token: string | null) {
  return githubFetch<GithubRelease>(`/repos/${fullName}/releases/${id}`, token);
}

export function createGithubRelease(
  fullName: string,
  input: { tag_name: string; target_commitish?: string; name?: string; body?: string; draft?: boolean; prerelease?: boolean },
  token: string | null,
) {
  return githubFetch<GithubRelease>(
    `/repos/${fullName}/releases`,
    requireWriteToken(token),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export function updateGithubRelease(
  fullName: string,
  id: number,
  patch: { tag_name?: string; target_commitish?: string; name?: string; body?: string; draft?: boolean; prerelease?: boolean },
  token: string | null,
) {
  return githubFetch<GithubRelease>(
    `/repos/${fullName}/releases/${id}`,
    requireWriteToken(token),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
}

export function listGithubCommits(fullName: string, token: string | null, ref?: string) {
  const query = ref ? `?sha=${encodeURIComponent(ref)}&per_page=100` : "?per_page=100";
  return githubFetch<GithubCommit[]>(`/repos/${fullName}/commits${query}`, token);
}

export async function listGithubProjects(fullName: string, token: string | null) {
  const [owner, name] = fullName.split("/");
  const data = await githubGraphql<{
    repository: { projectsV2: { nodes: GithubProject[] } } | null;
  }>(
    `query RepositoryProjects($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        projectsV2(first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes { id number title shortDescription closed url }
        }
      }
    }`,
    { owner, name },
    token,
  );
  return data.repository?.projectsV2.nodes ?? [];
}

export async function updateGithubProject(
  projectId: string,
  patch: {
    title?: string;
    shortDescription?: string;
    closed?: boolean;
    public?: boolean;
    readme?: string;
  },
  token: string | null,
) {
  const data = await githubGraphql<{
    updateProjectV2: { projectV2: GithubProject | null } | null;
  }>(
    `mutation UpdateProject($input: UpdateProjectV2Input!) {
      updateProjectV2(input: $input) {
        projectV2 { id number title shortDescription closed url }
      }
    }`,
    { input: { projectId, ...patch } },
    token,
  );
  const project = data.updateProjectV2?.projectV2;
  if (!project) throw new Error("GitHub did not return the updated project.");
  return project;
}

export async function getGithubProject(fullName: string, number: number, token: string | null) {
  const [owner, name] = fullName.split("/");
  const data = await githubGraphql<{
    repository: {
      projectV2: {
        id: string;
        number: number;
        title: string;
        shortDescription: string | null;
        closed: boolean;
        url: string;
        items: {
          nodes: Array<{
            id: string;
            type: string;
            content:
              | { __typename: "Issue"; number: number; title: string; url: string }
              | { __typename: "PullRequest"; number: number; title: string; url: string }
              | { __typename: "DraftIssue"; title: string; body: string | null }
              | null;
          }>;
        };
      } | null;
    } | null;
  }>(
    `query RepositoryProject($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        projectV2(number: $number) {
          id number title shortDescription closed url
          items(first: 100) {
            nodes {
              id type
              content {
                __typename
                ... on Issue { number title url }
                ... on PullRequest { number title url }
                ... on DraftIssue { title body }
              }
            }
          }
        }
      }
    }`,
    { owner, name, number },
    token,
  );
  const project = data.repository?.projectV2;
  if (!project) throw new Error(`Project #${number} was not found.`);
  return {
    ...project,
    items: project.items.nodes.map((item): GithubProjectItem => ({
      id: item.id,
      type: item.type,
      title: item.content?.title || "Untitled item",
      url: item.content && "url" in item.content ? item.content.url : undefined,
      number: item.content && "number" in item.content ? item.content.number : undefined,
    })),
  };
}

export async function searchGithubCode(
  fullName: string | null,
  query: string,
  token: string | null,
) {
  const scoped = fullName ? `${query} repo:${fullName}` : query;
  const q = encodeURIComponent(scoped);
  const result = await githubFetch<{ total_count: number; items: GithubSearchItem[] }>(
    `/search/code?q=${q}&per_page=100`,
    token,
  );
  return result.items;
}
