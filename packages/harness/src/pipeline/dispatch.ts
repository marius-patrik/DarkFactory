/**
 * Event routing: which stage a webhook event reaches, decided without touching GitHub.
 *
 * Ported from `.github/scripts/agent_runner.py` (`dispatch_event`). Each route is a decision plus
 * the ordered list of effects the caller must perform, so the routing can be asserted on its own
 * and the side effects stay in one place.
 *
 * Two things this deliberately does *not* port, because they are other modules' jobs rather than
 * this one's: the command grammar (`parse_issue_command`, `parse_pr_command`,
 * `is_allowed_approver`, `is_command_hint`) and every `gh` call. Both arrive here already resolved —
 * a route takes the parsed command and whether its author may act on it as parameters.
 */

import { failureEffectId, refailureEffectId } from "./failure-effect.ts";
import { isBotOrAgentComment } from "./signals.ts";

/** The decision verbs the issue and PR command grammars produce. */
export type PipelineCommand = "approve" | "reject" | "resume";

/** A label as GitHub sends it: an object on most payloads, a bare string on some. */
export type LabelLike = string | { name?: string };

function labelNames(labels: readonly LabelLike[] | undefined): string[] {
	return (labels ?? []).map((label) => (typeof label === "string" ? label : (label.name ?? "")));
}

/** The event that opens a Request, used as the pipeline's intake trigger. */
export const INTAKE_ACTIONS: readonly string[] = ["opened", "labeled"];

/** The label an existing issue must be given to enter the pipeline. */
const INTAKE_LABEL = "request";

/** Why an event reached no handler. */
type IgnoreReason =
	| "unsupported-event"
	| "not-an-intake-action"
	| "no-issue-number"
	| "plan-issue"
	| "unrelated-label"
	| "claim-lost"
	| "not-created"
	| "bot-or-agent"
	| "failure-chatter"
	| "unknown-stage";

/** A routed event: either a stage to run, or the reason nothing was. */
type Route = { kind: "run"; stage: PipelineStage; iteration?: number } | { kind: "ignore"; reason: IgnoreReason };

/** The stages the pipeline dispatches to each other. */
export type PipelineStage = "self-review" | "self-review-fix" | "pr-feedback-fix" | "resume";

/** The `issues` webhook payload this module reads. */
export interface IssuesPayload {
	action?: string;
	issue?: { number?: number; body?: string; labels?: LabelLike[] };
	label?: LabelLike;
}

/**
 * What an `issues` event asks the pipeline to do.
 *
 * `claim` is the effect identity this run must win before interpreting: a pipeline-failure issue is
 * the one trigger that can repair a failure, and the claim is what bounds that to one repair in
 * flight per failing run.
 */
type IssuesRoute =
	| { kind: "interpret"; issue: number; ensureRequestLabel: boolean; claim?: string }
	| { kind: "ignore"; reason: IgnoreReason };

/**
 * Routes an `issues` webhook event.
 *
 * Intake fires on `opened` and on `labeled` — but a `labeled` event only when the label just
 * applied is the intake label itself. The payload's `label` names the applied label; the issue's
 * own label set cannot, because it is the whole set and adding any second label to a live Request
 * would otherwise start a duplicate run.
 */
export function routeIssuesEvent(payload: IssuesPayload): IssuesRoute {
	const action = payload.action ?? "";
	if (!INTAKE_ACTIONS.includes(action)) return { kind: "ignore", reason: "not-an-intake-action" };
	const issue = payload.issue ?? {};
	const issueNumber = issue.number;
	if (!issueNumber) return { kind: "ignore", reason: "no-issue-number" };

	const labels = labelNames(issue.labels).map((label) => label.toLowerCase());

	// A Plan issue is opened by the pipeline itself, as the child of a Request that has already been
	// interpreted and approved. Interpreting it again asks what a plan means, which is a question
	// nobody posed, and the answer lands on the same issue as the plan that follows moments later.
	if (labels.includes("plan")) return { kind: "ignore", reason: "plan-issue" };

	if (action === "labeled") {
		const applied = typeof payload.label === "string" ? payload.label : (payload.label?.name ?? "");
		if (applied.toLowerCase() !== INTAKE_LABEL) return { kind: "ignore", reason: "unrelated-label" };
	}

	// A failure report is the one trigger that can repair a failure, so it enters the pipeline, but
	// only after this run wins the election for the failing run's identity.
	const claim = failureEffectId(issue.body ?? "");
	return {
		kind: "interpret",
		issue: issueNumber,
		// An agent that cannot apply a label has still read the issue and can still interpret it;
		// labelling is therefore best-effort rather than fatal.
		ensureRequestLabel: !labels.some((label) => label === INTAKE_LABEL || label === "plan"),
		...(claim === undefined ? {} : { claim }),
	};
}

/** A comment author's identity as a webhook payload carries it. */
interface CommentActor {
	login: string;
	authorAssociation: string;
	userType: string;
}

/** Extracts a commenter's identity from an `issue_comment` payload's `comment` object. */
export function commentActor(comment: {
	user?: { login?: string; type?: string };
	author_association?: string;
}): CommentActor {
	return {
		login: comment.user?.login ?? "",
		authorAssociation: comment.author_association ?? "",
		userType: comment.user?.type ?? "",
	};
}

/** The `issue_comment` payload this module reads. */
export interface IssueCommentPayload {
	action?: string;
	issue?: {
		number?: number;
		body?: string;
		labels?: LabelLike[];
		user?: { login?: string };
		pull_request?: unknown;
	};
	comment?: { body?: string; user?: { login?: string; type?: string }; author_association?: string };
}

/** Which stage an `issue_comment` event reaches, and with what. */
type IssueCommentRoute =
	| { kind: "interpret"; issue: number; claim: string }
	| { kind: "resume"; issue: number; isPr: boolean }
	| {
			kind: "rerun";
			stage: "interpret" | "plan" | "pr-feedback-fix";
			issue: number;
			feedback: string;
			plan?: number;
			request?: number;
	  }
	| { kind: "respond"; issue: number; isPr: boolean; body: string; postCommandHint: boolean }
	| { kind: "ignore"; reason: IgnoreReason };

/** What the caller resolved about the comment before asking for a route. */
export interface CommentDecision {
	/** The parsed command, or `undefined` when the comment carries none. */
	command?: PipelineCommand;
	/** False when the author may not act on a command, which demotes it to feedback. */
	allowedApprover: boolean;
	/** The text that follows the command, or the whole comment when there is no command. */
	feedback?: string;
	/** Whether the comment merely mentions a command word rather than being one. */
	looksLikeCommand?: boolean;
	/**
	 * For a rejection, the Plan the comment sends back: the Plan issue a pull request implements, or
	 * the Plan a Plan issue's parent Request owns.
	 */
	plan?: number;
	/**
	 * Whether a rejected Request has already had a plan posted. One issue carries both gates, so
	 * which one a rejection answers is read back from the issue rather than tracked in a label.
	 */
	hasPlan?: boolean;
	/** The parent Request of that Plan. */
	request?: number;
	/** Whether this run won the claim for the effect identity it carries. */
	claimWon?: boolean;
}

/**
 * Routes an `issue_comment` event.
 *
 * The order of the checks is the behaviour, not an accident: a `Failed again` comment is taken
 * *before* the bot check, because that is the one bot comment that is a trigger rather than
 * chatter, and a comment on a failure issue is answered only for an explicit `resume`.
 */
export function routeIssueCommentEvent(payload: IssueCommentPayload, decision: CommentDecision): IssueCommentRoute {
	const issue = payload.issue ?? {};
	const issueNumber = issue.number;
	if ((payload.action ?? "") !== "created" || !issueNumber) {
		return { kind: "ignore", reason: payload.action === "created" ? "no-issue-number" : "not-created" };
	}
	const comment = payload.comment ?? {};
	const body = (comment.body ?? "").trim();
	const isPr = issue.pull_request !== undefined && issue.pull_request !== null;
	const issueBody = issue.body ?? "";

	// A recurrence of the same failure: the reporter comments rather than filing a second issue, so
	// this is how a red build that came back after a repair enters the loop again.
	const recurrence = refailureEffectId(issueBody, body);
	if (recurrence !== undefined) {
		return decision.claimWon === false
			? { kind: "ignore", reason: "claim-lost" }
			: { kind: "interpret", issue: issueNumber, claim: recurrence };
	}

	if (isBotOrAgentComment(comment.user?.login ?? "", body)) {
		return { kind: "ignore", reason: "bot-or-agent" };
	}

	// Every other comment on a failure report is chatter about a red build, not an answer to a gate.
	// The opening event already claimed and interpreted the issue, so re-reading it here would start
	// a second repair. A resume command still unblocks it.
	if (failureEffectId(issueBody) !== undefined) {
		return decision.command === "resume"
			? { kind: "resume", issue: issueNumber, isPr }
			: { kind: "ignore", reason: "failure-chatter" };
	}

	// A stranger's command is feedback, never a gate transition.
	const command = decision.command && decision.allowedApprover ? decision.command : undefined;
	if (command === "approve" || command === "resume") return { kind: "resume", issue: issueNumber, isPr };

	if (command === "reject") {
		const feedback = decision.feedback || body;
		if (isPr) {
			return decision.plan === undefined
				? { kind: "respond", issue: issueNumber, isPr, body, postCommandHint: false }
				: {
						kind: "rerun",
						stage: "pr-feedback-fix",
						issue: issueNumber,
						feedback,
						plan: decision.plan,
						request: decision.request,
					};
		}
		const labels = labelNames(issue.labels).map((label) => label.toLowerCase());
		if (labels.includes("request")) {
			// One issue carries both gates, so which one is rejected is read back from the issue: a
			// posted plan means the plan is what is being sent back.
			return decision.hasPlan === true
				? { kind: "rerun", stage: "plan", issue: issueNumber, feedback, plan: issueNumber, request: issueNumber }
				: { kind: "rerun", stage: "interpret", issue: issueNumber, feedback, plan: issueNumber, request: issueNumber };
		}
		if (labels.includes("plan")) {
			return decision.request === undefined
				? { kind: "respond", issue: issueNumber, isPr, body, postCommandHint: false }
				: { kind: "rerun", stage: "plan", issue: issueNumber, feedback, plan: issueNumber, request: decision.request };
		}
		return { kind: "respond", issue: issueNumber, isPr, body, postCommandHint: false };
	}

	const labels = labelNames(issue.labels).map((label) => label.toLowerCase());
	const gated = labels.includes("request") || labels.includes("plan");
	return {
		kind: "respond",
		issue: issueNumber,
		isPr,
		body,
		postCommandHint: gated && decision.looksLikeCommand === true,
	};
}

/** The `pull_request_review_comment` payload this module reads. */
export interface ReviewCommentPayload {
	action?: string;
	pull_request?: { number?: number; user?: { login?: string } };
	comment?: { body?: string; user?: { login?: string; type?: string }; author_association?: string };
}

/** Which stage a pull-request review comment reaches. */
type ReviewCommentRoute =
	| { kind: "resume"; pr: number }
	| { kind: "rerun"; stage: "pr-feedback-fix"; pr: number; feedback: string; plan: number; request?: number }
	| { kind: "respond"; pr: number; body: string }
	| { kind: "ignore"; reason: IgnoreReason };

/**
 * Routes a `pull_request_review_comment` event.
 *
 * A rejection that resolves to a Plan issue becomes a code revision on the pull request's branch
 * rather than a second implementation, because the plan is already approved and only the code
 * diverged from it.
 */
export function routeReviewCommentEvent(payload: ReviewCommentPayload, decision: CommentDecision): ReviewCommentRoute {
	const prNumber = payload.pull_request?.number;
	if ((payload.action ?? "") !== "created" || !prNumber) {
		return { kind: "ignore", reason: payload.action === "created" ? "no-issue-number" : "not-created" };
	}
	const comment = payload.comment ?? {};
	const body = (comment.body ?? "").trim();
	if (isBotOrAgentComment(comment.user?.login ?? "", body)) return { kind: "ignore", reason: "bot-or-agent" };

	const command = decision.command && decision.allowedApprover ? decision.command : undefined;
	if (command === "approve" || command === "resume") return { kind: "resume", pr: prNumber };
	if (command === "reject" && decision.plan !== undefined) {
		return {
			kind: "rerun",
			stage: "pr-feedback-fix",
			pr: prNumber,
			feedback: decision.feedback || body,
			plan: decision.plan,
			request: decision.request,
		};
	}
	return { kind: "respond", pr: prNumber, body };
}

/** The `repository_dispatch` client payload the pipeline dispatches to itself. */
export interface AgentDispatchPayload {
	stage?: string;
	pr?: number;
	plan?: number;
	request?: number;
	iteration?: number;
	feedback?: string;
	item?: number;
	is_pr?: boolean;
}

/**
 * Resolves the stage a `repository_dispatch` names.
 *
 * `iteration` defaults to 1 because a dispatch that omits it is the first review; a dispatch naming
 * a stage this pipeline does not run is ignored rather than guessed at.
 */
export function routeRepositoryDispatch(payload: AgentDispatchPayload): Route {
	if (payload.stage === "resume") return { kind: "run", stage: "resume" };
	if (payload.stage === "self-review" || payload.stage === "self-review-fix" || payload.stage === "pr-feedback-fix") {
		return { kind: "run", stage: payload.stage, iteration: payload.iteration ?? 1 };
	}
	return { kind: "ignore", reason: "unknown-stage" };
}

/** The workflow name this pipeline runs under when an event names no repository. */
/**
 * No default target repository.
 *
 * This was the literal `"marius-patrik/DarkFactory"`, which is this repository's own slug baked into a
 * pipeline that installs into *other* repositories. A run with `GITHUB_REPOSITORY` unset — a local
 * invocation, a misconfigured step — resolved to DarkFactory and reported success against it, which is
 * the same class of failure as a run that silently reconciles a consumer against the pipeline. An
 * unset target is an error now.
 */
export const NO_TARGET_REPOSITORY =
	"no target repository: set GITHUB_REPOSITORY. The pipeline does not default to its own repository, " +
	"because it is installed into others.";

/** Reads the repository slug an event payload targets, falling back to the environment. */
export function eventRepository(repository: unknown, fallback = ""): string {
	if (repository && typeof repository === "object" && "full_name" in repository) {
		const fullName = (repository as { full_name?: unknown }).full_name;
		if (typeof fullName === "string" && fullName) return fullName;
	}
	if (typeof repository === "string" && repository) return repository;
	return fallback;
}
