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
