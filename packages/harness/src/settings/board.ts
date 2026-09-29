/** @packageDocumentation
 * Reconciling a project board's Status column with the canonical taxonomy.
 *
 * The decisions here are separated from the transport on purpose. A Projects v2 board can only be
 * rewritten through a GraphQL mutation that replaces the option set wholesale, and the two ways that
 * can go wrong - concluding a board is missing when the listing merely failed to read, and deleting
 * columns somebody added by hand - are both decided before any request is sent. Both have already
 * cost somebody something: a timeout during a reconcile produced a duplicate `Global` board that then
 * appeared in two repositories' Projects tabs.
 */

import type { CanonicalStatus } from "../../../protocol/src/workflow.ts";
import { STATUS_OPTIONS, statusPresentation } from "./taxonomy.ts";

/** One option of a Projects v2 single-select field. */
interface BoardStatusOption {
	name: string;
	color: string;
	description: string;
}

/**
 * The option name a board may already carry from before the taxonomy settled on `ToDo`.
 *
 * GitHub's Projects v2 is created with a default `Todo` option, so every board ever made by hand
 * has it. It is treated as absent rather than as a custom column, because rewriting the option set
 * is exactly what removes it and refusing on that ground would block every board that was ever
 * created in the UI.
 */
export const LEGACY_TODO_OPTION = "Todo";

/** The mutation that rewrites a Status field's options, matching survivors by name. */
const STATUS_OPTION_MUTATION =
	"mutation($fieldId:ID!,$options:[ProjectV2SingleSelectFieldInput!])" +
	"{updateProjectV2Field(input:{fieldId:$fieldId,singleSelectOptions:$options})" +
	"{projectV2Field{... on ProjectV2SingleSelectField{options{name}}}}}";

/**
 * The option set a board's Status field should carry.
 *
 * @returns One option per canonical status, in board column order.
 */
export function boardStatusOptions(): BoardStatusOption[] {
	return STATUS_OPTIONS.map((status) => {
		const presentation = statusPresentation(status);
		return { name: status, color: presentation.boardColour, description: presentation.description };
	});
}

/**
 * Whether a board's Status field already carries the canonical options.
 *
 * Order matters: the columns are laid out in taxonomy order, so a board carrying the right options
 * in the wrong order is a board a human arranged deliberately and is left alone.
 *
 * @param existing Option names currently on the field, in column order.
 * @returns `true` when a rewrite would change nothing.
 */
export function statusOptionsMatch(existing: readonly string[]): boolean {
	return existing.length === STATUS_OPTIONS.length && existing.every((name, index) => name === STATUS_OPTIONS[index]);
}

/**
 * The columns a rewrite would delete, and which is why the rewrite is refused.
 *
 * A single-select field is replaced wholesale, so an option this taxonomy does not name takes every
 * item sitting in that column with it. That is data loss, and it is not recoverable from here.
 *
 * @param existing Option names currently on the field, in column order.
 * @returns The names that are neither canonical nor the legacy default; empty when a rewrite is safe.
 */
export function customStatusOptions(existing: readonly string[]): string[] {
	const canonical = new Set<string>(STATUS_OPTIONS);
	return existing.filter((name) => !canonical.has(name) && name !== LEGACY_TODO_OPTION);
}

/**
 * The GraphQL request body that sets a Status field's options.
 *
 * @param fieldId Node id of the Status field.
 * @returns The query and the variables to send through `gh api graphql --input -`.
 */
export function statusOptionPayload(fieldId: string): {
	query: string;
	variables: { fieldId: string; options: BoardStatusOption[] };
} {
	return { query: STATUS_OPTION_MUTATION, variables: { fieldId, options: boardStatusOptions() } };
}

/**
 * The order the surviving options were written back in, read from a mutation response.
 *
 * A rewrite matches survivors by name so items already in a retained column keep their status, which
 * means the response is the only trustworthy report of what the board now holds.
 *
 * @param response The decoded `data` object returned by the mutation.
 * @returns The option names now on the field, in column order.
 */
export function appliedStatusOptions(response: unknown): string[] {
	const options = (
		response as {
			updateProjectV2Field?: { projectV2Field?: { options?: { name?: unknown }[] } };
		}
	)?.updateProjectV2Field?.projectV2Field?.options;
	if (!Array.isArray(options)) return [];
	return options.map((entry) => (typeof entry?.name === "string" ? entry.name : ""));
}

/** The names this taxonomy will write, typed as statuses rather than as loose strings. */
function canonicalStatusNames(): CanonicalStatus[] {
	return [...STATUS_OPTIONS];
}
