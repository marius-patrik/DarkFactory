/** @packageDocumentation
 * DarkFactory execution kernel: configuration, workflow graph/run state, routing mechanisms and deterministic orchestration primitives.
 */
export * from "../../../harness/src/config.ts";
export * from "../../../harness/src/graph/index.ts";
export * from "../../../harness/src/evidence/detector.ts";
export * from "../../../harness/src/evidence/capabilities.ts";
export {
	ChainExhaustedError,
	FailoverSupervisor,
	MaxTurnsError,
	RunTimeoutError,
	createFailoverSupervisor,
} from "../../../harness/src/harness/supervisor.ts";
export type {
	CandidateFailureReason,
	CreateSupervisorOptions,
	HarnessEvent,
	HarnessStepEvent,
	RunDeadline,
	SupervisorOptions,
} from "../../../harness/src/harness/supervisor.ts";
