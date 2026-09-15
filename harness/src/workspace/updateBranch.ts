import { runGit } from "./git.ts";

/**
 * Update the current branch of a worktree by merging the latest `origin/<base>` into it.
 *
 * @param worktree - Path to the git worktree.
 * @param base - Name of the base branch on the remote (e.g. "main").
 * @returns An object describing the result. If the merge succeeds without conflicts, `{ status: "clean" }` is returned.
 *          If a merge conflict occurs, `{ status: "conflict", conflictedFiles: string[] }` is returned, where
 *          `conflictedFiles` are the paths (relative to the worktree) that are in conflict.
 */
export async function updateBranch({ worktree, base }: { worktree: string; base: string }): Promise<
  | { status: "clean" }
  | { status: "conflict"; conflictedFiles: string[] }
> {
  // Ensure we have the latest remote refs for the base.
  runGit(worktree, ["fetch", "origin", base]);

  try {
    // Attempt the merge. Using `--no-ff` is not required; default merge works.
    runGit(worktree, ["merge", `origin/${base}`]);
    return { status: "clean" };
  } catch (e) {
    // If merge failed, it may be due to conflicts.
    // Determine conflicted files via `git diff --name-only --diff-filter=U`.
    let conflicted = [] as string[];
    try {
      const out = runGit(worktree, ["diff", "--name-only", "--diff-filter=U"]);
      conflicted = out ? out.split(/\r?\n/).filter(Boolean) : [];
    } catch (_) {
      // If we cannot get the list, fall back to empty.
    }
    return { status: "conflict", conflictedFiles: conflicted };
  }
}
