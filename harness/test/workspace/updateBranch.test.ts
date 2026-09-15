import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createWorktree } from "../../src/workspace/createWorktree.ts";
import { GitError, runGit } from "../../src/workspace/git.ts";
import { updateBranch } from "../../src/workspace/updateBranch.ts";
import { createTempRepo, TEST_IDENTITY } from "./helpers.ts";

const MERGE_IDENTITY = { name: "Merge Bot", email: "merge-bot@users.noreply.example" };

describe("updateBranch utility", () => {
	let repoInfo: ReturnType<typeof createTempRepo>;

	beforeAll(() => {
		repoInfo = createTempRepo();
	});

	afterAll(() => {
		repoInfo.cleanup();
	});

	it("returns clean when merge has no conflicts", async () => {
		const { worktreePath } = createWorktree({
			repo: repoInfo.repo,
			branch: "feature",
			base: "main",
			workRoot: repoInfo.workRoot,
		});

		const result = await updateBranch({ worktree: worktreePath, base: "main", identity: MERGE_IDENTITY });
		expect(result.status).toBe("clean");
	});

	it("detects merge conflicts and reports conflicted files", async () => {
		// Create a new worktree on a fresh branch.
		const { worktreePath } = createWorktree({
			repo: repoInfo.repo,
			branch: "conflict-branch",
			base: "main",
			workRoot: repoInfo.workRoot,
		});

		// Make a conflicting change in the worktree.
		writeFileSync(join(worktreePath, "README.md"), "Feature change\n");
		runGit(worktreePath, ["add", "README.md"]);
		runGit(worktreePath, ["commit", "-m", "feature edit"], { env: TEST_IDENTITY });

		// Make a conflicting change on the remote main branch.
		runGit(repoInfo.repo, ["checkout", "main"]);
		writeFileSync(join(repoInfo.repo, "README.md"), "Remote change\n");
		runGit(repoInfo.repo, ["add", "README.md"]);
		runGit(repoInfo.repo, ["commit", "-m", "remote edit"], { env: TEST_IDENTITY });
		runGit(repoInfo.repo, ["push", "origin", "main"]);

		// Now attempt to merge origin/main into the feature branch.
		const result = await updateBranch({ worktree: worktreePath, base: "main", identity: MERGE_IDENTITY });
		expect(result.status).toBe("conflict");
		if (result.status === "conflict") {
			expect(result.conflictedFiles).toContain("README.md");
		}
	});

	it("records the merge commit with the given identity when base moved on", async () => {
		const { worktreePath } = createWorktree({
			repo: repoInfo.repo,
			branch: "merge-identity",
			base: "main",
			workRoot: repoInfo.workRoot,
		});
		writeFileSync(join(worktreePath, "feature.txt"), "feature\n");
		runGit(worktreePath, ["add", "feature.txt"]);
		runGit(worktreePath, ["commit", "-m", "feature"], { env: TEST_IDENTITY });
		runGit(repoInfo.repo, ["checkout", "main"]);
		runGit(repoInfo.repo, ["reset", "--hard", "origin/main"]);
		writeFileSync(join(repoInfo.repo, "other.txt"), "other\n");
		runGit(repoInfo.repo, ["add", "other.txt"]);
		runGit(repoInfo.repo, ["commit", "-m", "other"], { env: TEST_IDENTITY });
		runGit(repoInfo.repo, ["push", "origin", "main"]);
		expect(await updateBranch({ worktree: worktreePath, base: "main", identity: MERGE_IDENTITY })).toEqual({
			status: "clean",
		});
		expect(runGit(worktreePath, ["log", "-1", "--format=%an <%ae> %p"])).toMatch(
			/^Merge Bot <merge-bot@users\.noreply\.example> \w+ \w+$/,
		);
	});

	it("throws git's error when the merge fails without conflicts", async () => {
		const { worktreePath } = createWorktree({
			repo: repoInfo.repo,
			branch: "no-such-base",
			base: "main",
			workRoot: repoInfo.workRoot,
		});
		await expect(
			updateBranch({ worktree: worktreePath, base: "does-not-exist", identity: MERGE_IDENTITY }),
		).rejects.toBeInstanceOf(GitError);
	});
});
