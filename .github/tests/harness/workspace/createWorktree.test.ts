import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createWorktree } from "../../src/workspace/createWorktree.ts";
import { runGit } from "../../src/workspace/git.ts";
import { createTempRepo, TEST_IDENTITY } from "./helpers.ts";

let temp: ReturnType<typeof createTempRepo>;

beforeAll(() => {
	temp = createTempRepo();
});

afterAll(() => {
	temp.cleanup();
});

describe("createWorktree", () => {
	test("creates a new worktree and is idempotent", () => {
		const branch = "feature/foo";
		const base = "main";
		const result1 = createWorktree({ repo: temp.repo, branch, base, workRoot: temp.workRoot });
		// The directory should now exist.
		expect(existsSync(result1.worktreePath)).toBeTrue();
		// HEAD should be the new branch.
		const head = runGit(result1.worktreePath, ["rev-parse", "--abbrev-ref", "HEAD"]);
		expect(head).toBe(branch);

		// Second call returns same path.
		const result2 = createWorktree({ repo: temp.repo, branch, base, workRoot: temp.workRoot });
		expect(result2.worktreePath).toBe(result1.worktreePath);
		expect(result2.worktreeBranch).toBe(result1.worktreeBranch);
	});

	test("continues a branch that only exists on origin instead of restarting it from base", () => {
		runGit(temp.repo, ["checkout", "-b", "pushed/work"]);
		writeFileSync(join(temp.repo, "work.txt"), "pushed work\n");
		runGit(temp.repo, ["add", "work.txt"]);
		runGit(temp.repo, ["commit", "-m", "pushed work"], { env: TEST_IDENTITY });
		runGit(temp.repo, ["push", "origin", "pushed/work"]);
		runGit(temp.repo, ["checkout", "main"]);
		runGit(temp.repo, ["branch", "-D", "pushed/work"]);
		const { worktreePath } = createWorktree({
			repo: temp.repo,
			branch: "pushed/work",
			base: "main",
			workRoot: temp.workRoot,
		});
		expect(existsSync(join(worktreePath, "work.txt"))).toBeTrue();
		expect(runGit(worktreePath, ["log", "-1", "--format=%s"])).toBe("pushed work");
	});

	test("refuses to reuse a directory that is not the branch's worktree", () => {
		mkdirSync(join(temp.workRoot, "stray-dir"), { recursive: true });
		expect(() =>
			createWorktree({ repo: temp.repo, branch: "stray-dir", base: "main", workRoot: temp.workRoot }),
		).toThrow("is not a worktree on stray-dir");
	});
});
