/**
 * Applying an owner's feedback to a pull request's branch.
 *
 * Replaces `run_pr_feedback_fix` in `.github/scripts/agent_runner.py`. An owner rejected a pull
 * request and said why; this asks the agent to address that reason, and then hands the pull request
 * back to self-review from iteration 1 - a rejection is not a continuation of the review that found
 * whatever the owner objected to, it is a fresh review of a new state.
 *
 * The two rules that make this stage different from the self-review fix, and both are the Python's:
 *
 * - **The rejection is answered once, and only once a revision exists on the branch.** An agent that
 *   changed nothing, or a commit that was rejected, is reported as *not applied* and blocks. A
 *   `### Feedback addressed` comment on a branch with no new commit is a false report, and it is the
 *   one that ends the exchange: the owner reads it, believes the feedback was handled, and stops
 *   asking.
 * - **Both entities block on failure.** The pull request and the Request the feedback came in on.
 *   A feedback rejection is a decision about one piece of work, and the Request is where the owner
 *   is; leaving either unblocked says the exchange is still live when it is not.
 *
 * The plan is read here rather than assumed, and the *newest* plan comment wins: an owner who
 * amended the plan after approving it meant the revision to be judged against the amendment, not
 * against the text the agent was originally given.
 */

import { type BoardStatus, blockEntity, type EntityStatePort } from "./board-status.ts";
import { errorMessage } from "./pipeline-io.ts";
import { findParentRequestNumber } from "./plan-links.ts";
import { approvedPlanText } from "./pr-body.ts";
import { checkoutPrBranch, type PrBranchContext } from "./pr-branch.ts";
import { AGENT_ERROR_PREFIX, isQuotaExhaustionNotice } from "./signals.ts";

/** Marks every comment this pipeline posts, so a later pass can recognise its own output. */
const AGENT_MARKER = "<!-- darkfactory-agent -->";

/** How long the feedback fix prompt gets. */
const FIX_TIMEOUT = "10m0s";

/**
 * How much of the agent's answer reaches the summary comment.
 *
 * Three thousand characters is the Python's trim. A pull request comment has a length limit, and a
 * longer answer is a failed comment - so a revision that was applied would read as unaddressed.
 */
const MAX_SUMMARY = 3000;

/** Longest a git failure's own output is quoted into a comment. */
const MAX_GIT_OUTPUT = 1500;

/** What applying owner feedback did. */
type PrFeedbackFixOutcome =
	/**
	 * A revision is on the branch, the agent's answer is posted, and self-review starts again at
	 * iteration 1.
	 */
	| { kind: "self-review-dispatched"; pr: number; comment: string }
	/**
	 * The pull request's branch could not be checked out, so the stage did not run.
	 */
	| { kind: "blocked"; pr: number; reason: "checkout-failed" }
	/**
	 * The Plan issue could not be read, so there was no approved plan to apply the feedback against.
	 *
	 * Blocks nothing, exactly as the Python did: a plan that cannot be read is a read that failed,
	 * and blocking the owner's Request over it would stop the pipeline on a transient error without
	 * saying what to retry.
	 */
	| { kind: "plan-unavailable"; pr: number; reason: string }
	/** The agent ran out of quota; the run that reported it already checkpointed and blocked. */
	| { kind: "quota-exhausted"; pr: number; notice: string }
	/** The agent failed, and a `### Feedback Fix Error` comment was posted. */
	| { kind: "agent-error"; pr: number; comment: string }
	/**
	 * No revision reached the branch, so the feedback was not applied.
	 *
	 * `reason` is `no-changes` when the agent finished without touching a file, and the git failure
	 * when the commit or the push was rejected.
	 */
	| { kind: "not-applied"; pr: number; reason: "no-changes" | "git-failed"; comment: string };

/** What to apply, and whose feedback it is. */
interface PrFeedbackFixRequest {
	/** The pull request the feedback is on. */
	prNumber: number;
	/** The approved Plan issue the revision is judged against. */
	planNumber: number;
	/**
	 * The Request the feedback arrived as.
	 *
	 * Optional, as the Python's is: a repository where both gates share one issue has no separate
	 * Request, and a failure then blocks the pull request alone.
	 */
	requestNumber?: number | undefined;
	/** The owner's feedback, verbatim. */
	feedback: string;
	/** The repository slug, `owner/name`. */
	repo: string;
}

/** What `run_pr_feedback_fix` needs in addition to what every ported handler is given. */
interface PrFeedbackFixContext extends PrBranchContext {
	/** The project board, for the entities a failed feedback fix blocks. */
	board: BoardStatus;
}

/** The entity-state port, which every blocking path in this handler needs. */
function entitiesOf(context: PrFeedbackFixContext): EntityStatePort {
	return { io: context.io, board: context.board, warn: context.warn };
}

/**
 * The prompt that asks the agent to apply the owner's feedback.
 *
 * The feedback is passed verbatim, not summarised. An owner who wrote "use `bun run test`, not
 * `npm test`" meant that sentence, and a paraphrase is one more place the agent can lose the
 * requirement.
 */
function feedbackPrompt(planBody: string, feedback: string): string {
	return (
		`Plan approved:\n${planBody}\n\nOwner feedback:\n${feedback}\n\n` +
		"Make the necessary changes to address the feedback."
	);
}

/**
 * Apply an owner's feedback to a pull request's branch, and start self-review again.
 *
 * Replaces `run_pr_feedback_fix`.
 *
 * @param context - The handler's GitHub port, workspace, board, agent and reporting.
 * @param request - The pull request, its Plan, that Plan's parent Request, and the owner's feedback.
 * @returns What applying the feedback did.
 * @throws When the next self review cannot be dispatched. It is the Python's uncaught failure, and
 *   the state it leaves - a revised pull request nobody is reviewing - is the one this stage exists
 *   to end.
 */
export async function runPrFeedbackFix(
	context: PrFeedbackFixContext,
	request: PrFeedbackFixRequest,
): Promise<PrFeedbackFixOutcome> {
	const { prNumber, planNumber, requestNumber, feedback, repo } = request;
	const { io, workspace } = context;
	const port = entitiesOf(context);

	/** Block the pull request, and the Request too when the feedback arrived as one. */
	const blockBoth = (): void => {
		blockEntity(port, repo, prNumber, true);
		if (requestNumber) blockEntity(port, repo, requestNumber, false);
	};

	if ((await checkoutPrBranch(context, repo, prNumber)) === undefined) {
		await io.addComment(
			repo,
			prNumber,
			`${AGENT_MARKER}\n### Branch checkout failed\n\n` +
				"The pull request branch could not be checked out, so this stage did not run.",
		);
		// Only the pull request, not the Request: the Python blocks just this one on a failed
		// checkout, because the owner can retry the feedback without re-approving anything.
		blockEntity(port, repo, prNumber, true);
		return { kind: "blocked", pr: prNumber, reason: "checkout-failed" };
	}

	let planBody: string;
	try {
		const plan = await io.issueView(repo, planNumber, ["title", "body", "comments"]);
		planBody = approvedPlanText(plan.comments, plan.body);
	} catch (error) {
		// Reported and returned, with nothing blocked. See the outcome's documentation: a failed read
		// of the plan is not a decision about the work, and blocking the owner's Request over one
		// stops a pipeline on a transient error.
		const reason = `Failed to load plan #${planNumber}: ${errorMessage(error)}`;
		context.warn(reason);
		return { kind: "plan-unavailable", pr: prNumber, reason };
	}

	const fixResult = await context.runAgentPrompt({
		prompt: feedbackPrompt(planBody, feedback),
		kind: "fix",
		timeout: FIX_TIMEOUT,
		checkpoint: { issueNumber: prNumber, repo, isPr: true, completedSteps: ["Feedback fix"] },
	});

	// Tested before the error prefix, because the quota notice *is* an execution error and has
	// already checkpointed the work and marked the issue Blocked.
	if (isQuotaExhaustionNotice(fixResult)) {
		return { kind: "quota-exhausted", pr: prNumber, notice: fixResult };
	}

	if (fixResult.startsWith(AGENT_ERROR_PREFIX)) {
		const comment = `${AGENT_MARKER}\n### Feedback Fix Error\n\n${fixResult}`;
		await io.addComment(repo, prNumber, comment);
		blockBoth();
		return { kind: "agent-error", pr: prNumber, comment };
	}

	// Formatted before the commit, not after: a revision that fails the repository's format check
	// fails the self-review that runs next, and the feedback reads as unapplied.
	for (const notice of workspace.formatRepository().notices) context.warn(notice);

	// The owner's rejection is answered once a revision is on the branch. Both ways of failing to
	// get one are reported the same way, because to the owner they are the same event: the feedback
	// was not applied.
	let failure: { reason: "no-changes" | "git-failed"; text: string } | undefined;
	try {
		await workspace.git(["add", "-A"]);
		const status = await workspace.git(["status", "--porcelain"]);
		if (status) {
			await workspace.git(["commit", "-m", "fix(feedback): address owner feedback"]);
			await workspace.git(["push", "origin", "HEAD"]);
		} else {
			failure = {
				reason: "no-changes",
				text: "The agent finished without changing any file, so nothing was pushed.",
			};
		}
	} catch (error) {
		const raw = errorMessage(error).trim();
		context.warn(`Git error during feedback fix: ${raw}`);
		failure = {
			reason: "git-failed",
			text: `Committing or pushing the revision failed:\n\n\`\`\`\n${raw.slice(0, MAX_GIT_OUTPUT)}\n\`\`\``,
		};
	}

	if (failure !== undefined) {
		const comment =
			`${AGENT_MARKER}\n### Feedback Fix Error\n\n${failure.text}\n\n` +
			"The feedback was not applied. Reply `/df reject <feedback>` to try again.";
		await io.addComment(repo, prNumber, comment);
		blockBoth();
		return { kind: "not-applied", pr: prNumber, reason: failure.reason, comment };
	}

	// No agent marker, as the Python posted it. This comment announces a human's own feedback as
	// handled, and marking it as the agent's own output would make a later pass treat the owner's
	// next reply as agent chatter to skip.
	const comment = `### Feedback addressed\n\n${fixResult.slice(0, MAX_SUMMARY)}`;
	await io.addComment(repo, prNumber, comment);

	// Back to iteration 1, not to the iteration the rejection interrupted: this is a new state of the
	// branch, and a review that resumes mid-loop would compare new findings against a digest from a
	// state that no longer exists. The request falls back to the plan's own parent, then to the plan,
	// which is what the Python's `start_self_review` resolved.
	const request_ = requestNumber ?? (await findParentRequestNumber(io, planNumber, repo)) ?? planNumber;
	await io.dispatchAgentStage(repo, {
		stage: "self-review",
		pr: prNumber,
		plan: planNumber,
		request: request_,
		iteration: 1,
	});
	context.say(`Dispatched self-review iteration 1 for PR #${prNumber}`);
	return { kind: "self-review-dispatched", pr: prNumber, comment };
}
