import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	bumpVersion,
	classifyCommits,
	isAhead,
	latestTag,
	loadConfig,
	nextVersion,
	parseVersion,
	readManualVersion,
	resolve,
	VersioningError,
	type VersioningMode,
} from "../../../scripts/versioning.ts";

/**
 * These tests pin the version scheme the owner already decided, so the TypeScript resolver that
 * replaces `.github/scripts/versioning.py` cannot quietly introduce a second one. The two facts
 * that matter and are easy to lose are that the `3a` letter survives a bump, and that a `VERSION`
 * matching the last release advances from that release instead of re-releasing it.
 */
const roots: string[] = [];

afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

async function repository(
	options: { version?: string | null; config?: Record<string, unknown> } = {},
): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "df-versioning-"));
	roots.push(root);
	await writeFile(
		join(root, "repo.dfconfig"),
		JSON.stringify({ repo: { versioning: { mode: "manual", tag_prefix: "v", initial: "3a.1.0", ...options.config } } }),
	);
	if (options.version !== null) await writeFile(join(root, "VERSION"), `${options.version ?? "3a.2.0"}\n`);
	git(root, "init", "-q", "--initial-branch=main");
	git(root, "config", "user.email", "test@example.com");
	git(root, "config", "user.name", "test");
	return root;
}

function git(root: string, ...args: string[]): void {
	const result = Bun.spawnSync(["git", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
	if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.toString()}`);
}

/** Commits everything staged so far, so a tag can be placed on a known tree. */
function commit(root: string, message: string): void {
	git(root, "add", "-A");
	git(root, "commit", "-q", "-m", message);
}

describe("release version parsing", () => {
	test("carries the scheme letter through so 3a is legible to the comparison", () => {
		expect(parseVersion("v3a.2.0")).toEqual({ scheme: "a", numbers: [3, 2, 0] });
		expect(parseVersion("3a.2")).toEqual({ scheme: "a", numbers: [3, 2, 0] });
		expect(parseVersion("0.81.0")).toEqual({ scheme: "", numbers: [0, 81, 0] });
		expect(parseVersion("v3.1.0")).toEqual({ scheme: "", numbers: [3, 1, 0] });
		expect(parseVersion("main")).toBeNull();
		expect(parseVersion("3a")).toBeNull();
	});

	// `3a.1.0` plus a feature is `3a.2.0`. Dropping the letter would silently move the repository
	// onto a different numbering line that nothing here decided.
	test("bumps within the scheme the repository is written in", () => {
		expect(bumpVersion("3a.1.0", "minor")).toBe("3a.2.0");
		expect(bumpVersion("3a.1.0", "patch")).toBe("3a.1.1");
		expect(bumpVersion("3a.1.0", "major")).toBe("4a.0.0");
		expect(bumpVersion("0.81.0", "minor")).toBe("0.82.0");
		expect(bumpVersion("3a.1.0", null)).toBeNull();
		expect(() => bumpVersion("3a.1.0", "proud")).toThrow(VersioningError);
	});

	test("compares within one scheme and treats a new scheme as a deliberate choice", () => {
		expect(isAhead("3a.2.0", "3a.1.0")).toBe(true);
		expect(isAhead("3a.1.0", "3a.2.0")).toBe(false);
		expect(isAhead("3a.2.0", "3a.2.0")).toBe(false);
		expect(isAhead("3b.0.0", "3a.9.9")).toBe(true);
		expect(isAhead("3a.1.0", null)).toBe(true);
		expect(isAhead(null, "3a.1.0")).toBe(false);
	});

	// The comparison is narrowed to the line VERSION names, so a superseded scheme that happens to
	// sort higher cannot become `current` and re-release an old number.
	test("picks the highest tag on the declared release line", () => {
		expect(latestTag(["v0.81.0", "v3a.1.0", "v3a.2.0", "not-a-tag"], "a")).toBe("v3a.2.0");
		expect(latestTag(["v0.81.0", "v3a.1.0", "v3a.2.0"])).toBe("v3a.2.0");
		expect(latestTag(["v0.81.0", "v0.9.0"])).toBe("v0.81.0");
		expect(latestTag(["main", "develop"])).toBeNull();
	});

	test("classifies Conventional Commits with breaking winning over feat winning over fix", () => {
		expect(classifyCommits(["fix(harness): a"])).toBe("patch");
		expect(classifyCommits(["perf: a", "feat(cli): b"])).toBe("minor");
		expect(classifyCommits(["feat: a", "fix: b"])).toBe("minor");
		expect(classifyCommits(["fix: a", "feat!: b"])).toBe("major");
		expect(classifyCommits(["fix: a\n\nBREAKING CHANGE: gone"])).toBe("major");
		expect(classifyCommits(["docs: a", "chore: b"])).toBeNull();
		expect(classifyCommits([])).toBeNull();
	});

	test("keeps the other modes the shared pipeline supports", () => {
		expect(nextVersion("semver", "1.2.3", "major")).toBe("2.0.0");
		expect(nextVersion("zerover", "0.4.2", "major")).toBe("0.5.0");
		expect(nextVersion("pridever", "1.2.3", "proud")).toBe("2.0.0");
		expect(nextVersion("pridever", "1.2.3", "patch")).toBe("1.2.4");
		expect(nextVersion("calver", "2026.09.1", "patch", new Date("2026-09-27T00:00:00Z"))).toBe("2026.09.2");
		expect(nextVersion("calver", "2026.09.1", "patch", new Date("2026-10-01T00:00:00Z"))).toBe("2026.10.0");
		expect(nextVersion("manual", "3a.1.0", "minor")).toBeNull();
		expect(() => nextVersion("semver", "1.0.0", "proud")).toThrow("only meaningful under pridever");
		const unknownMode = "calendrical" as VersioningMode;
		expect(() => nextVersion(unknownMode, "1.0.0", "patch")).toThrow("unknown versioning mode");
	});
});

describe("release version source", () => {
	test("reads the mode, tag prefix and initial version from the repository configuration", async () => {
		const root = await repository();
		expect(loadConfig(root)).toEqual({ mode: "manual", tag_prefix: "v", initial: "3a.1.0" });
		expect(readManualVersion(root)).toBe("3a.2.0");
	});

	test("rejects a mode this resolver does not implement rather than defaulting it", async () => {
		const root = await repository({ config: { mode: "calendaver" } });
		expect(() => loadConfig(root)).toThrow("unknown versioning mode 'calendaver'");
	});

	test("requires a VERSION file under manual versioning", async () => {
		const root = await repository({ version: null });
		expect(() => resolve(root)).toThrow("manual versioning requires a VERSION file at the repository root");
	});

	// The decision a promotion makes when VERSION names something newer than what is released: the
	// owner's choice wins, and naming a version is a decision no commit log can make.
	test("releases a declared version that is ahead of the last tag verbatim", async () => {
		const root = await repository({ version: "3b.0.0" });
		expect(resolve(root)).toMatchObject({
			mode: "manual",
			next: "3b.0.0",
			tag: "v3b.0.0",
			bump: "declared",
		});
	});

	// PR #1114: a VERSION that merely matches the last release used to be released again, so the
	// job reported success and cut nothing. The file advancing itself is the fix.
	test("advances from the last release rather than re-releasing the recorded one", async () => {
		const root = await repository({ version: "3a.2.0" });
		commit(root, "chore: first");
		git(root, "tag", "v3a.2.0");
		git(root, "commit", "-q", "--allow-empty", "-m", "feat(harness): a new capability");

		const decision = resolve(root);
		expect(decision).toMatchObject({
			mode: "manual",
			current: "3a.2.0",
			current_tag: "v3a.2.0",
			next: "3a.3.0",
			tag: "v3a.3.0",
			bump: "minor",
		});
	});

	// PR #1118: a stale VERSION is not a choice. Re-releasing it is how the pipeline tried to cut
	// v3a.1.0 a second time after v3a.2.0 had already shipped.
	test("treats a VERSION behind the last tag as stale and advances from the last release", async () => {
		const root = await repository({ version: "3a.1.0" });
		commit(root, "chore: first");
		git(root, "tag", "v3a.2.0");
		git(root, "commit", "-q", "--allow-empty", "-m", "fix(harness): a fix");

		const decision = resolve(root);
		expect(decision.bump).not.toBe("declared");
		expect(decision).toMatchObject({ current: "3a.2.0", next: "3a.2.1", tag: "v3a.2.1", bump: "patch" });
	});

	test("warrants no release when the recorded version is the last release and nothing landed", async () => {
		const root = await repository({ version: "3a.2.0" });
		commit(root, "chore: first");
		git(root, "tag", "v3a.2.0");

		expect(resolve(root)).toMatchObject({ next: null, tag: null, bump: null });
	});

	// The test that used to sit here spawned `versioning.py` and asserted the two resolvers agreed.
	// It was a real invariant while both existed — two implementations read the same tree, and a
	// divergence meant a release named one thing and tagged another. With the Python gone the
	// TypeScript is the only resolver, so there is nothing to agree with, and a comparison against a
	// deleted module would assert nothing while still spawning an interpreter. What remains in this
	// file is the resolver's own behaviour on this repository, which is the claim that matters now.
});
