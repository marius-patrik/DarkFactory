/**
 * One iteration of the self-review loop.
 *
 * Replaces `run_self_review_iteration` in `.github/scripts/agent_runner.py`. This is the loop's
 * decision, and the decision is the behaviour. There are three answers and exactly one condition
 * separates them:
 *
 * 1. **No findings.** The pass is clean. The findings comment is posted with `findings=0`, a clean
 *    comment goes out beside it, and the pipeline continues to the plan-alignment gate - which is a
 *    *different* question, and is asked only once self-review has stopped asking this one.
 * 2. **The digest equals iteration N-1's.** The review is returning an identical set of findings, so
 *    dispatching another fix would repeat the same round. The pull request and the parent Request
 *    are both marked Blocked.
 * 3. **Otherwise.** A fix is dispatched for this iteration, and the fix dispatches the next review.
 *
 * Condition 2 is what bounds the loop, and it is deliberately not an iteration cap. A cap stops a
 * review that is still making progress and says nothing about a review that is not; comparing the
 * findings digest detects the actual condition. The digest is taken over the *normalized* findings -
 * each stripped and lowercased, sorted, joined - so the comparison is a statement about what was
 * found rather than about how the agent worded or ordered it this time. See `review-convergence.ts`,
 * which owns that comparison as a pure function and is where the reasoning lives.
 *
 * The order of the steps is the behaviour and is preserved step for step, including the two that look
 * wrong:
 *
 * - The deterministic scope check runs *before* the model, and its findings lead the comment's list.
 *   A model asked "is this in scope?" will sometimes agree, and a gate whose answer can be argued
 *   with is not a gate.
 * - A diff or a plan that cannot be read returns "blocked" *without* blocking anything. A blocked
 *   pull request with a comment explaining nothing is a worse state than one that is merely stalled,
 *   and the Python reported to stderr and returned.
 */

import { type BoardStatus, blockEntity, type EntityStatePort } from "./board-status.ts";
import { type PipelineEnvironment, REVIEW_TIMEOUT } from "./handler-context.ts";
import { errorMessage } from "./pipeline-io.ts";
import { handlePlanAlignment, type PlanAlignmentOutcome } from "./plan-alignment.ts";
import { checkScope, parseExplicitPlanFiles } from "./plan-scope.ts";
import { approvedPlanText } from "./pr-body.ts";
import { checkoutPrBranch, type PrBranchContext } from "./pr-branch.ts";
import { decideSelfReview, findPriorDigest, fixPayload } from "./review-convergence.ts";
import { prChangedFiles } from "./scope-changes.ts";
import { AGENT_ERROR_PREFIX, isQuotaExhaustionNotice } from "./signals.ts";

/** Marks every comment this pipeline posts, so a later pass can recognise its own output. */
const AGENT_MARKER = "<!-- darkfactory-agent -->";

/** How much of the plan scope reaches the review. A review is not a place for a whole plan. */
const MAX_PLAN_SCOPE = 2000;

/**
 * How much of the diff reaches the agent.
 *
 * Sixty thousand characters is the Python's limit. A review handed a truncated diff and told to
 * decide anyway finds something to complain about, so the truncation is marked in the prompt rather
 * than applied silently.
 */
const MAX_DIFF = 60000;

/** What `run_self_review_iteration` needs in addition to what every ported handler is given. */
export interface SelfReviewContext extends PrBranchContext {
	/**
	 * The project board, for the entities a no-progress pass blocks and for the alignment gate the
	 * clean pass hands off to.
	 */
	board: BoardStatus;
	/** The environment, for the workspace directory the alignment gate clears its checkpoint in. */
	environment: PipelineEnvironment;
}

/** Why an iteration stopped without reaching a decision of its own. */
export type SelfReviewBlockReason =
	/** The pull request's branch could not be checked out, so nothing could be read. */
	| "checkout-failed"
	/** The diff could not be read, so there was nothing to review. */
	| "diff-unavailable"
	/** The Plan issue could not be read, so there was no scope to review against. */
	| "plan-unavailable"
	/** The agent ran out of quota; the run that reported it already checkpointed and blocked. */
	| "quota-exhausted"
	/** The agent failed, and a `### Self-Review Error` comment was posted. */
	| "agent-error"
	/** The findings are identical to iteration N-1's, so another round would repeat this one. */
	| "no-progress"
	/** The fix dispatch failed; the notice and the blocks it raises are already out. */
	| "dispatch-failed";

/** What one self-review iteration did. */
export type SelfReviewOutcome =
	/**
	 * The pass found nothing, so the findings comment, a clean comment, and the plan-alignment gate
	 * all ran.
	 */
	| {
			kind: "clean";
			iteration: number;
			digest: string;
			marker: string;
			comment: string;
			alignment: PlanAlignmentOutcome;
	  }
	/** A fix was dispatched for this iteration, and the fix will dispatch the next review. */
	| {
			kind: "fix-dispatched";
			iteration: number;
			digest: string;
			marker: string;
			comment: string;
			findings: string[];
	  }
	/** The iteration stopped, and this is why. */
	| { kind: "blocked"; iteration: number; reason: SelfReviewBlockReason };

/** What to review. */
export interface SelfReviewRequest {
	/** The pull request number. */
	prNumber: number;
	/** The child Plan issue number. */
	planNumber: number;
	/**
	 * The parent Request issue number.
	 *
	 * Optional, as the Python's is: a repository where both gates share one issue has no separate
	 * Request, and a no-progress pass then blocks the pull request alone.
	 */
	requestNumber?: number | undefined;
	/** The 1-based iteration number. */
	iteration: number;
	/** The repository slug, `owner/name`. */
	repo: string;
}

/**
 * The prompt that asks for one review pass.
 *
 * The plan scope is here for reference and explicitly *not* as a question: plan alignment is a
 * separate gate that runs after this one is clean, and asking a review to judge alignment too makes
 * its findings depend on which gate happens to be downstream of it.
 */
function reviewPrompt(planBody: string, diff: string): string {
	const diffSnippet =
		diff.length <= MAX_DIFF ? diff : `${diff.slice(0, MAX_DIFF)}\n\n[... diff truncated at ${MAX_DIFF} characters ...]`;
	return (
		"Review the following pull request diff for code quality issues.\n" +
		"Look for: bugs, edge cases, missing error handling, missing tests, " +
		"style issues, naming problems, architectural concerns.\n\n" +
		"## Plan Scope (for reference — do NOT evaluate plan alignment here)\n" +
		`${planBody.slice(0, MAX_PLAN_SCOPE)}\n\n` +
		`## PR Diff\n\`\`\`diff\n${diffSnippet}\n\`\`\`\n\n` +
		"If you find NO actionable issues, respond starting with: NO_FINDINGS\n" +
		"If you find issues, list each finding with a description and suggested fix."
	);
}

/** The entity-state port, which every blocking path in this handler needs. */
function entitiesOf(context: SelfReviewContext): EntityStatePort {
	return { io: context.io, board: context.board, warn: context.warn };
}

/**
 * Run one iteration of the self-review loop against a pull request.
 *
 * Replaces `run_self_review_iteration`. The Python returned one of three strings; the outcome is
 * returned here so a caller - and the tests - can see *which* of the three answers ran and why,
 * because "blocked" covers seven different conditions and a stalled pipeline needs to say which.
 *
 * @param context - The handler's GitHub port, workspace, board, environment, agent and reporting.
 * @param request - The pull request, its Plan, that Plan's parent Request, and the iteration.
 * @returns What this iteration decided.
 * @throws When the changed files cannot be listed against the base branch, or when the plan-alignment
 *   gate throws. Both are the Python's uncaught failures: a scope gate decided against an empty file
 *   list is a gate that passes on nothing.
 */
export async function runSelfReviewIteration(
	context: SelfReviewContext,
	request: SelfReviewRequest,
): Promise<SelfReviewOutcome> {
	const { prNumber, planNumber, requestNumber, iteration, repo } = request;
	const { io, workspace } = context;
	const blocked = (reason: SelfReviewBlockReason): SelfReviewOutcome => ({ kind: "blocked", iteration, reason });

	if ((await checkoutPrBranch(context, repo, prNumber)) === undefined) {
		// The checkout already reported why. A pull request nobody can check out is a stopped
		// pipeline, and Blocked is the label a human looking for the stopped work reads.
		blockEntity(entitiesOf(context), repo, prNumber, true);
		return blocked("checkout-failed");
	}

	// Neither of these two is fatal, and neither blocks: the Python reported to stderr and returned.
	// A pull request marked Blocked with no comment on it is worse than one that is merely stalled,
	// because a human opening it has nothing to act on.
	let diff: string;
	try {
		diff = await io.prDiff(repo, prNumber);
	} catch (error) {
		context.warn(`Failed to get PR diff: ${errorMessage(error)}`);
		return blocked("diff-unavailable");
	}

	let planData: { body: string; comments: string[] };
	try {
		planData = await io.issueView(repo, planNumber, ["title", "body", "comments"]);
	} catch (error) {
		context.warn(`Failed to get plan data: ${errorMessage(error)}`);
		return blocked("plan-unavailable");
	}
	// The plan is a comment rather than the body, and a reviewer can post a later one, so the newest
	// plan comment wins. The body is the fallback for an issue planned before the marker existed.
	const planBody = approvedPlanText(planData.comments, planData.body);

	// The deterministic gate runs before the model, and its findings lead the comment's list. Not
	// caught, deliberately: see this module's header.
	const outOfScopeFiles = checkScope(
		prChangedFiles(workspace, context.developmentBranch),
		parseExplicitPlanFiles(planBody),
	).outOfScope;

	const reviewResult = await context.runAgentPrompt({
		prompt: reviewPrompt(planBody, diff),
		kind: "review",
		timeout: REVIEW_TIMEOUT,
		checkpoint: {
			issueNumber: prNumber,
			repo,
			isPr: true,
			completedSteps: [`Completed implementation and opened PR #${prNumber}`, `Self-review iteration ${iteration}`],
		},
	});

	// Tested before the error prefix, because the quota notice *is* an execution error. It has
	// already checkpointed the work and marked the issue Blocked, so anything posted here would
	// contradict that.
	if (isQuotaExhaustionNotice(reviewResult)) return blocked("quota-exhausted");

	if (reviewResult.startsWith(AGENT_ERROR_PREFIX)) {
		await io.addComment(
			repo,
			prNumber,
			`${AGENT_MARKER}\n### Self-Review Error (Iteration ${iteration})\n\n${reviewResult}`,
		);
		return blocked("agent-error");
	}

	// Read the previous iteration's digest *before* posting: the comment about to go out carries a
	// marker of its own, and reading afterwards would find this iteration rather than the prior one.
	let priorDigest: string | undefined;
	try {
		const comments = await io.issueComments(repo, prNumber);
		priorDigest = findPriorDigest(
			comments.map((comment) => comment.body),
			iteration,
		);
	} catch (error) {
		context.warn(`Failed to read previous comments: ${errorMessage(error)}`);
	}

	const decision = decideSelfReview({ outOfScopeFiles, reviewText: reviewResult, iteration, priorDigest });

	// The findings comment carries no agent marker, only the review marker. The agent marker is what
	// a response pass skips, so a comment carrying it would be answered as feedback on a pull request
	// nobody asked about; the review marker is the only thing the next iteration reads back.
	const comment = `### Self-Review — iteration ${iteration}\n${decision.display}\n${decision.marker}`;
	await io.addComment(repo, prNumber, comment);

	if (decision.decision === "clean") {
		await io.addComment(
			repo,
			prNumber,
			`${AGENT_MARKER}\n### Self-Review — iteration ${iteration}\n\n` +
				`✅ Self-review clean at iteration ${iteration}\n${decision.marker}`,
		);
		context.say(`Self-review passed clean on iteration ${iteration}`);
		// The gate asks a different question, so it is a separate call rather than a branch here: it
		// has its own agent run, its own two-issue posting, and its own checkpoint to clear. The
		// request number falls back to the plan because a repository running both gates on one issue
		// has no separate Request - which is what the runner's own CLI does.
		const alignment = await handlePlanAlignment(context, {
			prNumber,
			planNumber,
			requestNumber: requestNumber ?? planNumber,
			repo,
		});
		return { kind: "clean", iteration, digest: decision.digest, marker: decision.marker, comment, alignment };
	}

	if (decision.decision === "blocked") {
		await io.addComment(
			repo,
			prNumber,
			`${AGENT_MARKER}\n### Self-Review Findings (Blocked)\n\n` +
				"Self-review made no progress across iterations (identical findings twice in a row):\n\n" +
				`${decision.findings.join("\n")}`,
		);
		const port = entitiesOf(context);
		blockEntity(port, repo, prNumber, true);
		if (requestNumber) blockEntity(port, repo, requestNumber, false);
		context.say(`Self-review loop made no progress on PR #${prNumber}; marked Blocked.`);
		return blocked("no-progress");
	}

	const payload = fixPayload({ pr: prNumber, plan: planNumber, request: requestNumber ?? null }, iteration);
	try {
		await io.dispatchAgentStage(repo, payload);
	} catch (error) {
		// `dispatchAgentStage` is this port's `dispatch_stage`: it has already posted the notice and
		// blocked both entities by the time it throws, so there is nothing left to add here.
		context.warn(`Dispatch failed during self-review: ${errorMessage(error)}`);
		return blocked("dispatch-failed");
	}
	context.say(`Self-review fix dispatched for iteration ${iteration}`);
	return {
		kind: "fix-dispatched",
		iteration,
		digest: decision.digest,
		marker: decision.marker,
		comment,
		findings: decision.findings,
	};
}
