/**
 * The plan-alignment gate: does the pull request implement the plan it was approved against?
 *
 * Replaces `handle_plan_alignment` in `.github/scripts/agent_runner.py`. This is the last gate a
 * pull request passes before it is offered to a human, and it is the only one that reads the plan's
 * *scope amendments* as well as its body — a reviewer who amended the plan mid-flight did so in a
 * comment, and an implementation judged against the original body alone is judged against a plan
 * nobody approved.
 *
 * The order is the behaviour:
 *
 * - The diff is read first and its failure is *not* fatal. A pull request whose diff cannot be read
 *   is not aligned, but the Python reported it and returned rather than posting a verdict it had no
 *   evidence for. A gate that fails open has to say so; one that fails closed stalls the pipeline on
 *   a read.
 * - The agent is asked for a verdict, and `MATCHES_PLAN_YES` in the *first fifty characters* is what
 *   counts. Not anywhere in the text: an agent asked to list divergences will happily quote the
 *   token in its own explanation, and a substring search over the whole answer marked a pull
 *   request aligned on the strength of a sentence saying it was not.
 * - On a match, the pull request is marked ready, every entity is unblocked to `In Progress` — not
 *   `Done`, because alignment is not completion — and the checkpoint is cleared. On a divergence,
 *   the verdict goes to *both* issues: the Request is where a human decides, and the Plan is where
 *   the amendment lives.
 */

import { type BoardStatus, IN_PROGRESS_STATUS, unblockEntity } from "./board-status.ts";
import { clearCheckpoint } from "./checkpoint.ts";
import { type PipelineContext, type PipelineEnvironment, REVIEW_TIMEOUT } from "./handler-context.ts";
import { errorMessage } from "./pipeline-io.ts";
import { fullPlanScope } from "./pr-body.ts";
import { AGENT_ERROR_PREFIX, isQuotaExhaustionNotice } from "./signals.ts";

/** Marks every comment this pipeline posts, so a later pass can recognise its own output. */
const AGENT_MARKER = "<!-- darkfactory-agent -->";

/** The verdict that marks a pull request as implementing its plan, which the agent states up front. */
export const MATCHES_PLAN = "MATCHES_PLAN_YES";

/** How much of the plan scope reaches the agent. A plan is prose; a review is not a place for it all. */
const MAX_PLAN_SCOPE = 4000;

/**
 * How much of the diff reaches the agent.
 *
 * Sixty thousand characters is the Python's limit and it is generous: a review that is handed a
 * truncated diff and told to decide anyway will find something to complain about, so the truncation
 * is marked in the prompt rather than applied silently.
 */
const MAX_DIFF = 60000;

/** How far into the answer the verdict is read from. */
const VERDICT_WINDOW = 50;

/** What verifying alignment did. */
export type PlanAlignmentOutcome =
	/**
	 * The implementation matches the plan, so the pull request is ready for a human.
	 *
	 * `ready` is false when marking the pull request ready failed. The Python caught that failure
	 * and carried on to unblock the entities, because a pull request that is aligned but still a
	 * draft is a state a human can act on and a failed run is not.
	 */
	| { kind: "aligned"; comment: string; ready: boolean }
	/**
	 * The implementation diverges, so the verdict is on the Request and the Plan.
	 *
	 * Nothing is blocked: a divergence is a review topic for a human, not a stopped run.
	 */
	| { kind: "diverged"; requestComment: string; planComment: string }
	/** The agent ran out of quota, so no verdict was posted. */
	| { kind: "quota-exhausted"; notice: string }
	/** The pull request's diff could not be read, so no verdict was reached. */
	| { kind: "diff-unavailable" }
	/** The agent failed, a `### Plan Alignment Error` comment was posted, and the run ends non-zero. */
	| { kind: "failed"; notice: string; comment: string };

/** What to check for alignment. */
interface PlanAlignmentRequest {
	/** The pull request number. */
	prNumber: number;
	/** The Plan issue number, which is the Request itself once both gates share one issue. */
	planNumber: number;
	/**
	 * The parent Request issue number.
	 *
	 * Required, because the runner's `plan-alignment` command refuses to dispatch without one and
	 * the Python's own signature is not optional. A divergence is posted on this issue, so there is
	 * nowhere to put it if the number is absent.
	 */
	requestNumber: number;
	/** The repository slug, `owner/name`. */
	repo: string;
}

/**
 * What `handle_plan_alignment` needs in addition to what every ported handler is given.
 *
 * The workspace is here for the checkpoint it clears and the board for the entities it unblocks,
 * and neither belongs on {@link PipelineContext} for the same reason as in `handle_implement`: only
 * the handlers that clear a checkpoint or move a board item need them.
 */
export interface PlanAlignmentContext extends PipelineContext {
	/** The project board, for the entities this gate unblocks. */
	board: BoardStatus;
	/** The environment, for the workspace directory the checkpoint lives in. */
	environment: PipelineEnvironment;
}

/**
 * The prompt that asks whether an implementation matches its plan.
 *
 * The verdict token is named in the prompt and the answer is told to *start* with it, because the
 * handler reads it from the first fifty characters: an answer that states its verdict first can be
 * classified without a second model call, and one that discusses before deciding cannot.
 */
function alignmentPrompt(fullScope: string, diff: string): string {
	const diffSnippet =
		diff.length <= MAX_DIFF ? diff : `${diff.slice(0, MAX_DIFF)}\n\n[... diff truncated at ${MAX_DIFF} characters ...]`;
	return (
		"Compare this PR diff against the implementation plan scope.\n\n" +
		`## Full Plan Scope\n${fullScope.slice(0, MAX_PLAN_SCOPE)}\n\n` +
		`## PR Diff\n\`\`\`diff\n${diffSnippet}\n\`\`\`\n\n` +
		"Determine if the implementation matches the plan scope EXACTLY.\n" +
		`If it matches, respond starting with: ${MATCHES_PLAN}\n` +
		"If there are divergences, list each divergence with details."
	);
}

/** Report whether the agent's answer states the verdict up front. */
function statesMatch(verdict: string): boolean {
	return verdict.toUpperCase().slice(0, VERDICT_WINDOW).includes(MATCHES_PLAN);
}

/**
 * Verify that a pull request's implementation matches the plan it was approved against, and either
 * offer it to a human or report the divergence.
 *
 * Replaces `handle_plan_alignment`. The Python returned `None`; the outcome is returned here so a
 * caller - and the tests - can see which of the five paths ran.
 *
 * @param context - The handler's GitHub port, agent, board and reporting.
 * @param request - The pull request, its Plan, and that Plan's parent Request when there is one.
 * @returns What verifying alignment did.
 * @throws {@link AgentRunFailure} when the agent fails, after the error comment is posted.
 */
export async function handlePlanAlignment(
	context: PlanAlignmentContext,
	request: PlanAlignmentRequest,
): Promise<PlanAlignmentOutcome> {
	const { prNumber, planNumber, requestNumber, repo } = request;
	const { io } = context;

	let diff: string;
	try {
		diff = await io.prDiff(repo, prNumber);
	} catch (error) {
		// Not fatal, and not a verdict. The Python reported it and returned: a gate that decided
		// "not aligned" from a diff it never read would block a correct implementation on a read.
		context.warn(`Failed to get PR diff for alignment: ${errorMessage(error)}`);
		return { kind: "diff-unavailable" };
	}

	const plan = await io.issueView(repo, planNumber, ["title", "body", "comments"]);
	const scope = fullPlanScope(plan.body, plan.comments);

	const verdict = await context.runAgentPrompt({
		prompt: alignmentPrompt(scope, diff),
		kind: "review",
		timeout: REVIEW_TIMEOUT,
		checkpoint: {
			issueNumber: planNumber,
			repo,
			isPr: false,
			completedSteps: [`Completed implementation and PR #${prNumber}`, "Evaluating plan alignment"],
		},
	});

	if (isQuotaExhaustionNotice(verdict)) {
		return { kind: "quota-exhausted", notice: verdict };
	}

	if (verdict.startsWith(AGENT_ERROR_PREFIX)) {
		const comment = `${AGENT_MARKER}\n### Plan Alignment Error\n\n${verdict}`;
		await io.addComment(repo, planNumber, comment);
		context.fail(`Plan alignment failed on issue #${planNumber}; Execution Error posted.`);
	}

	if (!statesMatch(verdict)) {
		// Both issues, and the order matters: the Request is where a human decides, and the Plan is
		// where the scope amendment the verdict was read against lives.
		const requestComment = `${AGENT_MARKER}\n### Plan Alignment\n\n${verdict}`;
		await io.addComment(repo, requestNumber, requestComment);
		const planComment = `${AGENT_MARKER}\n### Implementation Review\n\n**Matches Plan**: No\n\n${verdict}`;
		await io.addComment(repo, planNumber, planComment);
		context.say(`Plan alignment divergence detected on PR #${prNumber}`);
		return { kind: "diverged", requestComment, planComment };
	}

	const comment =
		`${AGENT_MARKER}\n### Implementation Review\n\n**Matches Plan**: Yes\n\n` +
		"All changes in the PR align with the plan scope.";
	await io.addComment(repo, planNumber, comment);

	// Alignment is not completion, so the entities go to `In Progress` and stay there until merge.
	// The pull request is marked ready first: an entity that is unblocked and still a draft reads as
	// work that has stopped.
	let ready = true;
	try {
		await io.prReady(repo, prNumber);
		context.say(`PR #${prNumber} marked ready for review`);
	} catch (error) {
		// Carried on, as the Python did. The entities are aligned and a human can open the pull
		// request; failing the run would leave them `Blocked` for no reason they can act on.
		ready = false;
		context.warn(`Failed to mark PR ready: ${errorMessage(error)}`);
	}

	const port = { io, board: context.board, warn: context.warn };
	unblockEntity(port, repo, prNumber, true, IN_PROGRESS_STATUS);
	unblockEntity(port, repo, planNumber, false, IN_PROGRESS_STATUS);
	unblockEntity(port, repo, requestNumber, false, IN_PROGRESS_STATUS);

	// Cleared only on the aligned path. A divergence leaves the checkpoint, because the run has not
	// finished: a later resume has to know the steps that led here.
	clearCheckpoint(context.environment.workspaceDir);
	return { kind: "aligned", comment, ready };
}
