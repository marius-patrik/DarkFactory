import type { CanonicalStatus } from "../../../protocol/src/workflow.ts";
import { extractBoundIssues, extractClosingIssues } from "./bindings.ts";
import type { BoardTarget, ReconcilableBoard } from "./client.ts";
import { applyBoundIssueStatus } from "./reconcile.ts";
import type { BoardRun } from "./run.ts";
import { type BoardItem, expectedStatus, type LabelSource } from "./status.ts";

/**
 * Real-time lifecycle handling.
 *
 * A webhook arrives carrying a fact - an issue was reopened, a pull request became ready, a branch
 * was pushed to - and the board has to agree with it immediately, because a human is looking at the
 * board while they decide what to do next. Everything here reads the same projection the nightly
 * sweep uses, so an item cannot read one way in a webhook and another way on the scan.
 */

/** The issue or pull request fragment a webhook payload carries. */
type WebhookEntity = BoardItem & {
	readonly number?: number;
	readonly html_url?: string | null;
	readonly node_id?: string | null;
	readonly body?: string | null;
	readonly labels?: readonly LabelSource[];
};

/** A webhook payload, in the union of shapes the four triggers produce. */
export interface WebhookPayload {
	readonly action?: string;
	readonly ref?: string;
	readonly repository?: { readonly full_name?: string; readonly default_branch?: string } | null;
	readonly issue?: WebhookEntity;
	readonly pull_request?: WebhookEntity;
	readonly commits?: readonly { readonly message?: string }[];
}

/** What a lifecycle handler needs beyond the board it writes to. */
export interface BoardEventContext {
	/** The run whose budget gates this handler. */
	readonly run: BoardRun;
	/** The branch whose pushes reconcile the board. */
	readonly defaultBranch: string;
	/** The integration branch, whose pushes reconcile it too. */
	readonly developmentBranch: string;
	/** Reconciles every board and repository. Run after a push, and on a schedule. */
	readonly sweep: (target?: ReconcilableBoard) => Promise<void>;
}

/** Label names on a webhook payload fragment. */
function labelsOf(entity: WebhookEntity | undefined): readonly LabelSource[] {
	return entity?.labels ?? [];
}

/** The event's own `action`, which decides what it means. */
function actionOf(payload: WebhookPayload): string {
	return payload.action ?? "";
}

/**
 * Projects an `issues` event onto the board.
 *
 * The reopen is the case that matters. It re-reads the quota checkpoint, because a reopened issue
 * whose agent stopped for quota must not re-enter the ready queue - but the checkpoint's age bound
 * applies, so a pause that was never resumed releases the issue rather than pinning it `Blocked`
 * forever. A `Blocked` *label* is a separate signal and is untouched by that expiry, because a human
 * put it there.
 */
export async function handleIssueEvent(
	payload: WebhookPayload,
	target: BoardTarget,
	_context: BoardEventContext,
): Promise<void> {
	const action = actionOf(payload);
	const issue = payload.issue ?? {};
	const url = issue.html_url;
	if (!url) return;

	const closed = (issue.state ?? "").toLowerCase() === "closed" || action === "closed";
	// The payload's own state is not trusted over the action: an `opened` event carries no state
	// field at all, and a `closed` one may carry no reason, which defaults to `completed` - GitHub's
	// own default for an issue closed from the UI.
	const lifecycle: BoardItem = closed
		? { state: "closed", state_reason: action === "closed" ? (issue.state_reason ?? "completed") : issue.state_reason }
		: action === "opened" || action === "reopened"
			? { state: "open" }
			: {};
	const status = expectedStatus({ ...issue, ...lifecycle, kind: "Issue", is_pr: false });
	await target.track(url, status, { contentId: issue.node_id, fastPath: true });
	if (issue.number) {
		await target.setStatusLabel(payload.repository?.full_name ?? "", issue.number, status, labelsOf(issue));
	}
}

/**
 * Projects a `pull_request` event onto the board, and onto the Requests it binds.
 *
 * Two bindings mean different things. A pull request becoming *ready* is the first signal that bound
 * work is active, so the Requests it binds move to `In Progress` - and not one moment earlier, because
 * a draft pull request is not yet reviewable and moving the Request then carries it past the approval
 * gate on the strength of an unreviewable diff. A *merged* pull request closes the Requests it closes,
 * so their state agrees with their labels.
 */
export async function handlePullRequestEvent(
	payload: WebhookPayload,
	target: BoardTarget,
	context: BoardEventContext,
): Promise<void> {
	const action = actionOf(payload);
	const pull = payload.pull_request ?? {};
	const url = pull.html_url;
	const repo = payload.repository?.full_name ?? "";
	const merged = Boolean(pull.merged);
	const body = pull.body ?? "";
	const bound = extractBoundIssues(body);
	const closing = extractClosingIssues(body);
	context.run.say(
		`PR event ${action}: bound issues ${JSON.stringify(bound)}; closing issues ${JSON.stringify(closing)}`,
	);
	if (!url) return;

	const closed = (pull.state ?? "").toLowerCase() === "closed" || action === "closed" || merged;
	const lifecycle: BoardItem = { ...(closed ? { state: "closed" as const } : {}), ...(merged ? { merged: true } : {}) };
	const status: CanonicalStatus = expectedStatus({ ...pull, ...lifecycle, kind: "PullRequest", is_pr: true });
	await target.track(url, status, { contentId: pull.node_id, fastPath: true });
	if (pull.number) await target.setStatusLabel(repo, pull.number, status, labelsOf(pull));

	if (action === "ready_for_review") {
		for (const number of bound) await applyBoundIssueStatus(target, repo, number, "In Progress", false);
	} else if (action === "closed" && merged) {
		for (const number of closing) await applyBoundIssueStatus(target, repo, number, "Done", true);
	}
}

/**
 * Reconciles the board after a push to the default or development branch.
 *
 * A closing keyword in a commit message is a completion recorded in the repository rather than in a
 * webhook, so the push is the moment those References are settled - on main, and on the integration
 * branch, whose arrival at main is the same event seen from the other side. Then the full sweep runs,
 * so anything a push could not write is repaired immediately instead of waiting for the schedule.
 */
export async function handlePushEvent(
	payload: WebhookPayload,
	target: BoardTarget,
	context: BoardEventContext,
): Promise<void> {
	const allowed = new Set([`refs/heads/${context.defaultBranch}`, `refs/heads/${context.developmentBranch}`]);
	if (!allowed.has(payload.ref ?? "")) return;

	const repo = payload.repository?.full_name ?? "";
	for (const commit of payload.commits ?? []) {
		for (const number of extractClosingIssues(commit.message)) {
			await applyBoundIssueStatus(target, repo, number, "Done", true);
		}
	}

	if (context.run.canReconcile()) await context.sweep(target as ReconcilableBoard);
}
