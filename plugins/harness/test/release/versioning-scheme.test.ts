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
	resolveRelease,
	type VersioningMode,
} from "../../src/release/versioning.ts";

/**
 * These tests pin the version scheme the owner already decided, so the TypeScript resolver that
 * replaces `.github/scripts/versioning.py` cannot quietly introduce a second one. The two facts
 * that matter are that the `3a` letter survives a bump and that immutable published tags
 * prevent accidental re-use even when the configured release target becomes stale.
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
		JSON.stringify({ repo: { versioning: { mode: "manual", tag_prefix: "v", initial: "3a.1.0", ...(options.version === null ? {} : { next: options.version ?? "3a.2.0" }), ...options.config } } }),
	);
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
		// The resolver this replaced threw on a pridever bump. The one in `src/release` implements
		// PrideVer, so a `proud` bump advances the patch rather than being rejected.
		expect(bumpVersion("3a.1.0", "proud")).toBe("3a.1.1");
	});

	test("compares within one scheme and treats a new scheme as a deliberate choice", () => {
		expect(isAhead("3a.2.0", "3a.1.0")).toBe(true);
		expect(isAhead("3a.1.0", "3a.2.0")).toBe(false);
		expect(isAhead("3a.2.0", "3a.2.0")).toBe(false);
		expect(isAhead("3b.0.0", "3a.9.9")).toBe(true);
		expect(isAhead("3a.1.0", null)).toBe(true);
		expect(isAhead(null, "3a.1.0")).toBe(false);
	});

	// The resolver can narrow to the configured release line, so a superseded scheme that happens to
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
		expect(loadConfig(root)).toEqual({ mode: "manual", tagPrefix: "v", initial: "3a.1.0", next: "3a.2.0" });
	});

	test("rejects a mode this resolver does not implement rather than defaulting it", async () => {
		const root = await repository({ config: { mode: "calendaver" } });
		expect(() => loadConfig(root)).toThrow("unknown versioning mode 'calendaver'");
	});

	test("requires no separate version file under manual versioning", async () => {
		const root = await repository({ version: null });
		expect(resolveRelease(root).next).toBeNull();
		expect(resolveRelease(root, "3a.9.0").next).toBe("3a.9.0");
	});

	// The declared manual target wins over Conventional Commits, without another repository file.
	test("releases a declared version that is ahead of the last tag verbatim", async () => {
		const root = await repository({ version: "3b.0.0" });
		expect(resolveRelease(root)).toMatchObject({
			mode: "manual",
			next: "3b.0.0",
			tag: "v3b.0.0",
			bump: "declared",
		});
	});

	test("does not automatically bump a manually configured version after it is tagged", async () => {
		const root = await repository({ version: "3a.2.0" });
		commit(root, "chore: first");
		git(root, "tag", "v3a.2.0");
		git(root, "commit", "-q", "--allow-empty", "-m", "feat(harness): a new capability");

		expect(resolveRelease(root)).toMatchObject({ current: "3a.2.0", next: null, tag: null });
		expect(resolveRelease(root, "3a.3.0")).toMatchObject({ next: "3a.3.0", tag: "v3a.3.0" });
	});

	test("rejects a stale manual version without reusing its tag", async () => {
		const root = await repository({ version: "3a.1.0" });
		commit(root, "chore: first");
		git(root, "tag", "v3a.2.0");
		git(root, "commit", "-q", "--allow-empty", "-m", "fix(harness): a fix");

		expect(resolveRelease(root)).toMatchObject({ current: "3a.2.0", next: null, tag: null });
		expect(resolveRelease(root, "3a.2.1")).toMatchObject({ next: "3a.2.1", tag: "v3a.2.1" });
	});

	test("warrants no release when the configured version is already tagged", async () => {
		const root = await repository({ version: "3a.2.0" });
		commit(root, "chore: first");
		git(root, "tag", "v3a.2.0");

		expect(resolveRelease(root)).toMatchObject({ next: null, tag: null, bump: null });
	});

	// The test that used to sit here spawned `versioning.py` and asserted the two resolvers agreed.
	// It was a real invariant while both existed — two implementations read the same tree, and a
	// divergence meant a release named one thing and tagged another. With the Python gone the
	// TypeScript is the only resolver, so there is nothing to agree with, and a comparison against a
	// deleted module would assert nothing while still spawning an interpreter. What remains in this
	// file is the resolver's own behaviour on this repository, which is the claim that matters now.
});
