/**
 * Tests for release assembly: notes, assets, and metadata conformance.
 *
 * A release is four decisions - whether, what it is called, what goes in it, and whether the
 * repository agrees with itself - so the tests are organised the same way.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	buildNotes,
	checkMetadata,
	collectAssets,
	declaredAssets,
	type GhCommand,
	planAssets,
	recordVersion,
	resolveRelease,
	syncMetadata,
} from "../../src/release/release.ts";

const roots: string[] = [];

afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

/** Writes a file inside a fixture repository, creating parent directories. */
async function write(root: string, relative: string, content: string): Promise<void> {
	const path = join(root, relative);
	await mkdir(join(path, ".."), { recursive: true });
	await writeFile(path, content, "utf8");
}

/** Creates a throwaway directory that is removed when the test ends. */
async function scratch(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "df-release-"));
	roots.push(root);
	return root;
}

function git(root: string, ...args: string[]): void {
	const result = Bun.spawnSync(["git", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
	if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.toString()}`);
}

/** Builds a throwaway git repository with a `repo.dfconfig` and the given commit subjects. */
async function repository(repo: Record<string, unknown>, commits: readonly string[] = []): Promise<string> {
	const root = await scratch();
	git(root, "init", "-q", "-b", "main", root);
	git(root, "config", "user.email", "t@example.com");
	git(root, "config", "user.name", "T");
	await write(root, "repo.dfconfig", JSON.stringify({ repo }));
	for (const [index, message] of commits.entries()) {
		await write(root, `f${index}.txt`, message);
		git(root, "add", "-A");
		git(root, "commit", "-q", "-m", message);
	}
	return root;
}

/** A Bun workspace whose CLI package has fallen behind the others. */
async function monorepo(): Promise<string> {
	const root = await scratch();
	await write(root, "package.json", JSON.stringify({ name: "acme", version: "1.4.0", workspaces: ["packages/*"] }));
	await write(root, "bun.lock", "");
	await write(root, "packages/web/package.json", JSON.stringify({ name: "@acme/web", version: "1.4.0" }));
	await write(root, "packages/cli/package.json", JSON.stringify({ name: "@acme/cli", version: "1.3.9" }));
	await write(root, "repo.dfconfig", JSON.stringify({ repo: {} }));
	return root;
}

describe("notes are grouped by Conventional Commit type", () => {
	test("commits land under their headings", () => {
		const notes = buildNotes(["feat(ci): add a job", "fix(docs): correct a link"], "1.0.0");
		expect(notes).toContain("### Features");
		expect(notes).toContain("**ci**: add a job");
		expect(notes).toContain("### Fixes");
		expect(notes).toContain("**docs**: correct a link");
	});

	test("sections with no commits are omitted entirely", () => {
		const notes = buildNotes(["feat(ci): add a job"], "1.0.0");
		expect(notes).not.toContain("### Fixes");
		expect(notes).not.toContain("### Maintenance");
	});

	test("breaking changes lead", () => {
		const notes = buildNotes(["fix(ci): small thing", "feat(agents)!: change the contract"], "1.0.0");
		expect(notes.indexOf("### Breaking changes")).toBeLessThan(notes.indexOf("### Fixes"));
	});

	test("a BREAKING CHANGE trailer is recognised", () => {
		const notes = buildNotes(["refactor(ci): rework\n\nBREAKING CHANGE: ids are namespaced"], "1.0.0");
		expect(notes).toContain("### Breaking changes");
	});

	test("a scopeless commit still appears", () => {
		expect(buildNotes(["feat: add a thing"], "1.0.0")).toContain("add a thing");
	});

	test("non-conventional commits are skipped", () => {
		expect(buildNotes(["wip", "asdf"], "1.0.0")).toContain("No user-facing changes recorded.");
	});

	test("a first release says so", () => {
		expect(buildNotes(["feat: x"], null)).toContain("First release.");
	});

	test("a later release names its predecessor", () => {
		expect(buildNotes(["feat: x"], "1.0.0")).toContain("since `1.0.0`");
	});
});

describe("asset planning composes detection and declaration", () => {
	test("detected ecosystems produce build steps", async () => {
		const steps = planAssets(await monorepo());
		expect(steps.some((step) => step.ecosystem === "node")).toBe(true);
		expect(steps.some((step) => step.command === "bun run build")).toBe(true);
	});

	test("a workspace root is built once, not once per member", async () => {
		const steps = planAssets(await monorepo()).filter((step) => step.ecosystem === "node");
		expect(steps).toHaveLength(1);
		expect(steps[0]?.cwd).toBe(".");
	});

	test("declared assets are appended", async () => {
		const root = await scratch();
		await write(root, "README.md", "nothing to detect");
		await write(
			root,
			"repo.dfconfig",
			JSON.stringify({ repo: { release: { assets: [{ command: "make bundle", path: "out/*.tar.gz" }] } } }),
		);
		expect(planAssets(root)).toEqual([
			{ command: "make bundle", cwd: ".", globs: ["out/*.tar.gz"], ecosystem: "declared" },
		]);
	});

	test("a declared asset may be a bare glob", async () => {
		const root = await scratch();
		await write(root, "README.md", "x");
		await write(root, "repo.dfconfig", JSON.stringify({ repo: { release: { assets: ["out/*"] } } }));
		expect(planAssets(root)[0]?.globs).toEqual(["out/*"]);
	});

	test("a repository with no build plans nothing", async () => {
		const root = await scratch();
		await write(root, "README.md", "a template repository");
		await write(root, "repo.dfconfig", JSON.stringify({ repo: {} }));
		expect(planAssets(root)).toEqual([]);
	});

	test("declared artifact globs override the defaults", async () => {
		const root = await monorepo();
		await write(
			root,
			"repo.dfconfig",
			JSON.stringify({ repo: { environment: { release: { node: { artifacts: ["out/**"] } } } } }),
		);
		expect(planAssets(root).filter((step) => step.ecosystem === "node")[0]?.globs).toEqual(["out/**"]);
	});
});

describe("asset collection only counts what was actually written", () => {
	test("only existing files are collected", async () => {
		const root = await scratch();
		await write(root, "dist/app.whl", "x");
		expect(collectAssets(root, [{ cwd: ".", globs: ["dist/*.whl", "dist/*.tar.gz"] }])).toEqual(["dist/app.whl"]);
	});

	test("directories are not collected", async () => {
		const root = await scratch();
		await mkdir(join(root, "dist", "nested"), { recursive: true });
		await write(root, "dist/nested/app.js", "x");
		expect(collectAssets(root, [{ cwd: ".", globs: ["dist/**"] }])).toEqual(["dist/nested/app.js"]);
	});

	test("the same file matched twice appears once", async () => {
		const root = await scratch();
		await write(root, "dist/app.whl", "x");
		expect(collectAssets(root, [{ cwd: ".", globs: ["dist/*.whl", "dist/app.whl"] }])).toEqual(["dist/app.whl"]);
	});

	test("nothing built yields no assets", async () => {
		const root = await scratch();
		expect(collectAssets(root, [{ cwd: ".", globs: ["dist/*"] }])).toEqual([]);
	});

	test("artifacts in a member package are reported relative to the repository root", async () => {
		const root = await scratch();
		await write(root, "packages/cli/dist/cli.whl", "x");
		expect(collectAssets(root, [{ cwd: "packages/cli", globs: ["dist/*.whl"] }])).toEqual([
			"packages/cli/dist/cli.whl",
		]);
	});
});

describe("metadata conformance: a tag that contradicts the artifact is worse than no release", () => {
	test("a lagging package is reported", async () => {
		const problems = checkMetadata(await monorepo(), "1.4.0");
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain("packages/cli/package.json");
		expect(problems[0]).toContain("1.3.9");
	});

	test("a conformant monorepo reports nothing", async () => {
		const root = await monorepo();
		await write(root, "packages/cli/package.json", JSON.stringify({ name: "@acme/cli", version: "1.4.0" }));
		expect(checkMetadata(root, "1.4.0")).toEqual([]);
	});

	test("packages that declare no version are not faulted", async () => {
		const root = await scratch();
		await write(root, "pyproject.toml", "[tool.black]\nline-length = 100\n");
		await write(root, "repo.dfconfig", JSON.stringify({ repo: {} }));
		expect(checkMetadata(root, "9.9.9")).toEqual([]);
	});

	test("the check can be switched off", async () => {
		const root = await monorepo();
		await write(root, "repo.dfconfig", JSON.stringify({ repo: { release: { metadata: "ignore" } } }));
		expect(checkMetadata(root, "1.4.0")).toEqual([]);
	});

	test("sync brings every manifest into line", async () => {
		const root = await monorepo();
		expect(syncMetadata(root, "1.5.0")).toContain("packages/cli/package.json");
		expect(checkMetadata(root, "1.5.0")).toEqual([]);
	});

	test("sync only touches the version", async () => {
		const root = await monorepo();
		syncMetadata(root, "1.5.0");
		expect(JSON.parse(await readFile(join(root, "packages/cli/package.json"), "utf8"))).toEqual({
			name: "@acme/cli",
			version: "1.5.0",
		});
	});

	test("sync handles toml manifests without reserialising them", async () => {
		const root = await scratch();
		await write(root, "Cargo.toml", '[package]\nname = "thing"\nversion = "0.1.0"\n');
		await write(root, "repo.dfconfig", JSON.stringify({ repo: {} }));
		syncMetadata(root, "0.2.0");
		const content = await readFile(join(root, "Cargo.toml"), "utf8");
		expect(content).toContain('version = "0.2.0"');
		expect(content).toContain('name = "thing"');
	});
});

describe("a paper releases its PDF and versions like any other manifest", () => {
	async function paper(): Promise<string> {
		const root = await scratch();
		await write(root, "typst.toml", '[package]\nname = "thesis"\nversion = "1.0.0"\n');
		return root;
	}

	test("the PDF is planned as a release asset", async () => {
		const steps = planAssets(await paper());
		expect(steps.some((step) => step.globs.includes("out/*.pdf"))).toBe(true);
		expect(steps.some((step) => step.command?.startsWith("typst compile") === true)).toBe(true);
	});

	test("typst.toml takes part in version tagging", async () => {
		const root = await paper();
		expect(checkMetadata(root, "1.0.0")).toEqual([]);
		const problems = checkMetadata(root, "2.0.0");
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain("typst.toml");
	});
});

describe("resolving a release, end to end against a real repository", () => {
	test("nothing release-worthy produces no release", async () => {
		const root = await repository({}, ["chore(ci): bump the image"]);
		const resolved = resolveRelease(root);
		expect(resolved.version).toBeNull();
		expect(resolved.steps).toEqual([]);
	});

	test("a feature produces a first release with notes", async () => {
		const root = await repository({}, ["feat(ci): add the pipeline"]);
		const resolved = resolveRelease(root);
		expect(resolved.version).toBe("0.1.0");
		expect(resolved.tag).toBe("v0.1.0");
		expect(resolved.notes).toContain("add the pipeline");
	});

	test("the versioning mode is honoured", async () => {
		const root = await repository({ versioning: { mode: "pridever" } }, ["feat(ci): x"]);
		git(root, "tag", "v1.2.3");
		expect(resolveRelease(root, "proud").version).toBe("2.0.0");
	});

	test("metadata problems surface on the release", async () => {
		const root = await repository({}, ["feat(ci): add the pipeline"]);
		await write(root, "package.json", JSON.stringify({ name: "a", version: "9.9.9" }));
		// A package at 9.9.9 cannot ship as 0.1.0 unnoticed.
		expect(resolveRelease(root).metadataProblems).not.toEqual([]);
	});
});

describe("recording the released version is what stops the next promotion re-releasing it", () => {
	// Each of these drives a real `git fetch`/`checkout`/`commit`/`push` against a real bare remote,
	// which is well past the default per-test budget on a cold filesystem.
	const GIT_TIMEOUT_MS = 60_000;
	/** A repository with a bare `origin`, so a push has somewhere to land. */
	async function withOrigin(
		repo: Record<string, unknown>,
		version: string | null = "3a.1.0",
	): Promise<{ work: string; remote: string }> {
		const base = await scratch();
		const remote = join(base, "remote.git");
		Bun.spawnSync(["git", "init", "-q", "--bare", remote]);
		const work = join(base, "work");
		const seeded = await repositoryIn(work, repo);
		if (version !== null) await write(seeded, "VERSION", `${version}\n`);
		git(seeded, "add", "-A");
		git(seeded, "commit", "-q", "-m", "chore(ci): seed");
		const identity = (repo.identity ?? {}) as Record<string, unknown>;
		const branch = String(identity.development_branch || identity.default_branch || "main");
		git(seeded, "branch", "-M", branch);
		git(seeded, "remote", "add", "origin", remote);
		git(seeded, "push", "-q", "origin", branch);
		return { work: seeded, remote };
	}

	/** Builds a repository at a chosen path, which `scratch` cannot do because it randomises one. */
	async function repositoryIn(path: string, repo: Record<string, unknown>): Promise<string> {
		roots.push(path);
		await mkdir(path, { recursive: true });
		git(path, "init", "-q", "-b", "main", path);
		git(path, "config", "user.email", "t@example.com");
		git(path, "config", "user.name", "T");
		await write(path, "repo.dfconfig", JSON.stringify({ repo }));
		return path;
	}

	/** A `gh` stub that records its arguments and reports no open pull request. */
	function ghStub(openPrs = "[]"): { calls: string[][]; run: GhCommand } {
		const calls: string[][] = [];
		return {
			calls,
			run: (_root, args) => {
				calls.push([...args]);
				return args.join(" ").includes("pr list") ? openPrs : `https://github.com/o/r/pull/${calls.length}`;
			},
		};
	}

	test(
		"a stale version is recorded on its own branch, never the protected one",
		async () => {
			const { work, remote } = await withOrigin({ identity: { development_branch: "develop" } });
			const result = recordVersion(work, "3a.2.0", "v3a.2.0", ghStub().run);
			expect(result.recorded).toBe(true);
			expect(result.branch).toBe("release/record-3a.2.0");
			expect(result.base).toBe("develop");
			expect(await readFile(join(work, "VERSION"), "utf8")).toBe("3a.2.0\n");
			const probe = Bun.spawnSync(["git", "-C", remote, "rev-parse", "--verify", "release/record-3a.2.0"]);
			expect(probe.exitCode).toBe(0);
		},
		GIT_TIMEOUT_MS,
	);

	test(
		"recording the same version twice changes nothing",
		async () => {
			const stub = ghStub();
			const { work } = await withOrigin({
				identity: { development_branch: "develop" },
				release: { record_issue: 1113 },
			});
			recordVersion(work, "3a.2.0", "v3a.2.0", stub.run);
			const first = Bun.spawnSync(["git", "-C", work, "rev-parse", "HEAD"]).stdout.toString();
			const again = recordVersion(work, "3a.2.0", "v3a.2.0", stub.run);
			expect(again.recorded).toBe(false);
			expect(again.pullRequest).toBeNull();
			expect(Bun.spawnSync(["git", "-C", work, "rev-parse", "HEAD"]).stdout.toString()).toBe(first);
			// A re-run after a completed release must not ask for a second review.
			expect(stub.calls.filter((args) => args.includes("create"))).toHaveLength(1);
		},
		GIT_TIMEOUT_MS,
	);

	test(
		"an open pull request for the same branch is reused",
		async () => {
			const stub = ghStub('[{"number": 42}]');
			const { work } = await withOrigin({
				identity: { development_branch: "develop" },
				release: { record_issue: 1113 },
			});
			const result = recordVersion(work, "3a.2.0", "v3a.2.0", stub.run);
			expect(result.pullRequest).toBe('[{"number": 42}]');
			expect(stub.calls.filter((args) => args.includes("create"))).toHaveLength(0);
		},
		GIT_TIMEOUT_MS,
	);

	test(
		"without a bound issue the version is still recorded, and the omission is reported",
		async () => {
			const stub = ghStub();
			const { work } = await withOrigin({ identity: { development_branch: "develop" } });
			const result = recordVersion(work, "3a.2.0", "v3a.2.0", stub.run);
			expect(result.recorded).toBe(true);
			expect(result.issue).toBeNull();
			expect(result.pullRequest).toBeNull();
			expect(result.reason).toContain("record_issue");
			// No pull request may be opened without a bound issue: `verify-bound-issue` would
			// reject it and it could only sit at REVIEW_REQUIRED.
			expect(stub.calls).toHaveLength(0);
		},
		GIT_TIMEOUT_MS,
	);

	test(
		"the pull request binds the configured issue",
		async () => {
			const stub = ghStub();
			const { work } = await withOrigin({
				identity: { development_branch: "develop" },
				release: { record_issue: 1113 },
			});
			expect(recordVersion(work, "3a.2.0", "v3a.2.0", stub.run).issue).toBe(1113);
			const created = stub.calls.find((args) => args.includes("create"));
			expect(created?.join("\n")).toContain("Advances #1113");
		},
		GIT_TIMEOUT_MS,
	);

	test(
		"a repository with one branch records against it",
		async () => {
			const { work } = await withOrigin({ identity: { default_branch: "trunk" } });
			const result = recordVersion(work, "3a.2.0", "v3a.2.0", ghStub().run);
			expect(result.base).toBe("trunk");
			expect(result.recorded).toBe(true);
		},
		GIT_TIMEOUT_MS,
	);
});

describe("declared assets are read as written", () => {
	test("an entry may be a bare glob, or carry a command", async () => {
		const root = await scratch();
		await write(
			root,
			"repo.dfconfig",
			JSON.stringify({
				repo: { release: { assets: ["out/*", { path: "dist/x.zip", command: "make zip" }, { path: "" }] } },
			}),
		);
		expect(declaredAssets(root)).toEqual([{ path: "out/*" }, { path: "dist/x.zip", command: "make zip" }]);
	});
});
