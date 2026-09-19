/** @packageDocumentation
 * Composed df CLI surface.
 *
 * The executable implementation remains in the temporary harness only for the #420 migration and is removed by the
 * later CLI/cutover work. Consumers can already address it through the final package identity.
 */
export {
	executableChainFor,
	exitCodeFor,
	main,
	parseDurationMs,
	redactToolInput,
} from "../../../harness/src/cli.ts";
