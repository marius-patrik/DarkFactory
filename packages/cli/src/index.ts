/** @packageDocumentation
 * Public `df` command and operator-surface package boundary.
 *
 * The `df` entrypoint itself (`main`, `exitCodeFor`, `executableChainFor`, `parseDurationMs`,
 * `redactToolInput`) is implemented in `@darkfactory/harness` (`src/cli.ts`) and forwarded from
 * here. That is a DF-RULE-017 violation — a final package forwarding implementation to the
 * deletion-bound tree — and it is the one remaining package-to-harness edge in the repository.
 *
 * It is recorded rather than fixed because the implementation cannot move into this package:
 * `src/cli.ts` is 1,693 lines, closes over most of the runtime tree, and imports
 * `@darkfactory/cli/capture-schema`, so moving it here would close a `cli` <-> `harness`
 * dependency cycle. `test/workspace-boundaries.test.ts` names this file in a migration ledger that
 * fails when the edge disappears.
 *
 * The direction harness -> package is the sanctioned one and is not restricted: the runtime reaches
 * `@darkfactory/cli/capture-schema` and the other packages through declared workspace dependencies.
 */
export {
	executableChainFor,
	exitCodeFor,
	main,
	parseDurationMs,
	redactToolInput,
} from "../../harness/src/cli.ts";
export * from "./capture-schema.ts";
export * from "./registry.ts";
