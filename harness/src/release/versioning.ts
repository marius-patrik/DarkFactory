/** @packageDocumentation
 * Release versioning: computes the next release version under a configurable versioning mode.
 *
 * The versioning mode is read from the repository manifest (`repo.versioning.mode`), not hardcoded.
 * Five modes are supported: `semver`, `zerover`, `pridever`, `calver`, `manual`.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { $ } from "bun";
import { loadRepoManifest } from "./manifest.ts";

/** Every versioning mode this module understands. */
export const MODES = ["semver", "zerover", "pridever", "calver", "manual"] as const;
export type VersioningMode = (typeof MODES)[number];

/** Bump sizes, ordered from smallest to largest, shared by the numeric modes. */
export const BUMPS = ["patch", "minor", "major"] as const;
export type BumpSize = (typeof BUMPS)[number];

/** Conventional Commit types that mean "a user-visible fix", i.e. the smallest bump. */
const PATCH_TYPES = ["fix", "perf", "revert"] as const;

/** Conventional Commit types that mean "a user-visible addition", i.e. a middle bump. */
const MINOR_TYPES = ["feat"] as const;

/** `type(scope)!: subject` - the `!` and a `BREAKING CHANGE:` trailer both mean a breaking change. */
const HEADER_RE = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?:\s/;
const BREAKING_TRAILER_RE = /^BREAKING[ -]CHANGE:/m;

/** A release version: two or three dot-separated components whose first may carry a scheme suffix
 * (`3a.1.0`), so a repository's own numbering is legible to the comparison instead of invisible to
 * it. A tag is this with the prefix in front, which is stripped before parsing. */
const VERSION_RE = /^(?<nums>\d+[a-z]*(?:\.\d+){1,2})$/;

/** The first component of a version: a number optionally followed by the scheme letter, so `3a` is
 * major number 3 on scheme `a`. The letter is never interpreted, only carried through. */
const HEAD_RE = /^(?<number>\d+)(?<scheme>[a-z]*)$/;

/** Versioning configuration loaded from the manifest. */
export interface VersioningConfig {
	mode: VersioningMode;
	tagPrefix: string;
	initial: string;
}

/** Result of resolving the next release version. */
export interface ResolveResult {
	mode: VersioningMode;
	current: string | null;
	currentTag: string | null;
	next: string | null;
	tag: string | null;
	bump: string | null;
}

/** Loads the versioning block from the repository manifest.
 *
 * @param repoRoot - Path to the repository root.
 * @returns The `versioning` object from the manifest, defaulted where absent.
 * @throws {Error} If the declared mode is not one this module implements.
 */
export function loadConfig(repoRoot: string): VersioningConfig {
	const manifest = loadRepoManifest(repoRoot);
	const versioning = (manifest.versioning ?? {}) as Record<string, unknown>;

	const mode = String(versioning.mode ?? "semver") as VersioningMode;
	if (!MODES.includes(mode)) {
		throw new Error(`unknown versioning mode ${mode}; expected one of ${MODES.join(", ")}`);
	}

	const tagPrefix = String(versioning.tagPrefix ?? "v");
	const initial = String(versioning.initial ?? (mode === "zerover" || mode === "pridever" ? "0.1.0" : "0.1.0"));

	return { mode, tagPrefix, initial };
}

/** Derives the bump size implied by a batch of Conventional Commit messages.
 *
 * @param subjects - Commit messages, each the full message (subject plus body).
 * @returns `"major"`, `"minor"`, `"patch"`, or `null` when nothing release-worthy landed.
 */
export function classifyCommits(subjects: readonly string[]): string | null {
	let result: string | null = null;
	for (const message of subjects) {
		const header = message.split("\n")[0] ?? "";
		const match = HEADER_RE.exec(header);
		if (!match) continue;
		if (match.groups?.bang || BREAKING_TRAILER_RE.test(message)) {
			return "major";
		}
		const commitType = match.groups?.type ?? "";
		if (MINOR_TYPES.includes(commitType as "feat")) {
			result = "minor";
		} else if (PATCH_TYPES.includes(commitType as "fix" | "perf" | "revert") && result === null) {
			result = "patch";
		}
	}
	return result;
}

/** Turns a release tag or version into its scheme letter and its numbers.
 *
 * @param tag - A tag name or bare version, with or without a leading `v`.
 * @returns The scheme letter (`""` when there is none) and the components padded to three, or `null` when the input is not a release version.
 */
function parseVersion(tag: string): { scheme: string; numbers: number[] } | null {
	const cleaned = tag.trim().replace(/^v/, "");
	const match = VERSION_RE.exec(cleaned);
	if (!match) return null;
	const parts = match.groups!.nums.split(".");
	const firstMatch = HEAD_RE.exec(parts[0]);
	if (!firstMatch) return null;
	const numbers = [parseInt(firstMatch.groups!.number, 10), ...parts.slice(1).map((p) => parseInt(p, 10))];
	while (numbers.length < 3) numbers.push(0);
	return { scheme: firstMatch.groups!.scheme, numbers };
}

/** Rebuilds a version from its scheme letter and numbers.
 *
 * @param scheme - The scheme letter, or `""` for a plain numeric version.
 * @param major - The most significant component.
 * @param minor - The middle component.
 * @param patch - The least significant component.
 * @returns The version string, e.g. `3a.2.0`.
 */
function renderVersion(scheme: string, major: number, minor: number, patch: number): string {
	return `${major}${scheme}.${minor}.${patch}`;
}

/** Applies a bump to a version without changing the scheme it is written in.
 *
 * A repository that versions itself `3a.1.0` gets `3a.2.0` and not `3.2.0`: the letter is part of
 * the version, and nothing here decides what it means. A bump to the major component moves the
 * number and keeps the letter, because a genuinely new scheme is a decision the `VERSION` file
 * exists to record explicitly.
 *
 * @param current - The version being bumped.
 * @param bump - `"major"`, `"minor"`, or `"patch"`; `null` warrants no release.
 * @returns The bumped version, or `null` when nothing is warranted or `current` is unparseable.
 * @throws {Error} If the bump is not a size this module understands.
 */
export function bumpVersion(current: string, bump: string | null): string | null {
	if (bump === null) return null;
	if (!BUMPS.includes(bump as BumpSize)) {
		throw new Error(`unknown bump ${bump}; expected one of ${BUMPS.join(", ")}`);
	}
	const parsed = parseVersion(current);
	if (!parsed) return null;
	const { scheme, numbers } = parsed;
	const [major, minor, patch] = numbers;
	if (bump === "major") return renderVersion(scheme, major + 1, 0, 0);
	if (bump === "minor") return renderVersion(scheme, major, minor + 1, 0);
	return renderVersion(scheme, major, minor, patch + 1);
}

/** Reports whether a version is a deliberate step past the one already released.
 *
 * Both sides are compared within one scheme, so `3b.0.0` is ahead of `3a.9.9` and `3a.1.0` is not
 * ahead of `3a.2.0`. A version in a different scheme than the current release cannot be compared
 * numerically, and a declared version that names an unreleased scheme is a choice, not staleness.
 *
 * @param candidate - The version being considered, or `null`.
 * @param current - The last released version, or `null` when nothing has been released.
 * @returns `true` when `candidate` names something newer than `current`.
 */
export function isAhead(candidate: string | null, current: string | null): boolean {
	if (!candidate) return false;
	const left = parseVersion(candidate);
	const right = current ? parseVersion(current) : null;
	if (!left) return false;
	if (!right) return true;
	if (left.scheme !== right.scheme) return true;
	return left.numbers[0] > right.numbers[0] ||
		(left.numbers[0] === right.numbers[0] && left.numbers[1] > right.numbers[1]) ||
		(left.numbers[0] === right.numbers[0] && left.numbers[1] === right.numbers[1] && left.numbers[2] > right.numbers[2]);
}

/** Picks the highest release tag from a list, ignoring anything that is not one.
 *
 * @param tags - Candidate tag names.
 * @param prefer - A scheme letter to narrow the candidates to, such as the `a` of a declared
 *   `3a.1.0`. Narrowing keeps a repository on the release line it says it is on instead of
 *   comparing it against a superseded scheme that happens to sort lower or higher.
 * @returns The highest tag, or `null` when the repository has never been released.
 */
export function latestTag(tags: readonly string[], prefer?: string | null): string | null {
	const parsed: Array<{ numbers: number[]; scheme: string; tag: string }> = [];
	for (const tag of tags) {
		const result = parseVersion(tag);
		if (result) parsed.push({ numbers: result.numbers, scheme: result.scheme, tag });
	}
	if (parsed.length === 0) return null;

	if (prefer) {
		const sameScheme = parsed.filter((entry) => entry.scheme === prefer);
		if (sameScheme.length > 0) return sameScheme.reduce((a, b) => compareVersions(b.numbers, a.numbers) > 0 ? b : a).tag;
	}
	return parsed.reduce((a, b) => compareVersions(b.numbers, a.numbers) > 0 ? b : a).tag;
}

function compareVersions(a: readonly number[], b: readonly number[]): number {
	for (let i = 0; i < 3; i++) {
		if (a[i] !== b[i]) return a[i] - b[i];
	}
	return 0;
}

/** Lists the repository's tags.
 *
 * @param repoRoot - Path to the repository root.
 * @returns Tag names, or an empty array when git is unavailable or there are none.
 */
export async function gitTags(repoRoot: string): Promise<string[]> {
	try {
		const result = await $`git -C ${repoRoot} tag --list`.text();
		return result.trim().split("\n").filter((line) => line.trim().length > 0);
	} catch {
		return [];
	}
}

/** Collects commit messages added since a tag.
 *
 * @param repoRoot - Path to the repository root.
 * @param tag - The tag to measure from, or `null` to take the whole history.
 * @returns Full commit messages, newest first.
 */
export async function commitsSince(repoRoot: string, tag: string | null): Promise<string[]> {
	const span = tag ? `${tag}..HEAD` : "HEAD";
	try {
		const result = await $`git -C ${repoRoot} log ${span} --format=%B%x00`.text();
		return result.split("\0").map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 0);
	} catch {
		return [];
	}
}

/** Reads the `VERSION` file used by `manual` mode.
 *
 * @param repoRoot - Path to the repository root.
 * @returns The declared version, or `null` when the file is absent or empty.
 */
export function readManualVersion(repoRoot: string): string | null {
	const path = resolve(repoRoot, "VERSION");
	if (!existsSync(path)) return null;
	const content = readFileSync(path, "utf8").trim();
	return content.length > 0 ? content : null;
}

/** Applies a bump to the current version under the given mode.
 *
 * @param mode - One of `MODES`.
 * @param current - The current version, or `null` if nothing has been released yet.
 * @param bump - `"major"`, `"minor"`, `"patch"`, or `"proud"` for PrideVer. `null` means the commit
 *   log implied no release.
 * @param today - Date used by `calver`; defaults to the current UTC date.
 * @returns The next version string, or `null` when no release is warranted.
 * @throws {Error} If the mode is unknown, or `proud` is requested outside PrideVer.
 */
export function nextVersion(
	mode: VersioningMode,
	current: string | null,
	bump: string | null,
	today: Date = new Date(),
): string | null {
	if (!MODES.includes(mode)) throw new Error(`unknown versioning mode ${mode}`);
	if (mode === "manual") return null;
	if (bump === "proud" && mode !== "pridever") throw new Error("a 'proud' bump is only meaningful under pridever");
	if (bump === null) return null;

	if (mode === "calver") {
		const stamp = `${today.getUTCFullYear()}.${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
		const parsed = current ? parseVersion(current) : null;
		const numbers = parsed?.numbers;
		if (numbers && current && current.startsWith(`${stamp}.`)) {
			return `${stamp}.${numbers[2] + 1}`;
		}
		return `${stamp}.0`;
	}

	const parsed = current ? parseVersion(current) : null;
	const [major, minor, patch] = parsed?.numbers ?? [0, 0, 0];

	if (mode === "pridever") {
		if (bump === "proud") return `${major + 1}.0.0`;
		// `fix` is the SHAME component; everything else is an ordinary release.
		if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
		return `${major}.${minor + 1}.0`;
	}

	if (mode === "zerover") {
		// The major never leaves zero, so a breaking change lands on the minor instead.
		if (bump === "major" || bump === "minor") return `0.${minor + 1}.0`;
		return `0.${minor}.${patch + 1}`;
	}

	// semver
	if (bump === "major") return `${major + 1}.0.0`;
	if (bump === "minor") return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

/** Works out the next release for a repository.
 *
 * @param repoRoot - Path to the repository root.
 * @param requested - An explicit bump requested by a human, which overrides the commit log. Accepts
 *   any of `BUMPS`, `"proud"`, or an exact version string.
 * @returns A mapping with `mode`, `current`, `currentTag`, `next`, `tag` and `bump`. `next` is `null`
 *   when no release is warranted.
 * @throws {Error} If `manual` mode is selected but no `VERSION` file exists.
 */
export async function resolve(repoRoot: string, requested?: string | null): Promise<ResolveResult> {
	const config = loadConfig(repoRoot);
	const mode = config.mode;
	const prefix = config.tagPrefix;

	const tags = await gitTags(repoRoot);
	const declared = readManualVersion(repoRoot);
	const parsedDeclared = declared ? parseVersion(declared) : null;
	const prefer = parsedDeclared?.scheme ?? null;
	const currentTag = latestTag(tags, prefer);
	const current = currentTag?.startsWith(prefix) ? currentTag.slice(prefix.length) : currentTag ?? null;

	if (mode === "manual") {
		if (!declared) {
			throw new Error("manual versioning requires a VERSION file at the repository root");
		}
		if (isAhead(declared, current)) {
			// The file names something newer than what is released: that is the owner's decision,
			// and it wins over anything the commit log implies.
			return {
				mode,
				current,
				currentTag,
				next: declared,
				tag: `${prefix}${declared}`,
				bump: "declared",
			};
		}
		// Either the file already matches the last release, or it names one that is behind it
		// because a record never landed. A stale file is not a choice: treating it as one would
		// re-release an old number, so the pipeline advances from the last release instead.
		const messages = await commitsSince(repoRoot, currentTag);
		const bump = classifyCommits(messages);
		const upcoming = current ? bumpVersion(current, bump) : null;
		return {
			mode,
			current,
			currentTag,
			next: upcoming,
			tag: upcoming ? `${prefix}${upcoming}` : null,
			bump,
		};
	}

	let bump: string | null = null;
	if (requested && parseVersion(requested)) {
		const upcoming = requested.replace(/^v/, "");
		return {
			mode,
			current,
			currentTag,
			next: upcoming,
			tag: `${prefix}${upcoming}`,
			bump: "explicit",
		};
	}
	if (requested) {
		bump = requested;
	} else {
		const messages = await commitsSince(repoRoot, currentTag);
		bump = classifyCommits(messages);
	}

	let upcoming: string | null = null;
	if (current === null && bump !== null) {
		upcoming = config.initial;
	} else {
		upcoming = nextVersion(mode, current, bump);
	}

	return {
		mode,
		current,
		currentTag,
		next: upcoming,
		tag: upcoming ? `${prefix}${upcoming}` : null,
		bump,
	};
}