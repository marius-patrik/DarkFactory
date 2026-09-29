/**
 * Assembles a release: the version, the notes, the assets, and the metadata check.
 *
 * On merge to `main` the pipeline decides whether a release is warranted, what it is called, what
 * goes in it, and whether the repository's own manifests agree with that answer. Each of those is a
 * separate question, so each is a separate function here and the workflow only sequences them.
 *
 * Asset collection supports both halves of the same idea as everything else in this pipeline: the
 * environment's build plan derives what to build from what is actually in the repository, and the
 * manifest's `release.assets` adds anything bespoke. A repository with no build - a template, a
 * documentation site - produces a tagged release with no assets rather than a failure.
 */
import { existsSync, globSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "../../../protocol/src/config-document.ts";
import { configure } from "./environment.ts";
import {
	commitsSince,
	readManualVersion,
	resolveRelease as resolveVersion,
	type ReleaseDecision as VersionDecision,
} from "./versioning.ts";

/** Conventional Commit type -> the heading it appears under in the release notes, in order. */
const NOTE_SECTIONS: readonly (readonly [string, string])[] = [
	["feat", "Features"],
	["fix", "Fixes"],
	["perf", "Performance"],
	["refactor", "Refactoring"],
	["docs", "Documentation"],
	["test", "Tests"],
	["ci", "Pipeline"],
	["chore", "Maintenance"],
];

/** `type(scope)!: subject` */
const COMMIT_HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?:\s*(?<subject>.+)$/u;

/** A `BREAKING CHANGE:` trailer, on its own line anywhere in the message. */
const BREAKING_TRAILER = /^BREAKING[ -]CHANGE:/mu;

/** The identity automation-authored commits carry, so a record commit is attributable. */
const BOT_NAME = "github-actions[bot]";
const BOT_EMAIL = "41898282+github-actions[bot]@users.noreply.github.com";
class ReleaseError extends Error {}

/** One bespoke asset the manifest declares, beyond whatever the ecosystems produce. */
interface DeclaredAsset {
	path: string;
	command?: string;
}

/** One build step and the artifacts it is expected to leave. */
interface ReleaseAssetStep {
	command: string | null;
	cwd: string;
	globs: string[];
	ecosystem: string;
}

/** The whole answer: what is released, what goes in it, and whether the repository agrees. */
interface ResolvedRelease {
	/** The version being released, or `null` when no release is warranted. */
	version: string | null;
	tag: string | null;
	mode: string;
	bump: string | null;
	/** The version being released replaces, or `null` for a first release. */
	previous: string | null;
	notes: string;
	steps: ReleaseAssetStep[];
	metadataProblems: string[];
	/** The manifests a `--sync-metadata` run rewrote. */
	metadataSynced?: string[];
}

/** What recording a released version did. */
export interface RecordVersionResult {
	recorded: boolean;
	version: string;
	branch: string | null;
	base: string;
	issue: number | null;
	pullRequest: string | null;
	reason: string | null;
}

/**
 * Groups Conventional Commits into release notes.
 *
 * @param messages - Full commit messages since the previous release, newest first.
 * @param previous - The previous version, or `null` for a first release.
 * @returns Markdown release notes. Sections with no commits are omitted entirely.
 */
export function buildNotes(messages: Iterable<string>, previous: string | null): string {
	const grouped = new Map<string, string[]>(NOTE_SECTIONS.map(([key]) => [key, []]));
	const breaking: string[] = [];

	for (const message of messages) {
		const header = message ? (message.split("\n")[0] ?? "") : "";
		const match = COMMIT_HEADER.exec(header.trim());
		if (!match?.groups) continue;
		const scope = match.groups.scope;
		const subject = (match.groups.subject ?? "").trim();
		const entry = scope ? `**${scope}**: ${subject}` : subject;
		if (match.groups.bang || BREAKING_TRAILER.test(message)) breaking.push(entry);
		const type = match.groups.type ?? "";
		if (grouped.has(type)) grouped.get(type)?.push(entry);
	}

	const lines: string[] = [];
	if (breaking.length > 0) {
		lines.push("### Breaking changes", ...breaking.map((entry) => `- ${entry}`), "");
	}
	for (const [key, heading] of NOTE_SECTIONS) {
		const entries = grouped.get(key) ?? [];
		if (entries.length > 0) lines.push(`### ${heading}`, ...entries.map((entry) => `- ${entry}`), "");
	}

	if (lines.length === 0) lines.push("No user-facing changes recorded.", "");

	lines.push(previous ? `Changes since \`${previous}\`.` : "First release.");
	return `${lines.join("\n").trim()}\n`;
}

/** The repository's `repo` block, or an empty mapping when it declares nothing. */
function repoBlock(root: string): Record<string, unknown> {
	const path = resolveConfigDocumentPath(root);
	if (!path) return {};
	return configBlock(parseConfigDocument(readFileSync(path, "utf8"), path), "repo", path) ?? {};
}

/** The `repo.release` block, which is where bespoke release assets are declared. */
function releaseBlock(root: string): Record<string, unknown> {
	const declared = repoBlock(root).release;
	return declared && typeof declared === "object" && !Array.isArray(declared)
		? (declared as Record<string, unknown>)
		: {};
}

/**
 * Reads bespoke asset definitions from the manifest.
 *
 * @returns A list of `{command?, path}` entries.
 */
export function declaredAssets(root: string): DeclaredAsset[] {
	const entries = releaseBlock(root).assets;
	const resolved: DeclaredAsset[] = [];
	if (!Array.isArray(entries)) return resolved;
	for (const entry of entries) {
		if (typeof entry === "string") {
			resolved.push({ path: entry });
			continue;
		}
		if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
		const declared = entry as Record<string, unknown>;
		if (!declared.path) continue;
		const path = String(declared.path);
		resolved.push(declared.command ? { path, command: String(declared.command) } : { path });
	}
	return resolved;
}

/**
 * Builds the complete list of build steps and artifact globs for a release.
 *
 * Detection and declaration compose: everything the environment found is built with its ecosystem's
 * command, and anything declared in the manifest is appended.
 *
 * @returns Steps as `{command, globs, cwd, ecosystem}`.
 */
export function planAssets(root: string): ReleaseAssetStep[] {
	const environment = configure(root);
	const steps: ReleaseAssetStep[] = [];

	for (const [ecosystem, entry] of Object.entries(environment.buildPlan())) {
		const candidates = environment.packagesFor(ecosystem);
		// A workspace root builds its members, so building each member as well duplicates work.
		const roots = candidates.filter((candidate) => candidate.isWorkspaceRoot);
		for (const candidate of roots.length > 0 ? roots : candidates) {
			steps.push({
				command: entry.command,
				cwd: candidate.path,
				globs: [...entry.artifacts],
				ecosystem,
			});
		}
	}

	for (const entry of declaredAssets(root)) {
		steps.push({ command: entry.command ?? null, cwd: ".", globs: [entry.path], ecosystem: "declared" });
	}
	return steps;
}

/** Reports whether a path exists and is a regular file, which is what a glob match has to be. */
function isFile(path: string): boolean {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
}

/**
 * Resolves the artifact globs produced by a set of build steps.
 *
 * @returns Existing file paths, relative to the repository root, deduplicated and sorted.
 */
export function collectAssets(root: string, steps: Iterable<Pick<ReleaseAssetStep, "cwd" | "globs">>): string[] {
	const found = new Set<string>();
	for (const step of steps) {
		const cwd = step.cwd === "." ? root : join(root, step.cwd);
		// A step whose package directory is absent contributes nothing, which is what a glob in a
		// directory that was never built means.
		if (!existsSync(cwd)) continue;
		for (const pattern of step.globs) {
			for (const match of globSync(pattern, { cwd })) {
				if (!isFile(join(cwd, match))) continue;
				const relativePath = step.cwd === "." ? match : `${step.cwd}/${match}`;
				found.add(relativePath.replaceAll("\\", "/"));
			}
		}
	}
	return [...found].sort();
}

/**
 * Verifies every package manifest agrees with the version being released.
 *
 * A monorepo carries the same version in several files, and nothing keeps them in step. A release
 * that tags `1.4.0` while `packages/cli/package.json` still says `1.3.9` publishes an artifact
 * whose own metadata contradicts its tag.
 *
 * @returns Human-readable descriptions of each disagreement. Empty means conformant.
 */
export function checkMetadata(root: string, version: string): string[] {
	if (releaseBlock(root).metadata === "ignore") return [];
	return configure(root)
		.packages.filter((candidate) => candidate.version !== null && candidate.version !== version)
		.map(
			(candidate) => `${candidate.manifest} declares version '${candidate.version}', but the release is '${version}'`,
		);
}

/**
 * Rewrites each package manifest's version in place.
 *
 * Only the version field is touched, and only in formats where it can be replaced without
 * reserialising the document - reformatting a manifest as a side effect of a release is a diff
 * nobody asked for.
 *
 * @returns The manifests that were changed.
 */
export function syncMetadata(root: string, version: string): string[] {
	const changed: string[] = [];
	for (const candidate of configure(root).packages) {
		if (candidate.version === null || candidate.version === version) continue;
		const path = join(root, candidate.manifest);
		if (!existsSync(path)) continue;
		const content = readFileSync(path, "utf8");
		// Only the first version field is replaced: it is the package's own, and a dependency block
		// further down the same file may legitimately pin an older one.
		const replace = (_match: string, prefix: string): string => `${prefix}"${version}"`;
		const updated = candidate.manifest.endsWith(".json")
			? content.replace(/("version"\s*:\s*)"[^"]*"/u, replace)
			: content.replace(/^(version\s*=\s*)"[^"]*"/mu, replace);
		if (updated === content) continue;
		writeFileSync(path, updated, "utf8");
		changed.push(candidate.manifest);
	}
	return changed;
}

/**
 * Decides everything about the next release without performing it.
 *
 * @param requested - An explicit bump or exact version requested by a human.
 */
export function resolveRelease(root: string, requested?: string | null): ResolvedRelease {
	const decision: VersionDecision = resolveVersion(root, requested ?? null);
	const version = decision.next;
	if (!version) {
		return {
			version: null,
			tag: null,
			mode: decision.mode,
			bump: decision.bump,
			previous: decision.current,
			notes: "",
			steps: [],
			metadataProblems: [],
		};
	}

	// The tag the decision was measured against, not a freshly recomputed one: measuring the notes
	// window against a different tag than the version decision used is how a release ends up
	// describing commits that are already published.
	const messages = commitsSince(root, decision.current_tag);

	return {
		version,
		tag: decision.tag,
		mode: decision.mode,
		bump: decision.bump,
		previous: decision.current,
		notes: buildNotes(messages, decision.current),
		steps: planAssets(root),
		metadataProblems: checkMetadata(root, version),
	};
}

/** Runs one git command in the repository and returns its output. */
function git(root: string, ...args: string[]): string {
	const result = Bun.spawnSync(["git", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
	if (result.exitCode !== 0) {
		throw new ReleaseError(`git ${args.join(" ")} failed: ${result.stderr.toString().trim()}`);
	}
	return result.stdout.toString().trim();
}

/** Runs one GitHub CLI command in a repository and returns its output. */
export type GhCommand = (root: string, args: readonly string[]) => string;

/** Runs one `gh` command, raising with its error output attached when it fails. */
const runGh: GhCommand = (root, args) => {
	const result = Bun.spawnSync(["gh", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
	if (result.exitCode !== 0) {
		throw new ReleaseError(`gh ${args.join(" ")} failed: ${result.stderr.toString().trim()}`);
	}
	return result.stdout.toString().trim();
};

/** The branch a released version is recorded against: the development lane, or the default one. */
function developmentBranch(root: string): string {
	const identity = repoBlock(root).identity;
	const declared =
		identity && typeof identity === "object" && !Array.isArray(identity) ? (identity as Record<string, unknown>) : {};
	const branch = declared.development_branch || declared.default_branch;
	return String(branch || "main");
}

/** The issue a record pull request must advance, or `null` when the manifest declares none. */
function recordIssue(root: string): number | null {
	const declared = releaseBlock(root).record_issue;
	return typeof declared === "number" && Number.isFinite(declared) ? declared : null;
}

/**
 * Records a released version on a delivery branch for the development branch.
 *
 * The `VERSION` file is the owner's control over the next number, which only works while it is also
 * a record of the last one. A file that still names an already-released version reads as an explicit
 * choice of that version, and the next promotion tries to release it again. So the release job
 * writes what it actually released onto its own branch and opens the governed pull request against
 * the development branch; it never pushes to a protected branch itself.
 *
 * Recording the same version twice is a no-op, so a re-run after a completed release neither commits
 * again nor asks for a second review. The pull request binds `release.record_issue`, because every
 * pull request to `develop` has to name a tracking issue to pass its required check; without one the
 * version is still committed and the omission is reported rather than opening a request that can
 * only sit at `REVIEW_REQUIRED`.
 *
 * @param releasedTag - The tag that was published, quoted in the pull request body.
 * @param ghCommand - How `gh` is reached; injected so the recording path is testable without a
 * live CLI.
 * @throws ReleaseError when the repository declares no development branch, or git fails.
 */
export function recordVersion(
	root: string,
	version: string,
	releasedTag?: string | null,
	ghCommand: GhCommand = runGh,
): RecordVersionResult {
	const base = developmentBranch(root);
	const declared = readManualVersion(root);
	const issue = recordIssue(root);
	const result: RecordVersionResult = {
		recorded: false,
		version,
		branch: null,
		base,
		issue,
		pullRequest: null,
		reason: null,
	};
	if (declared === version) {
		result.reason = `VERSION already records ${version}`;
		return result;
	}

	const branch = `release/record-${version}`;
	git(root, "fetch", "origin", base);
	git(root, "checkout", "-B", branch, `origin/${base}`);
	writeFileSync(join(root, "VERSION"), `${version}\n`, "utf8");
	git(root, "add", "VERSION");
	// The identity is passed on the command rather than configured on the runner: a release job
	// that inherits nobody's git identity fails at the commit, after the release is already public.
	git(
		root,
		"-c",
		`user.name=${BOT_NAME}`,
		"-c",
		`user.email=${BOT_EMAIL}`,
		"commit",
		"-q",
		"-m",
		`chore(release): record ${version}`,
	);
	git(root, "push", "--force-with-lease", "origin", `${branch}:${branch}`);
	result.recorded = true;
	result.branch = branch;

	if (issue === null) {
		result.reason =
			"no release.record_issue in the manifest, so no pull request was opened; " +
			`${version} is committed on ${branch}`;
		return result;
	}

	const openPrs = ghCommand(root, [
		"pr",
		"list",
		"--head",
		branch,
		"--state",
		"open",
		"--json",
		"number",
		"--jq",
		"[.[].number]",
	]);
	if (openPrs !== "" && openPrs !== "[]") {
		result.pullRequest = openPrs;
		result.reason = `a pull request for ${branch} is already open`;
		return result;
	}

	const body = [
		"## Summary",
		"",
		`The release job published \`${releasedTag || version}\` and this records it in \`VERSION\`.`,
		"",
		"Without this the file keeps naming an already-released version, which the resolver",
		"reads as an explicit choice of that version, so the next promotion would try to",
		"release it again.",
		"",
		`- Released: \`${releasedTag || version}\``,
		`- Base: \`${base}\``,
		"- One file: `VERSION`",
		"",
		"## Bound Request(s)",
		"",
		`- Advances #${issue}`,
		"",
	].join("\n");
	result.pullRequest = ghCommand(root, [
		"pr",
		"create",
		"--base",
		base,
		"--head",
		branch,
		"--title",
		`chore(release): record ${version}`,
		"--body",
		body,
	]);
	return result;
}
