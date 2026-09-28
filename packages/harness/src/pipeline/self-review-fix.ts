/**
 * Applying one review's findings to a pull request's branch.
 *
 * Replaces `run_self_review_fix` in `.github/scripts/agent_runner.py`. The review pass decides;
 * this stage acts on the decision, and its order is the behaviour:
 *
 * 1. **Read the findings back from the pull request.** Not from the review run's memory - this is a
 *    separate workflow run dispatched by the last one, and the comment carrying iteration N's marker
 *    is the only thing both runs share. A stage that could not find it posts a notice and blocks,
 *    because proceeding without findings would dispatch a fix for nothing.
 * 2. **Revert the out-of-scope paths first, in their own commit.** A file the plan never named comes
 *    back from the base branch rather than being rewritten by the agent, and it is separate so a
 *    reviewer can see that in the diff.
 * 3. **Then hand the rest to the agent.** These need reasoning, not a restore.
 * 4. **Format, commit, push.** A fix whose own output is unformatted fails the gate that runs after
 *    it, which would report the finding as unresolved when the agent did resolve it.
 * 5. **Post the summary and dispatch the next review at iteration N+1.**
 *
 * Two failure paths block and two do not, and that difference is the Python's. An agent failure
 * posts its error and stops: the next review will not be dispatched, so nothing runs on a broken
 * fix, but the pull request is left alone because the run may simply be retried. A failed *push*
 * blocks, because the branch now holds work that exists nowhere else.
 *
 * A fix that changes nothing is not a failure. The agent is told to address findings and may
 * correctly decide one is not worth changing; the empty commit is skipped, the summary says so, and
 * the next review decides from the same findings whether the loop has gone in circles. That second
 * judgement is the loop's bound, and this stage deliberately does not duplicate it.
 */

import { type BoardStatus, blockEntity, type EntityStatePort } from "./board-status.ts";
import { errorMessage } from "./pipeline-io.ts";
import { checkoutPrBranch, type PrBranchContext } from "./pr-branch.ts";
import { findIterationComment, fixSummaryBody, nextReviewPayload } from "./review-convergence.ts";
import { parseReviewFindings, splitScopeFindings } from "./review-findings.ts";
import { revertOutOfScopeFiles } from "./scope-changes.ts";
import { AGENT_ERROR_PREFIX, isQuotaExhaustionNotice } from "./signals.ts";

/** Marks every comment this pipeline posts, so a later pass can recognise its own output. */
const AGENT_MARKER = "<!-- darkfactory-agent -->";

/** How long a fix prompt gets. The Python's own ten minutes, not the review's. */
const FIX_TIMEOUT = "10m0s";

/** Longest a git failure's own output is quoted into a comment. */
const MAX_GIT_OUTPUT = 1500;

/** What a self-review fix stage did. */
export type SelfReviewFixOutcome =
	/**
	 * The findings were applied, the summary went out, and the next review was dispatched at
	 * iteration N+1.
	 */
	| { kind: "next-review-dispatched"; iteration: number; summary: string; comment: string }
	/** The pull request's branch could not be checked out, so nothing was applied. */
	| { kind: "blocked"; iteration: number; reason: "checkout-failed" }
	/**
	 * The iteration's findings comment is not on the pull request, so there was nothing to act on.
	 */
	| { kind: "blocked"; iteration: number; reason: "no-findings-comment" }
	/** The agent ran out of quota; the run that reported it already checkpointed and blocked. */
	| { kind: "quota-exhausted"; iteration: number; notice: string }
	/**
	 * The agent failed, and a `### Self-Review Fix Error` comment was posted.
	 *
	 * Not blocked: the findings are still on the pull request, so a retry re-reads them.
	 */
	| { kind: "agent-error"; iteration: number; comment: string }
	/** The commit or the push was rejected, so the applied work exists nowhere but this workspace. */
	| { kind: "blocked"; iteration: number; reason: "commit-failed"; comment: string };

/** What to fix. */
export interface SelfReviewFixRequest {
	/** The pull request number. */
	prNumber: number;
	/** The child Plan issue number. */
	planNumber: number;
	/**
	 * The parent Request issue number.
	 *
	 * Optional, as the Python's is. A run with no separate Request blocks the pull request alone.
	 */
	requestNumber?: number | undefined;
	/** The 1-based iteration whose findings are to be applied. */
	iteration: number;
	/** The repository slug, `owner/name`. */
	repo: string;
}

/** What `run_self_review_fix` needs in addition to what every ported handler is given. */
export interface SelfReviewFixContext extends PrBranchContext {
	/** The project board, for the entities a stopped fix blocks. */
	board: BoardStatus;
}

/** The entity-state port, which every blocking path in this handler needs. */
function entitiesOf(context: SelfReviewFixContext): EntityStatePort {
	return { io: context.io, board: context.board, warn: context.warn };
}

/**
 * The prompt that asks the agent to address the findings a review left.
 *
 * Numbered, because the review numbered them: a finding the reviewer can point at is a finding the
 * agent can address one at a time, and an unnumbered blob gets one blanket change instead.
 */
function fixPrompt(otherFindings: readonly string[]): string {
	return (
		"Fix the following code review findings in the workspace:\n\n" +
		`${otherFindings.map((finding, at) => `${at + 1}. ${finding}`).join("\n")}\n\n` +
		"Make the necessary changes to resolve all findings."
	);
}

/**
 * Apply one review's findings to a pull request's branch, and dispatch the next review.
 *
 * Replaces `run_self_review_fix`.
 *
 * @param context - The handler's GitHub port, workspace, board, agent and reporting.
 * @param request - The pull request, its Plan, that Plan's parent Request, and the iteration.
 * @returns What applying the findings did.
 * @throws When the out-of-scope paths cannot be restored, or when the next review cannot be
 *   dispatched. Both are the Python's uncaught failures: a reversion that silently did nothing and a
 *   review that never runs are the two ways a pull request is left in draft with nobody reading it.
 */
export async function runSelfReviewFix(
	context: SelfReviewFixContext,
	request: SelfReviewFixRequest,
): Promise<SelfReviewFixOutcome> {
	const { prNumber, planNumber, requestNumber, iteration, repo } = request;
	const { io, workspace } = context;
	const port = entitiesOf(context);

	if ((await checkoutPrBranch(context, repo, prNumber)) === undefined) {
		blockEntity(port, repo, prNumber, true);
		return { kind: "blocked", iteration, reason: "checkout-failed" };
	}

	// Best-effort, and the failure is not a stop: the Python caught it and looked at an empty
	// comment list, which then takes the "no findings comment" path below. That path posts a notice
	// explaining itself, which is a better outcome than an unhandled read.
	let comments: string[] = [];
	try {
		comments = (await io.issueComments(repo, prNumber)).map((comment) => comment.body);
	} catch (error) {
		context.warn(`Failed to read comments for PR #${prNumber}: ${errorMessage(error)}`);
	}

	// The lenient read is deliberate: a marker written by something other than a review pass is still
	// this iteration's findings, and blocking a pull request over an unexpected character in a
	// digest would be the wrong answer to a cosmetic problem.
	const findingsComment = findIterationComment(comments, iteration);
	if (findingsComment === undefined) {
		const notice =
			`${AGENT_MARKER}\n### Self-Review Fix Notice\n\n` +
			`No self-review findings comment found for iteration ${iteration}.`;
		await io.addComment(repo, prNumber, notice);
		blockEntity(port, repo, prNumber, true);
		if (requestNumber) blockEntity(port, repo, requestNumber, false);
		context.say(`No iteration ${iteration} findings comment found on PR #${prNumber}; set Blocked.`);
		return { kind: "blocked", iteration, reason: "no-findings-comment" };
	}

	// Split before acting, because the two kinds are fixed by different mechanisms. Merging them
	// would make one serve two decisions: a restore cannot reason, and an agent cannot restore.
	const { outOfScope, other } = splitScopeFindings(parseReviewFindings(findingsComment));

	// Not caught: a reversion that quietly did nothing leaves a file the plan rejected on the branch
	// and still dispatches the next review, which then reports it again and the loop goes in circles.
	let revertSha: string | undefined;
	if (outOfScope.length > 0) {
		revertSha = revertOutOfScopeFiles(workspace, context.developmentBranch, outOfScope);
		context.say(`Reverted out-of-scope files: ${outOfScope.join(", ")}`);
	}

	if (other.length > 0) {
		const fixResult = await context.runAgentPrompt({
			prompt: fixPrompt(other),
			kind: "fix",
			timeout: FIX_TIMEOUT,
			checkpoint: {
				issueNumber: prNumber,
				repo,
				isPr: true,
				completedSteps: [`Self-review fix iteration ${iteration}`],
			},
		});

		// Tested before the error prefix, because the quota notice *is* an execution error and has
		// already checkpointed the work and blocked the issue.
		if (isQuotaExhaustionNotice(fixResult)) {
			return { kind: "quota-exhausted", iteration, notice: fixResult };
		}

		if (fixResult.startsWith(AGENT_ERROR_PREFIX)) {
			// Posted and stopped, but not blocked. The findings are still on the pull request and the
			// reversion above is already pushed, so a retry re-reads them and continues.
			const comment =
				`${AGENT_MARKER}\n### Self-Review Fix Error (Iteration ${iteration})\n\n${fixResult}`;
			await io.addComment(repo, prNumber, comment);
			return { kind: "agent-error", iteration, comment };
		}

		// Formatted before the commit, not after: a fix whose own output is unformatted fails the next
		// review's gate, which reports a finding as unresolved when the agent did resolve it.
		for (const notice of workspace.formatRepository().notices) context.warn(notice);

		try {
			await workspace.git(["add", "-A"]);
			const status = await workspace.git(["status", "--porcelain"]);
			if (status) {
				await workspace.git([
					"commit",
					"-m",
					`fix(review): address self-review findings (iteration ${iteration})`,
				]);
				await workspace.git(["push", "origin", "HEAD"]);
				context.say(`Pushed review fixes for iteration ${iteration}`);
			} else {
				// Not a failure. The agent was told to address the findings and may have decided one
				// is not worth changing; the next review decides from the same findings whether this
				// loop is going in circles, and that judgement is not duplicated here.
				context.say(`No changes after fix attempt on iteration ${iteration}`);
			}
		} catch (error) {
			// Blocked, unlike the agent-failure path: the workspace now holds work that is on no
			// branch, and a pull request whose fixes exist only in a runner that is about to exit is
			// work that is lost.
			const raw = errorMessage(error).trim();
			context.warn(`Git error during review fix: ${raw}`);
			const comment =
				`${AGENT_MARKER}\n### Self-Review Fix Error (Iteration ${iteration})\n\n` +
				"Committing or pushing the fixes failed:\n\n" +
				`\`\`\`\n${raw.slice(0, MAX_GIT_OUTPUT)}\n\`\`\``;
			await io.addComment(repo, prNumber, comment);
			blockEntity(port, repo, prNumber, true);
			return { kind: "blocked", iteration, reason: "commit-failed", comment };
		}
	}

	const summary = fixSummaryBody(iteration, outOfScope, revertSha, other);
	const comment = `${AGENT_MARKER}\n${summary}`;
	await io.addComment(repo, prNumber, comment);

	// The loop's next step, and the only one that advances it. Not caught: a dispatch failure that
	// leaves a pull request in draft with nobody reading it is exactly the state this stage exists to
	// prevent, and `dispatchAgentStage` has already posted its notice and blocked both entities.
	await io.dispatchAgentStage(repo, nextReviewPayload({ pr: prNumber, plan: planNumber, request: requestNumber }, iteration + 1));
	context.say(`Dispatched self-review iteration ${iteration + 1}`);
	return { kind: "next-review-dispatched", iteration, summary, comment };
}
