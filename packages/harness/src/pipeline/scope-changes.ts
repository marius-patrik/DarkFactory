/**
 * The two ways the deterministic scope gate acts on the working copy.
 *
 * Replaces `get_pr_changed_files` and `revert_out_of_scope_files` in
 * `.github/scripts/agent_runner.py`. The gate itself - parsing a plan's declared file scope and
 * partitioning the changed files - is pure and lives in `plan-scope.ts`; these are the two effects it
 * has once the model is not in the loop, and both are git operations the review and fix stages
 * sequence around.
 *
 * Both refuse to be quiet about an unresolvable base. `resolveBaseRefs` throws naming the refs it
 * tried, and that is the point: an empty list of changed files is a scope gate that passes on
 * nothing, and a file absent from an unresolvable base looks exactly like a file the base never had
 * - so the reversion would delete work rather than restore it.
 */

import type { WorkspaceIo } from "./workspace-io.ts";

/**
 * The files changed between the checked-out branch and the base branch.
 *
 * The first base ref that yields any files wins, which is what makes this tolerant of a shallow
 * checkout: the range refs are tried first because they name the change, and a base equal to HEAD
 * produces an empty diff that a later ref can still answer.
 *
 * @param workspace - The working copy to read.
 * @param base - The base branch to compare against.
 * @returns The changed paths, normalised to forward slashes, possibly empty.
 * @throws When the base branch cannot be resolved in the working copy.
 */
export function prChangedFiles(workspace: WorkspaceIo, base: string): string[] {
	let files: string[] = [];
	for (const ref of workspace.resolveBaseRefs(base)) {
		const out = workspace.git(["diff", "--name-only", ref]);
		files = out
			.split("\n")
			.map((line) => line.trim().replace(/\\/gu, "/"))
			.filter((line) => line.length > 0);
		if (files.length > 0) break;
	}
	return files;
}

/**
 * Restore out-of-scope files from the base branch, in a commit of their own, and push it.
 *
 * Its own commit is the point. A reversion and an agent's fix in one commit cannot be told apart,
 * so a reviewer cannot read the diff and see that the file came back from the base rather than
 * having been rewritten by the agent.
 *
 * A file the base never had is deleted rather than restored, which is why the existence probe is
 * per-file and why it runs against a ref that names a commit: the `...HEAD` range refs are dropped,
 * because `git cat-file -e` cannot read a path out of a range.
 *
 * @param workspace - The working copy to restore into.
 * @param base - The base branch to restore from.
 * @param outOfScope - The paths the plan did not cover.
 * @returns The reversion commit's SHA.
 * @throws When the base branch cannot be resolved, or when git rejects any of the steps.
 */
export function revertOutOfScopeFiles(workspace: WorkspaceIo, base: string, outOfScope: readonly string[]): string {
	const baseRefs = workspace.resolveBaseRefs(base).filter((ref) => !ref.endsWith("...HEAD"));

	for (const path of outOfScope) {
		if (restoreFromBase(workspace, baseRefs, path)) continue;
		// Absent from every base ref: the change added a file the plan never asked for, so it goes.
		// The filesystem removal is what makes this work for an untracked file, which `git rm
		// --ignore-unmatch` deliberately leaves alone.
		const removed = workspace.removePath(path);
		if (removed === "file") workspace.git(["rm", "-f", "--ignore-unmatch", path]);
		else if (removed === "directory") workspace.git(["rm", "-rf", "--ignore-unmatch", path]);
	}

	workspace.git(["add", "-A"]);
	workspace.git(["commit", "-m", `revert(scope): revert files outside plan scope (${outOfScope.join(", ")})`]);
	workspace.git(["push", "origin", "HEAD"]);
	return workspace.git(["rev-parse", "HEAD"]).trim();
}

/**
 * Check one path out of the first base ref that carries it, and report whether that happened.
 *
 * The Python ran `git cat-file -e` through a non-raising `subprocess.run` and read its exit status;
 * this port's `git` throws instead, so the throw *is* the non-zero status, and the first ref that
 * does not throw is the one the path is checked out from.
 */
function restoreFromBase(workspace: WorkspaceIo, baseRefs: readonly string[], path: string): boolean {
	for (const ref of baseRefs) {
		try {
			workspace.git(["cat-file", "-e", `${ref}:${path}`]);
		} catch {
			continue;
		}
		workspace.git(["checkout", ref, "--", path]);
		return true;
	}
	return false;
}
