import { createHash } from "node:crypto";
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

export function renderControlConfig(slug, sourceBranch, release, upstream = "marius-patrik/DarkFactory", baseConfig = null) {
	verifyRelease(release);
	const [owner, repo, extra] = slug.split("/");
	if (!owner || !repo || extra) throw new Error("Invalid repository slug");
	let doc;
	try {
		doc = baseConfig ? JSON.parse(baseConfig) : { repo: {}, docs: {}, providers: {} };
	} catch {
		throw new Error("Repository configuration is invalid JSON; refusing destructive replacement");
	}
	if (!doc || typeof doc !== "object" || Array.isArray(doc) ||
		!doc.repo || typeof doc.repo !== "object" || Array.isArray(doc.repo))
		throw new Error("Repository configuration is not a valid combined document");
	const existingIdentity = doc.repo.identity && typeof doc.repo.identity === "object"
		? doc.repo.identity : {};
	const self = slug.toLowerCase() === upstream.toLowerCase();
	return JSON.stringify({
		...doc,
		repo: {
			...doc.repo,
			identity: {
				...existingIdentity, owner, repo,
				display_name: existingIdentity.display_name || repo,
				project_title: repo, default_branch: sourceBranch,
				development_branch: existingIdentity.development_branch || sourceBranch,
			},
			upstream: self ? { repo: null, ref: null } : { repo: upstream, ref: release.sha },
			board: { global: "Global", boards: ["Global", repo] },
		},
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

		"  detect:",
		"    if: github.event_name == 'push' || github.event_name == 'pull_request' || github.event_name == 'workflow_dispatch'",
		"    runs-on: ubuntu-latest",
		"    outputs:",
		"      matrix: @@MATRIX_OUTPUT@@",
		"      has-actions: @@HAS_OUTPUT@@",
		"    steps:",
		"      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0",
		"      - name: Checkout managed DarkFactory configuration",
		"        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0",
		"        with:",
		"          ref: darkfactory",
		"          path: .darkfactory-managed",
		"      - name: Materialize control-branch configuration for this run",
		'        run: cp "$GITHUB_WORKSPACE/.darkfactory-managed/repo.dfconfig" "$GITHUB_WORKSPACE/repo.dfconfig"',
		"      - name: Install SHA256-verified released df",
		"        env:",
		'          DF_TAG: "@@TAG@@"',
		'          DF_SHA256: "@@DIGEST@@"',
		"        run: |",
		"          set -euo pipefail",
		'          curl --fail --location --silent --show-error --retry 3 "https://github.com/@@UPSTREAM@@/releases/download/$DF_TAG/df-linux-x64.tar.gz" --output "$RUNNER_TEMP/df.tar.gz"',
		'          echo "$DF_SHA256  $RUNNER_TEMP/df.tar.gz" | sha256sum --check -',
		'          mkdir -p "$RUNNER_TEMP/darkfactory"',
		'          tar -xzf "$RUNNER_TEMP/df.tar.gz" -C "$RUNNER_TEMP/darkfactory"',
		"      - name: Detect official quality actions",
		"        id: matrix",
		"        run: |",
		'          "$RUNNER_TEMP/darkfactory/df-linux-x64" ci matrix --repo "$GITHUB_WORKSPACE" > "$RUNNER_TEMP/df-quality.json"',
		'          echo "matrix=$(jq -c .matrix "$RUNNER_TEMP/df-quality.json")" >> "$GITHUB_OUTPUT"',
		'          if [ "$(jq ".matrix | length" "$RUNNER_TEMP/df-quality.json")" -gt 0 ]; then echo "has-actions=true" >> "$GITHUB_OUTPUT"; else echo "has-actions=false" >> "$GITHUB_OUTPUT"; fi',
		"  execute-quality:",
		"    if: needs.detect.outputs.has-actions == 'true'",
		"    needs: detect",
		"    name: @@MATRIX_ID@@",
		"    runs-on: ubuntu-latest",
		"    strategy:",
		"      fail-fast: false",
		"      matrix:",
		"        include: @@MATRIX_INPUT@@",
		"    steps:",
		"      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0",
		"      - name: Checkout managed DarkFactory configuration",
		"        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0",
		"        with:",
		"          ref: darkfactory",
		"          path: .darkfactory-managed",
		"      - name: Materialize control-branch configuration for this run",
		'        run: cp "$GITHUB_WORKSPACE/.darkfactory-managed/repo.dfconfig" "$GITHUB_WORKSPACE/repo.dfconfig"',
		"      - if: matrix.packageManager == 'bun' || matrix.ecosystem == 'typst'",
		"        uses: oven-sh/setup-bun@v2",
		"      - if: matrix.ecosystem == 'node' && matrix.packageManager != 'bun'",
		"        uses: actions/setup-node@v4",
		"        with:",
		'          node-version: "24"',
		"      - if: matrix.packageManager == 'pnpm' || matrix.packageManager == 'yarn'",
		"        run: corepack enable",
		"      - if: matrix.ecosystem == 'python'",
		"        uses: actions/setup-python@v5",
		"        with:",
		"          python-version: @@PY_VERSION@@",
		"      - if: matrix.packageManager == 'uv' || matrix.packageManager == 'poetry' || matrix.packageManager == 'pipenv'",
		"        env:",
		"          DF_PACKAGE_MANAGER: @@PKG_MANAGER@@",
		'        run: python -m pip install "$DF_PACKAGE_MANAGER"',
		"      - if: matrix.ecosystem == 'rust'",
		"        uses: dtolnay/rust-toolchain@stable",
		"        with:",
		"          components: rustfmt, clippy",
		"      - if: matrix.ecosystem == 'go'",
		"        uses: actions/setup-go@v5",
		"        with:",
		"          go-version: stable",
		"      - if: matrix.ecosystem == 'deno'",
		"        uses: denoland/setup-deno@v2.0.5",
		"        with:",
		"          deno-version: v2.x",
		"      - if: matrix.ecosystem == 'typst'",
		"        uses: typst-community/setup-typst@v5",
		"      - if: matrix.ecosystem == 'lean'",
		"        uses: leanprover/lean-action@v1",
		"        with:",
		"          build: false",
		"          test: false",
		"      - if: matrix.ecosystem == 'latex'",
		"        run: sudo apt-get update && sudo apt-get install -y --no-install-recommends texlive-latex-recommended texlive-latex-extra texlive-fonts-recommended latexmk",
		"      - if: matrix.setupCommand != ''",
		"        env:",
		"          DF_SETUP_COMMAND: @@SETUP_COMMAND@@",
		"          DF_SETUP_CWD: @@SETUP_CWD@@",
		"        run: |",
		'          cd "$GITHUB_WORKSPACE/$DF_SETUP_CWD"',
		'          bash -lc "$DF_SETUP_COMMAND"',
		"      - name: Run detected quality action",
		"        env:",
		"          DF_ACTION_COMMAND: @@ACTION_COMMAND@@",
		"          DF_ACTION_CWD: @@ACTION_CWD@@",
		"        run: |",
		'          cd "$GITHUB_WORKSPACE/$DF_ACTION_CWD"',
		'          bash -lc "$DF_ACTION_COMMAND"',
		"  quality:",
		"    name: released-df-quality",
		"    runs-on: ubuntu-latest",
		"    if: always() && (github.event_name == 'push' || github.event_name == 'pull_request' || github.event_name == 'workflow_dispatch')",
		"    needs: [detect, execute-quality]",
		"    steps:",
		"      - name: Require all actual supported quality actions green",
		"        env:",
		"          DF_DETECT: @@DETECT_RESULT@@",
		"          DF_QUALITY: @@EXECUTE_RESULT@@",
		"          DF_HAS_ACTIONS: @@HAS_MATRIX@@",
		"        run: |",
		'          test "$DF_DETECT" = "success"',
		'          if [ "$DF_HAS_ACTIONS" = "true" ]; then test "$DF_QUALITY" = "success"; fi',
		"  agent:",
		"    if: github.event_name == 'issues' || github.event_name == 'issue_comment' || github.event_name == 'pull_request_review_comment'",
		"    uses: @@UPSTREAM@@/.github/workflows/agent.yml@@AT@@",
		"    with:",
		'      pipeline-ref: "@@SHA@@"',
		"      pipeline-repo: @@UPSTREAM@@",
		"      agent-enabled: @@AGENT_ENABLED@@",
		"    secrets: inherit",
		"  issue-binding:",
		"    if: github.event_name == 'pull_request'",
		"    uses: @@UPSTREAM@@/.github/workflows/verify-pr-issue.yml@@AT@@",
		"    with:",
		'      pipeline-ref: "@@SHA@@"',
		"      pipeline-repo: @@UPSTREAM@@",
		"    secrets: inherit",
		"  approvals:",
		"    if: github.event_name == 'pull_request_review' || github.event_name == 'issue_comment'",
		"    uses: @@UPSTREAM@@/.github/workflows/pr-approval-automerge.yml@@AT@@",
		"    with:",
		'      pipeline-ref: "@@SHA@@"',
		"      pipeline-repo: @@UPSTREAM@@",
		"    secrets: inherit",
	];
	return (
		lines
			.join("\n")
			.replaceAll("@@UPSTREAM@@", upstream)
			.replaceAll("@@TAG@@", release.tag)
			.replaceAll("@@DIGEST@@", release.digest)
			.replaceAll("@@SHA@@", release.sha)
			.replaceAll("@@AT@@", "@" + release.sha)
			.replaceAll("@@AGENT_ENABLED@@", "$" + "{{ vars.AGENT_ENABLED }}")
			.replaceAll("@@MATRIX_OUTPUT@@", "$" + "{{ steps.matrix.outputs.matrix }}")
			.replaceAll("@@HAS_OUTPUT@@", "$" + "{{ steps.matrix.outputs.has-actions }}")
			.replaceAll("@@MATRIX_ID@@", "$" + "{{ matrix.id }}")
			.replaceAll("@@MATRIX_INPUT@@", "$" + "{{ fromJson(needs.detect.outputs.matrix) }}")
			.replaceAll("@@PY_VERSION@@", "$" + "{{ matrix.version || '3.13' }}")
			.replaceAll("@@PKG_MANAGER@@", "$" + "{{ matrix.packageManager }}")
			.replaceAll("@@SETUP_COMMAND@@", "$" + "{{ matrix.setupCommand }}")
			.replaceAll("@@SETUP_CWD@@", "$" + "{{ matrix.setupCwd }}")
			.replaceAll("@@ACTION_COMMAND@@", "$" + "{{ matrix.command }}")
			.replaceAll("@@ACTION_CWD@@", "$" + "{{ matrix.cwd }}")
			.replaceAll("@@DETECT_RESULT@@", "$" + "{{ needs.detect.result }}")
			.replaceAll("@@EXECUTE_RESULT@@", "$" + "{{ needs.execute-quality.result }}")
			.replaceAll("@@HAS_MATRIX@@", "$" + "{{ needs.detect.outputs.has-actions }}") + "\n"
	);
}

export function renderDefaultBridge(slug, sourceBranch = "main") {
	if (!/^[A-Za-z0-9._/-]+$/.test(slug) || !/^[A-Za-z0-9._/-]+$/.test(sourceBranch))
		throw new Error("Invalid bridge target");
	return (
		[
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
			'    - cron: "43 5 * * *"',
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
		]
			.join("\n")
			.replaceAll("@@REPO@@", slug)
			.replaceAll("@@BRANCH@@", sourceBranch) + "\n"
	);
}

export function inspectManaged(source, next, marker) {
	if (source === null) return { kind: "create", content: next };
	if (source === next) return { kind: "current" };
	if (!source.startsWith(marker + "\n")) return { kind: "conflict", reason: "Unmanaged file; refusing overwrite" };
	return { kind: "review", reason: "Managed content differs; verify original canonical release first" };
}

// A separate branch contains only these three machine-managed files. It does
// not snapshot or fork application source, and changing main never changes it.
export const CONTROL_RECEIPT = ".darkfactory/installation.json";
const allowed = [CONTROL_CONFIG, CONTROL_WORKFLOW, CONTROL_RECEIPT].sort();
const esc = (p) => p.split("/").map(encodeURIComponent).join("/");

export function digestOf(source) {
	return createHash("sha256").update(source).digest("hex");
}

export function renderControlReceipt(slug, sourceBranch, release, fileHashes) {
	return (
		JSON.stringify({ managedBy: "DarkFactory", schema: 2, slug, sourceBranch, release, fileHashes }, null, 2) + "\n"
	);
}

export function controlFiles(slug, sourceBranch, release, upstream, baseConfig = null) {
	const config = renderControlConfig(slug, sourceBranch, release, upstream, baseConfig);
	const workflow = renderControlWorkflow(slug, release, upstream);
	const hashes = { [CONTROL_CONFIG]: digestOf(config), [CONTROL_WORKFLOW]: digestOf(workflow) };
	return {
		[CONTROL_CONFIG]: config,
		[CONTROL_WORKFLOW]: workflow,
		[CONTROL_RECEIPT]: renderControlReceipt(slug, sourceBranch, release, hashes),
	};
}

// api(method, path, token, body, optional) is the fleet's authenticated
// GitHub client. Never overwrite preexisting unowned branches or edited files.
export async function reconcileControlBranch({ slug, sourceBranch, release, token, api, upstream, sourceConfig = null }) {
	verifyRelease(release);
	const endpoint = "/repos/" + slug;
	const current = await api("GET", endpoint + "/git/ref/heads/" + CONTROL_BRANCH, token, undefined, true);
	let files = controlFiles(slug, sourceBranch, release, upstream, sourceConfig);
	const elements = Object.entries(files).map(([path, content]) => ({
		path,
		mode: "100644",
		type: "blob",
		content,
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
			tree: tree.sha,
			parents: [base.object.sha],
		});
		await api("POST", endpoint + "/git/refs", token, {
			ref: "refs/heads/" + CONTROL_BRANCH,
			sha: commit.sha,
		});
		return { kind: "created", sha: commit.sha };
	}

	const head = await api("GET", endpoint + "/git/commits/" + current.object.sha, token);
	const snapshot = await api("GET", endpoint + "/git/trees/" + head.tree.sha + "?recursive=1", token);
	if (snapshot.truncated || !Array.isArray(snapshot.tree))
		throw new Error("Control branch tree cannot be verified for " + slug);
	const paths = snapshot.tree
		.filter((item) => item.type === "blob")
		.map((item) => item.path)
		.sort();
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
	try {
		receipt = JSON.parse(currentFiles[CONTROL_RECEIPT]);
	} catch {
		throw new Error("Control branch receipt is invalid for " + slug);
	}
	if (
		receipt.managedBy !== "DarkFactory" ||
		receipt.schema !== 2 ||
		receipt.slug !== slug ||
		receipt.sourceBranch !== sourceBranch
	)
		throw new Error("Control branch ownership or branch does not match " + slug);

	for (const path of [CONTROL_CONFIG, CONTROL_WORKFLOW]) {
		if (typeof receipt.fileHashes?.[path] !== "string" || digestOf(currentFiles[path]) !== receipt.fileHashes[path])
			throw new Error("Control branch contains modified " + path + "; refusing overwrite");
	}
	// A release update must preserve the previous managed configuration, not reset it to defaults.
	files = controlFiles(slug, sourceBranch, release, upstream, currentFiles[CONTROL_CONFIG]);
	if (allowed.every((path) => files[path] === currentFiles[path])) return { kind: "current", sha: current.object.sha };
	const tree = await api("POST", endpoint + "/git/trees", token, { tree: elements });
	const commit = await api("POST", endpoint + "/git/commits", token, {
		message: "chore(df): update isolated control plane to " + release.tag,
		tree: tree.sha,
		parents: [current.object.sha],
	});
	await api("PATCH", endpoint + "/git/refs/heads/" + CONTROL_BRANCH, token, {
		sha: commit.sha,
		force: false,
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
		const prs = await api(
			"GET",
			endpoint + "/pulls?state=all&head=" + encodeURIComponent(owner + ":" + name) + "&per_page=100",
			token,
		);
		if (!Array.isArray(prs) || prs.length === 0)
			throw new Error("Cannot prove legacy release branch ownership: " + name);
		const pr = prs.find((item) => item.head?.sha === ref.object?.sha);
		if (!pr) throw new Error("Release branch contains unreviewed commits: " + name);
		const files = await api("GET", endpoint + "/pulls/" + pr.number + "/files?per_page=100", token);
		if (
			!pr.merged_at &&
			(!Array.isArray(files) ||
				files.length === 0 ||
				files.length > 2 ||
				files.some((file) => !LEGACY_MANAGED_PATHS.has(file.filename)))
		)
			throw new Error("Release branch contains unowned changes: " + name);
		if (pr.state === "open") {
			await api("POST", endpoint + "/issues/" + pr.number + "/comments", token, {
				body:
					"Superseded by the owner-approved isolated `darkfactory` control branch (DarkFactory#2070). " +
					"Diff verified: only legacy generated integration files. Preserving repository source and CI.",
			});
			await api("PATCH", endpoint + "/pulls/" + pr.number, token, { state: "closed" });
		} else if (pr.state !== "closed") {
			throw new Error("Unexpected release PR state for " + name);
		}
		await api("DELETE", endpoint + "/git/refs/heads/" + name, token);
	}
}
