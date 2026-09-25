import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "@darkfactory/protocol/config-document";
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
 * Resolves the canonical repository default branch from the combined configuration's repo block.
 *
 * @param repoDir - Path to the repository.
 * @returns The resolved default branch name.
 * @throws {Error} If the configuration or repo block is unavailable or identity.default_branch is missing.
 */
export async function resolveDefaultBranch(repoDir: string): Promise<string> {
	const path = resolveConfigDocumentPath(repoDir);
	if (!path) throw new Error(`No combined DarkFactory configuration found in ${repoDir}`);
	let content: string;
	try {
		content = await readFile(path, "utf8");
	} catch (error) {
		throw new Error(`Failed to read combined configuration at ${path}: ${(error as Error).message}`);
	}

	let repo: Record<string, unknown> | undefined;
	try {
		const document = parseConfigDocument(content, path);
		repo = configBlock(document, "repo", path);
	} catch (error) {
		throw new Error(`Failed to parse combined configuration at ${path}: ${(error as Error).message}`);
	}
	if (!repo) throw new Error(`Combined configuration at ${path} is missing the repo block`);
	const identity = repo.identity;
	const branch =
		identity && typeof identity === "object" && !Array.isArray(identity)
			? (identity as { default_branch?: unknown }).default_branch
			: undefined;
	if (typeof branch !== "string" || !branch.trim()) {
		throw new Error(`repo block at ${path} is missing a non-empty identity.default_branch`);
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
	const changed: { status: string; path: string }[] = [];
	for (let index = 0; index < entries.length; index++) {
		const entry = entries[index] ?? "";
		if (entry.length < 4) continue;
		const status = entry.slice(0, 2);
		const path = entry.slice(3);
		if (status.includes("R") || status.includes("C")) index++;
		if (!path.startsWith(".df-task/") && !path.startsWith(".df-")) {
			changed.push({ status, path });
		}
	}

	if (changed.length === 0) return false;

	const op = getInProgressOperation(worktree);
	if (op === "none") return true;

	// Conflict resolution may legitimately dirty tracked files, but unrelated untracked files
	// remain unsafe and must never be hidden merely because a merge/rebase/cherry-pick is active.
	return changed.some((entry) => entry.status === "??");
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
			const rebaseDir = existsSync(join(gitDir, "rebase-merge"))
				? join(gitDir, "rebase-merge")
				: join(gitDir, "rebase-apply");
			const origHeadFile = join(rebaseDir, "orig-head");
			const ontoFile = join(rebaseDir, "onto");
			if (existsSync(origHeadFile)) head = readFileSync(origHeadFile, "utf8").trim();
			else head = runGit(worktree, ["rev-parse", "ORIG_HEAD"]);
			if (existsSync(ontoFile)) base = readFileSync(ontoFile, "utf8").trim();
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
export function pushWithLease(worktree: string, remote: string, branch: string, expectedOldSHA: string): string {
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
	const localSha = runGit(worktree, ["rev-parse", "HEAD"]);
	try {
		runGit(worktree, ["push", `--force-with-lease=${branch}:${expectedOldSHA}`, remote, `HEAD:refs/heads/${branch}`]);
	} catch (error) {
		if (error instanceof GitError && /stale info|rejected|fetch first/iu.test(error.stderr)) {
			throw new Error(`Push refused: remote branch '${branch}' has been updated independently (stale lease).`);
		}
		throw error;
	}
	runGit(worktree, ["fetch", remote, `refs/heads/${branch}:refs/remotes/${remote}/${branch}`]);
	const remoteSha = runGit(worktree, ["rev-parse", `refs/remotes/${remote}/${branch}`]);
	if (remoteSha !== localSha) {
		throw new Error(`Push verification failed for ${remote}/${branch}: expected ${localSha}, observed ${remoteSha}`);
	}
	return remoteSha;
}
