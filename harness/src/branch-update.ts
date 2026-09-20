/**
 * Branch-update/repair stage for conflicting PRs.
 * Dynamically resolves base branch, attempts deterministic git update,
 * falls back to agent conflict resolution, verifies, pushes, re-enters merge.
 */
export const branchUpdateStage = {
	id: "branch-update",
	description: "Resolve conflicts and update PR branch deterministically.",
};
