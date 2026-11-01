/**
 * Checking out the branch a pull request actually merges.
 *
 * Replaces `checkout_pr_branch` in `.github/scripts/agent_runner.py`. Every stage after
 * implementation runs here, and the reason is the same in all of them: a dispatched stage starts
 * from the repository's default branch, so a review that read the default branch read the wrong
 * tree, and a fix that committed there pushed to a ref the pull request does not merge.
 *
 * The git identity is configured here rather than at each call site because every stage that
 * changes the branch starts here, and a container with no committer identity fails the commit with
 * "Author identity unknown" *after* the agent has already done the work.
 */

import type { PipelineContext } from "./handler-context.ts";
import { errorMessage } from "./pipeline-io.ts";
import type { WorkspaceIo } from "./workspace-io.ts";

/** What a stage needs in addition to what every ported handler is given, to prepare a branch. */
export interface PrBranchContext extends PipelineContext {
	/** The working copy the branch is checked out in, and the identity is configured for. */
	workspace: WorkspaceIo;
}

/**
 * Check out a pull request's head branch in the working copy, ready for commits.
 *
 * The branch is reset to `origin/<head>` rather than merged into, because a dispatched review or fix
 * run is one step of a sequence and the previous step's push is the state to continue from; starting
 * from the default branch and fast-forwarding is what would have merged two lanes of work.
 *
 * A failure is reported and answered with `undefined` rather than thrown. Three callers depend on
 * that: each posts its own notice, because what went wrong decides what is worth saying, and a
 * stage that threw here would post nothing at all.
 *
 * @param context - The handler's GitHub port, workspace, and reporting.
 * @param repo - Repository slug, `owner/name`.
 * @param prNumber - The pull request whose branch is wanted.
 * @returns The head branch name, or `undefined` when it could not be checked out.
 */
export async function checkoutPrBranch(
	context: PrBranchContext,
	repo: string,
	prNumber: number,
): Promise<string | undefined> {
	try {
		// `run_gh(["pr","view",..., "--json","headRefName"])` raised `KeyError` when the field was
		// absent and `ValueError` when the response was not JSON; both are ordinary throws here, and
		// both belong to this catch. The Python's exception list named subprocess failures, which is
		// this port's equivalent.
		const view = await context.io.prView(repo, prNumber, ["headRefName"]);
		const head = view.headRefName;
		if (!head) throw new Error(`PR #${prNumber} did not report a headRefName`);

		// Never throws, and the notices are reported rather than dropped: a container that cannot
		// write a global identity still commits once a local one is set.
		for (const notice of context.workspace.configureGitIdentity()) context.warn(notice);

		await context.workspace.git(["fetch", "origin", head]);
		await context.workspace.git(["checkout", "-B", head, `origin/${head}`]);
		return head;
	} catch (error) {
		context.warn(`Could not check out the branch of PR #${prNumber}: ${errorMessage(error)}`);
		return undefined;
	}
}
