/**
 * Works out the next release version, replacing `.github/scripts/versioning.py`.
 *
 * The scheme is not chosen here. It is read from the `repo.versioning` block of the repository's
 * combined configuration, exactly as the Python module read it, and the arithmetic below is the
 * same arithmetic: a release version is `<number><letter>.<minor>.<patch>`, the letter is carried
 * through a bump rather than interpreted, and the letter is never dropped in favour of a plain
 * number. That is what keeps a repository released as `3a.1.0` moving to `3a.2.0` and not `3.2.0`.
 *
 * This exists because the Python pipeline is being removed as a v1 exit criterion. Until the
 * workflow that calls it is replaced wholesale, both implementations run, and `release.yml`
 * asserts that they agree rather than trusting one of them.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve as resolvePath } from "node:path";

/** Every versioning mode this module understands, matching the Python module it replaces. */
export const MODES = ["semver", "zerover", "pridever", "calver", "manual"] as const;
export type VersioningMode = (typeof MODES)[number];

/** Bump sizes, ordered from smallest to largest, shared by the numeric modes. */
export const BUMPS = ["patch", "minor", "major"] as const;
export type Bump = (typeof BUMPS)[number] | "proud";

/** Conventional Commit types that mean "a user-visible fix", i.e. the smallest bump. */
const PATCH_TYPES: readonly string[] = ["fix", "perf", "revert"];

/** Conventional Commit types that mean "a user-visible addition", i.e. a middle bump. */
const MINOR_TYPES: readonly string[] = ["feat"];

/** `type(scope)!: subject` - the `!` and a `BREAKING CHANGE:` trailer both mean a breaking change. */
const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?:\s/u;
const BREAKING_TRAILER = /^BREAKING[ -]CHANGE:/mu;

/**
 * A release version: two or three dot-separated components whose first may carry a scheme suffix
 * (`3a.1.0`), so a repository's own numbering is legible to the comparison instead of invisible to
 * it. A tag is this with the prefix in front, which is stripped before parsing.
 */
const VERSION = /^(?<nums>\d+[a-z]*(?:\.\d+){1,2})$/u;

/** The first component of a version: a number optionally followed by the scheme letter. */
const HEAD = /^(?<number>\d+)(?<scheme>[a-z]*)$/u;

const CONFIG_FILENAMES = ["repo.dfconfig", "config.dfconfig", ".dfconfig"] as const;
const DEFAULT_CONFIG_DIR = ".darkfactory";

export class VersioningError extends Error {}

/** A parsed release version: its scheme letter and its components padded to three. */
export interface ParsedVersion {
	scheme: string;
	numbers: [number, number, number];
}

/** The `repo.versioning` block, defaulted where the repository leaves a key out. */
export interface VersioningConfig {
	mode: VersioningMode;
	tag_prefix: string;
	initial: string;
}

/** The answer a release job needs: what is released now, and whether anything is warranted. */
export interface VersionDecision {
	mode: VersioningMode;
	current: string | null;
	current_tag: string | null;
	next: string | null;
	tag: string | null;
	bump: string | null;
}

function configDirectory(root: string, env: NodeJS.ProcessEnv): string {
	const configured = (env.DF_CONFIG_DIR ?? "").trim() || DEFAULT_CONFIG_DIR;
	return isAbsolute(configured) ? resolvePath(configured) : resolvePath(root, configured);
}

/** Reads the `repo` block of the one combined configuration selected for a repository. */
export function loadRepoBlock(root: string, env: NodeJS.ProcessEnv = process.env): Record<string, unknown> {
	const rootCandidates = CONFIG_FILENAMES.map((name) => join(root, name)).filter((path) => existsSync(path));
	const directory = configDirectory(root, env);
	const folderCandidates =
		directory === root ? [] : CONFIG_FILENAMES.map((name) => join(directory, name)).filter((p) => existsSync(p));

	if (rootCandidates.length > 0 && folderCandidates.length > 0) {
		throw new VersioningError(
			`Ambiguous DarkFactory configuration: candidates exist in both the repository root ` +
				`(${rootCandidates.join(", ")}) and ${directory} (${folderCandidates.join(", ")}); ` +
				`remove all but one config.dfconfig, repo.dfconfig, or .dfconfig location.`,
		);
	}
	const candidates = rootCandidates.length > 0 ? rootCandidates : folderCandidates;
	if (candidates.length > 1) {
		throw new VersioningError(
			`Ambiguous DarkFactory configuration aliases in ${dirname(candidates[0] ?? root)}: ` +
				`${candidates.join(", ")}; keep only repo.dfconfig, config.dfconfig, or .dfconfig.`,
		);
	}
	const path = candidates[0];
	if (!path || !existsSync(path)) return {};

	let document: unknown;
	try {
		document = JSON.parse(readFileSync(path, "utf8"));
	} catch (error) {
		throw new VersioningError(`Invalid DarkFactory configuration JSON at ${path}: ${String(error)}`);
	}
	if (typeof document !== "object" || document === null || Array.isArray(document)) {
		throw new VersioningError(`DarkFactory configuration at ${path} must contain an object.`);
	}
	const block = (document as Record<string, unknown>).repo;
	if (block === undefined || block === null) return {};
	if (typeof block !== "object" || Array.isArray(block)) {
		throw new VersioningError(`DarkFactory configuration block "repo" at ${path} must be an object.`);
	}
	return block as Record<string, unknown>;
}

/** Reads and validates the repository's versioning declaration. */
export function loadConfig(root: string, env: NodeJS.ProcessEnv = process.env): VersioningConfig {
	const block = loadRepoBlock(root, env);
	const declared = (block.versioning ?? {}) as Record<string, unknown>;
	const mode = String(declared.mode ?? "semver");
	if (!(MODES as readonly string[]).includes(mode)) {
		throw new VersioningError(`unknown versioning mode '${mode}'; expected one of ${MODES.join(", ")}`);
	}
	return {
		mode: mode as VersioningMode,
		tag_prefix: String(declared.tag_prefix ?? "v"),
		initial: String(declared.initial ?? "0.1.0"),
	};
}

/** Derives the bump size implied by a batch of Conventional Commit messages. */
export function classifyCommits(messages: Iterable<string>): Bump | null {
	let result: Bump | null = null;
	for (const message of messages) {
		const header = message.split("\n")[0] ?? "";
		const match = HEADER.exec(header);
		if (!match?.groups) continue;
		if (match.groups.bang || BREAKING_TRAILER.test(message)) return "major";
		const type = match.groups.type ?? "";
		if (MINOR_TYPES.includes(type)) result = "minor";
		else if (PATCH_TYPES.includes(type) && result === null) result = "patch";
	}
	return result;
}

/** Turns a release tag or version into its scheme letter and its numbers, or `null`. */
export function parseVersion(tag: string): ParsedVersion | null {
	const match = VERSION.exec(tag.trim().replace(/^v/u, ""));
	if (!match?.groups?.nums) return null;
	const [head, ...rest] = match.groups.nums.split(".");
	const first = head ? HEAD.exec(head) : null;
	if (!first?.groups) return null;
	const numbers = [Number(first.groups.number), ...rest.map((part) => Number(part))];
	while (numbers.length < 3) numbers.push(0);
	return { scheme: first.groups.scheme ?? "", numbers: numbers as [number, number, number] };
}

/**
 * Reads one component of a parsed version.
 *
 * A parsed version always has three components, so the fallback is unreachable; it exists because
 * the tuple is indexed in a loop and the type is written as if it might not be.
 */
function component(numbers: readonly number[], index: number): number {
	return numbers[index] ?? 0;
}

/** Rebuilds a version from its scheme letter and numbers, e.g. `3a.2.0`. */
function renderVersion(scheme: string, [major, minor, patch]: readonly [number, number, number]): string {
	return `${major}${scheme}.${minor}.${patch}`;
}

/**
 * Applies a bump to a version without changing the scheme it is written in.
 *
 * A genuinely new generation is a decision the `VERSION` file exists to record explicitly, which
 * is why a major bump moves the number and keeps the letter rather than dropping it.
 */
export function bumpVersion(current: string, bump: Bump | null): string | null {
	if (bump === null) return null;
	if (bump === "proud" || !(BUMPS as readonly string[]).includes(bump)) {
		throw new VersioningError(`unknown bump '${bump}'; expected one of ${BUMPS.join(", ")}`);
	}
	const parsed = parseVersion(current);
	if (!parsed) return null;
	const [major, minor, patch] = parsed.numbers;
	if (bump === "major") return renderVersion(parsed.scheme, [major + 1, 0, 0]);
	if (bump === "minor") return renderVersion(parsed.scheme, [major, minor + 1, 0]);
	return renderVersion(parsed.scheme, [major, minor, patch + 1]);
}

/**
 * Reports whether a version is a deliberate step past the one already released.
 *
 * Both sides are compared within one scheme, so `3b.0.0` is ahead of `3a.9.9` and `3a.1.0` is not
 * ahead of `3a.2.0`. A declared version naming an unreleased scheme is a choice, not staleness.
 */
export function isAhead(candidate: string | null, current: string | null): boolean {
	if (!candidate) return false;
	const left = parseVersion(candidate);
	if (!left) return false;
	const right = current ? parseVersion(current) : null;
	if (!right) return true;
	if (left.scheme !== right.scheme) return true;
	for (let index = 0; index < 3; index += 1) {
		if (component(left.numbers, index) !== component(right.numbers, index)) {
			return component(left.numbers, index) > component(right.numbers, index);
		}
	}
	return false;
}

/** Picks the highest release tag from a list, ignoring anything that is not one. */
export function latestTag(tags: readonly string[], prefer?: string | null): string | null {
	const parsed: { numbers: readonly number[]; scheme: string; tag: string }[] = [];
	for (const tag of tags) {
		const result = parseVersion(tag);
		if (result) parsed.push({ numbers: result.numbers, scheme: result.scheme, tag });
	}
	if (parsed.length === 0) return null;
	let candidates = parsed;
	if (prefer != null) {
		const sameScheme = parsed.filter((entry) => entry.scheme === prefer);
		// Narrowing keeps a repository on the release line it says it is on instead of comparing it
		// against a superseded scheme that happens to sort lower or higher.
		if (sameScheme.length > 0) candidates = sameScheme;
	}
	let best = candidates[0];
	if (!best) return null;
	for (const entry of candidates.slice(1)) {
		for (let index = 0; index < 3; index += 1) {
			if (component(entry.numbers, index) === component(best.numbers, index)) continue;
			if (component(entry.numbers, index) > component(best.numbers, index)) best = entry;
			break;
		}
	}
	return best.tag;
}

/** Applies a bump to the current version under the given mode. */
export function nextVersion(
	mode: VersioningMode,
	current: string | null,
	bump: Bump | null,
	today: Date = new Date(),
): string | null {
	if (!(MODES as readonly string[]).includes(mode)) throw new VersioningError(`unknown versioning mode '${mode}'`);
	if (mode === "manual") return null;
	if (bump === "proud" && mode !== "pridever") {
		throw new VersioningError("a 'proud' bump is only meaningful under pridever");
	}
	if (bump === null) return null;

	const parsed = current ? parseVersion(current) : null;
	if (mode === "calver") {
		const stamp = `${today.getUTCFullYear()}.${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
		if (parsed && current?.startsWith(`${stamp}.`)) return `${stamp}.${parsed.numbers[2] + 1}`;
		return `${stamp}.0`;
	}

	const [major, minor, patch] = parsed?.numbers ?? [0, 0, 0];
	if (mode === "pridever") {
		if (bump === "proud") return `${major + 1}.0.0`;
		// `fix` is the SHAME component; everything else is an ordinary release.
		if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
		return `${major}.${minor + 1}.0`;
	}
	if (mode === "zerover") {
		// The major never leaves zero, so a breaking change lands on the minor instead.
		if (bump === "minor" || bump === "major") return `0.${minor + 1}.0`;
		return `0.${minor}.${patch + 1}`;
	}
	if (bump === "major") return `${major + 1}.0.0`;
	if (bump === "minor") return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

/** Lists the repository's tags, or an empty list when git is unavailable. */
export function gitTags(root: string): string[] {
	return gitOrEmpty(root, "tag", "--list")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

/** Collects full commit messages added since a tag, newest first. */
export function commitsSince(root: string, tag: string | null): string[] {
	const span = tag ? `${tag}..HEAD` : "HEAD";
	return gitOrEmpty(root, "log", span, "--format=%B%x00")
		.split("\0")
		.map((chunk) => chunk.trim())
		.filter((chunk) => chunk.length > 0);
}

/**
 * Runs git for the read-only queries above, yielding nothing when it cannot answer.
 *
 * An unreadable repository has no tags and no commit window, which is the same position as one
 * that has never been released, and a first release is a legitimate answer. The mitigation for a
 * clone that is merely too shallow to see the tags is the release workflow's `fetch-depth: 0`, and
 * it is load-bearing: without it a shallow clone reads as an unreleased repository.
 */
function gitOrEmpty(root: string, ...args: string[]): string {
	const result = Bun.spawnSync(["git", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
	return result.exitCode === 0 ? result.stdout.toString() : "";
}

/** Reads the `VERSION` file used by `manual` mode. */
export function readManualVersion(root: string): string | null {
	const path = join(root, "VERSION");
	if (!existsSync(path)) return null;
	return readFileSync(path, "utf8").trim() || null;
}

/**
 * Works out the next release for a repository.
 *
 * Under `manual` mode a `VERSION` that is genuinely ahead of the last release is the owner's
 * decision and wins outright. A `VERSION` that merely matches the last release, or that names one
 * behind it because a record never landed, is not a choice: the pipeline advances from the last
 * release in the scheme the file is written in, so a promotion cuts a new release instead of
 * re-cutting the last one.
 */
export function resolve(
	root: string,
	requested?: string | null,
	env: NodeJS.ProcessEnv = process.env,
): VersionDecision {
	const config = loadConfig(root, env);
	const { mode, tag_prefix: prefix, initial } = config;

	const declared = readManualVersion(root);
	const parsedDeclared = declared ? parseVersion(declared) : null;
	// The declared version says which release line this repository is on, so the comparison is
	// narrowed to that line rather than weighed against a superseded scheme.
	const currentTag = latestTag(gitTags(root), parsedDeclared?.scheme ?? null);
	const current = currentTag ? currentTag.replace(new RegExp(`^${prefix}`, "u"), "") : null;

	if (mode === "manual") {
		if (declared === null) {
			throw new VersioningError("manual versioning requires a VERSION file at the repository root");
		}
		if (isAhead(declared, current)) {
			return { mode, current, current_tag: currentTag, next: declared, tag: `${prefix}${declared}`, bump: "declared" };
		}
		const bump = classifyCommits(commitsSince(root, currentTag));
		const upcoming = current ? bumpVersion(current, bump) : null;
		return {
			mode,
			current,
			current_tag: currentTag,
			next: upcoming,
			tag: upcoming ? `${prefix}${upcoming}` : null,
			bump,
		};
	}

	if (requested && parseVersion(requested)) {
		const exact = requested.replace(new RegExp(`^${prefix}`, "u"), "");
		return { mode, current, current_tag: currentTag, next: exact, tag: `${prefix}${exact}`, bump: "explicit" };
	}
	const bump: Bump | null = requested ? (requested as Bump) : classifyCommits(commitsSince(root, currentTag));
	if (current === null && bump !== null) {
		return { mode, current, current_tag: currentTag, next: initial, tag: `${prefix}${initial}`, bump };
	}
	const upcoming = nextVersion(mode, current, bump);
	return {
		mode,
		current,
		current_tag: currentTag,
		next: upcoming,
		tag: upcoming ? `${prefix}${upcoming}` : null,
		bump,
	};
}

if (import.meta.main) {
	const args = process.argv.slice(2);
	const value = (name: string): string | undefined => {
		const index = args.indexOf(name);
		return index >= 0 ? args[index + 1] : undefined;
	};
	const root = value("--repo-root") ?? ".";
	try {
		console.log(JSON.stringify(resolve(root, value("--bump") ?? process.env.REQUESTED_BUMP ?? null), null, 2));
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
