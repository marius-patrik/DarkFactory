/** @packageDocumentation
 * DarkFactory execution kernel: configuration, workflow graph/run state, routing mechanisms and deterministic orchestration primitives.
 */
export * from "../../../harness/src/config.ts";
export * from "../../../harness/src/graph/index.ts";
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
export * from "./repository-evidence.ts";
export * from "./result-capture.ts";

import { changedFiles } from "../../../harness/src/workspace/changedFiles.ts";
import { commitChunk } from "../../../harness/src/workspace/commitChunk.ts";
import { runDetectedVerification } from "../../../harness/src/workspace/runVerify.ts";
import { scopeCheck } from "../../../harness/src/workspace/scopeCheck.ts";
import { registerWorkspaceOperations } from "./result-capture.ts";

registerWorkspaceOperations({
	changedFiles,
	scopeCheck,
	runDetectedVerification,
	commitChunk,
});

