// A versioned management plane. The only default-branch exception is the
// GitHub Actions event bridge; all managed policy and config is on darkfactory.
export const CONTROL_BRANCH = "darkfactory";
export const CONTROL_WORKFLOW = ".github/workflows/darkfactory-control.yml";
export const DEFAULT_BRIDGE = ".github/workflows/darkfactory.yml";
export const CONTROL_CONFIG = "repo.dfconfig";
export const CONTROL_MARKER = "# df-control-managed: 1";
export const BRIDGE_MARKER = "# df-control-bridge: 1";

export function verifyRelease({ tag, sha, digest }) {
  if (!/^v[0-9][A-Za-z0-9.+-]*$/.test(tag) || !/^[a-f0-9]{40}$/.test(sha) || !/^[a-f0-9]{64}$/.test(digest))
    throw new Error("Invalid pinned release metadata");
}

export function renderControlConfig(slug, sourceBranch, release, upstream = "marius-patrik/DarkFactory") {
  verifyRelease(release);
  const [owner, repo, extra] = slug.split("/");
  if (!owner || !repo || extra) throw new Error("Invalid repository slug");
  return JSON.stringify({
    repo: {
      identity: { owner, repo, display_name: repo, project_title: repo, default_branch: sourceBranch, development_branch: sourceBranch },
      upstream: { repo: upstream, ref: release.sha },
      board: { global: "Global", boards: ["Global", repo] },
      $comment: "Owned by DarkFactory on the darkfactory branch. The default branch holds application source.",
    },
    docs: {}, providers: {},
  }, null, 2) + "\n";
}

export function renderControlWorkflow(slug, release, upstream = "marius-patrik/DarkFactory") {
  verifyRelease(release);
  const lines = [
    CONTROL_MARKER,
    "name: DarkFactory Control",
    "on:",
    "  workflow_call:",
    "permissions:",
    "  contents: write",
    "  issues: write",
    "  pull-requests: write",
    "  actions: write",
    "  repository-projects: write",
    "jobs:",
    "  quality:",
    "    if: github.event_name == 'push' || github.event_name == 'pull_request' || github.event_name == 'workflow_dispatch'",
    "    name: released-df-quality",
    "    runs-on: ubuntu-latest",
    "    timeout-minutes: 45",
    "    steps:",
    "      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0",
    "      - name: Install SHA256-verified released df",
    "        env:",
    "          DF_TAG: \"@@TAG@@\"",
    "          DF_SHA256: \"@@DIGEST@@\"",
    "        run: |",
    "          set -euo pipefail",
    "          curl --fail --location --silent --show-error --retry 3 \"https://github.com/@@UPSTREAM@@/releases/download/$DF_TAG/df-linux-x64.tar.gz\" --output \"$RUNNER_TEMP/df.tar.gz\"",
    "          echo \"$DF_SHA256  $RUNNER_TEMP/df.tar.gz\" | sha256sum --check -",
    "          mkdir -p \"$RUNNER_TEMP/darkfactory\"",
    "          tar -xzf \"$RUNNER_TEMP/df.tar.gz\" -C \"$RUNNER_TEMP/darkfactory\"",
    "      - name: Run actual repository quality actions",
    "        run: \"$RUNNER_TEMP/darkfactory/df-linux-x64\" ci quality --repo \"$GITHUB_WORKSPACE\"",
    "  agent:",
    "    if: github.event_name == 'issues' || github.event_name == 'issue_comment' || github.event_name == 'pull_request_review_comment'",
    "    uses: @@UPSTREAM@@/.github/workflows/agent.yml@@AT@@",
    "    with:",
    "      pipeline-ref: \"@@SHA@@\"",
    "      pipeline-repo: @@UPSTREAM@@",
    "      agent-enabled: @@AGENT_ENABLED@@",
    "    secrets: inherit",
    "  issue-binding:",
    "    if: github.event_name == 'pull_request'",
    "    uses: @@UPSTREAM@@/.github/workflows/verify-pr-issue.yml@@AT@@",
    "    with:",
    "      pipeline-ref: \"@@SHA@@\"",
    "      pipeline-repo: @@UPSTREAM@@",
    "    secrets: inherit",
    "  approvals:",
    "    if: github.event_name == 'pull_request_review' || github.event_name == 'issue_comment'",
    "    uses: @@UPSTREAM@@/.github/workflows/pr-approval-automerge.yml@@AT@@",
    "    with:",
    "      pipeline-ref: \"@@SHA@@\"",
    "      pipeline-repo: @@UPSTREAM@@",
    "    secrets: inherit",
  ];
  return lines.join("\n").replaceAll("@@UPSTREAM@@", upstream).replaceAll("@@TAG@@", release.tag)
    .replaceAll("@@DIGEST@@", release.digest).replaceAll("@@SHA@@", release.sha)
    .replaceAll("@@AT@@", "@" + release.sha)
    .replaceAll("@@AGENT_ENABLED@@", "$" + "{{ vars.AGENT_ENABLED }}") + "\n";
}

export function renderDefaultBridge(slug, sourceBranch = "main") {
  if (!/^[A-Za-z0-9._/-]+$/.test(slug) || !/^[A-Za-z0-9._/-]+$/.test(sourceBranch))
    throw new Error("Invalid bridge target");
  return [
    BRIDGE_MARKER,
    "# GitHub requires issues, workflow_dispatch and schedules on the default branch.",
    "# Every executable job and managed config lives on the darkfactory branch.",
    "name: DarkFactory Runtime",
    "on:",
    "  push:",
    "    branches: [@@BRANCH@@]",
    "  pull_request:",
    "    types: [opened, edited, synchronize, reopened, ready_for_review]",
    "  issues:",
    "    types: [opened, labeled, unlabeled, closed, reopened]",
    "  issue_comment:",
    "    types: [created]",
    "  pull_request_review_comment:",
    "    types: [created]",
    "  pull_request_review:",
    "    types: [submitted]",
    "  workflow_dispatch:",
    "  schedule:",
    "    - cron: \"43 5 * * *\"",
    "permissions:",
    "  contents: write",
    "  issues: write",
    "  pull-requests: write",
    "  actions: write",
    "  repository-projects: write",
    "jobs:",
    "  governed:",
    "    uses: @@REPO@@/.github/workflows/darkfactory-control.yml@darkfactory",
    "    secrets: inherit",
  ].join("\n").replaceAll("@@REPO@@", slug).replaceAll("@@BRANCH@@", sourceBranch) + "\n";
}

export function inspectManaged(source, next, marker) {
  if (source === null) return { kind: "create", content: next };
  if (source === next) return { kind: "current" };
  if (!source.startsWith(marker + "\n"))
    return { kind: "conflict", reason: "Unmanaged file; refusing overwrite" };
  return { kind: "review", reason: "Managed content differs; verify original canonical release first" };
}


// A separate branch contains only these three machine-managed files. It does
// not snapshot or fork application source, and changing main never changes it.
export const CONTROL_RECEIPT = ".darkfactory/installation.json";
const allowed = [CONTROL_CONFIG, CONTROL_WORKFLOW, CONTROL_RECEIPT].sort();
const esc = (p) => p.split("/").map(encodeURIComponent).join("/");

export function renderControlReceipt(slug, sourceBranch, release) {
  return JSON.stringify({ managedBy: "DarkFactory", schema: 1, slug, sourceBranch, release }, null, 2) + "\n";
}

export function controlFiles(slug, sourceBranch, release, upstream) {
  return {
    [CONTROL_CONFIG]: renderControlConfig(slug, sourceBranch, release, upstream),
    [CONTROL_WORKFLOW]: renderControlWorkflow(slug, release, upstream),
    [CONTROL_RECEIPT]: renderControlReceipt(slug, sourceBranch, release),
  };
}

// api(method, path, token, body, optional) is the fleet's authenticated
// GitHub client. Never overwrite preexisting unowned branches or edited files.
export async function reconcileControlBranch({ slug, sourceBranch, release, token, api, upstream }) {
  verifyRelease(release);
  const endpoint = "/repos/" + slug;
  const current = await api("GET", endpoint + "/git/ref/heads/" + CONTROL_BRANCH, token, undefined, true);
  const files = controlFiles(slug, sourceBranch, release, upstream);
  const elements = Object.entries(files).map(([path, content]) => ({
    path, mode: "100644", type: "blob", content,
  }));

  if (!current) {
    // Git refuses refs/heads/darkfactory while refs/heads/darkfactory/*
    // exists. The previous fleet updater created this namespace. Retire
    // ONLY provably generated, merged/closed release branches; fail closed
    // for user work or an open review with non-managed changes.
    await clearObsoleteReleaseRefs(endpoint, slug, token, api);
    const base = await api("GET", endpoint + "/git/ref/heads/" + esc(sourceBranch), token);
    if (!base?.object?.sha) throw new Error("Cannot resolve default branch for " + slug);
    const tree = await api("POST", endpoint + "/git/trees", token, { tree: elements });
    const commit = await api("POST", endpoint + "/git/commits", token, {
      message: "feat(df): initialize isolated DarkFactory control plane (" + release.tag + ")",
      tree: tree.sha, parents: [base.object.sha],
    });
    await api("POST", endpoint + "/git/refs", token, {
      ref: "refs/heads/" + CONTROL_BRANCH, sha: commit.sha,
    });
    return { kind: "created", sha: commit.sha };
  }

  const head = await api("GET", endpoint + "/git/commits/" + current.object.sha, token);
  const snapshot = await api("GET", endpoint + "/git/trees/" + head.tree.sha + "?recursive=1", token);
  if (snapshot.truncated || !Array.isArray(snapshot.tree))
    throw new Error("Control branch tree cannot be verified for " + slug);
  const paths = snapshot.tree.filter((item) => item.type === "blob").map((item) => item.path).sort();
  if (paths.some((path) => !allowed.includes(path)) || paths.length !== allowed.length)
    throw new Error("Control branch has unexpected content; refusing to overwrite " + slug);

  const currentFiles = {};
  for (const path of allowed) {
    const response = await api("GET", endpoint + "/contents/" + esc(path) + "?ref=" + CONTROL_BRANCH, token);
    if (response?.type !== "file" || response.encoding !== "base64")
      throw new Error("Cannot verify managed file " + path);
    currentFiles[path] = Buffer.from(response.content, "base64").toString("utf8");
  }
  let receipt;
  try { receipt = JSON.parse(currentFiles[CONTROL_RECEIPT]); }
  catch { throw new Error("Control branch receipt is invalid for " + slug); }
  if (receipt.managedBy !== "DarkFactory" || receipt.schema !== 1 ||
      receipt.slug !== slug || receipt.sourceBranch !== sourceBranch)
    throw new Error("Control branch ownership or branch does not match " + slug);

  const previous = controlFiles(slug, sourceBranch, receipt.release, upstream);
  for (const path of allowed) {
    if (currentFiles[path] !== previous[path])
      throw new Error("Control branch contains modified " + path + "; refusing overwrite");
  }
  if (allowed.every((path) => files[path] === currentFiles[path]))
    return { kind: "current", sha: current.object.sha };
  const tree = await api("POST", endpoint + "/git/trees", token, { tree: elements });
  const commit = await api("POST", endpoint + "/git/commits", token, {
    message: "chore(df): update isolated control plane to " + release.tag,
    tree: tree.sha, parents: [current.object.sha],
  });
  await api("PATCH", endpoint + "/git/refs/heads/" + CONTROL_BRANCH, token, {
    sha: commit.sha, force: false,
  });
  return { kind: "updated", sha: commit.sha };
}

const LEGACY_MANAGED_PATHS = new Set([".github/workflows/darkfactory.yml", "repo.dfconfig"]);

export async function clearObsoleteReleaseRefs(endpoint, slug, token, api) {
  const refs = await api("GET", endpoint + "/git/matching-refs/heads/darkfactory/", token);
  if (!Array.isArray(refs)) throw new Error("Cannot enumerate DarkFactory branch namespace for " + slug);
  const owner = slug.split("/")[0];
  for (const ref of refs) {
    const name = String(ref.ref || "").replace(/^refs\/heads\//, "");
    if (!/^darkfactory\/release-v[0-9][A-Za-z0-9.+-]*$/.test(name))
      throw new Error("Refusing to remove unexpected control-branch collision: " + name);
    const prs = await api("GET", endpoint + "/pulls?state=all&head=" +
      encodeURIComponent(owner + ":" + name) + "&per_page=100", token);
    if (!Array.isArray(prs) || prs.length === 0)
      throw new Error("Cannot prove legacy release branch ownership: " + name);
    const pr = prs.find(item => item.head?.sha === ref.object?.sha);
    if (!pr) throw new Error("Release branch contains unreviewed commits: " + name);
    const files = await api("GET", endpoint + "/pulls/" + pr.number + "/files?per_page=100", token);
    if (!Array.isArray(files) || files.length === 0 || files.length > 2 ||
        files.some(file => !LEGACY_MANAGED_PATHS.has(file.filename)))
      throw new Error("Release branch contains unowned changes: " + name);
    if (pr.state === "open") {
      await api("POST", endpoint + "/issues/" + pr.number + "/comments", token, {
        body: "Superseded by the owner-approved isolated `darkfactory` control branch (DarkFactory#2070). " +
          "Diff verified: only legacy generated integration files. Preserving repository source and CI.",
      });
      await api("PATCH", endpoint + "/pulls/" + pr.number, token, { state: "closed" });
    } else if (pr.state !== "closed") {
      throw new Error("Unexpected release PR state for " + name);
    }
    await api("DELETE", endpoint + "/git/refs/heads/" + name, token);
  }
}
