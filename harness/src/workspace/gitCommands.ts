import { GitError, runGit } from "./git.ts";
import { getInProgressOperation, hasConflicts } from "./gitWorkspace.ts";

function validateRef(ref: string, name = "ref"): void {
	if (!ref || typeof ref !== "string" || !/^[a-zA-Z0-9_\-./~^@{}+]+$/.test(ref) || ref.startsWith("-")) {
		throw new Error(`Invalid ${name}: ${ref}`);
	}
}

/** Fetches from a remote (or origin by default). */
export function fetch(worktree: string, remote = "origin"): void {
	validateRef(remote, "remote");
	runGit(worktree, ["fetch", remote]);
}

/** Fetches from origin. */
export function fetchOrigin(worktree: string): void {
	fetch(worktree, "origin");
}

/** Returns the status porcelain output. */
export function getStatus(worktree: string): string {
	return runGit(worktree, ["status", "--porcelain=v1"]);
}

/** Lists branch names. */
export function listBranches(worktree: string): string[] {
	return runGit(worktree, ["branch", "--format=%(refname:short)"]).split("\n").filter(Boolean);
}

/** Creates and switches to a new branch. */
export function createBranch(worktree: string, branch: string, startPoint: string): void {
	validateRef(branch, "branch");
	validateRef(startPoint, "startPoint");
	runGit(worktree, ["checkout", "-b", branch, startPoint]);
}

/** Switches to a branch. */
export function switchBranch(worktree: string, branch: string): void {
	validateRef(branch, "branch");
	runGit(worktree, ["checkout", branch]);
}

/** Rebases current branch on top of base. */
export function rebase(worktree: string, base: string): "clean" | "conflict" {
	validateRef(base, "base");
	try {
		runGit(worktree, ["rebase", base]);
		return "clean";
	} catch (error) {
		if (error instanceof GitError && error.exitCode !== 0) {
			if (hasConflicts(worktree)) return "conflict";
			throw new Error(`Git rebase failed: ${error.stderr || error.message}`);
		}
		throw error;
	}
}

/** Merges base into current branch. */
export function merge(worktree: string, base: string): "clean" | "conflict" {
	validateRef(base, "base");
	try {
		runGit(worktree, ["merge", "--no-edit", base]);
		return "clean";
	} catch (error) {
		if (error instanceof GitError && error.exitCode !== 0) {
			if (hasConflicts(worktree)) return "conflict";
			throw new Error(`Git merge failed: ${error.stderr || error.message}`);
		}
		throw error;
	}
}

/** Cherry-picks a commit. */
export function cherryPick(worktree: string, commit: string): "clean" | "conflict" {
	validateRef(commit, "commit");
	try {
		runGit(worktree, ["cherry-pick", commit]);
		return "clean";
	} catch (error) {
		if (error instanceof GitError && error.exitCode !== 0) {
			if (hasConflicts(worktree)) return "conflict";
			throw new Error(`Git cherry-pick failed: ${error.stderr || error.message}`);
		}
		throw error;
	}
}

/** Continues an in-progress operation (rebase/merge/cherry-pick). */
export function continueOperation(worktree: string): void {
	const operation = getInProgressOperation(worktree);
	if (operation === "rebase") {
		runGit(worktree, ["rebase", "--continue"], { env: { GIT_EDITOR: "true" } });
	} else if (operation === "merge") {
		runGit(worktree, ["merge", "--continue"], { env: { GIT_EDITOR: "true" } });
	} else if (operation === "cherry-pick") {
		runGit(worktree, ["cherry-pick", "--continue"], { env: { GIT_EDITOR: "true" } });
	} else {
		throw new Error("No operation (rebase, merge, or cherry-pick) in progress to continue.");
	}
}

/** Aborts an in-progress operation (rebase/merge/cherry-pick). */
export function abortOperation(worktree: string): void {
	const operation = getInProgressOperation(worktree);
	if (operation === "rebase") {
		runGit(worktree, ["rebase", "--abort"]);
	} else if (operation === "merge") {
		runGit(worktree, ["merge", "--abort"]);
	} else if (operation === "cherry-pick") {
		runGit(worktree, ["cherry-pick", "--abort"]);
	} else {
		throw new Error("No operation (rebase, merge, or cherry-pick) in progress to abort.");
	}
}

/** Pushes current branch with lease. */
export function pushWithLease(worktree: string, remote: string, branch: string, expectedSHA: string): void {
	validateRef(remote, "remote");
	validateRef(branch, "branch");
	if (!expectedSHA || !/^[0-9a-fA-F]{4,64}$/.test(expectedSHA)) {
		throw new Error(`Invalid expected SHA for push with lease: ${expectedSHA}`);
	}
	runGit(worktree, ["push", `--force-with-lease=${branch}:${expectedSHA}`, remote, branch]);
}
