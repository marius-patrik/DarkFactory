/** @packageDocumentation
 * Compatibility re-exports for result capture mechanisms now owned by `@darkfactory/protocol` and `@darkfactory/core`.
 */
export {
	CAPTURE_SCHEMAS,
	CaptureError,
	alignmentResultSchema,
	captureJsonSchema,
	getCaptureSchema,
	listCaptureSchemas,
	planningResultSchema,
	reviewFindingSchema,
	reviewResultSchema,
	validateCaptureSchema,
	type AlignmentResultData,
	type CaptureAttempt,
	type CodeNodeResult,
	type ExtractedJudgement,
	type PlanningResultData,
	type ReviewFindingData,
	type ReviewResultData,
} from "../../../packages/protocol/src/result-capture.ts";

export {
	CAPTURE_TOOL_NAME,
	captureCodeResult,
	captureContext,
	captureTool,
	extractJudgementResult,
	forceCaptureTool,
	readCapture,
	registerWorkspaceOperations,
	type CaptureCodeResultOptions,
	type CaptureToolDefinition,
	type CodeWorkspaceOperations,
	type CommitIdentityData,
	type ExtractJudgementOptions,
	type JudgementSupervisor,
} from "../../../packages/core/src/result-capture.ts";

import { changedFiles } from "../workspace/changedFiles.ts";
import { commitChunk } from "../workspace/commitChunk.ts";
import { runDetectedVerification } from "../workspace/runVerify.ts";
import { scopeCheck } from "../workspace/scopeCheck.ts";
import { registerWorkspaceOperations } from "../../../packages/core/src/result-capture.ts";

registerWorkspaceOperations({
	changedFiles,
	scopeCheck,
	runDetectedVerification,
	commitChunk,
});
