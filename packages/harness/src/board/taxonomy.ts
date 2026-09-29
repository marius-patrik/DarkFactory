import { CANONICAL_STATUSES, type CanonicalStatus } from "../../../protocol/src/workflow.ts";

/**
 * The board's status taxonomy, and the labels that project it.
 *
 * The seven statuses are the repository's, declared once in `@darkfactory/protocol/workflow` because
 * the workflow graph names them too. Everything here is derived from that one list so the board, the
 * labels and the graph cannot drift apart.
 *
 * Rule 009 makes `expectedStatus` *exclusive*: an item holds exactly one status. The order of
 * `CANONICAL_STATUSES` is the board's column order and is significant.
 */

/** The single-select field the board projects status into. */
export const STATUS_FIELD_NAME = "Status";

/** The seven canonical statuses, in board column order. */
export const STATUS_NAMES: readonly CanonicalStatus[] = CANONICAL_STATUSES;

/** The statuses an item can never leave once it holds one. */
export const TERMINAL_STATUSES: ReadonlySet<CanonicalStatus> = new Set<CanonicalStatus>([
	"Done",
	"Dropped",
	"Superseded",
]);

/**
 * Labels that name a lifecycle status rather than a type or an area.
 *
 * Automation owns these exclusively: applying one removes the others, and nothing else may add or
 * remove them. That exclusivity is the reason `setStatusLabel` adds by POST and deletes the rest
 * rather than replacing the label set.
 */
export const STATUS_LABELS: ReadonlySet<string> = new Set<string>(CANONICAL_STATUSES);

/**
 * One status option as the Projects v2 Status field declares it.
 *
 * `name` is a plain string, not a `CanonicalStatus`: the vocabulary is declared per repository, so a
 * status outside the canonical seven is a value this type has to be able to carry. The canonical seven
 * remain the default, not the constraint.
 */
export interface CanonicalStatusOption {
	readonly name: string;
	readonly color: string;
	readonly description: string;
}

/**
 * The canonical Status field options, enforced onto every linked board on every run.
 *
 * Enforcement is programmatic rather than manual so no board can drift: a board rebuilt in the UI
 * with a missing column is repaired on the next automation run instead of silently mapping issues
 * onto a lossy substitute.
 */
export const CANONICAL_STATUS_OPTIONS: readonly CanonicalStatusOption[] = [
	{ name: "Backlog", color: "PURPLE", description: "Staged for future consideration" },
	{ name: "ToDo", color: "GREEN", description: "Approved and ready to be worked on" },
	{ name: "In Progress", color: "YELLOW", description: "Work is actively in progress" },
	{ name: "Blocked", color: "ORANGE", description: "Blocked by dependencies, externals, or agent quota" },
	{ name: "Done", color: "BLUE", description: "Completed and verified" },
	{ name: "Superseded", color: "GRAY", description: "Outranked by a newer request or plan" },
	{ name: "Dropped", color: "RED", description: "Closed without implementation or abandoned" },
];

/**
 * The Status field options for a declared vocabulary, in that order.
 *
 * The presentation of a status is the table above; the *order and membership* are data, read from
 * the repository's declaration. A name the presentation table does not know still gets a column, with
 * a neutral description, because dropping a declared status would leave the items in it unreachable —
 * the projection can produce any status the repository declares.
 */
export function statusOptionsFor(names: readonly string[]): readonly CanonicalStatusOption[] {
	return names.map((name) => {
		const known = CANONICAL_STATUS_OPTIONS.find((option) => option.name === name);
		return known ?? { name, color: "GRAY", description: `${name} (declared by this repository)` };
	});
}

/** Whether a label is one automation owns as a status. */
export function isStatusLabel(name: string): boolean {
	return STATUS_LABELS.has(name);
}

/** Whether a status is one an item never leaves. */
export function isTerminalStatus(name: string): name is CanonicalStatus {
	return TERMINAL_STATUSES.has(name as CanonicalStatus);
}
