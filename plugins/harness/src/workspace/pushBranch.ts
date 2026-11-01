import { runGit } from "./git.ts";

/**
 * Pushes the current HEAD of the given worktree to the specified remote and branch, setting it as the upstream.
 *
 * @param params - Push parameters.
 * @param params.worktree - Path to the worktree directory.
 * @param params.remote - Name or URL of the remote repository.
 * @param params.branch - Target branch name on the remote.
 * @returns The SHA of the commit that was pushed.
 * @throws {GitError} If the push is rejected or fails.
 */
export function pushBranch({ worktree, remote, branch }: { worktree: string; remote: string; branch: string }): string {
	runGit(worktree, ["push", "--set-upstream", remote, `HEAD:refs/heads/${branch}`]);
	return runGit(worktree, ["rev-parse", "HEAD"]);
}
