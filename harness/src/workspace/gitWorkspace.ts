import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { resolveDfFile } from "../utils/resolver.ts";
import { GitError, runGit } from "./git.ts";

/**
 * Structured Git Conflict State.
 */
export interface GitConflictState {
	/** The current conflict-bearing operation. */
	operation: "rebase" | "merge" | "cherry-pick" | "none";
	/** The base ref or SHA of the operation. */
	base?: string;
	/** The head ref or SHA of the operation. */
	head?: string;
	/** The list of conflicted files. */
	conflictedPaths: string[];
	/** Actionable commands for the operator or agent to proceed. */
	continuationCommands: {
		continue: string;
		abort: string;
	};
}

/**
 * Structured Git Status.
 */
export interface GitStatusResult {
	/** Current branch name. */
	branch: string;
	/** Whether there are uncommitted changes. */
	isDirty: boolean;
	/** Whether a conflict-bearing operation is currently in progress. */
	inProgressOperation: "rebase" | "merge" | "cherry-pick" | "none";
	/** Path relative changes in the worktree. */
	changedFiles: string[];
}

/**
 * Resolves the canonical repository default branch from repo.df.
 *
 * @param repoDir - Path to the repository.
 * @returns The resolved default branch name.
 * @throws {Error} If repo.df cannot be found, parsed, or does not specify identity.default_branch.
 */
export async function resolveDefaultBranch(repoDir: string): Promise<string> {
	const path = resolveDfFile(repoDir, "repo");
	let content: string;
	try {
		content = await readFile(path, "utf8");
	} catch (error) {
		throw new Error(`Failed to read repo.df file at ${path}: ${(error as Error).message}`);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch (error) {
		throw new Error(`Failed to parse repo.df at ${path}: ${(error as Error).message}`);
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error(`repo.df at ${path} must contain an object`);
	}
	const identity = (parsed as { identity?: unknown }).identity;
	const branch =
		identity && typeof identity === "object" && !Array.isArray(identity)
			? (identity as { default_branch?: unknown }).default_branch
			: undefined;
	if (typeof branch !== "string" || !branch.trim()) {
		throw new Error(`repo.df at ${path} is missing a non-empty identity.default_branch`);
	}
	return branch.trim();
}

/**
 * Helper to get the git-dir for a worktree.
 */
function getGitDir(worktree: string): string {
	const raw = runGit(worktree, ["rev-parse", "--git-dir"]).trim();
	return resolve(worktree, raw);
}

/**
 * Checks if there is an in-progress conflict-bearing operation (rebase, merge, cherry-pick).
 *
 * @param worktree - Path to the git worktree.
 * @returns The active operation type, or "none".
 */
export function getInProgressOperation(worktree: string): "rebase" | "merge" | "cherry-pick" | "none" {
	const gitDir = getGitDir(worktree);

	if (existsSync(join(gitDir, "rebase-merge")) || existsSync(join(gitDir, "rebase-apply"))) return "rebase";
	if (existsSync(join(gitDir, "MERGE_HEAD"))) return "merge";
	if (existsSync(join(gitDir, "CHERRY_PICK_HEAD"))) return "cherry-pick";

	return "none";
}

/**
 * Identifies if the worktree contains uncommitted/dirty work, ignoring scratch paths.
 * Returns false when there are only scratch files or if the dirty files belong to
 * an explicitly initiated in-progress conflict-bearing operation.
 *
 * @param worktree - Path to the git worktree.
 * @returns True if the worktree contains uncommitted changes.
 */
export function isWorktreeDirty(worktree: string): boolean {
	const stdout = runGit(worktree, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
	const entries = stdout.split("\0");
	const changed: string[] = [];
	for (let index = 0; index < entries.length; index++) {
		const entry = entries[index] ?? "";
		if (entry.length < 4) continue;
		const status = entry.slice(0, 2);
		const path = entry.slice(3);
		if (status.includes("R") || status.includes("C")) index++;
		if (!path.startsWith(".df-task/") && !path.startsWith(".df-")) {
			changed.push(path);
		}
	}

	if (changed.length === 0) return false;

	// If we are in-progress of rebase/merge/cherry-pick, those dirty files are expected
	const op = getInProgressOperation(worktree);
	if (op !== "none") return false;

	return true;
}

/**
 * Asserts that the worktree is not dirty. Protects against accidental loss of work.
 *
 * @param worktree - Path to the git worktree.
 * @throws {Error} If the worktree is dirty.
 */
export function assertCleanWorktree(worktree: string): void {
	if (isWorktreeDirty(worktree)) {
		throw new Error(`Operation refused: worktree at ${worktree} has uncommitted dirty changes.`);
	}
}

/**
 * Returns structured git status of the worktree.
 *
 * @param worktree - Path to the git worktree.
 * @returns Status of the current branch, dirty flag, and in-progress operation.
 */
export function getGitStatus(worktree: string): GitStatusResult {
	let branch = "";
	try {
		branch = runGit(worktree, ["branch", "--show-current"]);
		if (!branch) {
			// fallback for detached HEAD
			branch = runGit(worktree, ["rev-parse", "--short", "HEAD"]);
		}
	} catch {
		branch = "unknown";
	}

	const isDirty = isWorktreeDirty(worktree);
	const inProgressOperation = getInProgressOperation(worktree);

	const stdout = runGit(worktree, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
	const entries = stdout.split("\0");
	const changed: string[] = [];
	for (let index = 0; index < entries.length; index++) {
		const entry = entries[index] ?? "";
		if (entry.length < 4) continue;
		const status = entry.slice(0, 2);
		const path = entry.slice(3);
		if (status.includes("R") || status.includes("C")) index++;
		if (!path.startsWith(".df-task/") && !path.startsWith(".df-")) {
			changed.push(path);
		}
	}

	return {
		branch,
		isDirty,
		inProgressOperation,
		changedFiles: changed,
	};
}

/**
 * Runs a git fetch on the worktree with basic error reporting.
 *
 * @param worktree - Path to the git worktree.
 * @param remote - The remote name (defaults to "origin").
 */
export function fetch(worktree: string, remote = "origin"): void {
	try {
		runGit(worktree, ["fetch", remote]);
	} catch (error) {
		throw new Error(`Failed to fetch from ${remote}: ${(error as Error).message}`);
	}
}

/**
 * Retrieves the log from current HEAD with basic error reporting.
 *
 * @param worktree - Path to the git worktree.
 * @param limit - Maximum number of commits to list (defaults to 20).
 * @returns Array of commit lines.
 */
export function getLog(worktree: string, limit = 20): string[] {
	try {
		const stdout = runGit(worktree, ["log", `--max-count=${limit}`, "--oneline"]);
		return stdout.split(/\r?\n/).filter(Boolean);
	} catch (error) {
		throw new Error(`Failed to retrieve log: ${(error as Error).message}`);
	}
}

/**
 * Retrieves diff of uncommitted changes or difference between references.
 *
 * @param worktree - Path to the git worktree.
 * @param options - Diff options (e.g., base branch, staged-only).
 * @returns The raw diff output.
 */
export function getDiff(worktree: string, options: { base?: string; staged?: boolean } = {}): string {
	const args = ["diff"];
	if (options.staged) args.push("--staged");
	if (options.base) args.push(options.base);
	return runGit(worktree, args);
}

/**
 * Creates a new branch from a start point, and switches to it.
 *
 * @param worktree - Path to the git worktree.
 * @param name - The name of the new branch.
 * @param startPoint - Start point (defaults to HEAD).
 */
export function createAndSwitchBranch(worktree: string, name: string, startPoint = "HEAD"): void {
	assertCleanWorktree(worktree);
	runGit(worktree, ["checkout", "-b", name, startPoint]);
}

/**
 * Switches the current branch to an existing branch.
 *
 * @param worktree - Path to the git worktree.
 * @param branch - The branch name to switch to.
 */
export function switchBranch(worktree: string, branch: string): void {
	assertCleanWorktree(worktree);
	runGit(worktree, ["checkout", branch]);
}

/**
 * Checks if the worktree is currently in a merge conflict state.
 *
 * @param worktree - Path to the git worktree.
 * @returns True if unmerged paths (conflicts) exist.
 */
export function hasConflicts(worktree: string): boolean {
	try {
		const conflicted = runGit(worktree, ["diff", "--name-only", "--diff-filter=U"]).split(/\r?\n/).filter(Boolean);
		return conflicted.length > 0;
	} catch {
		return false;
	}
}
/**
 * Surfaces structured conflict state when an operation is blocked by merge conflicts.
 *
 * @param worktree - Path to the git worktree.
 * @returns The structured conflict state.
 */
export function getConflictState(worktree: string): GitConflictState {
	const operation = getInProgressOperation(worktree);
	let conflictedPaths: string[] = [];
	try {
		conflictedPaths = runGit(worktree, ["diff", "--name-only", "--diff-filter=U"]).split(/\r?\n/).filter(Boolean);
	} catch (error) {
		throw new Error(`Failed to determine conflicted paths: ${(error as Error).message}`);
	}

	let base: string | undefined;
	let head: string | undefined;

	if (operation === "rebase") {
		try {
			const gitDir = getGitDir(worktree);
			const rebaseMerge = join(gitDir, "rebase-merge");
			if (existsSync(rebaseMerge)) {
				const headNameFile = join(rebaseMerge, "head-name");
				if (existsSync(headNameFile)) {
					head = runGit(worktree, ["cat-file", "-p", `HEAD`]);
				}
				const ontoFile = join(rebaseMerge, "onto");
				if (existsSync(ontoFile)) {
					base = runGit(worktree, ["cat-file", "-p", "onto"]);
				}
			}
		} catch (error) {
			throw new Error(`Failed to retrieve rebase state details: ${(error as Error).message}`);
		}
	} else if (operation === "merge") {
		try {
			head = runGit(worktree, ["rev-parse", "HEAD"]);
			base = runGit(worktree, ["rev-parse", "MERGE_HEAD"]);
		} catch (error) {
			throw new Error(`Failed to retrieve merge state details: ${(error as Error).message}`);
		}
	} else if (operation === "cherry-pick") {
		try {
			head = runGit(worktree, ["rev-parse", "HEAD"]);
			base = runGit(worktree, ["rev-parse", "CHERRY_PICK_HEAD"]);
		} catch (error) {
			throw new Error(`Failed to retrieve cherry-pick state details: ${(error as Error).message}`);
		}
	}

	return {
		operation,
		base,
		head,
		conflictedPaths,
		continuationCommands: {
			continue: `df workspace continue`,
			abort: `df workspace abort`,
		},
	};
}

/**
 * Rebases the current branch onto base.
 *
 * @param worktree - Path to the git worktree.
 * @param base - The target branch or ref onto which HEAD is rebased.
 * @returns Result status.
 */
export async function rebase(worktree: string, base: string): Promise<{ status: "clean" | "conflict" }> {
	assertCleanWorktree(worktree);
	try {
		runGit(worktree, ["rebase", base]);
		return { status: "clean" };
	} catch (error) {
		if (error instanceof GitError && error.exitCode !== 0) {
			if (hasConflicts(worktree)) {
				return { status: "conflict" };
			}
			throw new Error(`Git rebase failed: ${error.stderr || error.message}`);
		}
		throw error;
	}
}

/**
 * Merges a base branch into the current branch.
 *
 * @param worktree - Path to the git worktree.
 * @param base - The branch or ref to merge.
 * @returns Result status.
 */
export async function merge(worktree: string, base: string): Promise<{ status: "clean" | "conflict" }> {
	assertCleanWorktree(worktree);
	try {
		runGit(worktree, ["merge", "--no-edit", base]);
		return { status: "clean" };
	} catch (error) {
		if (error instanceof GitError && error.exitCode !== 0) {
			if (hasConflicts(worktree)) {
				return { status: "conflict" };
			}
			throw new Error(`Git merge failed: ${error.stderr || error.message}`);
		}
		throw error;
	}
}

/**
 * Cherry-picks a commit into the current branch.
 *
 * @param worktree - Path to the git worktree.
 * @param commit - The commit SHA or ref to cherry-pick.
 * @returns Result status.
 */
export async function cherryPick(worktree: string, commit: string): Promise<{ status: "clean" | "conflict" }> {
	assertCleanWorktree(worktree);
	try {
		runGit(worktree, ["cherry-pick", commit]);
		return { status: "clean" };
	} catch (error) {
		if (error instanceof GitError && error.exitCode !== 0) {
			if (hasConflicts(worktree)) {
				return { status: "conflict" };
			}
			throw new Error(`Git cherry-pick failed: ${error.stderr || error.message}`);
		}
		throw error;
	}
}

/**
 * Continues an in-progress rebase, merge, or cherry-pick operation.
 *
 * @param worktree - Path to the git worktree.
 */
export function continueOperation(worktree: string): void {
	const operation = getInProgressOperation(worktree);
	try {
		if (operation === "rebase") {
			// Stage any resolved conflicted files first if needed, but git continue will enforce it
			runGit(worktree, ["rebase", "--continue"], { env: { GIT_EDITOR: "true" } });
		} else if (operation === "merge") {
			runGit(worktree, ["merge", "--continue"], { env: { GIT_EDITOR: "true" } });
		} else if (operation === "cherry-pick") {
			runGit(worktree, ["cherry-pick", "--continue"], { env: { GIT_EDITOR: "true" } });
		} else {
			throw new Error("No operation (rebase, merge, or cherry-pick) in progress to continue.");
		}
	} catch (error) {
		throw new Error(`Failed to continue ${operation} operation: ${(error as Error).message}`);
	}
}

/**
 * Aborts an in-progress rebase, merge, or cherry-pick operation.
 *
 * @param worktree - Path to the git worktree.
 */
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

/**
 * Pushes branch updates using lease-safe expected-old-SHA semantics.
 * Blind push is strictly forbidden.
 *
 * @param worktree - Path to the git worktree.
 * @param remote - The remote repository.
 * @param branch - The target branch.
 * @param expectedOldSHA - The exact expected old SHA on the remote. If remote has moved, push is refused.
 */
export function pushWithLease(worktree: string, remote: string, branch: string, expectedOldSHA: string): void {
	if (!branch) {
		throw new Error("Branch name is required for push with lease.");
	}
	try {
		runGit(worktree, ["check-ref-format", "--branch", branch]);
	} catch (error) {
		throw new Error(`Invalid branch name for push with lease (${branch}): ${(error as Error).message}`);
	}
	if (!expectedOldSHA || !/^[0-9a-fA-F]{4,64}$/.test(expectedOldSHA)) {
		throw new Error(`Invalid expected SHA for push with lease: ${expectedOldSHA}`);
	}
	try {
		runGit(worktree, ["push", `--force-with-lease=${branch}:${expectedOldSHA}`, remote, `HEAD:refs/heads/${branch}`]);
	} catch (error) {
		if (error instanceof GitError && error.stderr.includes("stale info")) {
			throw new Error(`Push refused: remote branch '${branch}' has been updated independently (stale lease).`);
		}
		throw error;
	}
}
