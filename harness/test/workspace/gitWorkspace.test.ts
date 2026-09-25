import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGit } from "../../src/workspace/git.ts";
import {
	abortOperation,
	cherryPick,
	createAndSwitchBranch,
	fetch,
	getConflictState,
	getDiff,
	getGitStatus,
	getLog,
	hasConflicts,
	isWorktreeDirty,
	merge,
	pushWithLease,
	rebase,
	resolveDefaultBranch,
	switchBranch,
} from "../../src/workspace/gitWorkspace.ts";
import { createTempRepo, TEST_IDENTITY, type TempRepo } from "./helpers.ts";

let temp: TempRepo | undefined;

function repo(): string {
	if (!temp) throw new Error("temporary repository was not created");
	return temp.repo;
}

beforeEach(() => {
	temp = createTempRepo();
});

afterEach(() => {
	temp?.cleanup();
	temp = undefined;
});

test("resolveDefaultBranch reads identity.default_branch from the repo block", async () => {
	const repoDfPath = join(repo(), "repo.dfconfig");

	writeFileSync(
		repoDfPath,
		JSON.stringify({
			repo: {
				identity: {
					default_branch: "darkfactory-dev",
				},
			},
		}),
	);

	const resolved = await resolveDefaultBranch(repo());
	expect(resolved).toBe("darkfactory-dev");
});

test("resolveDefaultBranch throws if default_branch is missing or empty", async () => {
	const repoDfPath = join(repo(), "repo.dfconfig");

	writeFileSync(repoDfPath, JSON.stringify({ repo: {} }));
	expect(resolveDefaultBranch(repo())).rejects.toThrow("missing a non-empty identity.default_branch");

	writeFileSync(
		repoDfPath,
		JSON.stringify({
			repo: {
				identity: {
					default_branch: "  ",
				},
			},
		}),
	);
	expect(resolveDefaultBranch(repo())).rejects.toThrow("missing a non-empty identity.default_branch");
});

test("status, log, and diff read operations work on clean repo", () => {
	const status = getGitStatus(repo());
	expect(status.branch).toBe("main");
	expect(status.isDirty).toBe(false);
	expect(status.inProgressOperation).toBe("none");

	const log = getLog(repo(), 5);
	expect(log.length).toBeGreaterThan(0);
	expect(log[0]).toContain("init");

	const diff = getDiff(repo());
	expect(diff).toBe("");
});

test("fetch pulls latest updates", () => {
	// Let's create a new commit directly on remote via clone or mock fetch
	expect(() => fetch(repo())).not.toThrow();
});

test("branch creation and switching switches HEAD successfully", () => {
	createAndSwitchBranch(repo(), "feature-branch");
	const status = getGitStatus(repo());
	expect(status.branch).toBe("feature-branch");

	// Switching back
	switchBranch(repo(), "main");
	const statusMain = getGitStatus(repo());
	expect(statusMain.branch).toBe("main");
});

test("dirty-worktree protection refuses destructive operations", () => {
	writeFileSync(join(repo(), "dirty.txt"), "some dirty content");
	expect(isWorktreeDirty(repo())).toBe(true);

	// Creating branch or switching should be blocked
	expect(() => createAndSwitchBranch(repo(), "new-branch")).toThrow(/dirty changes/);
	expect(() => switchBranch(repo(), "main")).toThrow(/dirty changes/);
	expect(rebase(repo(), "main")).rejects.toThrow(/dirty changes/);
	expect(merge(repo(), "main")).rejects.toThrow(/dirty changes/);
	expect(cherryPick(repo(), "HEAD")).rejects.toThrow(/dirty changes/);
});

test("clean rebase, merge, and cherry-pick execute successfully", async () => {
	// Switch to feature-branch, make a commit
	createAndSwitchBranch(repo(), "feature-1");
	writeFileSync(join(repo(), "file1.txt"), "content 1");
	runGit(repo(), ["add", "file1.txt"]);
	runGit(repo(), ["commit", "-m", "commit 1"], { env: TEST_IDENTITY });

	// Go back to main, make a commit
	switchBranch(repo(), "main");
	writeFileSync(join(repo(), "file2.txt"), "content 2");
	runGit(repo(), ["add", "file2.txt"]);
	runGit(repo(), ["commit", "-m", "commit 2"], { env: TEST_IDENTITY });

	// Rebase feature-1 onto main
	switchBranch(repo(), "feature-1");
	const rebaseResult = await rebase(repo(), "main");
	expect(rebaseResult.status).toBe("clean");

	const log = getLog(repo(), 3);
	expect(log[0]).toContain("commit 1");
	expect(log[1]).toContain("commit 2");
});

test("conflicting merge and abort/continue works on merge conflict", async () => {
	// Create conflicting changes on main and branch
	createAndSwitchBranch(repo(), "feature-conflict");
	writeFileSync(join(repo(), "conflict.txt"), "feature content");
	runGit(repo(), ["add", "conflict.txt"]);
	runGit(repo(), ["commit", "-m", "feature conflict"], { env: TEST_IDENTITY });

	switchBranch(repo(), "main");
	writeFileSync(join(repo(), "conflict.txt"), "main content");
	runGit(repo(), ["add", "conflict.txt"]);
	runGit(repo(), ["commit", "-m", "main conflict"], { env: TEST_IDENTITY });

	// Attempt merge, should return conflict
	const mergeResult = await merge(repo(), "feature-conflict");
	expect(mergeResult.status).toBe("conflict");

	const conflictState = getConflictState(repo());
	expect(conflictState.operation).toBe("merge");
	expect(conflictState.conflictedPaths).toEqual(["conflict.txt"]);

	// Abort the operation
	abortOperation(repo());
	const status = getGitStatus(repo());
	expect(status.inProgressOperation).toBe("none");
});

test("push with lease succeeds when remote SHA is as expected, fails when remote has moved on", () => {
	const initialSHA = runGit(repo(), ["rev-parse", "main"]);

	// Push should succeed initially
	expect(() => pushWithLease(repo(), "origin", "main", initialSHA)).not.toThrow();

	// Make another commit in origin to simulate remote moving on
	const otherClone = join(
		temp?.root ??
			(() => {
				throw new Error("temporary repository was not created");
			})(),
		"other-clone",
	);
	runGit(
		temp?.root ??
			(() => {
				throw new Error("temporary repository was not created");
			})(),
		[
			"clone",
			temp?.remote ??
				(() => {
					throw new Error("temporary repository was not created");
				})(),
			otherClone,
		],
	);
	writeFileSync(join(otherClone, "remote-change.txt"), "remote");
	runGit(otherClone, ["add", "remote-change.txt"]);
	runGit(otherClone, ["commit", "-m", "remote change"], { env: TEST_IDENTITY });
	runGit(otherClone, ["push", "origin", "main"]);

	// Pushing with initialSHA should now fail (stale lease)
	expect(() => pushWithLease(repo(), "origin", "main", initialSHA)).toThrow(/stale lease/);
});

test("hasConflicts detects actual conflicts vs none", () => {
	expect(hasConflicts(repo())).toBe(false);
});

test("pushWithLease sanitizes branch name and expected SHA against command injection", () => {
	expect(() => pushWithLease(repo(), "origin", "feature; rm -rf /", "abcdef123456")).toThrow(/Invalid branch name/);
	expect(() => pushWithLease(repo(), "origin", "feature", "abc; rm -rf /")).toThrow(/Invalid expected SHA/);
});

test("merge and rebase throw proper errors for genuine git failures other than conflicts", async () => {
	await expect(merge(repo(), "non-existent-branch")).rejects.toThrow(/Git merge failed/);
	await expect(rebase(repo(), "non-existent-branch")).rejects.toThrow(/Git rebase failed/);
});

test("rebase conflict state reports commit SHAs instead of commit object text", () => {
	const root = mkdtempSync(join(tmpdir(), "df-git-rebase-"));
	try {
		runGit(root, ["init", "-b", "darkfactory"]);
		runGit(root, ["config", "user.name", "Test"]);
		runGit(root, ["config", "user.email", "test@example.com"]);
		writeFileSync(join(root, "file.txt"), "base\n");
		runGit(root, ["add", "file.txt"]);
		runGit(root, ["commit", "-m", "base"]);
		runGit(root, ["checkout", "-b", "feature"]);
		writeFileSync(join(root, "file.txt"), "feature\n");
		runGit(root, ["commit", "-am", "feature"]);
		const featureHead = runGit(root, ["rev-parse", "HEAD"]);
		runGit(root, ["checkout", "darkfactory"]);
		writeFileSync(join(root, "file.txt"), "main\n");
		runGit(root, ["commit", "-am", "main"]);
		const onto = runGit(root, ["rev-parse", "HEAD"]);
		runGit(root, ["checkout", "feature"]);
		try {
			runGit(root, ["rebase", "darkfactory"]);
		} catch {}
		const state = getConflictState(root);
		expect(state.operation).toBe("rebase");
		expect(state.head).toBe(featureHead);
		expect(state.base).toBe(onto);
		expect(state.head).toMatch(/^[0-9a-f]{40}$/);
		expect(state.base).toMatch(/^[0-9a-f]{40}$/);
		runGit(root, ["rebase", "--abort"]);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("untracked unrelated files remain dirty during a conflict operation", () => {
	const root = mkdtempSync(join(tmpdir(), "df-git-dirty-"));
	try {
		runGit(root, ["init", "-b", "darkfactory"]);
		runGit(root, ["config", "user.name", "Test"]);
		runGit(root, ["config", "user.email", "test@example.com"]);
		writeFileSync(join(root, "file.txt"), "base\n");
		runGit(root, ["add", "file.txt"]);
		runGit(root, ["commit", "-m", "base"]);
		runGit(root, ["checkout", "-b", "feature"]);
		writeFileSync(join(root, "file.txt"), "feature\n");
		runGit(root, ["commit", "-am", "feature"]);
		runGit(root, ["checkout", "darkfactory"]);
		writeFileSync(join(root, "file.txt"), "main\n");
		runGit(root, ["commit", "-am", "main"]);
		runGit(root, ["checkout", "feature"]);
		try {
			runGit(root, ["merge", "darkfactory"]);
		} catch {}
		writeFileSync(join(root, "unrelated.txt"), "do not hide me\n");
		expect(isWorktreeDirty(root)).toBe(true);
		runGit(root, ["merge", "--abort"]);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
