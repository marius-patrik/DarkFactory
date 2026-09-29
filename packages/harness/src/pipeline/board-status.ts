/**
 * The item-state half of `block_entity` and `unblock_entity`.
 *
 * Ported from `update_project_status_blocked`/`unblock_entity` in `.github/scripts/agent_runner.py`.
 * Each of those is two operations, and only one of them is GitHub I/O: the `Blocked` label, which
 * {@link blockEntity} and {@link unblockEntity} perform through the pipeline's own port, and the
 * project board's status column, which belongs to a different subsystem and arrives here as
 * {@link BoardStatus}.
 *
 * Neither half is ever fatal. The Python caught every exception in both and printed a notice, and a
 * run that cannot reach the board has still labelled the item it stopped on.
 */

import type { PipelineIo } from "./pipeline-io.ts";
import { errorMessage } from "./pipeline-io.ts";

/** The label that marks an item the pipeline has stopped on. */
const BLOCKED_LABEL = "Blocked";

/** The status an unblocked item returns to. Alignment is not completion, so this is not `Done`. */
export const IN_PROGRESS_STATUS = "In Progress";

/** An issue or a pull request, as the board addresses it. */
export interface BoardEntity {
	/** The issue or pull request number. */
	number: number;
	/** Whether the entity is a pull request; the board addresses the two by different URLs. */
	isPr: boolean;
}

/**
 * Moves an item on the project board.
 *
 * @param entity - The item to move.
 * @param status - The status column to put it in.
 */
export type BoardStatus = (entity: BoardEntity, status: string) => void;

/** What the entity-state helpers need, without depending on the whole handler context. */
export interface EntityStatePort {
	/** The GitHub port, for the `Blocked` label. */
	io: Pick<PipelineIo, "changeLabels">;
	/** The project board port. */
	board: BoardStatus;
	/** Where the Python's failure notices went. */
	warn: (message: string) => void;
}

/** Which way an item's blocked state moves. */
interface StateChange {
	/** Whether the `Blocked` label goes on or comes off. */
	add: boolean;
	/** The board column the item moves to. */
	status: string;
	/** The notice the Python printed when the label could not be changed. */
	labelNotice: string;
}

/**
 * Mark an item blocked, and move it to the board's `Blocked` column.
 *
 * @param port - The GitHub port, the board port, and where notices go.
 * @param repo - Repository slug, `owner/name`.
 * @param number - The issue or pull request number.
 * @param isPr - Whether the entity is a pull request.
 */
export function blockEntity(port: EntityStatePort, repo: string, number: number, isPr: boolean): void {
	applyEntityState(port, repo, number, isPr, {
		add: true,
		status: "Blocked",
		labelNotice: "Notice: Failed to add Blocked label",
	});
}

/**
 * Mark an item unblocked, and move it to the board's given column.
 *
 * @param port - The GitHub port, the board port, and where notices go.
 * @param repo - Repository slug, `owner/name`.
 * @param number - The issue or pull request number.
 * @param isPr - Whether the entity is a pull request.
 * @param targetStatus - The column to move it to; the pipeline's own default is `In Progress`.
 */
export function unblockEntity(
	port: EntityStatePort,
	repo: string,
	number: number,
	isPr: boolean,
	targetStatus: string = IN_PROGRESS_STATUS,
): void {
	applyEntityState(port, repo, number, isPr, {
		add: false,
		status: targetStatus,
		labelNotice: "Notice: Failed to remove Blocked label",
	});
}

/**
 * Change an item's blocked state on both surfaces.
 *
 * The label and the board are changed independently and each failure is reported on its own, which
 * is what the Python did: a run that could not reach the board had still labelled the item.
 */
function applyEntityState(
	port: EntityStatePort,
	repo: string,
	number: number,
	isPr: boolean,
	change: StateChange,
): void {
	try {
		port.io.changeLabels(repo, number, { add: change.add, labels: [BLOCKED_LABEL] });
	} catch (error) {
		port.warn(`${change.labelNotice}: ${errorMessage(error)}`);
	}
	try {
		port.board({ number, isPr }, change.status);
	} catch (error) {
		port.warn(`Notice: Failed to update project status: ${errorMessage(error)}`);
	}
}
