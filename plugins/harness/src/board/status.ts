import type { CanonicalStatus } from "../../../protocol/src/workflow.ts";
import { checkpointCoversIssue } from "./checkpoint.ts";
import { STATUS_FIELD_NAME } from "./taxonomy.ts";

/**
 * The status projection: the canonical board status an item holds, derived from live facts.
 *
 * This is the single place the board's meaning lives. The real-time event handlers, the membership
 * sweep and the historic reconciliation all call it, so an item cannot read one way in a webhook
 * and another way on the nightly scan.
 *
 * The projection is **exclusive**: an item holds exactly one status, and a later event replaces the
 * previous one rather than adding to it. An issue that is `Blocked` is not also `ToDo`; the
 * `Blocked` label alone decides that. Status labels are projected from here and are removed by
 * `setStatusLabel`, so an additive projection would leave the issue carrying two statuses and the
 * board unable to say which one is true.
 */

/** A label as it arrives: a bare name, or the REST/GraphQL object carrying one. */
export type LabelSource = string | { readonly name?: string | null };

/** The GraphQL `labels(first: n) { nodes: [...] }` wrapper. */
interface LabelConnection {
	readonly nodes?: readonly LabelSource[] | null;
}

/** A label container: a bare list, or the GraphQL connection wrapper. */
type LabelListSource = readonly LabelSource[] | LabelConnection | null;

/** Whether a label container is the connection wrapper rather than a bare list. */
function isLabelConnection(labels: readonly LabelSource[] | LabelConnection): labels is LabelConnection {
	return !Array.isArray(labels);
}

/** A bound pull request, in the subset the projection reads. */
interface BoundPullRequest {
	readonly state?: string | null;
	readonly merged?: boolean | null;
	readonly merged_at?: string | null;
	readonly mergedAt?: string | null;
	readonly draft?: boolean | null;
	readonly is_draft?: boolean | null;
	readonly isDraft?: boolean | null;
}

/**
 * One issue or pull request, in the union of shapes the four sources produce.
 *
 * Every field is optional and all the spellings are present because the sources disagree: REST
 * issues carry `state_reason` and `html_url`, GraphQL carries `stateReason` and `url`, a webhook
 * payload carries `node_id` and neither reason spelling, and `merged`/`merged_at`/`mergedAt` is the
 * same fact written three ways by three callers. Reading the union is what lets one projection serve
 * all four.
 */
export interface BoardItem {
	readonly number?: number | string | null;
	readonly issue_number?: number | string | null;
	readonly html_url?: string | null;
	readonly url?: string | null;
	readonly node_id?: string | null;
	readonly state?: string | null;
	readonly state_reason?: string | null;
	readonly stateReason?: string | null;
	readonly closed?: boolean | null;
	readonly merged?: boolean | null;
	readonly merged_at?: string | null;
	readonly mergedAt?: string | null;
	readonly draft?: boolean | null;
	readonly kind?: string | null;
	readonly type?: string | null;
	readonly __typename?: string | null;
	readonly is_pr?: boolean | null;
	readonly isPr?: boolean | null;
	readonly pull_request?: unknown;
	readonly labels?: LabelListSource;
	readonly checkpoint?: boolean | null;
	readonly bound_prs?: readonly BoundPullRequest[] | null;
	readonly bound_pr_states?: readonly BoundPullRequest[] | null;
}

/** Facts a caller already holds, so the projection does not have to go looking for them. */
interface ExpectedStatusOptions {
	/** Bound pull requests, when the caller holds them outside the item. */
	readonly boundPrs?: readonly BoundPullRequest[] | null;
	/** An explicit answer to "does a quota checkpoint cover this item", overriding the filesystem. */
	readonly checkpoint?: boolean | null;
	/** How to answer that question when neither the caller nor the item says. Defaults to the
	 *  checkpoint file the agent runner writes. */
	readonly coversIssue?: (issueNumber: number) => boolean;
}

/** One projected single-select field value on a board item. */
interface FieldValueProjection {
	readonly name?: string | null;
	readonly optionId?: string | null;
	readonly field?: { readonly name?: string | null } | null;
}

/** The `fieldValues` connection a GraphQL board item carries. */
export interface FieldValueConnection {
	readonly nodes?: readonly FieldValueProjection[] | null;
}

/** Labels that mean "this item lost to a newer one", whether it is open or closed. */
const SUPERSEDED_LABELS: ReadonlySet<string> = new Set(["superseded", "duplicate"]);

/** `state_reason` spellings that mean the item was closed without being implemented. */
const NOT_PLANNED_REASONS: ReadonlySet<string> = new Set(["not_planned", "not-planned"]);

/** The facts the decision tree reads, normalised once so the branches stay readable. */
interface ItemFacts {
	readonly isPr: boolean;
	readonly isMerged: boolean;
	readonly isClosed: boolean;
	readonly stateReason: string | null;
	readonly checkpoint: boolean;
	readonly labels: ReadonlySet<string>;
	readonly boundPrMerged: boolean;
	readonly boundPrReady: boolean;
}

/** The label list, whether it arrived as a list or as the GraphQL `nodes` wrapper. */
function labelList(labels: LabelListSource): readonly LabelSource[] {
	if (!labels) return [];
	if (isLabelConnection(labels)) return labels.nodes ?? [];
	return labels;
}

/** Label names, trimmed, skipping the ones that carry no name. */
function labelNames(labels: LabelListSource): string[] {
	const list = labelList(labels);
	const names: string[] = [];
	for (const label of list) {
		const name = typeof label === "string" ? label : label?.name;
		if (name) names.push(name.trim());
	}
	return names;
}

/** Whether a value is a plain object, which is how the REST `pull_request` marker arrives. */
function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Lower-cased, trimmed text of a possibly-absent string field. */
function normalized(value: string | null | undefined): string {
	return (value ?? "").trim().toLowerCase();
}

/** An issue number from whatever the source used for one, or null when it is not a number. */
function issueNumberOf(value: number | string | null | undefined): number | null {
	if (value === undefined || value === null) return null;
	const parsed = Number.parseInt(String(value), 10);
	return Number.isNaN(parsed) ? null : parsed;
}

/** The first candidate that carries at least one entry, mirroring the `or` chain it replaces. */
function firstNonEmpty(
	...candidates: readonly (readonly BoundPullRequest[] | null | undefined)[]
): readonly BoundPullRequest[] {
	for (const candidate of candidates) {
		if (candidate && candidate.length > 0) return candidate;
	}
	return [];
}

/**
 * Whether a current quota checkpoint covers this item.
 *
 * An explicit answer - from the caller or carried on the item - is believed. Otherwise only an issue
 * is looked up on disk, because a quota pause is recorded per issue; a pull request never is.
 */
function readCheckpoint(item: BoardItem, isPr: boolean, options: ExpectedStatusOptions): boolean {
	if (options.checkpoint !== undefined && options.checkpoint !== null) return Boolean(options.checkpoint);
	if (item.checkpoint !== undefined && item.checkpoint !== null) return Boolean(item.checkpoint);
	const number = issueNumberOf(item.number ?? item.issue_number);
	if (number === null || isPr) return false;
	return (options.coversIssue ?? checkpointCoversIssue)(number);
}

/**
 * Normalises one item into the facts the decision tree branches on.
 *
 * `isPr` is deliberately forgiving about how a source says it - an explicit flag, a REST
 * `pull_request` marker, or a GraphQL `__typename` - because a pull request projected as an issue
 * reaches `ToDo`, the one status that means "approved and idle", which would be a lie.
 */
function readFacts(item: BoardItem, options: ExpectedStatusOptions): ItemFacts {
	const kind = normalized(item.kind ?? item.type ?? item.__typename);
	const state = normalized(item.state);
	const pullRequest = asRecord(item.pull_request);
	const isPr = Boolean(item.is_pr || item.isPr || item.pull_request || kind === "pullrequest" || kind === "pr");
	const isMerged = Boolean(
		item.merged || item.merged_at || item.mergedAt || pullRequest?.merged_at || state === "merged",
	);
	const reason = item.state_reason || item.stateReason;

	let boundPrMerged = false;
	let boundPrReady = false;
	for (const pr of firstNonEmpty(options.boundPrs, item.bound_prs, item.bound_pr_states)) {
		const prState = normalized(pr.state);
		if (pr.merged || pr.merged_at || pr.mergedAt || prState === "merged") {
			boundPrMerged = true;
		} else if (prState === "open" && !pr.draft && !pr.is_draft && !pr.isDraft) {
			boundPrReady = true;
		}
	}

	return {
		isPr,
		isMerged,
		isClosed: state === "closed" || state === "merged" || isMerged || Boolean(item.closed),
		stateReason: reason ? normalized(reason) : null,
		checkpoint: readCheckpoint(item, isPr, options),
		labels: new Set(labelNames(item.labels ?? null).map((name) => name.toLowerCase())),
		boundPrMerged,
		boundPrReady,
	};
}

/** Whether the item says, by label or by state reason, that it lost to a newer one. */
function isSuperseded(facts: ItemFacts): boolean {
	if (facts.stateReason === "duplicate" || facts.stateReason === "superseded") return true;
	return [...facts.labels].some((label) => SUPERSEDED_LABELS.has(label));
}

/** Whether the item says, by label or by state reason, that it was closed unimplemented. */
function hasDropped(facts: ItemFacts): boolean {
	if (facts.stateReason !== null && NOT_PLANNED_REASONS.has(facts.stateReason)) return true;
	return facts.labels.has("dropped");
}

/**
 * The canonical board status of an issue or pull request, derived from live facts.
 *
 * The order below is the whole rule, and it is deliberately closed-before-open:
 *
 * - A closed item is terminal. A merged pull request is `Done`; one closed unmerged is `Dropped`,
 *   unless it says it was superseded. A closed issue is `Done` when something implemented it - a
 *   merged pull request, a completed state reason, or a `Done` label - and `Dropped` otherwise.
 *   Nothing an open item's labels say can keep a closed item out of this branch, which is what
 *   stopped a closed issue reading `In Progress` on the board.
 * - An open item is never terminal. A quota checkpoint or a `Blocked` label is `Blocked`; an open
 *   pull request, or an issue with work bound to it, is `In Progress`; a `Backlog` label is
 *   `Backlog`; everything else is `ToDo`.
 *
 * The final `ToDo` is the honest default and the weakest part of the projection: an unrecognised
 * open item reads `ToDo`, the column meaning "approved and ready to be worked on", so an item no
 * rule recognises claims an approval it was never given. That defect is real and is not repaired
 * here, because repairing it changes what every unlabelled open issue reads on the next run.
 */
export function expectedStatus(item: BoardItem, options: ExpectedStatusOptions = {}): CanonicalStatus {
	const facts = readFacts(item, options);

	if (facts.isClosed) {
		if (facts.isPr) {
			if (facts.isMerged) return "Done";
			return isSuperseded(facts) ? "Superseded" : "Dropped";
		}
		if (facts.isMerged || facts.boundPrMerged) return "Done";
		if (isSuperseded(facts)) return "Superseded";
		if (hasDropped(facts)) return "Dropped";
		if (facts.stateReason === "completed") return "Done";
		if (facts.labels.has("done")) return "Done";
		if (facts.labels.has("dropped")) return "Dropped";
		if (facts.labels.has("superseded")) return "Superseded";
		return "Dropped";
	}

	if (facts.checkpoint || facts.labels.has("blocked")) return "Blocked";
	if (facts.isPr) return "In Progress";
	if (facts.boundPrReady || facts.labels.has("in progress")) return "In Progress";
	if (facts.labels.has("backlog")) return "Backlog";
	return "ToDo";
}

/**
 * The status a set of labels implies for an item, without the rest of its facts.
 *
 * A projection from labels alone, for callers that hold nothing else - a board listing, a label
 * event. It reads through `expectedStatus` rather than reimplementing it, so the two cannot disagree.
 */
export function determineStatusFromLabels(labels: LabelListSource, closed = false): CanonicalStatus {
	return expectedStatus({ labels, state: closed ? "closed" : "open" });
}

/**
 * The status a closed item should hold, or null when it is still open.
 *
 * A closed item's status is a fact the board has to agree with, not a judgement to preserve: an open
 * item's status is exactly the judgement the board exists to record, so it is never overridden from
 * the outside. An item closed with nothing to say it was implemented settles as `Dropped` rather
 * than being skipped, because a closed issue still showing `In Progress` is the drift this exists to
 * repair.
 */
export function settledStatus(
	closed: boolean,
	merged: boolean,
	labels: LabelListSource,
	stateReason?: string | null,
): CanonicalStatus | null {
	if (!closed) return null;
	return expectedStatus({ state: "closed", merged, labels, state_reason: stateReason });
}

/** The Status field value a board item currently holds, read from its projected field values. */
export function statusOfFieldValues(fieldValues: FieldValueConnection | null | undefined): string | null {
	for (const value of fieldValues?.nodes ?? []) {
		if (value.field?.name === STATUS_FIELD_NAME) return value.name ?? null;
	}
	return null;
}
