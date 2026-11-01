/**
 * The webhook entrypoint: read the event, work out which stage it reaches, and perform it.
 *
 * Replaces `dispatch_event` in `.github/scripts/agent_runner.py`. The *decisions* were already
 * ported to `dispatch.ts`, which is why this module is short: `routeIssuesEvent`,
 * `routeIssueCommentEvent`, `routeReviewCommentEvent` and `routeRepositoryDispatch` say which stage
 * an event reaches and what the caller must resolve first. What is left here is everything those
 * functions deliberately do not do — normalising the payload, resolving the pre-routing facts the
 * routes need (which plan, which parent Request, whether a plan is posted, who may act), and
 * performing the effects in the Python's order.
 *
 * The order of the checks is the behaviour and is not to be tidied:
 *
 * - A `Failed again` comment is recognised *before* the bot check, because that is the one bot
 *   comment that is a trigger rather than chatter. Take it after and every recurrence stays muted.
 * - Every other comment on a failure report is chatter about a red build, not an answer to a gate,
 *   so it is skipped — with `resume` the one exception, because that is a human asking for the run
 *   back.
 * - A stranger's command is feedback. The command is demoted, not the comment discarded, because
 *   the comment itself is still something worth answering.
 */

import {
	commandFeedback,
	isAllowedApprover,
	isCommandHint,
	parseIssueCommand,
	parsePrCommand,
} from "../approvals/commands.ts";
import { type BoardStatus, unblockEntity } from "./board-status.ts";
import {
	type AgentDispatchPayload,
	type CommentDecision,
	commentActor,
	eventRepository,
	type IssueCommentPayload,
	type IssuesPayload,
	type LabelLike,
	type PipelineStage,
	type ReviewCommentPayload,
	routeIssueCommentEvent,
	routeIssuesEvent,
	routeRepositoryDispatch,
	routeReviewCommentEvent,
} from "./dispatch.ts";
import { claimFailureDispatch, postCommandHintOnce } from "./dispatch-effects.ts";
import { failureEffectId, refailureEffectId } from "./failure-effect.ts";
import type { PipelineContext, PipelineEnvironment } from "./handler-context.ts";
import { handleInterpret } from "./interpret.ts";
import { errorMessage } from "./pipeline-io.ts";
import { handlePlan, hasPlan } from "./plan.ts";
import { findParentRequestNumber, findPlanIssueForPr } from "./plan-links.ts";
import { handleRespond } from "./respond.ts";

/** An event run was handed, and the name GitHub delivered it under. */
interface DispatchEventRequest {
	/** Where the event payload was written, for the report when it is not there. */
	eventPath: string;
	/** The event name, e.g. `issues`, `issue_comment`, `pull_request_review_comment`. */
	eventName: string;
	/**
	 * The payload, already read and parsed.
	 *
	 * `undefined` means the file was not there, which is the one thing the caller cannot infer from
	 * a payload: a file holding `null` is a payload that normalises to nothing, and the Python
	 * reported those two differently.
	 */
	payload?: unknown;
}

/**
 * The stages `dispatch_event` hands a `repository_dispatch` to, and that an `approve` or `resume`
 * resumes.
 *
 * Three of the four now have bodies: `self-review`, `self-review-fix` and `pr-feedback-fix` are
 * ported in `self-review.ts`, `self-review-fix.ts` and `pr-feedback-fix.ts`. Only `resume_item` is
 * still unported, and it is still a required dependency rather than a stub, because a stub returning
 * an empty value would make a dispatched stage look like it had run - and a self-review that did not
 * run leaves a pull request in draft with nobody reading it, reported as a success. The *routing* to
 * all four is ported and tested; the body of `resume` is not.
 */
export interface PipelineStages {
	/**
	 * `self-review`: read a pull request, post its findings, and dispatch the fix.
	 *
	 * @param payload - The stage payload, naming the pull request, plan, request and iteration.
	 */
	selfReview(payload: AgentDispatchPayload): Promise<void>;
	/**
	 * `self-review-fix`: apply a review's findings to the pull request's branch.
	 *
	 * @param payload - The stage payload, naming the pull request, plan, request and iteration.
	 */
	selfReviewFix(payload: AgentDispatchPayload): Promise<void>;
	/**
	 * `pr-feedback-fix`: apply owner feedback to the pull request's branch.
	 *
	 * @param payload - The stage payload, naming the pull request, plan, request and feedback.
	 */
	prFeedbackFix(payload: AgentDispatchPayload): Promise<void>;
	/**
	 * `resume`: pick up a stopped item where its checkpoint left it.
	 *
	 * @param payload - The stage payload, naming the item and whether it is a pull request.
	 */
	resume(payload: AgentDispatchPayload): Promise<void>;
}

/** What `dispatch_event` reached. */
type DispatchEventOutcome =
	/** A handler ran, and this is what it did. */
	| { kind: "handled"; stage: "interpret" | "plan" | "respond"; detail: string }
	/** An unported stage was handed the event. */
	| { kind: "dispatched"; stage: PipelineStage }
	/** Nothing was reached, and this is why. */
	| { kind: "ignored"; reason: string };

/**
 * What `dispatch_event` needs in addition to what every ported handler is given.
 *
 * `stages` is required and has no default: a dispatched stage that silently did nothing is the one
 * failure this pipeline cannot detect, and it is exactly what a stub would produce.
 */
export interface DispatchEventContext extends PipelineContext {
	/** The stage bodies, three of which are now ported. */
	stages: PipelineStages;
	/** The project board, for the resume path on a failure report. */
	board: BoardStatus;
	/** The environment, for the repository slug an event that names none falls back to. */
	environment: PipelineEnvironment;
}

/** The `repository_dispatch` client payload a stage carries, or `{}` when it carries none. */
function clientPayloadOf(payload: Record<string, unknown>): AgentDispatchPayload {
	const inner = payload.client_payload;
	if (inner === null || typeof inner !== "object" || Array.isArray(inner)) return {};
	return inner as AgentDispatchPayload;
}

/** The entity a resume names, as the resume stage needs it. */
function resumePayload(item: number, isPr: boolean): AgentDispatchPayload {
	return { stage: "resume", item, is_pr: isPr };
}

/**
 * The line the Python printed for a comment route that reached nothing.
 *
 * @param reason - Why the route reached nothing.
 * @param number - The issue or pull request the comment was on.
 * @param author - The comment author's login.
 * @returns The line to report, or `undefined` when the Python said nothing.
 */
function ignoreNoteForComment(reason: string, number: number | undefined, author: string): string | undefined {
	if (reason === "bot-or-agent") return `Skipping comment on #${number} authored by bot/agent (${author}).`;
	if (reason === "failure-chatter") return `Skipping ordinary comment on failure issue #${number}.`;
	return undefined;
}

/** Report whether a label set carries a label, case-insensitively. */
function hasLabel(labels: readonly LabelLike[] | undefined, wanted: string): boolean {
	return (labels ?? []).some(
		(label) => (typeof label === "string" ? label : (label.name ?? "")).toLowerCase() === wanted,
	);
}

/** The `issues` event: intake. */
async function handleIssuesEvent(
	context: DispatchEventContext,
	payload: IssuesPayload,
	repo: string,
): Promise<DispatchEventOutcome> {
	const route = routeIssuesEvent(payload);
	if (route.kind === "ignore") {
		return ignored(
			context,
			route.reason,
			route.reason === "plan-issue"
				? `Issue #${payload.issue?.number} is a Plan; interpretation belongs to its parent Request.`
				: undefined,
		);
	}

	// A failure report enters the pipeline only after this run wins the election for the failing
	// run's identity. One repair in flight per failing run is the whole bound on the loop.
	if (route.claim !== undefined) {
		if (!(await claimFailureDispatch(context.io, route.issue, route.claim, repo, context))) {
			return { kind: "ignored", reason: "claim-lost" };
		}
	}

	if (route.ensureRequestLabel) {
		// Not `bestEffort`: that answers "did it throw", which for a call returning nothing it cannot
		// tell from "it succeeded". The Python branched on the call producing output, and the branch
		// is the whole point - an agent that cannot apply a label has still read the issue and can
		// still interpret it, so the label is reported and the run carries on.
		try {
			await context.io.changeLabels(repo, route.issue, { add: true, labels: ["Request"] });
			context.say(`Auto-labeled issue #${route.issue} as Request`);
		} catch (error) {
			context.warn(`Could not label #${route.issue} as Request: ${errorMessage(error)}`);
		}
	}

	await handleInterpret(context, { issueNumber: route.issue, repo });
	return { kind: "handled", stage: "interpret", detail: `interpreted issue #${route.issue}` };
}

/**
 * Report a route that reached nothing.
 *
 * The router says *why* and stops there, because a reason with no wording is reusable and a wording
 * is a decision. The Python's own lines are reproduced here for the two reasons a human reading the
 * job log will want explained - a Plan that was not interpreted, and a comment that was not acted on -
 * and the rest are silent, exactly as the Python was.
 */
function ignored(context: DispatchEventContext, reason: string, note?: string): DispatchEventOutcome {
	if (note !== undefined) context.say(note);
	return { kind: "ignored", reason };
}

/**
 * The `issue_comment` event.
 *
 * Everything the route needs about the *author* is resolved here, because deciding whether a
 * stranger's `approve` is a gate transition is a question about who is speaking, not about routing.
 */
async function handleIssueCommentEvent(
	context: DispatchEventContext,
	payload: IssueCommentPayload,
	repo: string,
): Promise<DispatchEventOutcome> {
	const issue = payload.issue ?? {};
	const body = (payload.comment?.body ?? "").trim();
	const author = payload.comment?.user?.login ?? "";
	const issueBody = issue.body ?? "";
	const command = parseIssueCommand(body);
	const actor = commentActor(payload.comment ?? {});

	const decision: CommentDecision = {
		command: command ?? undefined,
		allowedApprover: isAllowedApprover(actor.login, {
			authorAssociation: actor.authorAssociation,
			issueAuthor: issue.user?.login ?? "",
			userType: actor.userType,
		}),
		feedback: commandFeedback(body),
		looksLikeCommand: isCommandHint(body),
	};

	// A stranger's command is feedback, never a gate transition. Said out loud so the log explains
	// why a human's `approve` did nothing.
	if (command !== null && !decision.allowedApprover) {
		context.say(
			`Ignoring ${command} command on #${issue.number} from @${actor.login}: ` +
				"not the author nor OWNER/MEMBER/COLLABORATOR.",
		);
	}

	// A `Failed again` re-report is a trigger, so it has to win the same election the opening event
	// won. Resolved before routing, because whether this run may act is not a routing question.
	const recurrence = refailureEffectId(issueBody, body);
	if (recurrence !== undefined) {
		const won = await claimFailureDispatch(context.io, Number(issue.number), recurrence, repo, context);
		decision.claimWon = won;
		context.say(
			won
				? `#${issue.number} failed again as ${recurrence}; dispatching the repair.`
				: `#${issue.number} failed again as ${recurrence}; another run is repairing it.`,
		);
	}

	if (command !== null) {
		context.say(`${command === "reject" ? "Rejection" : "Approval"} comment on #${issue.number} from @${author}.`);
	}

	await resolveGateLinks(context, payload, repo, decision, command);

	const route = routeIssueCommentEvent(payload, decision);
	if (route.kind === "ignore") {
		return ignored(context, route.reason, ignoreNoteForComment(route.reason, issue.number, author));
	}

	// A `Failed again` re-report is the one comment on a failure issue that re-enters the repair, and
	// the route names it an `interpret` rather than a `reject` - the plan is the failure report.
	if (route.kind === "interpret") {
		await handleInterpret(context, { issueNumber: route.issue, repo });
		return { kind: "handled", stage: "interpret", detail: `interpreted issue #${route.issue}` };
	}

	// The router folds two resumes into one route, and their effects differ: a `resume` on a
	// *failure report* unblocks the item and answers the human, while an `approve` resumes the stage
	// that stopped. The failure report is identified here, before the route, so the two stay apart.
	if (route.kind === "resume" && failureEffectId(issueBody) !== undefined) {
		unblockEntity({ io: context.io, board: context.board, warn: context.warn }, repo, route.issue, route.isPr);
		await handleRespond(context, { number: route.issue, commentText: body, repo, isPr: route.isPr });
		return { kind: "handled", stage: "respond", detail: `unblocked and resumed #${route.issue}` };
	}

	if (route.kind === "resume") {
		await context.stages.resume(resumePayload(route.issue, route.isPr));
		return { kind: "dispatched", stage: "resume" };
	}

	if (route.kind === "rerun") {
		if (route.stage === "pr-feedback-fix") {
			await context.stages.prFeedbackFix({
				stage: "pr-feedback-fix",
				pr: route.issue,
				plan: route.plan,
				// The Python's `find_parent_request_number(plan) or plan`: a Plan with no discoverable
				// parent still names a Request, because the fallback is what stops a pull request's
				// feedback from reaching nothing at all.
				request: route.request ?? route.plan,
				feedback: route.feedback,
			});
			return { kind: "dispatched", stage: "pr-feedback-fix" };
		}
		if (route.stage === "plan") {
			await handlePlan(context, {
				requestNumber: route.request ?? route.issue,
				planNumber: route.issue,
				repo,
				feedback: route.feedback,
			});
			return { kind: "handled", stage: "plan", detail: `re-planned on issue #${route.issue}` };
		}
		await handleInterpret(context, { issueNumber: route.issue, repo, feedback: route.feedback });
		return { kind: "handled", stage: "interpret", detail: `re-interpreted issue #${route.issue}` };
	}

	if (route.postCommandHint) await postCommandHintOnce(context.io, route.issue, repo, context);
	await handleRespond(context, { number: route.issue, commentText: route.body, repo, isPr: route.isPr });
	return {
		kind: "handled",
		stage: "respond",
		detail: `responded on ${route.isPr ? "PR" : "issue"} #${route.issue}`,
	};
}

/**
 * Resolve the links a rejection needs before it can be routed.
 *
 * Only a rejection needs them, and only the ones a Request's own plan does not answer: a rejected
 * pull request needs the Plan it implements, and a Plan-labelled issue needs its parent Request.
 * Asking on an `approve` would spend requests to learn something nothing uses.
 */
async function resolveGateLinks(
	context: DispatchEventContext,
	payload: IssueCommentPayload,
	repo: string,
	decision: CommentDecision,
	command: ReturnType<typeof parseIssueCommand>,
): Promise<void> {
	if (command !== "reject") return;
	const issue = payload.issue ?? {};
	const number = Number(issue.number);
	const isPr = issue.pull_request !== undefined && issue.pull_request !== null;

	if (isPr) {
		decision.plan = await findPlanIssueForPr(context.io, number, repo, context.warn);
		if (decision.plan !== undefined) {
			decision.request = await findParentRequestNumber(context.io, decision.plan, repo);
		}
		return;
	}
	// One issue carries both gates, so which gate a rejection answers is read back from the issue.
	// A Request is checked before a Plan, because a merged-gate issue has both labels and the plan
	// comment is the thing being sent back.
	if (hasLabel(issue.labels, "request")) {
		// An unreadable issue counts as unplanned, which re-interprets safely: planning twice wastes
		// a run, approving a plan nobody posted stalls the pipeline on nothing.
		decision.hasPlan = await hasPlan(context, number, repo);
		return;
	}
	if (hasLabel(issue.labels, "plan")) {
		decision.request = await findParentRequestNumber(context.io, number, repo);
		if (decision.request === undefined) context.say(`Could not find parent Request for Plan #${number}`);
	}
}

/** The `pull_request_review_comment` event: the same grammar, on a pull request's own thread. */
async function handleReviewCommentEvent(
	context: DispatchEventContext,
	payload: ReviewCommentPayload,
	repo: string,
): Promise<DispatchEventOutcome> {
	const body = (payload.comment?.body ?? "").trim();
	const author = payload.comment?.user?.login ?? "";
	const prNumber = payload.pull_request?.number;
	const command = parsePrCommand(body);
	const actor = commentActor(payload.comment ?? {});

	const decision: CommentDecision = {
		command: command ?? undefined,
		allowedApprover: isAllowedApprover(actor.login, {
			authorAssociation: actor.authorAssociation,
			issueAuthor: payload.pull_request?.user?.login ?? "",
			userType: actor.userType,
		}),
		feedback: commandFeedback(body),
	};
	if (command !== null && !decision.allowedApprover) {
		context.say(`Ignoring ${command} review comment on #${prNumber}: not the author nor OWNER/MEMBER/COLLABORATOR.`);
	}

	// A rejection on a pull request becomes a code revision on that pull request's branch, which
	// needs the Plan it implements. An approval needs nothing read, and the Python returned before
	// this lookup for exactly that reason.
	if (command === "reject" && prNumber !== undefined) {
		decision.plan = await findPlanIssueForPr(context.io, prNumber, repo, context.warn);
		if (decision.plan !== undefined) {
			decision.request = await findParentRequestNumber(context.io, decision.plan, repo);
		}
	}

	const route = routeReviewCommentEvent(payload, decision);
	if (route.kind === "ignore") {
		return ignored(
			context,
			route.reason,
			route.reason === "bot-or-agent"
				? `Skipping PR review comment on #${prNumber} authored by bot/agent (${author}).`
				: undefined,
		);
	}

	if (route.kind === "resume") {
		await context.stages.resume(resumePayload(route.pr, true));
		return { kind: "dispatched", stage: "resume" };
	}

	context.say(`PR review comment on #${prNumber} from @${author}: ${body.slice(0, 80)}...`);

	if (route.kind === "rerun") {
		await context.stages.prFeedbackFix({
			stage: "pr-feedback-fix",
			pr: route.pr,
			plan: route.plan,
			request: route.request ?? route.plan,
			feedback: route.feedback,
		});
		return { kind: "dispatched", stage: "pr-feedback-fix" };
	}
	await handleRespond(context, { number: route.pr, commentText: route.body, repo, isPr: true });
	return { kind: "handled", stage: "respond", detail: `responded on PR #${route.pr}` };
}

/**
 * Route a webhook event to the stage it reaches and perform it.
 *
 * Replaces `dispatch_event`. The Python read the file itself; this takes the already-read payload so
 * the routing can be asserted against a payload rather than a filesystem, and the entrypoint that
 * reads `GITHUB_EVENT_PATH` stays where it is — that is the one part of the process boundary this
 * port deliberately does not reach for.
 *
 * @param context - The dispatcher's GitHub port, stages, agent and reporting.
 * @param request - The event's name and its already-read payload.
 * @returns What was reached, or why nothing was.
 */
export async function dispatchEvent(
	context: DispatchEventContext,
	request: DispatchEventRequest,
): Promise<DispatchEventOutcome> {
	if (request.payload === undefined) {
		context.say(`Event path ${request.eventPath} not found.`);
		return { kind: "ignored", reason: "event-not-found" };
	}

	const payload = normalisePayload(request.payload);
	const repo = eventRepository(payload.repository, context.environment.repository);

	if (request.eventName === "repository_dispatch") {
		if (payload.action !== "agent-dispatch") return { kind: "ignored", reason: "unsupported-event" };
		const clientPayload = clientPayloadOf(payload);
		const route = routeRepositoryDispatch(clientPayload);
		if (route.kind === "ignore") return { kind: "ignored", reason: route.reason };
		// The stage is the route's, not the payload's: `routeRepositoryDispatch` defaults the
		// iteration to 1, and a dispatch naming no stage this pipeline runs is ignored rather than
		// guessed at.
		const stage = { ...clientPayload, stage: route.stage, iteration: route.iteration ?? 1 };
		if (route.stage === "self-review") await context.stages.selfReview(stage);
		else if (route.stage === "self-review-fix") await context.stages.selfReviewFix(stage);
		else if (route.stage === "pr-feedback-fix") await context.stages.prFeedbackFix(stage);
		else await context.stages.resume(stage);
		return { kind: "dispatched", stage: route.stage };
	}

	if (request.eventName === "issues") return handleIssuesEvent(context, payload as IssuesPayload, repo);
	if (request.eventName === "issue_comment")
		return handleIssueCommentEvent(context, payload as IssueCommentPayload, repo);
	if (request.eventName === "pull_request_review_comment") {
		return handleReviewCommentEvent(context, payload as ReviewCommentPayload, repo);
	}
	return { kind: "ignored", reason: "unsupported-event" };
}

/**
 * Normalise an event payload to an object.
 *
 * A `repository_dispatch` payload arrives as an object, but a workflow that pipes a JSON *string*
 * into the file delivers a string, and the Python re-parsed one level of that. Anything still not
 * an object becomes `{}`, which routes to nothing: a payload the pipeline cannot read is not one it
 * should act on.
 *
 * @param payload - What the file held, once parsed.
 * @returns The payload as an object, or `{}`.
 */
export function normalisePayload(payload: unknown): Record<string, unknown> {
	let value = payload;
	if (typeof value === "string") {
		try {
			value = JSON.parse(value);
		} catch {
			// Left as the string, and so rejected below, exactly as the Python's `except: pass` left
			// it: a string that is not JSON is not a payload.
		}
	}
	if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
	return value as Record<string, unknown>;
}
