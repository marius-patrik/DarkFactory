/** @packageDocumentation
 * Public `df` command and operator-surface package boundary.
 *
 * The `df` entrypoint itself (`main`, `exitCodeFor`, `executableChainFor`, `parseDurationMs`,
 * `redactToolInput`) is implemented in `harness/src/cli.ts` and forwarded from here. That is a
 * DF-RULE-017 violation — a final package forwarding implementation to the deletion-bound tree — and
 * it is the one remaining package-to-harness edge in the repository.
 *
 * It is recorded rather than fixed because the implementation cannot move before the harness is
 * relocated: `harness/src/cli.ts` is 1,694 lines and closes over most of the harness tree, so
 * extracting it is the relocation, not a refactor. `harness/src/workspace-boundaries.test.ts` names
 * this file in a migration ledger that fails when the edge disappears, so landing the relocation
 * turns the ledger entry into a test failure that has to be deleted in the same change.
 *
 * The direction harness -> package is the sanctioned one and is not restricted: harness reaches
 * `@darkfactory/cli/capture-schema` and the other packages through declared workspace dependencies.
 */
export {
	executableChainFor,
	exitCodeFor,
	main,
	parseDurationMs,
	redactToolInput,
} from "../../../harness/src/cli.ts";
export * from "./capture-schema.ts";
export * from "./registry.ts";
