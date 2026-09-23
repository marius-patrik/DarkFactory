import type { Page, Route } from "@playwright/test";

export const MOCK_REPOSITORY = "acme/private";
export const BASE_SHA = "1111111111111111111111111111111111111111";
const BASE_TREE = "2222222222222222222222222222222222222222";
const README_BLOB = "3333333333333333333333333333333333333333";
const APP_BLOB = "4444444444444444444444444444444444444444";

const repository = {
  id: 42,
  name: "private",
  full_name: MOCK_REPOSITORY,
  private: true,
  default_branch: "main",
  html_url: "https://github.com/acme/private",
  owner: { login: "acme" },
  permissions: { admin: true, maintain: true, push: true, triage: true, pull: true },
};

const user = {
  login: "octocat",
  avatar_url: "https://avatars.example/octocat.png",
  html_url: "https://github.com/octocat",
};

const issue = {
  id: 700,
  number: 7,
  title: "Private issue",
  body: "Issue body",
  state: "open",
  html_url: "https://github.com/acme/private/issues/7",
  user,
  labels: [{ name: "bug", color: "d73a4a" }],
  comments: 0,
  created_at: "2026-09-20T10:00:00Z",
  updated_at: "2026-09-22T10:00:00Z",
};

const pullRequest = {
  id: 300,
  number: 3,
  title: "Private pull request",
  body: "Pull request body",
  state: "open",
  draft: false,
  merged: false,
  mergeable: true,
  html_url: "https://github.com/acme/private/pull/3",
  user,
  labels: [],
  created_at: "2026-09-20T10:00:00Z",
  updated_at: "2026-09-22T10:00:00Z",
  base: { sha: BASE_SHA, ref: "main", repo: { full_name: MOCK_REPOSITORY } },
  head: { sha: "5555555555555555555555555555555555555555", ref: "feature", repo: { full_name: MOCK_REPOSITORY } },
};

const workflow = {
  id: 10,
  name: "CI",
  path: ".github/workflows/ci.yml",
  state: "active",
  html_url: "https://github.com/acme/private/actions/workflows/ci.yml",
};

const workflowRun = {
  id: 20,
  name: "CI",
  display_title: "Validate private repository",
  run_number: 12,
  event: "push",
  status: "completed",
  conclusion: "success",
  head_branch: "main",
  head_sha: BASE_SHA,
  html_url: "https://github.com/acme/private/actions/runs/20",
  created_at: "2026-09-22T10:00:00Z",
  updated_at: "2026-09-22T10:03:00Z",
};

const project = {
  id: "PVT_private_1",
  number: 1,
  title: "Private project",
  shortDescription: "Tracked in Projects v2",
  closed: false,
  url: "https://github.com/orgs/acme/projects/1",
};

const release = {
  id: 9,
  tag_name: "v1.0.0",
  target_commitish: "main",
  name: "Version 1.0.0",
  body: "Release notes",
  draft: false,
  prerelease: false,
  html_url: "https://github.com/acme/private/releases/tag/v1.0.0",
  created_at: "2026-09-21T10:00:00Z",
  published_at: "2026-09-21T10:05:00Z",
  assets: [],
};

function commit(sha: string, tree = BASE_TREE, message = "Base commit") {
  return {
    sha,
    html_url: `https://github.com/acme/private/commit/${sha}`,
    commit: {
      message,
      author: { name: "Octo Cat", email: "octocat@example.com", date: "2026-09-22T09:00:00Z" },
      committer: { name: "Octo Cat", email: "octocat@example.com", date: "2026-09-22T09:00:00Z" },
      tree: { sha: tree },
    },
    parents: [],
    files: [{ filename: "README.md", status: "modified", additions: 1, deletions: 0, changes: 1 }],
  };
}

function tree(sha: string) {
  return {
    sha,
    truncated: false,
    tree: [
      { path: "README.md", mode: "100644", type: "blob", sha: README_BLOB, size: 32 },
      { path: "src", mode: "040000", type: "tree", sha: "6666666666666666666666666666666666666666" },
      { path: "src/app.ts", mode: "100644", type: "blob", sha: APP_BLOB, size: 54 },
    ],
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: body === undefined ? "" : JSON.stringify(body),
  });
}

export type GithubMock = {
  state: {
    remoteHead: string;
    pushed: boolean;
    writes: string[];
  };
  setRemoteHead: (sha: string) => void;
};

export async function installGithubMock(page: Page): Promise<GithubMock> {
  const state = {
    remoteHead: BASE_SHA,
    pushed: false,
    writes: [] as string[],
  };
  let createdBlob = 0;
  let createdTree = 0;
  let createdCommit = 0;
  const trees = new Map<string, ReturnType<typeof tree>>();
  trees.set(BASE_TREE, tree(BASE_TREE));
  const commits = new Map<string, ReturnType<typeof commit>>();
  commits.set(BASE_SHA, commit(BASE_SHA));

  await page.route("http://127.0.0.1:4173/__auth/github", async (route) => {
    state.writes.push("auth-broker");
    await json(route, { access_token: "test-token", expires_in: 3600 });
  });

  await page.route("https://api.github.com/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/graphql" && method === "POST") {
      const body = request.postDataJSON() as { query?: string; variables?: Record<string, unknown> };
      const query = body.query || "";
      if (query.includes("RepositoryProjects")) {
        return json(route, { data: { repository: { projectsV2: { nodes: [project] } } } });
      }
      if (query.includes("RepositoryProject")) {
        return json(route, {
          data: {
            repository: {
              projectV2: {
                ...project,
                items: {
                  nodes: [
                    {
                      id: "PVTI_issue_7",
                      type: "ISSUE",
                      content: {
                        __typename: "Issue",
                        number: issue.number,
                        title: issue.title,
                        url: issue.html_url,
                      },
                    },
                  ],
                },
              },
            },
          },
        });
      }
      return json(route, { errors: [{ message: "Unhandled test GraphQL operation" }] }, 400);
    }

    if (path === "/user" && method === "GET") return json(route, user);
    if (path === "/user/repos" && method === "GET") return json(route, [repository]);

    if (path === `/repos/${MOCK_REPOSITORY}` && method === "GET") {
      return json(route, repository);
    }

    if (path === `/repos/${MOCK_REPOSITORY}/branches` && method === "GET") {
      return json(route, [
        { name: "main", commit: { sha: state.remoteHead } },
        { name: "feature", commit: { sha: pullRequest.head.sha } },
      ]);
    }
    if (path === `/repos/${MOCK_REPOSITORY}/tags` && method === "GET") {
      return json(route, [{ name: "v1.0.0", commit: { sha: BASE_SHA } }]);
    }

    if (path.startsWith(`/repos/${MOCK_REPOSITORY}/commits/`) && method === "GET") {
      const ref = decodeURIComponent(path.split("/").at(-1) || "");
      const sha = ref === "main" ? state.remoteHead : ref;
      return json(route, commits.get(sha) ?? commit(sha, BASE_TREE, sha === state.remoteHead ? "Remote head" : "Commit detail"));
    }

    if (path === `/repos/${MOCK_REPOSITORY}/commits` && method === "GET") {
      const items = [
        commits.get(state.remoteHead) ?? commit(state.remoteHead, BASE_TREE, "Remote head"),
      ];
      if (state.remoteHead !== BASE_SHA) items.push(commit(BASE_SHA, BASE_TREE, "Base commit"));
      return json(route, items);
    }

    if (path.startsWith(`/repos/${MOCK_REPOSITORY}/git/trees/`) && method === "GET") {
      const sha = decodeURIComponent(path.split("/").at(-1) || "");
      return json(route, trees.get(sha) ?? tree(sha));
    }

    if (path === `/repos/${MOCK_REPOSITORY}/git/blobs/${README_BLOB}` && method === "GET") {
      return json(route, { encoding: "base64", content: btoa("# Private repository\n") });
    }
    if (path === `/repos/${MOCK_REPOSITORY}/git/blobs/${APP_BLOB}` && method === "GET") {
      return json(route, { encoding: "base64", content: btoa("export function hello() {\n  return \"world\";\n}\n") });
    }

    if (path === `/repos/${MOCK_REPOSITORY}/git/ref/heads/main` && method === "GET") {
      return json(route, {
        ref: "refs/heads/main",
        object: { sha: state.remoteHead, type: "commit", url: "https://api.github.com/mock" },
      });
    }

    if (path === `/repos/${MOCK_REPOSITORY}/git/blobs` && method === "POST") {
      createdBlob += 1;
      state.writes.push("blob");
      return json(route, { sha: `created-blob-${createdBlob}` }, 201);
    }

    if (path === `/repos/${MOCK_REPOSITORY}/git/trees` && method === "POST") {
      createdTree += 1;
      state.writes.push("tree");
      const sha = `created-tree-${createdTree}`;
      trees.set(sha, tree(sha));
      return json(route, { sha, tree: tree(sha).tree }, 201);
    }

    if (path === `/repos/${MOCK_REPOSITORY}/git/commits` && method === "POST") {
      createdCommit += 1;
      state.writes.push("commit");
      const body = request.postDataJSON() as { message?: string; tree?: string };
      const sha = `created-commit-${createdCommit}`;
      commits.set(sha, commit(sha, body.tree || BASE_TREE, body.message || "Local commit"));
      return json(route, { sha, tree: { sha: body.tree || BASE_TREE } }, 201);
    }

    if (path === `/repos/${MOCK_REPOSITORY}/git/refs/heads/main` && method === "PATCH") {
      const body = request.postDataJSON() as { sha: string };
      state.remoteHead = body.sha;
      state.pushed = true;
      state.writes.push("ref-update");
      return json(route, {
        ref: "refs/heads/main",
        object: { sha: state.remoteHead, type: "commit", url: "https://api.github.com/mock" },
      });
    }

    if (path === `/repos/${MOCK_REPOSITORY}/issues` && method === "GET") {
      return json(route, [issue]);
    }
    if (path === `/repos/${MOCK_REPOSITORY}/issues/7` && method === "GET") return json(route, issue);
    if (path === `/repos/${MOCK_REPOSITORY}/issues/7/comments` && method === "GET") return json(route, []);

    if (path === `/repos/${MOCK_REPOSITORY}/pulls` && method === "GET") return json(route, [pullRequest]);
    if (path === `/repos/${MOCK_REPOSITORY}/pulls/3` && method === "GET") return json(route, pullRequest);
    if (path === `/repos/${MOCK_REPOSITORY}/pulls/3/commits` && method === "GET") return json(route, [commit(BASE_SHA)]);
    if (path === `/repos/${MOCK_REPOSITORY}/pulls/3/files` && method === "GET") return json(route, []);
    if (path === `/repos/${MOCK_REPOSITORY}/commits/${pullRequest.head.sha}/check-runs` && method === "GET") {
      return json(route, { total_count: 1, check_runs: [{ id: 1, name: "CI", status: "completed", conclusion: "success", html_url: null, started_at: null, completed_at: null }] });
    }

    if (path === `/repos/${MOCK_REPOSITORY}/actions/workflows` && method === "GET") {
      return json(route, { total_count: 1, workflows: [workflow] });
    }
    if (path === `/repos/${MOCK_REPOSITORY}/actions/runs` && method === "GET") {
      return json(route, { total_count: 1, workflow_runs: [workflowRun] });
    }
    if (path === `/repos/${MOCK_REPOSITORY}/actions/runs/20` && method === "GET") return json(route, workflowRun);
    if (path === `/repos/${MOCK_REPOSITORY}/actions/runs/20/jobs` && method === "GET") {
      return json(route, { total_count: 1, jobs: [{ id: 21, name: "test", status: "completed", conclusion: "success" }] });
    }
    if (path === `/repos/${MOCK_REPOSITORY}/actions/runs/20/artifacts` && method === "GET") {
      return json(route, { total_count: 0, artifacts: [] });
    }

    if (path === `/repos/${MOCK_REPOSITORY}/releases` && method === "GET") return json(route, [release]);
    if (path === `/repos/${MOCK_REPOSITORY}/releases/9` && method === "GET") return json(route, release);

    return json(route, { message: `Unhandled test GitHub endpoint: ${method} ${path}` }, 501);
  });

  return {
    state,
    setRemoteHead(sha: string) {
      state.remoteHead = sha;
      commits.set(sha, commit(sha, BASE_TREE, "Remote divergence"));
    },
  };
}
