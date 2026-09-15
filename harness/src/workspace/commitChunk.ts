import { changedFiles } from "./changedFiles.ts";
import { runGit } from "./git.ts";

/**
 * Workspace utility to commit a chunk of changes.
 *
 * It stages exactly the files returned by {@link changedFiles} (including deletions) and creates a commit
 * with the supplied message and author/committer identity. If there are no changes, it returns `null` and
 * performs no git operation.
 *
 * @param worktree - Absolute path to the git worktree.
 * @param message - Commit message.
 * @param identity - Author and committer name and e.
 * @returns The new commit SHA as a string, or `null` if nothing was committed.
 */
export interface CommitIdentity {
  /** Author/committer name */
  name: string;
  /** Author/committer email */
  email: string;
}

/**
 * Commit a chunk of changes from the worktree.
 *
 * Stages exactly the files returned by {@link changedFiles} (including deletions), then creates a commit
 * with the supplied message and author/committer identity. If there are no changes, returns `null` without
 * committing.
 *
 * @param worktree - Absolute path to the git worktree.
 * @param message - Commit message.
 * @param identity - Author and committer name and e.
 * @returns The new commit SHA as a string, or `null` if nothing was committed.
 */
export async function commitChunk({
  worktree,
  message,
  identity,
}: {
  worktree: string;
  message: string;
  identity: CommitIdentity;
}): Promise<string | null> {
  // Determine which files have changed (excluding engine scratch files).
  const paths = await changedFiles(worktree);
  if (paths.length === 0) {
    return null;
  }

  // Stage exactly those paths, including deletions.
  // The `--` separator ensures paths are not interpreted as options.
  runGit(worktree, ["add", "--all", "--", ...paths]);

  // Commit with the provided identity.
  const env = {
    GIT_AUTHOR_NAME: identity.name,
    GIT_AUTHOR_EMAIL: identity.email,
    GIT_COMMITTER_NAME: identity.name,
    GIT_COMMITTER_EMAIL: identity.email,
  };
  runGit(worktree, ["commit", "-m", message], { env });

  // Return the newly created commit SHA.
  return runGit(worktree, ["rev-parse", "HEAD"]);
}
