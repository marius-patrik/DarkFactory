import { describe, test, expect, afterEach } from "bun:test";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { createTempRepo, TEST_IDENTITY } from "./helpers.ts";
import { runGit, GitError } from "../../src/workspace/git.ts";
import { pushBranch } from "../../src/workspace/pushBranch.ts";

describe("pushBranch", () => {
	let tempRepo: ReturnType<typeof createTempRepo>;

	afterEach(() => {
		tempRepo?.cleanup();
	});

	test("pushes HEAD to a new branch and returns the SHA", () => {
		tempRepo = createTempRepo();
		const { repo, remote } = tempRepo;

		runGit(repo, ["checkout", "-b", "feature/x"]);
		writeFileSync(join(repo, "feature.txt"), "content");
		runGit(repo, ["add", "feature.txt"]);
		runGit(repo, ["commit", "-m", "feature commit"], { env: TEST_IDENTITY });

		const sha = pushBranch({ worktree: repo, remote: "origin", branch: "feature/x" });
		const headSha = runGit(repo, ["rev-parse", "HEAD"]);
		expect(sha).toBe(headSha);

		const remoteSha = runGit(remote, ["rev-parse", "refs/heads/feature/x"]);
		expect(remoteSha).toBe(headSha);
	});

	test("throws GitError and leaves remote unchanged on non-fast-forward push", () => {
		tempRepo = createTempRepo();
		const { repo, remote } = tempRepo;

		runGit(repo, ["checkout", "-b", "feature/x"]);
		writeFileSync(join(repo, "f1.txt"), "1");
		runGit(repo, ["add", "f1.txt"]);
		runGit(repo, ["commit", "-m", "c1"], { env: TEST_IDENTITY });
		pushBranch({ worktree: repo, remote: "origin", branch: "feature/x" });

		const sha1 = runGit(repo, ["rev-parse", "HEAD"]);

		// Reset local branch to parent and create a divergent commit
		runGit(repo, ["reset", "--hard", "HEAD~1"]);
		writeFileSync(join(repo, "f2.txt"), "2");
		runGit(repo, ["add", "f2.txt"]);
		runGit(repo, ["commit", "-m", "c2"], { env: TEST_IDENTITY });

		expect(() => {
			pushBranch({ worktree: repo, remote: "origin", branch: "feature/x" });
		}).toThrow(GitError);

		const remoteSha = runGit(remote, ["rev-parse", "refs/heads/feature/x"]);
		expect(remoteSha).toBe(sha1);
	});
});
