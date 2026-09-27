import { existsSync, readFileSync } from "node:fs";
// Aliased deliberately: this module exports a `resolve` of its own, which would otherwise shadow
// the path helper for the whole file and make every internal `resolve(root, "VERSION")` recursive.
import { resolve as resolvePath } from "node:path";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "@darkfactory/protocol/config-document";
import { runGit } from "../workspace/git.ts";

/** Versioning modes, read from the manifest rather than hardcoded. */
export const MODES = ["semver", "zerover", "pridever", "calver", "manual"] as const;

/** A versioning mode. */
export type VersioningMode = (typeof MODES)[number];

/** Bump sizes. `proud` is PrideVer's own. */
export const BUMPS = ["major", "minor", "patch", "proud"] as const;

/** A bump size, or `null` when nothing release-worthy landed. */
export type Bump = (typeof BUMPS)[number] | null;

/** Conventional Commit types that mean a user-visible fix: the smallest bump. */
const PATCH_TYPES: ReadonlySet<string> = new Set(["fix", "perf", "revert"]);

/** Conventional Commit types that mean a user-visible addition: a middle bump. */
const MINOR_TYPES: ReadonlySet<string> = new Set(["feat"]);

/** `type(scope)!: subject` — the `!` and a `BREAKING CHANGE:` trailer both mean breaking. */
const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?:\s/;

/** A `BREAKING CHANGE:` trailer anywhere in the message. */
const BREAKING_TRAILER = /^BREAKING[ -]CHANGE:/m;

/**
 * A release version: two or three dot-separated components whose first may carry a scheme suffix
 * (`3a.1.0`), so a repository's own numbering stays legible instead of invisible to the comparison.
 */
const VERSION = /^(?<nums>\d+[a-z]*(?:\.\d+){1,2})$/;

/** The first component: a number optionally followed by the scheme letter, as `3a` is `3` on `a`. */
const HEAD = /^(?<number>\d+)(?<scheme>[a-z]*)$/;

/** Raised when a repository's versioning configuration cannot be honoured. */
export class VersioningError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "VersioningError";
	}
}

/** The `versioning` block as the manifest declares it. */
export interface VersioningConfig {
	/** How versions are numbered. */
	mode: VersioningMode;
	/** Prefix a release tag carries. */
	tagPrefix: string;
	/** First version, used when nothing has been released yet. */
	initial: string;
}

/**
 * Reads the versioning block from the repository manifest.
 *
 * @param repoRoot Repository root.
 * @returns The declared block, defaulted where the manifest is silent.
 * @throws {VersioningError} When the declared mode is not one this module implements.
 */
export function loadConfig(repoRoot: string): VersioningConfig {
	const path = resolveConfigDocumentPath(repoRoot);
	const declared =
		(path ? configBlock(parseConfigDocument(readFileSync(path, "utf8"), path), "repo", path) : undefined) ?? {};
	const block = (declared.versioning ?? {}) as Record<string, unknown>;
	const mode = String(block.mode ?? "semver");
	if (!(MODES as readonly string[]).includes(mode)) {
		throw new VersioningError(`unknown versioning mode '${mode}'; expected one of ${MODES.join(", ")}`);
	}
	return {
		mode: mode as VersioningMode,
		tagPrefix: String(block.tag_prefix ?? "v"),
		initial: String(block.initial ?? "0.1.0"),
	};
}

/**
 * Derives the bump size implied by a batch of Conventional Commit messages.
 *
 * @param subjects Full commit messages, subject plus body.
 * @returns The bump, or `null` when nothing release-worthy landed.
 */
export function classifyCommits(subjects: Iterable<string>): Bump {
	let result: Bump = null;
	for (const message of subjects) {
		const header = message.split("\n")[0] ?? "";
		const match = HEADER.exec(header);
		if (!match?.groups) continue;
		if (match.groups["bang"] || BREAKING_TRAILER.test(message)) return "major";
		const type = match.groups["type"] ?? "";
		if (MINOR_TYPES.has(type)) result = "minor";
		else if (PATCH_TYPES.has(type) && result === null) result = "patch";
	}
	return result;
}

/** A version split into its scheme letter and its three numbers. */
interface ParsedVersion {
	/** Scheme letter, empty for a plain numeric version. */
	scheme: string;
	/** Major, minor and patch, padded to three. */
	numbers: [number, number, number];
}

/**
 * Turns a release tag or version into its scheme letter and its numbers.
 *
 * @param tag A tag or bare version, with or without a leading `v`.
 * @returns The parsed version, or `null` when the input is not a release version.
 */
export function parseVersion(tag: string): ParsedVersion | null {
	const match = VERSION.exec(tag.trim().replace(/^v/, ""));
	const nums = match?.groups?.["nums"];
	if (!nums) return null;
	const parts = nums.split(".");
	const head = HEAD.exec(parts[0] ?? "");
	if (!head?.groups) return null;
	const numbers = [Number(head.groups["number"]), ...parts.slice(1).map(Number)];
	while (numbers.length < 3) numbers.push(0);
	const [major = 0, minor = 0, patch = 0] = numbers;
	return { scheme: head.groups["scheme"] ?? "", numbers: [major, minor, patch] };
}

/** Rebuilds a version from its scheme letter and numbers, e.g. `3a.2.0`. */
export function renderVersion(scheme: string, major: number, minor: number, patch: number): string {
	return `${major}${scheme}.${minor}.${patch}`;
}

/**
 * Applies a bump to a version without changing the scheme it is written in.
 *
 * A repository that versions itself `3a.1.0` gets `3a.2.0` and not `3.2.0`: the letter is part of
 * the version and nothing here decides what it means. A major bump moves the number and keeps the
 * letter, because a genuinely new scheme is a decision the `VERSION` file exists to record.
 *
 * @param current Version being bumped.
 * @param bump Bump size; `null` warrants no release.
 * @returns The bumped version, or `null` when nothing is warranted or `current` is unparseable.
 * @throws {VersioningError} When the bump is not a size this module understands.
 */
export function bumpVersion(current: string, bump: Bump): string | null {
	if (bump === null) return null;
	if (!(BUMPS as readonly string[]).includes(bump)) {
		throw new VersioningError(`unknown bump '${bump}'; expected one of ${BUMPS.join(", ")}`);
	}
	const parsed = parseVersion(current);
	if (!parsed) return null;
	const [major, minor, patch] = parsed.numbers;
	if (bump === "major") return renderVersion(parsed.scheme, major + 1, 0, 0);
	if (bump === "minor") return renderVersion(parsed.scheme, major, minor + 1, 0);
	return renderVersion(parsed.scheme, major, minor, patch + 1);
}

/**
 * Reports whether a candidate version is ahead of the current one.
 *
 * @param candidate Version being proposed.
 * @param current Version currently released, if any.
 * @returns True when the candidate sorts after the current version.
 */
export function isAhead(candidate: string | null, current: string | null): boolean {
	if (candidate === null) return false;
	if (current === null) return true;
	const a = parseVersion(candidate);
	const b = parseVersion(current);
	if (!a || !b) return false;
	if (a.scheme !== b.scheme) return true;
	for (let index = 0; index < 3; index += 1) {
		const left = a.numbers[index] ?? 0;
		const right = b.numbers[index] ?? 0;
		if (left !== right) return left > right;
	}
	return false;
}

/**
 * Picks the highest release tag, ignoring anything that is not one.
 *
 * @param tags Candidate tag names.
 * @param prefer Scheme letter to narrow to, such as the `a` of a declared `3a.1.0`. Narrowing
 *   keeps a repository on the release line it says it is on rather than comparing it against a
 *   superseded scheme that happens to sort lower or higher.
 * @returns The highest tag, or `null` when the repository has never been released.
 */
export function latestTag(tags: readonly string[], prefer?: string | null): string | null {
	const parsed: { tag: string; scheme: string; numbers: [number, number, number] }[] = [];
	for (const tag of tags) {
		const result = parseVersion(tag);
		if (result) parsed.push({ tag, scheme: result.scheme, numbers: result.numbers });
	}
	if (parsed.length === 0) return null;
	let candidates = parsed;
	if (prefer) {
		const sameScheme = parsed.filter((entry) => entry.scheme === prefer);
		// Only narrow when the preferred line actually has a tag; otherwise fall back rather than
		// reporting no release at all.
		if (sameScheme.length > 0) candidates = sameScheme;
	}
	let best = candidates[0]!;
	for (const entry of candidates.slice(1)) {
		for (let index = 0; index < 3; index += 1) {
			const left = entry.numbers[index] ?? 0;
			const right = best.numbers[index] ?? 0;
			if (left === right) continue;
			if (left > right) best = entry;
			break;
		}
	}
	return best.tag;
}

/**
 * Applies a bump to the current version under the given mode.
 *
 * @param mode One of {@link MODES}.
 * @param current Current version, or `null` when nothing has been released.
 * @param bump Bump size; `null` means the commit log implied no release.
 * @param today Date `calver` stamps; defaults to the current UTC date.
 * @returns The next version, or `null` when no release is warranted.
 * @throws {VersioningError} When the mode is unknown, or `proud` is requested outside PrideVer.
 */
export function nextVersion(mode: VersioningMode, current: string | null, bump: Bump, today?: Date): string | null {
	if (!(MODES as readonly string[]).includes(mode)) throw new VersioningError(`unknown versioning mode '${mode}'`);
	if (mode === "manual") return null;
	if (bump === "proud" && mode !== "pridever") {
		throw new VersioningError("a 'proud' bump is only meaningful under pridever");
	}
	if (bump === null) return null;

	const parsed = current === null ? null : parseVersion(current);
	const major = parsed?.numbers[0] ?? 0;
	const minor = parsed?.numbers[1] ?? 0;
	const patch = parsed?.numbers[2] ?? 0;

	if (mode === "calver") {
		const day = today ?? new Date();
		const stamp = `${day.getUTCFullYear()}.${String(day.getUTCMonth() + 1).padStart(2, "0")}`;
		if (parsed && current?.startsWith(`${stamp}.`)) return `${stamp}.${patch + 1}`;
		return `${stamp}.0`;
	}

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

	if (bump === "major") return `${major + 1}.0.0`;
	if (bump === "minor") return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

/**
 * Reads the version the `VERSION` file declares.
 *
 * Under `manual` mode this file is the owner's control: nothing else may decide a version.
 *
 * @param repoRoot Repository root.
 * @returns The declared version, or `null` when the file is absent or empty.
 */
export function readManualVersion(repoRoot: string): string | null {
	const path = resolvePath(repoRoot, "VERSION");
	if (!existsSync(path)) return null;
	const content = readFileSync(path, "utf8").trim();
	return content.length > 0 ? content : null;
}

/** Lists the repository's tags, or an empty list when git cannot answer. */
export function gitTags(repoRoot: string): string[] {
	try {
		return runGit(repoRoot, ["tag", "--list"])
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
	} catch {
		return [];
	}
}

/** Commit subjects since a tag, or every commit when there is no tag yet. */
export function commitsSince(repoRoot: string, tag: string | null): string[] {
	try {
		const range = tag ? `${tag}..HEAD` : "HEAD";
		return runGit(repoRoot, ["log", "--format=%B%x00", range])
			.split("\0")
			.map((message) => message.trim())
			.filter((message) => message.length > 0);
	} catch {
		return [];
	}
}

/** What {@link resolveRelease} decided about the next release. */
export interface ReleaseDecision {
	/** The mode the manifest declares. */
	mode: VersioningMode;
	/** Version currently released, or `null` when nothing has been. */
	current: string | null;
	/** Tag currently released, or `null`. */
	currentTag: string | null;
	/** The version to release, or `null` when none is warranted. */
	next: string | null;
	/** The tag `next` would carry, or `null`. */
	tag: string | null;
	/** Where the bump came from: the log, an explicit request, the `VERSION` file, or nothing. */
	bump: string | null;
}

/**
 * Works out the next release for a repository.
 *
 * @param repoRoot Repository root.
 * @param requested An explicit bump or exact version a human asked for, overriding the log.
 * @returns The decision; `next` is `null` when no release is warranted.
 * @throws {VersioningError} When `manual` is selected but no `VERSION` file exists.
 */
export function resolveRelease(repoRoot: string, requested?: string | null): ReleaseDecision {
	const config = loadConfig(repoRoot);
	const prefix = config.tagPrefix;

	const declared = readManualVersion(repoRoot);
	const prefer = declared === null ? null : (parseVersion(declared)?.scheme ?? null);
	const currentTag = latestTag(gitTags(repoRoot), prefer);
	const current =
		currentTag === null ? null : currentTag.startsWith(prefix) ? currentTag.slice(prefix.length) : currentTag;

	if (config.mode === "manual") {
		if (declared === null) {
			throw new VersioningError("manual versioning requires a VERSION file at the repository root");
		}
		if (isAhead(declared, current)) {
			// The file names something newer than what is released: that is the owner's decision,
			// and it wins over anything the commit log implies.
			return { mode: config.mode, current, currentTag, next: declared, tag: `${prefix}${declared}`, bump: "declared" };
		}
		// Either the file already matches the last release, or it names one behind it because a
		// record never landed. A stale file is not a choice: treating it as one would re-release an
		// old number, so the pipeline advances from the last release instead.
		const bump = classifyCommits(commitsSince(repoRoot, currentTag));
		const upcoming = current === null ? null : bumpVersion(current, bump);
		return {
			mode: config.mode,
			current,
			currentTag,
			next: upcoming,
			tag: upcoming === null ? null : `${prefix}${upcoming}`,
			bump,
		};
	}

	if (requested && parseVersion(requested)) {
		const upcoming = requested.replace(/^v/, "");
		return { mode: config.mode, current, currentTag, next: upcoming, tag: `${prefix}${upcoming}`, bump: "explicit" };
	}

	const bump: Bump = requested ? (requested as Bump) : classifyCommits(commitsSince(repoRoot, currentTag));
	const upcoming = current === null && bump !== null ? config.initial : nextVersion(config.mode, current, bump);
	return {
		mode: config.mode,
		current,
		currentTag,
		next: upcoming,
		tag: upcoming === null ? null : `${prefix}${upcoming}`,
		bump,
	};
}
