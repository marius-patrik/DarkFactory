import type { AssistantMessage, Context } from "@earendil-works/pi-ai";
import { z } from "zod";
import type { Candidate } from "@darkfactory/protocol/model";
import {
	CaptureError,
	type CaptureAttempt,
	type ExtractedJudgement,
	type CodeNodeResult,
	type ScopeCheckResultSummary,
	type VerificationActionResultSummary,
	captureJsonSchema,
	validateCaptureSchema,
} from "@darkfactory/protocol/result-capture";
/** Supervisor capability required for structured judgement extraction. */
export interface JudgementSupervisor {
	extractJudgement<T>(options: {
		answer: string;
		schema: z.ZodType<T>;
		budget?: { deadlineAt: number; budgetMs: number; startedAt: number };
	}): Promise<ExtractedJudgement<T>>;
}

/** Commit author and committer identity. */
export interface CommitIdentityData {
	name: string;
	email: string;
}

/** Workspace operations used by captureCodeResult. */
export interface CodeWorkspaceOperations {
	changedFiles(worktree: string): Promise<string[]>;
	scopeCheck?(
		worktree: string,
		allowedPatterns: readonly string[],
		requiredTests: readonly string[],
	): Promise<ScopeCheckResultSummary>;
	runDetectedVerification(options: {
		repoDir: string;
		changedFiles: string[];
		capabilitiesRoot?: string;
		timeoutMs?: number;
	}): Promise<VerificationActionResultSummary[]>;
	commitChunk?(options: {
		worktree: string;
		message: string;
		identity: CommitIdentityData;
	}): Promise<string | null>;
}

let defaultWorkspaceOperations: CodeWorkspaceOperations | undefined;

/**
 * Register default workspace operations for code-node truth derivation.
 *
 * @param ops - Workspace operations implementation.
 */
export function registerWorkspaceOperations(ops: CodeWorkspaceOperations): void {
	defaultWorkspaceOperations = ops;
}

export {
	CAPTURE_SCHEMAS,
	CaptureError,
	type CaptureAttempt,
	type ExtractedJudgement,
	type CodeNodeResult,
	type ReviewFindingData,
	type ReviewResultData,
	type PlanningResultData,
	type AlignmentResultData,
	captureJsonSchema,
	getCaptureSchema,
	listCaptureSchemas,
	planningResultSchema,
	alignmentResultSchema,
	reviewFindingSchema,
	reviewResultSchema,
	validateCaptureSchema,
} from "@darkfactory/protocol/result-capture";

/** Canonical name of the capture tool used for structured extraction. */
export const CAPTURE_TOOL_NAME = "capture";

/** Definition of the capture tool provided to model contexts. */
export interface CaptureToolDefinition {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
	constrainedSampling?: { type: "json_schema"; strict: "prefer" };
}

/**
 * Construct a capture tool with the given JSON schema.
 *
 * @param jsonSchema - The JSON schema describing the expected result.
 * @returns A capture tool definition ready for model contexts.
 */
export function captureTool(jsonSchema: Record<string, unknown>): CaptureToolDefinition {
	return {
		name: CAPTURE_TOOL_NAME,
		description: "Record the result extracted from the answer.",
		parameters: jsonSchema,
		constrainedSampling: { type: "json_schema", strict: "prefer" },
	};
}

/**
 * Build a context that asks the model to extract a result from the answer
 * by calling the capture tool exactly once.
 *
 * @param answer - The answer text to be processed.
 * @param jsonSchema - The schema for the capture tool.
 * @returns A model context ready for a model request.
 */
export function captureContext(answer: string, jsonSchema: Record<string, unknown>): Context {
	const systemPrompt =
		"extract the result from the user's message by calling the capture tool exactly once, using only information stated in the message.";
	return {
		systemPrompt,
		messages: [
			{
				role: "user",
				content: answer,
				timestamp: Date.now(),
			},
		],
		tools: [captureTool(jsonSchema) as any],
	};
}

/**
 * Return a new payload that forces the use of the capture tool for the given
 * provider dialect. The original payload is never mutated.
 *
 * @param dialect - The provider dialect string.
 * @param payload - The original request payload.
 * @returns A new payload with the appropriate `tool_choice` set, or the
 *          original payload unchanged when the dialect does not require a
 *          forced capture tool.
 */
export function forceCaptureTool(dialect: string, payload: unknown): unknown {
	if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
		return payload;
	}
	const original = payload as Record<string, unknown>;
	const withKey = (key: string, value: unknown) => ({ ...original, [key]: value });
	switch (dialect) {
		case "openai-completions":
			return withKey("tool_choice", { type: "function", function: { name: CAPTURE_TOOL_NAME } });
		case "openai-responses":
		case "openai-codex-responses":
			return withKey("tool_choice", { type: "function", name: CAPTURE_TOOL_NAME });
		case "anthropic-messages":
			return withKey("tool_choice", { type: "tool", name: CAPTURE_TOOL_NAME });
		case "google-generative-ai": {
			const { model, contents, config } = original;
			const newConfig = {
				...((config as Record<string, unknown>) ?? {}),
				toolConfig: {
					functionCallingConfig: {
						mode: "ANY",
						allowedFunctionNames: [CAPTURE_TOOL_NAME],
					},
				},
			};
			return { model, contents, config: newConfig };
		}
		default:
			return payload;
	}
}

/**
 * Extract the arguments of the first `capture` tool call from an assistant message.
 *
 * @param message - The assistant message to inspect.
 * @returns The arguments object if a capture call is present, otherwise `undefined`.
 */
export function readCapture(message: AssistantMessage): Record<string, unknown> | undefined {
	const anyMsg = message as unknown as Record<string, unknown>;
	const contents = anyMsg.content;
	if (!Array.isArray(contents)) {
		return undefined;
	}
	for (const block of contents) {
		if (
			block &&
			typeof block === "object" &&
			(block as Record<string, unknown>).type === "toolCall" &&
			(block as Record<string, unknown>).name === CAPTURE_TOOL_NAME
		) {
			return (block as Record<string, unknown>).arguments as Record<string, unknown>;
		}
	}
	return undefined;
}

/** Options for extracting judgement from natural prose. */
export interface ExtractJudgementOptions<T> {
	/** Raw natural prose emitted by the model on natural stop. */
	answer: string;
	/** Target Zod schema for structured output. */
	schema: z.ZodType<T>;
	/** Supervisor instance to route and execute the extraction call. */
	supervisor?: JudgementSupervisor;
	/** Direct turn runner for lightweight or mocked extraction without full supervisor. */
	runExtractionTurn?: (candidate: Candidate, context: Context, dialect: string) => Promise<AssistantMessage>;
	/** Candidates to try if a direct runner is used. Required when runExtractionTurn is provided. */
	candidates?: readonly Candidate[];
	/** Stage budget deadline if applicable. */
	budget?: { deadlineAt: number; budgetMs: number; startedAt: number };
}

/**
 * Extract structured judgement from natural model prose using provider-enforced
 * structured output (forced capture tool) routed through light-tier candidates.
 *
 * @param options - Extraction parameters, schema, and supervisor/runner.
 * @returns Parsed and validated result, the winning candidate metadata, and any prior attempts.
 * @throws CaptureError when all candidate attempts fail.
 */
export async function extractJudgementResult<T>(options: ExtractJudgementOptions<T>): Promise<ExtractedJudgement<T>> {
	const { answer, schema, supervisor, runExtractionTurn, candidates, budget } = options;

	if (typeof (schema as any)?.safeParse !== "function") {
		throw new Error("Provided schema is not a Zod schema");
	}

	if (supervisor) {
		return supervisor.extractJudgement({ answer, schema, budget });
	}

	if (runExtractionTurn) {
		if (!candidates || candidates.length === 0) {
			throw new Error("extractJudgementResult with runExtractionTurn requires candidates to be specified");
		}
		const attempts: CaptureAttempt[] = [];
		const jsonSchema = captureJsonSchema(schema);
		const context = captureContext(answer, jsonSchema);

		for (const candidate of candidates) {
			const dialect: string = candidate.provider.includes("google")
				? "google-generative-ai"
				: candidate.provider.includes("anthropic")
					? "anthropic-messages"
					: "openai-responses";
			try {
				const message = await runExtractionTurn(candidate, context, dialect);
				const capture = readCapture(message);
				if (!capture) {
					attempts.push({
						model: candidate.model,
						provider: candidate.provider,
						account: candidate.account,
						error: "no capture tool call",
					});
					continue;
				}
				const parsed = schema.safeParse(capture);
				if (!parsed.success) {
					attempts.push({
						model: candidate.model,
						provider: candidate.provider,
						account: candidate.account,
						error: `schema validation failed: ${parsed.error.message}`,
					});
					continue;
				}
				return {
					value: parsed.data,
					model: candidate.model,
					provider: candidate.provider,
					account: candidate.account,
					usage: message.usage,
					attempts,
				};
			} catch (err) {
				attempts.push({
					model: candidate.model,
					provider: candidate.provider,
					account: candidate.account,
					error: err instanceof Error ? err.message : String(err),
				});
			}
		}
		throw new CaptureError(attempts);
	}

	throw new Error("extractJudgementResult requires either supervisor or runExtractionTurn with candidates");
}

/** Options for evaluating code node truth from engine-observed workspace evidence. */
export interface CaptureCodeResultOptions {
	/** Absolute path to the git worktree. */
	worktree: string;
	/** Allowed glob patterns for modified files (scope check). */
	allowedPatterns?: readonly string[];
	/** Required test files that must be present in the change set. */
	requiredTests?: readonly string[];
	/** Root directory for capabilities discovery. */
	capabilitiesRoot?: string;
	/** Commit message if changes should be committed. */
	commitMessage?: string;
	/** Identity for git commit author and committer. */
	identity?: CommitIdentityData;
	/** Timeout for verification commands in milliseconds. */
	timeoutMs?: number;
	/** Explicit workspace operations to override the default. */
	workspace?: CodeWorkspaceOperations;
}

/**
 * Capture authoritative code node truth from observed workspace state,
 * detected verification actions, and deterministic commit operations.
 *
 * @param options - Worktree path, scope boundaries, and commit metadata.
 * @returns Deterministic {@link CodeNodeResult}.
 */
export async function captureCodeResult(options: CaptureCodeResultOptions): Promise<CodeNodeResult> {
	const ops = options.workspace ?? defaultWorkspaceOperations;
	if (!ops) {
		throw new Error("No workspace operations registered for captureCodeResult");
	}
	const paths = await ops.changedFiles(options.worktree);
	let scopeResult: ScopeCheckResultSummary | undefined;

	if (options.allowedPatterns && options.allowedPatterns.length > 0 && ops.scopeCheck) {
		scopeResult = await ops.scopeCheck(options.worktree, options.allowedPatterns, options.requiredTests ?? []);
		if (scopeResult.outside.length > 0) {
			return {
				outcome: "failure",
				changedFiles: paths,
				scopeCheck: scopeResult,
				verification: [],
				error: `Scope violation: modified files outside allowed patterns: ${scopeResult.outside.join(", ")}`,
			};
		}
		if (scopeResult.untouchedTests.length > 0) {
			return {
				outcome: "failure",
				changedFiles: paths,
				scopeCheck: scopeResult,
				verification: [],
				error: `Required test files untouched: ${scopeResult.untouchedTests.join(", ")}`,
			};
		}
	}

	const verification: VerificationActionResultSummary[] = await ops.runDetectedVerification({
		repoDir: options.worktree,
		changedFiles: paths,
		capabilitiesRoot: options.capabilitiesRoot,
		timeoutMs: options.timeoutMs,
	});

	const failedActions = verification.filter((v) => v.result && (v.result.exitCode !== 0 || v.result.timedOut));
	if (failedActions.length > 0) {
		const errors = failedActions
			.map(
				(f) =>
					`${f.action.command ?? f.action.kind}: exit ${f.result?.exitCode}${f.result?.timedOut ? " (timed out)" : ""}`,
			)
			.join("; ");
		return {
			outcome: "failure",
			changedFiles: paths,
			scopeCheck: scopeResult,
			verification,
			error: `Verification failed: ${errors}`,
		};
	}

	let commitSha: string | null = null;
	if (paths.length > 0 && options.commitMessage && options.identity && ops.commitChunk) {
		commitSha = await ops.commitChunk({
			worktree: options.worktree,
			message: options.commitMessage,
			identity: options.identity,
		});
	}

	return {
		outcome: "success",
		changedFiles: paths,
		scopeCheck: scopeResult,
		verification,
		commitSha,
	};
}
