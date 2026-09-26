import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	bumpVersion,
	classifyCommits,
	isAhead,
	latestTag,
	loadConfig,
	nextVersion,
	resolveRelease,
	VersioningError,
} from "../src/release/versioning.ts";
import { runGit } from "../src/workspace/git.ts";

const BREAKING = "feat(agents)!: replace the harness invocation contract";
const BREAKING_TRAILER = "refactor(agents): rework the chain\n\nBREAKING CHANGE: harness ids are now namespaced";
const FEATURE = "feat(release): add a versioning mode";
const FIX = "fix(ci): stop dropping the final log line";
const CHORE = "chore(ci): bump the runner image";

const roots: string[] = [];
afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

/** Builds a throwaway git repository carrying a manifest and a commit log. */
async function initRepo(mode: string, commits: string[], version?: string): Promise<string> {
	const path = await mkdtemp(join(process.cwd(), ".versioning-test-"));
	roots.push(path);
	runGit(path, ["init", "-q", "-b", "main", "."]);
	runGit(path, ["config", "user.email", "t@example.com"]);
	runGit(path, ["config", "user.name", "T"]);
	await writeFile(join(path, "repo.dfconfig"), JSON.stringify({ repo: { versioning: { mode } } }));
	if (version !== undefined) await writeFile(join(path, "VERSION"), `${version}\n`);
	for (const [index, message] of commits.entries()) {
		await writeFile(join(path, `f${index}.txt`), message);
		runGit(path, ["add", "-A"]);
		runGit(path, ["commit", "-q", "-m", message]);
	}
	return path;
}

/** Records one more commit, so a release can be measured against a tag. */
async function later(path: string, message: string): Promise<void> {
	await writeFile(join(path, "later.txt"), message);
	runGit(path, ["add", "-A"]);
	runGit(path, ["commit", "-q", "-m", message]);
}

describe("classifyCommits", () => {
	test("a bang marks a breaking change", () => {
		expect(classifyCommits([BREAKING])).toBe("major");
	});
	test("a BREAKING CHANGE trailer counts too", () => {
		expect(classifyCommits([BREAKING_TRAILER])).toBe("major");
	});
	test("a feature is a minor bump", () => {
		expect(classifyCommits([FEATURE])).toBe("minor");
	});
	test("a fix is a patch bump", () => {
		expect(classifyCommits([FIX])).toBe("patch");
	});
	test("the largest bump in the batch wins", () => {
		expect(classifyCommits([FIX, FEATURE, CHORE])).toBe("minor");
		expect(classifyCommits([FIX, BREAKING])).toBe("major");
	});
	test("chores alone do not warrant a release", () => {
		expect(classifyCommits([CHORE])).toBeNull();
	});
	test("non-conventional messages are ignored", () => {
		expect(classifyCommits(["wip", "asdf", ""])).toBeNull();
	});
});

describe("semver", () => {
	for (const [current, bump, expected] of [
		["1.2.3", "major", "2.0.0"],
		["1.2.3", "minor", "1.3.0"],
		["1.2.3", "patch", "1.2.4"],
	] as const) {
		test(`${current} ${bump} -> ${expected}`, () => {
			expect(nextVersion("semver", current, bump)).toBe(expected);
		});
	}
});

describe("zerover", () => {
	// The major version should never exceed zero.
	for (const bump of ["major", "minor", "patch"] as const) {
		test(`a ${bump} never escapes zero`, () => {
			expect(nextVersion("zerover", "0.9.8", bump)?.startsWith("0.")).toBe(true);
		});
	}
	test("a breaking change lands on the minor instead of the major", () => {
		// Under semver this would be 1.0.0; ZeroVer's whole point is that it must not be.
		expect(nextVersion("zerover", "0.9.8", "major")).toBe("0.10.0");
		expect(nextVersion("semver", "0.9.8", "major")).toBe("1.0.0");
	});
	test("patches still move the patch", () => {
		expect(nextVersion("zerover", "0.4.0", "patch")).toBe("0.4.1");
	});
	test("it never escapes however many breaking changes land", () => {
		let version: string | null = "0.1.0";
		for (let index = 0; index < 50; index += 1) version = nextVersion("zerover", version, "major");
		expect(version?.split(".")[0]).toBe("0");
	});
});

describe("pridever", () => {
	// PROUD.DEFAULT.SHAME - pride cannot be inferred, but shame can.
	test("a fix bumps shame", () => {
		expect(nextVersion("pridever", "1.2.3", "patch")).toBe("1.2.4");
	});
	test("an ordinary release bumps default", () => {
		expect(nextVersion("pridever", "1.2.3", "minor")).toBe("1.3.0");
	});
	test("a breaking change is still only a default bump", () => {
		// Breaking is not the same as proud; only a human declares pride.
		expect(nextVersion("pridever", "1.2.3", "major")).toBe("1.3.0");
	});
	test("pride resets the slate", () => {
		expect(nextVersion("pridever", "1.2.3", "proud")).toBe("2.0.0");
	});
	test("pride is meaningless in other modes", () => {
		expect(() => nextVersion("semver", "1.2.3", "proud")).toThrow(VersioningError);
	});
});

describe("calver", () => {
	// YYYY.MM.PATCH, counting releases within the month.
	const day = new Date(Date.UTC(2026, 8, 7));
	test("the first release of a month starts at zero", () => {
		expect(nextVersion("calver", "2026.08.4", "minor", day)).toBe("2026.09.0");
	});
	test("a later release in the same month increments", () => {
		expect(nextVersion("calver", "2026.09.0", "patch", day)).toBe("2026.09.1");
	});
	test("the bump size does not matter", () => {
		const results = new Set(
			(["patch", "minor", "major"] as const).map((bump) => nextVersion("calver", "2026.09.3", bump, day)),
		);
		expect([...results]).toEqual(["2026.09.4"]);
	});
});

describe("no release", () => {
	// Nothing release-worthy means no tag, in every mode.
	for (const mode of ["semver", "zerover", "pridever", "calver"] as const) {
		test(`a null bump produces no version under ${mode}`, () => {
			expect(nextVersion(mode, "1.2.3", null)).toBeNull();
		});
	}
	test("manual never derives anything", () => {
		expect(nextVersion("manual", "1.2.3", "major")).toBeNull();
	});
	test("an unknown mode is rejected", () => {
		expect(() => nextVersion("heroic" as "semver", "1.2.3", "patch")).toThrow(VersioningError);
	});
});

describe("latestTag", () => {
	test("picks the highest, not the last", () => {
		expect(latestTag(["v0.1.0", "v0.10.0", "v0.9.0"])).toBe("v0.10.0");
	});
	test("non-release tags are ignored", () => {
		expect(latestTag(["nightly", "v1.0.0", "release-candidate"])).toBe("v1.0.0");
	});
	test("no tags means no current version", () => {
		expect(latestTag([])).toBeNull();
		expect(latestTag(["nightly"])).toBeNull();
	});
	test("two-component tags are accepted", () => {
		expect(latestTag(["v1.2"])).toBe("v1.2");
	});
	test("a scheme is not invisible", () => {
		// `3a.1.0` used to fail the numeric pattern, so a repository versioning itself this way
		// compared itself against whatever plain tag happened to be lower.
		expect(latestTag(["v0.81.0", "v3a.1.0"])).toBe("v3a.1.0");
	});
	test("the declared line wins over a higher superseded one", () => {
		// A repository that has moved to a new line is on that line, not on the old one.
		expect(latestTag(["v0.81.0", "v3a.1.0", "v4.0.0"], "a")).toBe("v3a.1.0");
	});
	test("a preference with no matching tag falls back", () => {
		expect(latestTag(["v1.0.0"], "a")).toBe("v1.0.0");
	});
});

describe("isAhead", () => {
	// A declared version is a choice only when it steps past what is released.
	for (const [candidate, current, expected] of [
		["3a.9.0", "3a.1.0", true],
		["3b.0.0", "3a.9.9", true],
		["3a.1.0", "3a.1.0", false],
		["3a.1.0", "3a.2.0", false],
		["3a.0.9", "3a.1.0", false],
		["1.0.0", null, true],
		[null, "3a.1.0", false],
		["nightly", "3a.1.0", false],
	] as const) {
		test(`${String(candidate)} vs ${String(current)} -> ${expected}`, () => {
			expect(isAhead(candidate, current)).toBe(expected);
		});
	}
});

describe("bumpVersion", () => {
	// A bump moves the number and never rewrites the scheme the repository versions itself in.
	for (const [current, bump, expected] of [
		["3a.1.0", "minor", "3a.2.0"],
		["3a.1.0", "patch", "3a.1.1"],
		["3a.1.0", "major", "4a.0.0"],
		["0.81.0", "minor", "0.82.0"],
		["0.81.0", "patch", "0.81.1"],
		["1.2", "minor", "1.3.0"],
	] as const) {
		test(`${current} ${bump} -> ${expected}`, () => {
			expect(bumpVersion(current, bump)).toBe(expected);
		});
	}
	test("nothing bumped is no version", () => {
		expect(bumpVersion("3a.1.0", null)).toBeNull();
	});
	test("an unparseable version yields nothing", () => {
		expect(bumpVersion("nightly", "minor")).toBeNull();
	});
	test("an unknown bump size is rejected", () => {
		expect(() => bumpVersion("3a.1.0", "sideways" as "minor")).toThrow(VersioningError);
	});
});

describe("resolving against a real repository", () => {
	test("a first release uses the configured initial version", async () => {
		const repo = await initRepo("semver", [FEATURE]);
		expect(resolveRelease(repo).next).toBe("0.1.0");
	});
	test("nothing release-worthy yields no release", async () => {
		const repo = await initRepo("semver", [CHORE]);
		expect(resolveRelease(repo).next).toBeNull();
	});
	test("an explicit bump overrides the commit log", async () => {
		const repo = await initRepo("semver", [CHORE]);
		runGit(repo, ["tag", "v1.0.0"]);
		expect(resolveRelease(repo, "minor").next).toBe("1.1.0");
	});
	test("an exact version can be requested", async () => {
		const repo = await initRepo("semver", [CHORE]);
		expect(resolveRelease(repo, "3.2.1").next).toBe("3.2.1");
	});
	test("a proud release can be requested under pridever", async () => {
		const repo = await initRepo("pridever", [FIX]);
		runGit(repo, ["tag", "v1.4.2"]);
		expect(resolveRelease(repo, "proud").next).toBe("2.0.0");
	});
	test("the same log gives different answers per mode", async () => {
		const answers: Record<string, string | null> = {};
		for (const mode of ["semver", "zerover", "pridever"]) {
			const repo = await initRepo(mode, [BREAKING]);
			answers[mode] = resolveRelease(repo).next;
		}
		expect(answers["semver"]).toBe("0.1.0");
		expect(answers["zerover"]).toBe("0.1.0");
		expect(answers["pridever"]).toBe("0.1.0");
	});
	test("manual mode requires a version file", async () => {
		const repo = await initRepo("manual", [FEATURE]);
		expect(() => resolveRelease(repo)).toThrow(VersioningError);
	});
	test("manual mode reads the version file", async () => {
		const repo = await initRepo("manual", [FEATURE], "3a.9.0");
		expect(resolveRelease(repo).next).toBe("3a.9.0");
	});
	test("manual mode is idempotent once tagged", async () => {
		const repo = await initRepo("manual", [FEATURE], "7.7.7");
		runGit(repo, ["tag", "v7.7.7"]);
		expect(resolveRelease(repo).next).toBeNull();
	});
	test("a scheme survives the round trip through a tag", async () => {
		const repo = await initRepo("manual", [CHORE], "3a.1.0");
		runGit(repo, ["tag", "v3a.1.0"]);
		await later(repo, FEATURE);
		expect(resolveRelease(repo).next).toBe("3a.2.0");
	});
	test("a declared version beats the commit log", async () => {
		const repo = await initRepo("manual", [FEATURE], "3a.9.0");
		expect(resolveRelease(repo).bump).toBe("declared");
	});
	test("a stale version does not re-release an old number", async () => {
		const repo = await initRepo("manual", [CHORE], "3a.1.0");
		runGit(repo, ["tag", "v3a.5.0"]);
		await later(repo, FEATURE);
		expect(resolveRelease(repo).next).toBe("3a.6.0");
	});
	test("nothing since the release warrants nothing", async () => {
		const repo = await initRepo("manual", [FEATURE], "3a.1.0");
		runGit(repo, ["tag", "v3a.1.0"]);
		expect(resolveRelease(repo).next).toBeNull();
	});
});

describe("reading the declared configuration", () => {
	test("reads the mode, prefix and initial version", async () => {
		const repo = await initRepo("semver", [CHORE]);
		expect(loadConfig(repo)).toEqual({ mode: "semver", tagPrefix: "v", initial: "0.1.0" });
	});
	test("an unknown mode is rejected", async () => {
		const repo = await initRepo("heroic", [CHORE]);
		expect(() => loadConfig(repo)).toThrow(VersioningError);
	});
});
