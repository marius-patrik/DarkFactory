/** @packageDocumentation
 * Compatibility re-exports for result capture mechanisms now owned by `@darkfactory/protocol` and `@darkfactory/core`.
 */

export {
	CAPTURE_TOOL_NAME,
	type CaptureCodeResultOptions,
	type CaptureToolDefinition,
	type CodeWorkspaceOperations,
	type CommitIdentityData,
	captureCodeResult,
	captureContext,
	captureTool,
	type ExtractJudgementOptions,
	extractJudgementResult,
	forceCaptureTool,
	type JudgementSupervisor,
	readCapture,
	registerWorkspaceOperations,
} from "../../../packages/core/src/result-capture.ts";
export {
	type AlignmentResultData,
	alignmentResultSchema,
	CAPTURE_SCHEMAS,
	type CaptureAttempt,
	CaptureError,
	type CodeNodeResult,
	captureJsonSchema,
	type ExtractedJudgement,
	getCaptureSchema,
	listCaptureSchemas,
	type PlanningResultData,
	planningResultSchema,
	type ReviewFindingData,
	type ReviewResultData,
	reviewFindingSchema,
	reviewResultSchema,
	validateCaptureSchema,
} from "../../../packages/protocol/src/result-capture.ts";

import { registerWorkspaceOperations } from "../../../packages/core/src/result-capture.ts";
import { changedFiles } from "../workspace/changedFiles.ts";
import { commitChunk } from "../workspace/commitChunk.ts";
import { runDetectedVerification } from "../workspace/runVerify.ts";
import { scopeCheck } from "../workspace/scopeCheck.ts";

registerWorkspaceOperations({
	changedFiles,
	scopeCheck,
	runDetectedVerification,
	commitChunk,
});
