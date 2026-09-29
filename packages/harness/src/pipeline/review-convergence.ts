/**
 * The self-review convergence machine.
 *
 * One review pass produces findings, and the pass must decide one of three things: there is
 * nothing to fix, this pass is going in circles, or a fix should be dispatched. The middle case is
 * the one that matters, because a review that keeps returning the same findings will otherwise run
 * forever, and a cap is the wrong answer to that: a cap stops a review that is still making
 * progress and says nothing about a review that is not. Comparing the findings digest against the
 * previous iteration's detects the actual condition - an identical set of findings twice in a row -
 * and nothing else.
 *
 * The machine is a pure function of (findings, iteration, prior digest). It has no iteration cap and
 * takes no clock and no process, so the three cases are decided by the data alone and are
 * testable without a pull request, an agent, or a workflow.
 */

import { createHash } from "node:crypto";
import { parseReviewFindings } from "./review-findings.ts";

/** Marker naming the stage a dispatch asks for. */
const SELF_REVIEW_STAGE = "self-review";

/** Marker naming the stage that applies a review's findings. */
const SELF_REVIEW_FIX_STAGE = "self-review-fix";

/** Hidden marker every review comment carries, and the only thing the next iteration reads back. */
const SELF_REVIEW_MARKER_RE =
	/<!--\s*darkfactory-self-review\s+iteration=(\d+)\s+findings=(\d+)\s+digest=([a-f0-9]+)\s*-->/u;

/** The digest character set a marker is read with when the fix stage parses it. */
const LENIENT_MARKER_RE =
	/<!--\s*darkfactory-self-review\s+iteration=(\d+)\s+findings=(\d+)\s+digest=([a-zA-Z0-9]+)\s*-->/u;

/**
 * What the machine decided.
 *
 * `clean` means the pass found nothing and the pipeline continues to the plan-alignment gate.
 * `blocked` means the pass cannot make progress, and both the pull request and the request are
 * marked Blocked. `fix-dispatched` means a fix run is dispatched at the next iteration.
 */
type ReviewDecision = "clean" | "blocked" | "fix-dispatched";

/** The marker's per-iteration fields, parsed back out of a posted review comment. */
interface ReviewMarker {
	/** The 1-based iteration the comment was posted for. */
	iteration: number;
	/** How many findings that iteration reported. */
	findings: number;
	/** The digest of that iteration's normalized findings. */
	digest: string;
}

/** The inputs the machine decides from. */
interface ConvergenceInput {
	/** Out-of-scope paths the deterministic scope gate rejected. */
	outOfScopeFiles: readonly string[];
	/** The agent's review answer for this iteration. */
	reviewText: string;
	/** The 1-based iteration number. */
	iteration: number;
	/** The digest posted for iteration N-1, when one is on the pull request. */
	priorDigest?: string | undefined;
}

/** The machine's decision, with everything a caller needs to post about it. */
interface ConvergenceOutcome {
	/** Which of the three cases this is. */
	decision: ReviewDecision;
	/** Out-of-scope findings followed by the agent's, in that order. */
	findings: string[];
	/** How many findings there were, which is the marker's `findings=` field. */
	count: number;
	/** The digest of the normalized findings. */
	digest: string;
	/** The marker for the comment this iteration posts. */
	marker: string;
	/** The findings rendered as a numbered list, or the clean-review sentence. */
	display: string;
}

/**
 * Digest a set of findings by its content, independent of order and formatting.
 *
 * Each finding is stripped and lowercased, the results are sorted, and they are joined by a
 * newline. Normalizing before hashing is what makes the comparison a statement about *what* was
 * found rather than about how the agent happened to word or order it this time.
 *
 * @param findings - The findings to digest.
 * @returns A hex SHA-1 digest of the normalized findings.
 */
export function reviewDigest(findings: readonly string[]): string {
	const normalized = findings
		.map((finding) => finding.trim().toLowerCase())
		.sort()
		.join("\n");
	return createHash("sha1").update(normalized, "utf8").digest("hex");
}

/**
 * Read the marker a review comment carries.
 *
 * @param body - A comment body.
 * @returns The parsed marker, or `undefined` when the comment carries none.
 */
export function parseReviewMarker(body: string): ReviewMarker | undefined {
	const match = SELF_REVIEW_MARKER_RE.exec(body);
	if (!match) return undefined;
	return {
		iteration: Number(match[1]),
		findings: Number(match[2]),
		digest: match[3] as string,
	};
}

/**
 * Read the marker a fix stage needs, tolerating a digest that is not strictly hexadecimal.
 *
 * The review pass writes a hex digest, so this only ever differs on a marker written by something
 * else. Reading it anyway is what lets a fix stage recognise its own iteration's comment rather
 * than blocking a pull request because a digest had an unexpected character in it.
 *
 * @param body - A comment body.
 * @returns The parsed marker, or `undefined` when the comment carries none.
 */
export function parseReviewMarkerLenient(body: string): ReviewMarker | undefined {
	const match = LENIENT_MARKER_RE.exec(body);
	if (!match) return undefined;
	return {
		iteration: Number(match[1]),
		findings: Number(match[2]),
		digest: match[3] as string,
	};
}

/**
 * Find the digest posted for the iteration immediately before this one.
 *
 * @param comments - Comment bodies on the pull request, oldest first.
 * @param iteration - The 1-based iteration now being run.
 * @returns The prior digest, or `undefined` when iteration N-1 is not on the pull request.
 */
export function findPriorDigest(comments: readonly string[], iteration: number): string | undefined {
	for (const body of comments) {
		const marker = parseReviewMarker(body);
		if (marker && marker.iteration === iteration - 1) return marker.digest;
	}
	return undefined;
}

/**
 * Find the newest comment carrying the marker for one specific iteration.
 *
 * @param comments - Comment bodies on the pull request, oldest first.
 * @param iteration - The 1-based iteration whose comment is wanted.
 * @returns The comment body, or `undefined` when that iteration's comment is absent.
 */
export function findIterationComment(comments: readonly string[], iteration: number): string | undefined {
	for (let index = comments.length - 1; index >= 0; index -= 1) {
		const body = comments[index] as string;
		const marker = parseReviewMarkerLenient(body);
		if (marker && marker.iteration === iteration) return body;
	}
	return undefined;
}

/**
 * Decide what one self-review iteration does next.
 *
 * The three cases, in the order they are tested:
 *
 * 1. No findings. The pass is clean and the pipeline continues to the plan-alignment gate.
 * 2. The digest equals iteration N-1's. The review is returning an identical set of findings, so
 *    dispatching another fix would repeat the same round; both the pull request and the request are
 *    marked Blocked.
 * 3. Otherwise. A fix is dispatched at this iteration, and the fix dispatches the next review.
 *
 * There is deliberately no iteration cap. See the module documentation for why.
 *
 * @param input - The findings, review text, iteration, and prior digest.
 * @returns The decision and the comment material for it.
 */
export function decideSelfReview(input: ConvergenceInput): ConvergenceOutcome {
	const scopeFindings = input.outOfScopeFiles.map((path) => `Out of scope: ${path} (not in the approved plan)`);
	const findings = [...scopeFindings, ...parseReviewFindings(input.reviewText)];
	const count = findings.length;
	const digest = reviewDigest(findings);
	const marker = `<!-- darkfactory-self-review iteration=${input.iteration} findings=${count} digest=${digest} -->`;
	const display =
		findings.length > 0 ? findings.map((finding, at) => `${at + 1}. ${finding}`).join("\n") : "No actionable findings.";

	if (count === 0) return { decision: "clean", findings, count, digest, marker, display };
	if (input.priorDigest !== undefined && digest === input.priorDigest) {
		return { decision: "blocked", findings, count, digest, marker, display };
	}
	return { decision: "fix-dispatched", findings, count, digest, marker, display };
}

/** The payload a stage dispatch carries. */
interface StagePayload {
	stage: string;
	pr: number;
	plan: number;
	/**
	 * The parent Request issue, omitted when the run has none.
	 *
	 * The Python put `"request": null` there instead, which the receiving stage reads back as
	 * `client_payload.get("request")` - and a missing key reads the same way. Omitting it keeps this
	 * assignable to {@link AgentDispatchPayload}, which is the port the stage is dispatched through.
	 */
	request?: number | undefined;
	iteration?: number;
}

/** What a stage payload names, with a Request that may be absent. */
interface StageTarget {
	/** The pull request. */
	pr: number;
	/** The Plan issue. */
	plan: number;
	/** The parent Request issue, or `null`/`undefined` when the run named none. */
	request?: number | null | undefined;
}

/**
 * Build the payload that dispatches a fix for one review iteration.
 *
 * @param input - The pull request, plan, and request the review is running against.
 * @param iteration - The iteration whose findings are to be fixed.
 * @returns The payload for {@link SELF_REVIEW_FIX_STAGE}.
 */
export function fixPayload(input: StageTarget, iteration: number): StagePayload {
	return {
		stage: SELF_REVIEW_FIX_STAGE,
		pr: input.pr,
		plan: input.plan,
		request: input.request ?? undefined,
		iteration,
	};
}

/**
 * Build the payload that dispatches the next review iteration.
 *
 * @param input - The pull request, plan, and request the review is running against.
 * @param nextIteration - The iteration to run, which is the fixed one plus one.
 * @returns The payload for {@link SELF_REVIEW_STAGE}.
 */
export function nextReviewPayload(input: StageTarget, nextIteration: number): StagePayload {
	return {
		stage: SELF_REVIEW_STAGE,
		pr: input.pr,
		plan: input.plan,
		request: input.request ?? undefined,
		iteration: nextIteration,
	};
}

/**
 * Build the payload that dispatches an owner-feedback revision on a pull request branch.
 *
 * @param input - The pull request, plan, and request.
 * @param feedback - The reviewer's verbatim feedback.
 * @returns The payload for the `pr-feedback-fix` stage.
 */
export function feedbackFixPayload(
	input: { pr: number; plan: number; request: number },
	feedback: string,
): StagePayload & { feedback: string } {
	return {
		stage: "pr-feedback-fix",
		pr: input.pr,
		plan: input.plan,
		request: input.request,
		feedback,
	};
}

/**
 * Summarise a completed fix run for the pull request comment that announces it.
 *
 * @param iteration - The iteration that was fixed.
 * @param reverted - Out-of-scope paths the fix restored from the base branch.
 * @param revertSha - The reversion commit, when one was made.
 * @param fixed - The remaining findings the agent addressed.
 * @returns The markdown body of the summary comment.
 */
export function fixSummaryBody(
	iteration: number,
	reverted: readonly string[],
	revertSha: string | undefined,
	fixed: readonly string[],
): string {
	const parts: string[] = [];
	if (reverted.length > 0) {
		const sha = revertSha ? ` in commit ${revertSha.slice(0, 7)}` : "";
		parts.push(`Reverted out-of-scope files (${reverted.join(", ")})${sha}.`);
	}
	if (fixed.length > 0) {
		parts.push(`Applied fixes for findings:\n${fixed.map((finding) => `- ${finding}`).join("\n")}`);
	}
	const summary = parts.length > 0 ? parts.join("\n\n") : "No fixes required.";
	return `### Self-Review fixes — iteration ${iteration}\n\n${summary}`;
}
