import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { runGit } from "./git.ts";
import { slugify } from "../import/shared.ts";

/**
 * Create (or reuse) a git worktree for a given branch.
 *
 * - Ensures the remote `repo` has fetched `base`.
 * - Worktree directory is `<workRoot>/<branch-slug>`.
 * - If the branch does not exist locally, it is created from `origin/<base>`.
 * - If the worktree already exists, it is reused.
 * - Returns the absolute path and the branch name used.
 */
export function createWorktree({
  repo,
  branch,
  base,
  workRoot,
}: {
  /** Path to the local repository (clone). */
  repo: string;
  /** Name of the branch to check out in the worktree. */
  branch: string;
  /** Base branch name on the remote (e.g. "main"). */
  base: string;
  /** Directory under which worktrees are created. */
  workRoot: string;
}): { worktreePath: string; worktreeBranch: string } {
  // Ensure we have the latest refs for the base.
  runGit(repo, ["fetch", "origin", base]);

  // Determine the worktree path using a slugified branch name.
  const worktreePath = join(workRoot, slugify(branch));

  // Ensure the workRoot directory exists.
  if (!existsSync(workRoot)) {
    mkdirSync(workRoot, { recursive: true });
  }

  // If the worktree directory already exists, assume it is correctly set up.
  if (!existsSync(worktreePath)) {
    // Does the branch already exist locally?
    let branchExists = false;
    try {
      runGit(repo, ["rev-parse", "--verify", branch]);
      branchExists = true;
    } catch (_) {
      branchExists = false;
    }

    if (branchExists) {
      // Attach existing branch to a new worktree.
      runGit(repo, ["worktree", "add", worktreePath, branch]);
    } else {
      // Create a new branch from origin/<base> and attach it.
      runGit(repo, ["worktree", "add", "-b", branch, worktreePath, `origin/${base}`]);
    }
  }

  return { worktreePath, worktreeBranch: branch };
}
