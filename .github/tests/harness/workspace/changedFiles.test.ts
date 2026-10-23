import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { changedFiles } from "../../src/workspace/changedFiles.ts";
import { createWorktree } from "../../src/workspace/createWorktree.ts";
import { runGit } from "../../src/workspace/git.ts";
import { createTempRepo, TEST_IDENTITY } from "./helpers.ts";

describe("changedFiles utility", () => {
	let repoInfo: ReturnType<typeof createTempRepo>;

	beforeAll(() => {
		repoInfo = createTempRepo();
	});

	afterAll(() => {
		repoInfo.cleanup();
	});

	it("lists only non‑scratch changed files", async () => {
		const { worktreePath } = createWorktree({
			repo: repoInfo.repo,
			branch: "feature",
			base: "main",
			workRoot: repoInfo.workRoot,
		});

		// Add a tracked file.
		const srcDir = join(worktreePath, "src");
		mkdirSync(srcDir, { recursive: true });
		writeFileSync(join(srcDir, "a.ts"), "export const x = 1;\n");
		runGit(worktreePath, ["add", "src/a.ts"]);
		runGit(worktreePath, ["commit", "-m", "add a.ts"], { env: TEST_IDENTITY });

		// Modify the tracked file.
		writeFileSync(join(srcDir, "a.ts"), "export const x = 2;\n");

		// Create engine‑scratch files.
		mkdirSync(join(worktreePath, ".df-task"), { recursive: true });
		mkdirSync(join(worktreePath, ".df-temp"), { recursive: true });
		writeFileSync(join(worktreePath, ".df-task", "tmp.txt"), "scratch\n");
		writeFileSync(join(worktreePath, ".df-temp", "log.txt"), "scratch2\n");

		const result = await changedFiles(worktreePath);
		expect(result).toEqual(["src/a.ts"]);
	});

	it("lists every file of a new directory, paths with spaces, and a rename's new path", async () => {
		const { worktreePath } = createWorktree({
			repo: repoInfo.repo,
			branch: "shapes",
			base: "main",
			workRoot: repoInfo.workRoot,
		});
		mkdirSync(join(worktreePath, "new", "deep"), { recursive: true });
		writeFileSync(join(worktreePath, "new", "deep", "one.ts"), "1\n");
		writeFileSync(join(worktreePath, "new", "two words.ts"), "2\n");
		runGit(worktreePath, ["mv", "README.md", "RENAMED.md"]);
		expect((await changedFiles(worktreePath)).sort()).toEqual(["RENAMED.md", "new/deep/one.ts", "new/two words.ts"]);
	});
});
