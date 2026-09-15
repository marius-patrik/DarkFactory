import type { CommitIdentity } from "./commitChunk.ts";
import { GitError, runGit } from "./git.ts";

/** Result of {@link updateBranch}. */
export type UpdateBranchResult =
	| { status: "clean" }
	| { status: "conflict"; conflictedFiles: string[] };

/**
 * Merges the latest `origin/<base>` into the worktree's branch.
 *
 * The merge commit uses the configured identity (a CI runner has no git identity; E2E #314 failed that way). On a
 * conflict the merge stays in progress with the conflicted files listed, so an agent can resolve them and the engine
 * commits the resolution; any other git failure is thrown.
 *
 * @param options - Worktree, base branch and commit identity.
 * @returns `clean` when the merge completed (or there was nothing to merge), otherwise the conflicted files.
 * @throws GitError when the fetch or merge fails for a reason other than conflicts.
 */
export async function updateBranch({
	worktree,
	base,
	identity,
}: {
	worktree: string;
	base: string;
	identity: CommitIdentity;
}): Promise<UpdateBranchResult> {
	runGit(worktree, ["fetch", "origin", base]);
	const env = {
		GIT_AUTHOR_NAME: identity.name,
		GIT_AUTHOR_EMAIL: identity.email,
		GIT_COMMITTER_NAME: identity.name,
		GIT_COMMITTER_EMAIL: identity.email,
	};
	try {
		runGit(worktree, ["merge", "--no-edit", `origin/${base}`], { env });
		return { status: "clean" };
	} catch (error) {
		if (!(error instanceof GitError)) throw error;
		const conflicted = runGit(worktree, ["diff", "--name-only", "--diff-filter=U"]).split(/\r?\n/).filter(Boolean);
		if (conflicted.length === 0) throw error;
		return { status: "conflict", conflictedFiles: conflicted };
	}
}
