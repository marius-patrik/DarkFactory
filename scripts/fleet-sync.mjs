import { createSign } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
	CONTROL_CONFIG,
	CONTROL_RECEIPT,
	SUBMODULE_CONTROL_RECEIPT,
	CONTROL_WORKFLOW,
	DEFAULT_BRIDGE,
	controlFiles,
	readLegacyControl,
	renderDefaultBridge,
	renderLegacyDefaultBridge,
	retireLegacyControl,
	retireLegacyReleaseBranches,
	verifyControlReceipt,
} from "./fleet-control.mjs";

// Additive, release-driven GitHub App reconciler. Existing consumer CI,
// configuration, secrets and branch protection are never overwritten.
const API = "https://api.github.com";
const OWNER = process.env.DF_FLEET_OWNER || "marius-patrik";
const UPSTREAM = `${OWNER}/DarkFactory`;
const MARKER = "# df-fleet-managed: 2";
const LEGACY_MARKER = "# df-fleet-managed: 1";
const ISSUE_MARKER = "<!-- darkfactory-fleet-release: ";
const DRY_RUN = process.env.DF_FLEET_DRY_RUN === "1";
// A released update proposes reviewed PRs in every eligible consumer; it never
// overwrites user-owned files or changes branch protections.

// Lifecycle exclusions are intentional. Do not open release upgrade PRs in
// retired *-old repositories or Agent OS repositories. A previously installed
// runtime is left in place; its workflows, issues and archived evidence are
// never deleted by fleet reconciliation.
export function isFleetExcluded(fullName) {
	const name = String(fullName).split("/").at(-1)?.toLowerCase() ?? "";
	return /(?:^|[-_])old(?:$|[-_])/.test(name) || /(?:^|[-_])agents?[-_]os(?:$|[-_])/.test(name);
}

export function renderLegacyWorkflow({ tag, sha, digest }) {
	if (!/^v[0-9][A-Za-z0-9.+-]*$/.test(tag) || !/^[a-f0-9]{40}$/.test(sha) || !/^[a-f0-9]{64}$/.test(digest)) {
		throw new Error("Invalid stable release metadata");
	}
	return `${LEGACY_MARKER}
# Additive integration: existing project workflows remain unchanged.
# Customize in separate workflows; hand-editing this one pauses auto-updates.
name: DarkFactory Runtime
on:
  push:
  pull_request:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  darkfactory:
    name: released-df
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      DF_TAG: "${tag}"
      DF_RELEASE_SHA: "${sha}"
      DF_SHA256: "${digest}"
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
      - name: Install verified released df
        shell: bash
        run: |
          set -euo pipefail
          curl --fail --location --silent --show-error --retry 3 "https://github.com/${UPSTREAM}/releases/download/$DF_TAG/df-linux-x64" --output "$RUNNER_TEMP/df"
          echo "$DF_SHA256  $RUNNER_TEMP/df" | sha256sum --check -
          chmod +x "$RUNNER_TEMP/df"
      - name: Verify df detects this repository
        shell: bash
        run: |
          set -euo pipefail
          mkdir -p "$RUNNER_TEMP/df-capabilities"
          "$RUNNER_TEMP/df" ci matrix --repo "$GITHUB_WORKSPACE" --capabilities-root "$RUNNER_TEMP/df-capabilities" > "$RUNNER_TEMP/df-matrix.json"
          jq --exit-status '.matrix | type == "array"' "$RUNNER_TEMP/df-matrix.json"
          jq --raw-output '"Detected packages: \\(.packages | length); unresolved actions: \\(.gaps | length)"' "$RUNNER_TEMP/df-matrix.json"
`;
}

export function renderWorkflow({ tag, sha, digest }) {
	if (!/^v[0-9][A-Za-z0-9.+-]*$/.test(tag) || !/^[a-f0-9]{40}$/.test(sha) || !/^[a-f0-9]{64}$/.test(digest)) {
		throw new Error("Invalid stable release metadata");
	}
	return `${MARKER}
# This managed workflow is additive; existing consumer CI remains intact.
# User edits pause automated updates rather than being overwritten.
name: DarkFactory Runtime
on:
  push:
  pull_request:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  darkfactory:
    name: released-df
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      DF_TAG: "${tag}"
      DF_RELEASE_SHA: "${sha}"
      DF_SHA256: "${digest}"
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
      - name: Install complete verified released df
        shell: bash
        run: |
          set -euo pipefail
          curl --fail --location --silent --show-error --retry 3 "https://github.com/${UPSTREAM}/releases/download/$DF_TAG/df-linux-x64.tar.gz" --output "$RUNNER_TEMP/df-runtime.tar.gz"
          echo "$DF_SHA256  $RUNNER_TEMP/df-runtime.tar.gz" | sha256sum --check -
          mkdir -p "$RUNNER_TEMP/df-runtime"
          tar -xzf "$RUNNER_TEMP/df-runtime.tar.gz" -C "$RUNNER_TEMP/df-runtime"
          chmod +x "$RUNNER_TEMP/df-runtime/df-linux-x64"
      - name: Verify df detects this repository using its official capabilities
        shell: bash
        run: |
          set -euo pipefail
          "$RUNNER_TEMP/df-runtime/df-linux-x64" ci matrix --repo "$GITHUB_WORKSPACE" > "$RUNNER_TEMP/df-matrix.json"
          jq --exit-status '.matrix | type == "array"' "$RUNNER_TEMP/df-matrix.json"
          jq --raw-output '"Detected packages: (.packages | length); unresolved actions: (.gaps | length)"' "$RUNNER_TEMP/df-matrix.json"
`;
}

export function renderConfig(slug, branch, sha) {
	const [owner, repo] = slug.split("/");
	return (
		JSON.stringify(
			{
				repo: {
					$comment:
						"Generated by DarkFactory fleet-sync. User edits are preserved and disable automatic config rewriting.",
					identity: { owner, repo, default_branch: branch, development_branch: branch },
					upstream: { repo: UPSTREAM, ref: sha },
				},
				docs: {},
				providers: {},
			},
			null,
			2,
		) + "\n"
	);
}

export function inspectWorkflow(source, release) {
	if (source === null) return { kind: "create", content: renderWorkflow(release) };
	if (!source.startsWith(MARKER + "\n") && !source.startsWith(LEGACY_MARKER + "\n"))
		return { kind: "conflict", reason: "Existing workflow is not managed by fleet-sync" };
	const tag = source.match(/^\s+DF_TAG: "([^"]+)"$/m)?.[1];
	const sha = source.match(/^\s+DF_RELEASE_SHA: "([^"]+)"$/m)?.[1];
	const digest = source.match(/^\s+DF_SHA256: "([^"]+)"$/m)?.[1];
	let previous;
	try {
		previous = source.startsWith(LEGACY_MARKER)
			? renderLegacyWorkflow({ tag, sha, digest })
			: renderWorkflow({ tag, sha, digest });
	} catch {
		return { kind: "conflict", reason: "Invalid release metadata in existing workflow" };
	}
	if (previous !== source)
		return { kind: "conflict", reason: "Managed workflow has been customized; refusing overwrite" };
	const next = renderWorkflow(release);
	return source === next ? { kind: "current" } : { kind: "update", content: next };
}

export function inspectConfig(source, slug, branch, sha) {
	if (source === null) return { kind: "create", content: renderConfig(slug, branch, sha) };
	let parsed;
	try {
		parsed = JSON.parse(source);
	} catch {
		return { kind: "preserve", reason: "Configuration is not JSON" };
	}
	const upstream = parsed?.repo?.upstream?.repo;
	if (upstream && upstream.toLowerCase() !== UPSTREAM.toLowerCase()) {
		return { kind: "preserve", reason: `Consumer selected alternate upstream: ${upstream}` };
	}
	const oldRef = parsed?.repo?.upstream?.ref;
	if (typeof oldRef === "string" && /^[a-f0-9]{40}$/.test(oldRef) && source === renderConfig(slug, branch, oldRef)) {
		const next = renderConfig(slug, branch, sha);
		return source === next ? { kind: "current" } : { kind: "update", content: next };
	}
	return { kind: "preserve", reason: "Consumer-managed configuration left intact" };
}

const escaped = (path) => path.split("/").map(encodeURIComponent).join("/");
export async function api(method, path, token, data, optional = false) {
	const result = await fetch(API + path, {
		method,
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${token}`,
			"X-GitHub-Api-Version": "2022-11-28",
			"User-Agent": "darkfactory-fleet-sync",
			...(data === undefined ? {} : { "Content-Type": "application/json" }),
		},
		...(data === undefined ? {} : { body: JSON.stringify(data) }),
	});
	if (optional && result.status === 404) return null;
	if (!result.ok) throw new Error(`${method} ${path}: HTTP ${result.status} ${(await result.text()).slice(0, 350)}`);
	return result.status === 204 ? null : result.json();
}
export async function pages(path, token, select = (value) => value) {
	const out = [];
	for (let page = 1; page <= 100; page++) {
		const body = await api("GET", `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`, token);
		const values = select(body);
		if (!Array.isArray(values)) throw new Error(`Unexpected GitHub API page ${path}`);
		out.push(...values);
		if (values.length < 100) return out;
	}
	throw new Error(`Pagination exceeded ${path}`);
}
export function appJwt(appId, pem) {
	const now = Math.floor(Date.now() / 1000);
	const base = [
		Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url"),
		Buffer.from(JSON.stringify({ iss: appId, iat: now - 60, exp: now + 480 })).toString("base64url"),
	].join(".");
	return `${base}.${createSign("RSA-SHA256").update(base).sign(pem).toString("base64url")}`;
}
async function readFile(slug, path, branch, token) {
	const result = await api(
		"GET",
		`/repos/${slug}/contents/${escaped(path)}?ref=${encodeURIComponent(branch)}`,
		token,
		undefined,
		true,
	);
	if (!result) return null;
	if (result.type !== "file" || result.encoding !== "base64") throw new Error(`${slug}/${path} is not a regular file`);
	return { sha: result.sha, content: Buffer.from(result.content, "base64").toString("utf8") };
}
async function issueFor(slug, release, changes, conflicts, token) {
	const marker = `${ISSUE_MARKER}${release.tag} -->`;
	const existing = (await pages(`/repos/${slug}/issues?state=open`, token)).find(
		(item) => !item.pull_request && item.body?.includes(marker),
	);
	if (existing) return existing.number;
	const title = `${changes.length ? "Install/update" : "Review"} DarkFactory ${release.tag} on default branch`;
	const body = [
		marker,
		"",
		`Published release: ${UPSTREAM}@${release.tag} (${release.sha}).`,
		"This rollout only proposes changes through a PR; no branch protection or project CI is replaced.",
		"",
		"Proposed managed files:",
		...changes.map((p) => `- \`${p}\``),
		...(conflicts.length ? ["", "Items requiring owner review:", ...conflicts.map((s) => `- ${s}`)] : []),
		"",
		"Existing setups are preserved. PR merge remains owner-governed.",
	].join("\n");
	if (DRY_RUN) {
		console.log(`[dry-run] issue ${slug}: ${title}`);
		return 0;
	}
	return (await api("POST", `/repos/${slug}/issues`, token, { title, body })).number;
}

/** A user-authored field is not overwritten just because the previous control
 * branch declared a different value. Import nonconflicting branch fields, and
 * surface the paths that require a deliberate owner decision. */
export function mergeConfigSources(mainText, legacyText) {
	if (!mainText) return { content: legacyText, conflicts: [] };
	if (!legacyText) return { content: mainText, conflicts: [] };
	let main, legacy;
	try {
		main = JSON.parse(mainText);
		legacy = JSON.parse(legacyText);
	} catch {
		throw new Error("Cannot merge invalid JSON configuration");
	}
	const conflicts = [];
	const derived = new Set([
		"repo.upstream",
		"repo.board",
		"repo.identity.owner",
		"repo.identity.repo",
		"repo.identity.display_name",
		"repo.identity.project_title",
		"repo.identity.default_branch",
		"repo.identity.development_branch",
	]);
	function merge(a, b, prefix = "") {
		if (a === undefined) return b;
		if (b === undefined) return a;
		if (JSON.stringify(a) === JSON.stringify(b) || derived.has(prefix)) return a;
		if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
			const result = {};
			for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
				result[key] = merge(a[key], b[key], prefix ? prefix + "." + key : key);
			}
			return result;
		}
		conflicts.push(prefix);
		return a;
	}
	const merged = merge(main, legacy);
	return { content: JSON.stringify(merged, null, 2) + "\n", conflicts };
}

/**
 * Produce a single atomic default-branch PR. Never stage a partial installation
 * whose receipt would attest to files that were never installed.
 */
export function planMainInstallation({ slug, base, release, upstream, mainFiles, legacy, receiptPath = CONTROL_RECEIPT }) {
	const conflicts = [];
	const changes = [];
	const current = (path) => mainFiles[path]?.content ?? null;
	const oldConfig = current(CONTROL_CONFIG);
	const branchConfig = legacy?.files[CONTROL_CONFIG] ?? null;
	if (mainFiles["config.dfconfig"] || mainFiles[".dfconfig"]) {
		return {
			changes,
			conflicts: ["Alternate root configuration already exists; reconcile to one canonical config first"],
		};
	}
	const existingReceipt = current(receiptPath);
	if (existingReceipt) {
		try {
			verifyControlReceipt(existingReceipt, oldConfig, current(CONTROL_WORKFLOW), slug, base);
		} catch (error) {
			return { changes, conflicts: [String(error)] };
		}
	} else if (current(CONTROL_WORKFLOW)) {
		return { changes, conflicts: ["Existing control workflow has no verifiable installation receipt"] };
	}
	let merged;
	try {
		merged = mergeConfigSources(oldConfig, branchConfig);
		const doc = merged.content ? JSON.parse(merged.content) : null;
		if (doc?.repo?.upstream?.repo && doc.repo.upstream.repo.toLowerCase() !== upstream.toLowerCase()) {
			return { changes, conflicts: ["Consumer configuration selects an alternate DarkFactory upstream"] };
		}
	} catch (error) {
		return { changes, conflicts: [String(error)] };
	}
	if (merged.conflicts.length) {
		return { changes, conflicts: merged.conflicts.map((p) => "Divergent main/control configuration: " + p) };
	}
	let files;
	try {
		files = controlFiles(slug, base, release, upstream, merged.content, receiptPath);
	} catch (error) {
		return { changes, conflicts: [String(error)] };
	}
	const oldBridge = current(DEFAULT_BRIDGE);
	const newBridge = renderDefaultBridge(slug, base);
	if (oldBridge !== null && oldBridge !== newBridge && oldBridge !== renderLegacyDefaultBridge(slug, base)) {
		// The previous released-binary smoke is machine-generated and can be replaced,
		// but only if its rendered bytes match the version it declares.
		const tag = oldBridge.match(/^\s+DF_TAG: "([^"]+)"$/m)?.[1];
		const sha = oldBridge.match(/^\s+DF_RELEASE_SHA: "([^"]+)"$/m)?.[1];
		const digest = oldBridge.match(/^\s+DF_SHA256: "([^"]+)"$/m)?.[1];
		let canonical = false;
		try {
			if (oldBridge.startsWith(MARKER + "\n")) canonical = oldBridge === renderWorkflow({ tag, sha, digest });
			else if (oldBridge.startsWith(LEGACY_MARKER + "\n"))
				canonical = oldBridge === renderLegacyWorkflow({ tag, sha, digest });
		} catch {
			// Unverifiable release metadata is a conflict, not ownership proof.
		}
		if (!canonical) return { changes, conflicts: ["Default-branch workflow is customized or unowned"] };
	}
	for (const [path, content] of Object.entries({ ...files, [DEFAULT_BRIDGE]: newBridge })) {
		if (current(path) !== content) changes.push({ path, content, sha: mainFiles[path]?.sha });
	}
	return { changes, conflicts };
}

async function reconcile(repo, release, token) {
	const slug = repo.full_name;
	if (slug.toLowerCase() === UPSTREAM.toLowerCase()) return "self-main";
	const base = repo.default_branch;
	if (!base) throw new Error(slug + " has no default branch");
	const legacy = await readLegacyControl({ slug, sourceBranch: base, token, api });
	const endpoint = "/repos/" + slug;
	const ref = await api("GET", endpoint + "/git/ref/heads/" + escaped(base), token);
	const commit = await api("GET", endpoint + "/git/commits/" + ref.object.sha, token);
	const root = await api("GET", endpoint + "/git/trees/" + commit.tree.sha, token);
	if (!Array.isArray(root?.tree)) throw new Error("Cannot inspect root layout: " + slug);
	const dfEntry = root.tree.find((entry) => entry.path === ".darkfactory");
	const receiptPath = dfEntry && dfEntry.type !== "tree" ? SUBMODULE_CONTROL_RECEIPT : CONTROL_RECEIPT;
	const mainFiles = {};
	for (const path of [
		CONTROL_CONFIG,
		"config.dfconfig",
		".dfconfig",
		CONTROL_WORKFLOW,
		receiptPath,
		DEFAULT_BRIDGE,
	]) {
		mainFiles[path] = await readFile(slug, path, base, token);
	}
	const { changes, conflicts } = planMainInstallation({
		slug,
		base,
		release,
		upstream: UPSTREAM,
		mainFiles,
		legacy,
		receiptPath,
	});
	if (!changes.length && !conflicts.length) {
		if (DRY_RUN) return "dry-run";
		let outcome = "absent";
		if (legacy) outcome = await retireLegacyControl({
			slug,
			sourceBranch: base,
			upstream: UPSTREAM,
			token,
			api,
			mainFiles: Object.fromEntries(Object.entries(mainFiles).map(([path, value]) => [path, value?.content ?? null])),
			legacy,
			receiptPath,
		});
		console.log(slug + ": legacy control branch " + outcome);
		const oldReleases = await retireLegacyReleaseBranches({ slug, token, api });
		if (oldReleases.length) console.log(slug + ": legacy release branch audit " + JSON.stringify(oldReleases));
		return outcome === "retired" || oldReleases.some((item) => item.disposition === "retired")
			? "retired" : "current";
	}
	if (DRY_RUN) {
		console.log("[dry-run] " + slug + ": " + JSON.stringify({ changes: changes.map((x) => x.path), conflicts }));
		return "dry-run";
	}
	// One open installation review per consumer. Never open a second PR simply
	// because a newer upstream release appeared while the first awaits review.
	if (changes.length) {
		const pending = (await pages("/repos/" + slug + "/pulls?state=open", token)).find(
			(item) => /^df-main\/v[0-9]/.test(item.head?.ref ?? "") &&
				item.user?.login === "darkfactory-pipeline[bot]",
		);
		if (pending) {
			console.log(slug + ": existing installation review " + pending.html_url +
				"; update the existing PR rather than opening a second proposal for " + release.tag);
			return "pending";
		}
	}
	const issue = await issueFor(
		slug,
		release,
		changes.map((x) => x.path),
		conflicts,
		token,
	);
	if (!changes.length) return "conflict";
	const proposal = "df-main/" + release.tag.replace(/[^A-Za-z0-9._-]/g, "-");
	const existingPr = (await pages("/repos/" + slug + "/pulls?state=open", token)).find(
		(item) => item.head?.ref === proposal,
	);
	if (existingPr) {
		console.log(slug + ": already proposed " + existingPr.html_url);
		return "pending";
	}
	if (await api("GET", endpoint + "/git/ref/heads/" + escaped(proposal), token, undefined, true)) {
		throw new Error(slug + ": installation proposal branch exists without an open review");
	}
	// One tree/commit/ref transaction: readers never see a half-installed controller.
	const tree = await api("POST", endpoint + "/git/trees", token, {
		base_tree: commit.tree.sha,
		tree: changes.map(({ path, content }) => ({ path, mode: "100644", type: "blob", content })),
	});
	const built = await api("POST", endpoint + "/git/commits", token, {
		message: "feat(df): install managed control on default branch (" + release.tag + ")",
		tree: tree.sha,
		parents: [ref.object.sha],
	});
	await api("POST", endpoint + "/git/refs", token, {
		ref: "refs/heads/" + proposal,
		sha: built.sha,
	});
	const pr = await api("POST", endpoint + "/pulls", token, {
		title: "feat(df): install managed configuration and workflows on main",
		head: proposal,
		base,
		body: [
			"Closes #" + issue,
			"",
			"Install DarkFactory entirely on the repository default branch. No separate",
			"persistent control branch or external workflow checkout is required.",
			"Existing non-DarkFactory CI and repository setup are preserved.",
			"",
			"Changes:",
			...changes.map((x) => "- `" + x.path + "`"),
			...(conflicts.length ? ["", "Review considerations:", ...conflicts.map((x) => "- " + x)] : []),
			"",
			"The old isolated branch is removed only after a later run verifies an",
			"equivalent receipt-sealed main installation and no open review on that branch.",
		].join("\n"),
	});
	console.log(slug + ": " + pr.html_url);
	return "proposed";
}

async function main() {
	const pem = process.env.DARKFACTORY_APP_PRIVATE_KEY;
	if (!pem) throw new Error("Missing DARKFACTORY_APP_PRIVATE_KEY: fleet reconciliation cannot run");
	const jwt = appJwt(process.env.DARKFACTORY_APP_ID || "4861004", pem);
	const installs = await pages("/app/installations", jwt);
	const install = installs.find((i) => i.account?.login?.toLowerCase() === OWNER.toLowerCase() && !i.suspended_at);
	if (!install) throw new Error(`DarkFactory App is not installed on ${OWNER}`);
	const { token } = await api("POST", `/app/installations/${install.id}/access_tokens`, jwt, {});
	const release = await api("GET", `/repos/${UPSTREAM}/releases/latest`, token);
	if (!release?.tag_name || release.draft || release.prerelease) throw new Error("Stable release not found");
	const asset = release.assets?.find((item) => item.name === "df-linux-x64.tar.gz");
	const digest = asset?.digest?.match(/^sha256:([a-f0-9]{64})$/)?.[1];
	if (!digest) throw new Error("Latest stable release has no SHA-256-verified Linux runtime archive");
	let ref = await api("GET", `/repos/${UPSTREAM}/git/ref/tags/${encodeURIComponent(release.tag_name)}`, token);
	if (ref.object.type === "tag") ref = await api("GET", `/repos/${UPSTREAM}/git/tags/${ref.object.sha}`, token);
	if (ref.object.type !== "commit") throw new Error("Release tag is not a commit");
	const selected = { tag: release.tag_name, sha: ref.object.sha, digest };
	const accessible = await pages("/installation/repositories", token, (page) => page.repositories);
	const eligible = accessible.filter(
		(r) =>
			r.full_name?.split("/")[0]?.toLowerCase() === OWNER.toLowerCase() &&
			!r.archived &&
			!r.disabled &&
			!isFleetExcluded(r.full_name),
	);
	console.log(
		`Selected ${eligible.length} eligible repositories (producer on main; all active consumers), released df ${selected.tag}`,
	);
	const stats = {},
		failures = [];
	for (const repo of eligible.sort((a, b) => a.full_name.localeCompare(b.full_name))) {
		try {
			const outcome = await reconcile(repo, selected, token);
			stats[outcome] = (stats[outcome] || 0) + 1;
		} catch (error) {
			failures.push(`${repo.full_name}: ${String(error)}`);
		}
	}
	// Public owner repositories omitted from the App installation cannot be modified.
	const publicRepos = await pages(`/users/${OWNER}/repos?type=owner`, token);
	const available = new Set(accessible.map((r) => r.full_name.toLowerCase()));
	const missing = publicRepos
		.filter(
			(r) =>
				!r.archived &&
				!r.disabled &&
				!isFleetExcluded(r.full_name) &&
				r.full_name?.toLowerCase() !== UPSTREAM.toLowerCase() &&
				!available.has(r.full_name.toLowerCase()),
		)
		.map((r) => r.full_name);
	if (missing.length) failures.push(`Grant App access to: ${missing.join(", ")}`);
	console.log(JSON.stringify({ tag: selected.tag, eligible: eligible.length, stats, failures }, null, 2));
	if (failures.length) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((e) => {
		console.error(e);
		process.exitCode = 1;
	});
}
