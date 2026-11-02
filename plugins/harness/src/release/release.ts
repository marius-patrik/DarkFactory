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
