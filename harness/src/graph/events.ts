import type { Actor, AuthorAssociation, GraphEvent } from "./types.ts";

/**
 * Translated representation of a GitHub event for the graph processing.
 *
 * The union consists of:
 * - An event with a concrete GraphEvent and subject information.
 * - A skip entry indicating the event should be ignored, with a reason.
 */
export type TranslatedEvent =
	| {
		/** The kind of translation result, always "event" for a valid event. */
		kind: "event";
		/** The specific graph event derived from the GitHub payload. */
		event: GraphEvent;
		/** Subject information identifying the target of the event. */
		subject: {
			/** The issue or PR number. */
			number: number;
			/** True if the subject is a pull request. */
			is_pr: boolean;
			/** Optional ref (e.g., commit SHA) for the subject. */
			ref?: string;
		};
	}
	| {
		/** The kind of translation result, "skip" when the payload is not relevant. */
		kind: "skip";
		/** Reason why the event is being skipped. */
		reason: string;
	};

// Events whose ingress comes from a human user (and thus can be a bot). System
// events like `check_suite` and `schedule` are deliberately excluded: GitHub
// dispatches them on behalf of `github-actions[bot]`, and bot-filtering those
// would silently drop CI completions and cron runs.
const USER_INGRESS_EVENTS = new Set<string>(["issues", "issue_comment", "pull_request_review"]);
const ASSOCIATIONS: readonly AuthorAssociation[] = ["OWNER", "MEMBER", "COLLABORATOR", "AUTHOR"];

function asRecord(val: unknown): Record<string, unknown> | undefined {
	return val && typeof val === "object" ? (val as Record<string, unknown>) : undefined;
}

function toNumber(val: unknown): number {
	const n = typeof val === "number" ? val : Number(val);
	return Number.isNaN(n) ? 0 : n;
}

function association(value: unknown): AuthorAssociation | "NONE" {
	return ASSOCIATIONS.includes(value as AuthorAssociation) ? (value as AuthorAssociation) : "NONE";
}

function isBotUser(user: unknown): boolean {
	if (!user || typeof user !== "object") return false;
	const u = user as { type?: unknown; login?: unknown };
	if (u.type === "Bot") return true;
	return typeof u.login === "string" && u.login.endsWith("[bot]");
}

function ingressUser(eventName: string, p: Record<string, unknown>): unknown {
	if (eventName === "issue_comment") return asRecord(p.comment)?.user ?? p.sender;
	if (eventName === "pull_request_review") return asRecord(p.review)?.user ?? p.sender;
	return p.sender;
}

function actorFrom(user: unknown, associationValue: unknown): Actor {
	const login = typeof (user as { login?: unknown })?.login === "string" ? (user as { login: string }).login : "";
	return { login, association: association(associationValue), is_bot: isBotUser(user) };
}

function actionOrUnknown(action: unknown): string {
	return action === undefined ? "unknown" : String(action);
}

function translateIssues(p: Record<string, unknown>): TranslatedEvent {
	const issue = asRecord(p.issue);
	if (!issue) return { kind: "skip", reason: "malformed payload" };
	const action = p.action;
	const actor = actorFrom(p.sender, issue.author_association);
	const subject = { number: toNumber(issue.number), is_pr: false };
	if (action === "opened") return { kind: "event", event: { type: "issues.opened", actor }, subject };
	if (action === "labeled") {
		const label = asRecord(p.label);
		return { kind: "event", event: { type: "issues.labeled", actor, label: String(label?.name ?? "") }, subject };
	}
	return { kind: "skip", reason: `issues.${actionOrUnknown(action)} is not a graph event` };
}

function translateComment(p: Record<string, unknown>): TranslatedEvent {
	const action = p.action;
	const comment = asRecord(p.comment);
	const issue = asRecord(p.issue);
	if (!comment || !issue) return { kind: "skip", reason: "malformed payload" };
	if (action === "created") {
		const actor = actorFrom(comment.user, comment.author_association);
		return { kind: "event", event: { type: "comment", actor, body: String(comment.body ?? "") }, subject: { number: toNumber(issue.number), is_pr: Boolean(issue.pull_request) } };
	}
	return { kind: "skip", reason: `issue_comment.${actionOrUnknown(action)} is not a graph event` };
}

function translateReview(p: Record<string, unknown>): TranslatedEvent {
	const action = p.action;
	const review = asRecord(p.review);
	const pr = asRecord(p.pull_request);
	if (!review || !pr) return { kind: "skip", reason: "malformed payload" };
	if (action === "submitted") {
		const actor = actorFrom(review.user, review.author_association);
		const head = asRecord(pr.head);
		return { kind: "event", event: { type: "review", state: String(review.state ?? "").toUpperCase(), actor }, subject: { number: toNumber(pr.number), is_pr: true, ref: String(head?.sha ?? "") } };
	}
	return { kind: "skip", reason: `pull_request_review.${actionOrUnknown(action)} is not a graph event` };
}

function translateCheckSuite(p: Record<string, unknown>): TranslatedEvent {
	const action = p.action;
	const checkSuite = asRecord(p.check_suite);
	if (!checkSuite) return { kind: "skip", reason: "malformed payload" };
	if (action === "completed") {
		const pullRequests = Array.isArray(checkSuite.pull_requests) ? checkSuite.pull_requests : [];
		if (pullRequests.length === 0) return { kind: "skip", reason: "check_suite has no pull requests" };
		const pr = asRecord(pullRequests[0]);
		if (!pr) return { kind: "skip", reason: "check_suite has no pull requests" };
		const conclusion: "required_green" | "failed" = checkSuite.conclusion === "success" ? "required_green" : "failed";
		return { kind: "event", event: { type: "checks.completed", conclusion }, subject: { number: toNumber(pr.number), is_pr: true, ref: String(checkSuite.head_sha ?? "") } };
	}
	return { kind: "skip", reason: `check_suite.${actionOrUnknown(action)} is not a graph event` };
}

function translateSchedule(p: Record<string, unknown>, now?: string): TranslatedEvent {
	const schedule = p.schedule === undefined ? "" : String(p.schedule);
	return { kind: "event", event: { type: "schedule", schedule, now: now ?? new Date().toISOString() }, subject: { number: 0, is_pr: false } };
}

/**
 * Translate a raw GitHub webhook payload into a TranslatedEvent for the graph engine.
 *
 * @param eventName - The name of the GitHub event (e.g., "issues", "push").
 * @param payload - The parsed JSON payload of the webhook.
 * @param now - Optional current timestamp override for schedule events.
 * @returns A TranslatedEvent representing the processed event or a skip with reason.
 */
export function translateGitHubEvent(
	eventName: string,
	payload: unknown,
	now?: string
): TranslatedEvent {
	try {
		if (!payload || typeof payload !== "object") return { kind: "skip", reason: "malformed payload" };
		const p = payload as Record<string, unknown>;
		if (USER_INGRESS_EVENTS.has(eventName) && isBotUser(ingressUser(eventName, p))) return { kind: "skip", reason: "bot ingress ignored" };
		switch (eventName) {
			case "issues": return translateIssues(p);
			case "issue_comment": return translateComment(p);
			case "pull_request_review": return translateReview(p);
			case "check_suite": return translateCheckSuite(p);
			case "schedule": return translateSchedule(p, now);
			default: return { kind: "skip", reason: `${eventName} is not a graph event` };
		}
	} catch {
		return { kind: "skip", reason: "malformed payload" };
	}
}
