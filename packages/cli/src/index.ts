/** @packageDocumentation
 * Operator-facing CLI entrypoints and public command contracts.
 * The CLI dispatches commands; the harness owns the underlying runtime.
 */
export {
	executableChainFor,
	exitCodeFor,
	main,
	parseDurationMs,
	redactToolInput,
} from "./cli.ts";
export * from "./capture-schema.ts";
export * from "./registry.ts";
