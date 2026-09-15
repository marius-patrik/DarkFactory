import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { slugify } from "../import/shared.ts";
import { GitError, runGit } from "./git.ts";

/** Options for {@link createWorktree}. */
export interface CreateWorktreeOptions {
	/** Local clone whose `origin` holds the base (and possibly the branch). */
	repo: string;
	/** Branch to check out in the worktree. */
	branch: string;
	/** Base branch on `origin` a new branch starts from, e.g. `darkfactory`. */
	base: string;
	/** Directory under which worktrees are created (`<workRoot>/<branch-slug>`). */
	workRoot: string;
}

function refExists(repo: string, ref: string): boolean {
	try {
		runGit(repo, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
		return true;
	} catch (error) {
		if (error instanceof GitError) return false;
		throw error;
	}
}

/**
 * Creates or reuses the worktree for a branch. Idempotent: calling it again returns the same directory.
 *
 * Fetches `base` (and the branch, when `origin` has it). The branch is checked out from, in order: the local branch,
 * `origin/<branch>` (so work already pushed is continued, never replaced), or a new branch from `origin/<base>`.
 * An existing directory is reused only when it is a worktree of this repository on that branch.
 *
 * @param options - Repository, branch, base and work root.
 * @returns The worktree directory and the branch checked out there.
 * @throws GitError when git fails; Error when the directory exists but is not this branch's worktree.
 */
export function createWorktree({ repo, branch, base, workRoot }: CreateWorktreeOptions): {
	worktreePath: string;
	worktreeBranch: string;
} {
	runGit(repo, ["fetch", "origin", base]);
	try {
		runGit(repo, ["fetch", "origin", `refs/heads/${branch}:refs/remotes/origin/${branch}`]);
	} catch (error) {
		if (!(error instanceof GitError)) throw error;
		// The branch is not on origin yet.
	}
	const worktreePath = resolve(join(workRoot, slugify(branch)));
	if (existsSync(worktreePath)) {
		let current = "";
		try {
			current = runGit(worktreePath, ["branch", "--show-current"]);
		} catch (error) {
			if (!(error instanceof GitError)) throw error;
		}
		if (current !== branch) throw new Error(`${worktreePath} exists but is not a worktree on ${branch}`);
		return { worktreePath, worktreeBranch: branch };
	}
	mkdirSync(workRoot, { recursive: true });
	if (refExists(repo, `refs/heads/${branch}`)) {
		runGit(repo, ["worktree", "add", worktreePath, branch]);
	} else if (refExists(repo, `refs/remotes/origin/${branch}`)) {
		runGit(repo, ["worktree", "add", "--track", "-b", branch, worktreePath, `origin/${branch}`]);
	} else {
		runGit(repo, ["worktree", "add", "--no-track", "-b", branch, worktreePath, `origin/${base}`]);
	}
	return { worktreePath, worktreeBranch: branch };
}
