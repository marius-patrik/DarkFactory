import { createHash } from "node:crypto";
// The configuration and its reusable workflow live on each repository's default branch.
// "darkfactory" is recognized only to retire previously installed control branches.
export const LEGACY_CONTROL_BRANCH = "darkfactory";
export const CONTROL_WORKFLOW = ".github/workflows/darkfactory-control.yml";
export const DEFAULT_BRIDGE = ".github/workflows/darkfactory.yml";
export const CONTROL_CONFIG = "repo.dfconfig";
export const CONTROL_MARKER = "# df-control-managed: 1";
export const BRIDGE_MARKER = "# df-control-bridge: 1";

export function verifyRelease({ tag, sha, digest }) {
	if (!/^v[0-9][A-Za-z0-9.+-]*$/.test(tag) || !/^[a-f0-9]{40}$/.test(sha) || !/^[a-f0-9]{64}$/.test(digest))
		throw new Error("Invalid pinned release metadata");
}

export function renderControlConfig(
	slug,
	sourceBranch,
	release,
	upstream = "marius-patrik/DarkFactory",
	baseConfig = null,
) {
	verifyRelease(release);
	const [owner, repo, extra] = slug.split("/");
	if (!owner || !repo || extra) throw new Error("Invalid repository slug");
	let doc;
	try {
		doc = baseConfig ? JSON.parse(baseConfig) : { repo: {}, docs: {}, providers: {} };
	} catch {
		throw new Error("Repository configuration is invalid JSON; refusing destructive replacement");
	}
	if (
		!doc ||
		typeof doc !== "object" ||
		Array.isArray(doc) ||
		!doc.repo ||
		typeof doc.repo !== "object" ||
		Array.isArray(doc.repo)
	)
		throw new Error("Repository configuration is not a valid combined document");
	const existingIdentity = doc.repo.identity && typeof doc.repo.identity === "object" ? doc.repo.identity : {};
	const self = slug.toLowerCase() === upstream.toLowerCase();
	return (
		JSON.stringify(
			{
				...doc,
				repo: {
					...doc.repo,
					identity: {
						...existingIdentity,
						owner,
						repo,
						display_name: existingIdentity.display_name || repo,
						project_title: repo,
						default_branch: sourceBranch,
						development_branch: existingIdentity.development_branch || sourceBranch,
					},
					upstream: self ? { repo: null, ref: null } : { repo: upstream, ref: release.sha },
					board: { global: "Global", boards: ["Global", repo] },
				},
			},
			null,
			2,
		) + "\n"
	);
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
		'          if [ "$DF_SETUP_COMMAND" = "npm ci" ] && [ ! -f package-lock.json ] && [ ! -f npm-shrinkwrap.json ]; then',
		"            npm install --no-package-lock",
		"          else",
		'            bash -lc "$DF_SETUP_COMMAND"',
		"          fi",
		"      - if: matrix.ecosystem == 'python'",
		"        name: Install inferred Python quality tooling",
		"        env:",
		"          DF_ACTION_COMMAND: @@ACTION_COMMAND@@",
		"        run: |",
		"          set -euo pipefail",
		'          case "$DF_ACTION_COMMAND" in',
		"            pytest*|*' -m pytest'*) python -m pip install pytest ;;",
		"            black*|*' -m black'*) python -m pip install black ;;",
		"            ruff*|*' -m ruff'*) python -m pip install ruff ;;",
		"            mypy*|*' -m mypy'*) python -m pip install mypy ;;",
		"            flake8*|*' -m flake8'*) python -m pip install flake8 ;;",
		"            isort*|*' -m isort'*) python -m pip install isort ;;",
		"          esac",
		"      - name: Run detected quality action",
		"        env:",
		"          DF_ACTION_COMMAND: @@ACTION_COMMAND@@",
		"          DF_ACTION_CWD: @@ACTION_CWD@@",
		"        run: |",
		'          cd "$GITHUB_WORKSPACE/$DF_ACTION_CWD"',
		'          export PATH="$GITHUB_WORKSPACE/node_modules/.bin:$PWD/node_modules/.bin:$PATH"',
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
			"# Configuration and executable workflows reside on this repository's default branch.",
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
			"    uses: ./.github/workflows/darkfactory-control.yml",
			"    secrets: inherit",
		]
			.join("\n")
			.replaceAll("@@REPO@@", slug)
			.replaceAll("@@BRANCH@@", sourceBranch) + "\n"
	);
}

// Exact legacy bridge renderer for checking ownership during one-time migration.
export function renderLegacyDefaultBridge(slug, sourceBranch = "main") {
	return renderDefaultBridge(slug, sourceBranch)
		.replace(
			"# Configuration and executable workflows reside on this repository's default branch.",
			"# Every executable job and managed config lives on the darkfactory branch.",
		)
		.replace(
			"uses: ./.github/workflows/darkfactory-control.yml",
			"uses: " + slug + "/.github/workflows/darkfactory-control.yml@darkfactory",
		);
}

export function inspectManaged(source, next, marker) {
	if (source === null) return { kind: "create", content: next };
	if (source === next) return { kind: "current" };
	if (!source.startsWith(marker + "\n")) return { kind: "conflict", reason: "Unmanaged file; refusing overwrite" };
	return { kind: "review", reason: "Managed content differs; verify original canonical release first" };
}

export const CONTROL_RECEIPT = ".darkfactory/installation.json";
export const SUBMODULE_CONTROL_RECEIPT = ".github/darkfactory-installation.json";
export const CONTROL_FILES = [CONTROL_CONFIG, CONTROL_WORKFLOW, CONTROL_RECEIPT].sort();
const esc = (path) => path.split("/").map(encodeURIComponent).join("/");

export function digestOf(source) {
	return createHash("sha256").update(source).digest("hex");
}

export function renderControlReceipt(slug, sourceBranch, release, fileHashes) {
	return (
		JSON.stringify({ managedBy: "DarkFactory", schema: 2, slug, sourceBranch, release, fileHashes }, null, 2) + "\n"
	);
}

export function controlFiles(slug, sourceBranch, release, upstream, baseConfig = null, receiptPath = CONTROL_RECEIPT) {
	if (![CONTROL_RECEIPT, SUBMODULE_CONTROL_RECEIPT].includes(receiptPath))
		throw new Error("Unknown installation receipt location");
	const config = renderControlConfig(slug, sourceBranch, release, upstream, baseConfig);
	const workflow = renderControlWorkflow(slug, release, upstream);
	return {
		[CONTROL_CONFIG]: config,
		[CONTROL_WORKFLOW]: workflow,
		[receiptPath]: renderControlReceipt(slug, sourceBranch, release, {
			[CONTROL_CONFIG]: digestOf(config),
			[CONTROL_WORKFLOW]: digestOf(workflow),
		}),
	};
}

// A schema-2 receipt proves the owner and bytes; a marker alone never proves ownership.
export function verifyControlReceipt(receiptText, configText, workflowText, slug, sourceBranch) {
	let receipt;
	try {
		receipt = JSON.parse(receiptText);
	} catch {
		throw new Error("Invalid DarkFactory installation receipt");
	}
	if (
		receipt.managedBy !== "DarkFactory" ||
		receipt.schema !== 2 ||
		receipt.slug !== slug ||
		receipt.sourceBranch !== sourceBranch
	) {
		throw new Error("DarkFactory installation receipt ownership or source branch mismatch");
	}
	verifyRelease(receipt.release);
	for (const [path, content] of [
		[CONTROL_CONFIG, configText],
		[CONTROL_WORKFLOW, workflowText],
	]) {
		if (typeof content !== "string" || digestOf(content) !== receipt.fileHashes?.[path]) {
			throw new Error("DarkFactory installation contains modified or missing " + path);
		}
	}
	return receipt;
}

/**
 * Read an optional previous isolated installation without modifying its branch.
 * It is eligible for retirement only if every byte belongs to the sealed
 * three-file control tree. Any unexpected file or modified receipt fails closed.
 */
export async function readLegacyControl({ slug, sourceBranch, token, api }) {
	const endpoint = "/repos/" + slug;
	const ref = await api("GET", endpoint + "/git/ref/heads/" + LEGACY_CONTROL_BRANCH, token, undefined, true);
	if (!ref) return null;
	const head = await api("GET", endpoint + "/git/commits/" + ref.object.sha, token);
	const snapshot = await api("GET", endpoint + "/git/trees/" + head.tree.sha + "?recursive=1", token);
	if (snapshot.truncated || !Array.isArray(snapshot.tree)) throw new Error("Cannot inspect legacy branch: " + slug);
	const paths = snapshot.tree
		.filter((entry) => entry.type === "blob")
		.map((entry) => entry.path)
		.sort();
	if (
		JSON.stringify(paths) !== JSON.stringify(CONTROL_FILES) ||
		snapshot.tree.some((entry) => entry.type !== "tree" && entry.type !== "blob")
	) {
		throw new Error("Legacy control branch contains unowned paths: " + slug);
	}
	const files = {};
	for (const path of CONTROL_FILES) {
		const response = await api("GET", endpoint + "/contents/" + esc(path) + "?ref=" + LEGACY_CONTROL_BRANCH, token);
		if (response?.type !== "file" || response.encoding !== "base64") {
			throw new Error("Legacy control file is not regular: " + path);
		}
		files[path] = Buffer.from(response.content, "base64").toString("utf8");
	}
	verifyControlReceipt(files[CONTROL_RECEIPT], files[CONTROL_CONFIG], files[CONTROL_WORKFLOW], slug, sourceBranch);
	return { sha: ref.object.sha, files };
}

/** Never delete before a validated, lossless default-branch installation is visible. */
export async function retireLegacyControl({
	slug,
	sourceBranch,
	upstream,
	token,
	api,
	mainFiles,
	legacy,
	receiptPath = CONTROL_RECEIPT,
}) {
	if (!legacy) return "absent";
	const receipt = verifyControlReceipt(
		mainFiles[receiptPath],
		mainFiles[CONTROL_CONFIG],
		mainFiles[CONTROL_WORKFLOW],
		slug,
		sourceBranch,
	);
	const expected = controlFiles(
		slug,
		sourceBranch,
		receipt.release,
		upstream,
		legacy.files[CONTROL_CONFIG],
		receiptPath,
	);
	if (
		expected[CONTROL_CONFIG] !== mainFiles[CONTROL_CONFIG] ||
		expected[CONTROL_WORKFLOW] !== mainFiles[CONTROL_WORKFLOW] ||
		renderDefaultBridge(slug, sourceBranch) !== mainFiles[DEFAULT_BRIDGE]
	)
		return "retained: configuration differs";
	const endpoint = "/repos/" + slug;
	const owner = slug.split("/")[0];
	const prs = await api(
		"GET",
		endpoint + "/pulls?state=open&head=" + encodeURIComponent(owner + ":" + LEGACY_CONTROL_BRANCH) + "&per_page=100",
		token,
	);
	if (!Array.isArray(prs) || prs.length > 0) return "retained: open review";
	const latest = await api("GET", endpoint + "/git/ref/heads/" + LEGACY_CONTROL_BRANCH, token, undefined, true);
	if (latest?.object?.sha !== legacy.sha) return "retained: branch changed";
	await api("DELETE", endpoint + "/git/refs/heads/" + LEGACY_CONTROL_BRANCH, token);
	return "retired";
}

/**
 * Retire only historical DarkFactory release branches whose exact head belongs
 * to a closed/merged, narrowly scoped install PR. Never touch user work,
 * arbitrary darkfactory/* refs or branches with unreviewed changes.
 */
export async function retireLegacyReleaseBranches({ slug, token, api }) {
	const endpoint = "/repos/" + slug;
	const refs = await api("GET", endpoint + "/git/matching-refs/heads/darkfactory/", token);
	if (!Array.isArray(refs)) throw new Error("Cannot enumerate legacy release branches for " + slug);
	const results = [];
	for (const ref of refs) {
		const name = String(ref.ref || "").replace(/^refs\/heads\//, "");
		if (!/^darkfactory\/release-v[0-9][A-Za-z0-9.+-]*$/.test(name)) continue;
		const owner = slug.split("/")[0];
		const prs = await api(
			"GET",
			endpoint + "/pulls?state=all&head=" + encodeURIComponent(owner + ":" + name) + "&per_page=100",
			token,
		);
		if (!Array.isArray(prs) || prs.length === 0) {
			results.push({ branch: name, disposition: "retained: no verified pull request" });
			continue;
		}
		const pr = prs.find((value) => value.head?.sha === ref.object?.sha);
		if (!pr || pr.state !== "closed") {
			results.push({ branch: name, disposition: "retained: unreviewed or still open" });
			continue;
		}
		const files = await api("GET", endpoint + "/pulls/" + pr.number + "/files?per_page=100", token);
		const owned = new Set([DEFAULT_BRIDGE, CONTROL_CONFIG]);
		if (
			!Array.isArray(files) ||
			files.length === 0 ||
			files.length > owned.size ||
			files.some((entry) => !owned.has(entry.filename))
		) {
			results.push({ branch: name, disposition: "retained: unowned changes" });
			continue;
		}
		const check = await api("GET", endpoint + "/git/ref/heads/" + name, token, undefined, true);
		if (check?.object?.sha !== ref.object.sha) {
			results.push({ branch: name, disposition: "retained: branch moved" });
			continue;
		}
		await api("DELETE", endpoint + "/git/refs/heads/" + name, token);
		results.push({ branch: name, disposition: "retired" });
	}
	return results;
}
