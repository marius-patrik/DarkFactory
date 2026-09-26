/** @packageDocumentation
 * Public `df` command and operator-surface package boundary.
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
