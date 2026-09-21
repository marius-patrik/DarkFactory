import { z } from "zod";

/** Token usage metadata for an extraction turn. */
export interface ExtractionUsage {
	/** Input prompt tokens. */
	input?: number;
	/** Output completion tokens. */
	output?: number;
	/** Cached prompt read tokens. */
	cacheRead?: number;
	/** Cached prompt write tokens. */
	cacheWrite?: number;
	/** Total tokens consumed. */
	totalTokens?: number;
}

/** Record of a failed extraction attempt on a candidate. */
export interface CaptureAttempt {
	/** Model identifier that failed extraction. */
	model: string;
	/** Provider name for the candidate. */
	provider?: string;
	/** Account name for the candidate. */
	account?: string;
	/** Error description or failure reason. */
	error: string;
}

/** Thrown when all extraction attempts fail to produce a validated result. */
export class CaptureError extends Error {
	/** Prior failed candidate attempts. */
	readonly attempts: readonly CaptureAttempt[];

	constructor(attempts: readonly CaptureAttempt[]) {
		super(`All capture candidates failed (${attempts.length} attempts)`);
		this.name = "CaptureError";
		this.attempts = attempts;
	}
}

/** Result of extracting structured judgement from model prose. */
export interface ExtractedJudgement<T> {
	/** Validated structured data value. */
	value: T;
	/** Model that produced the winning output. */
	model: string;
	/** Provider that handled the winning call. */
	provider: string;
	/** Account used for the winning call. */
	account: string;
	/** Token usage recorded for the winning call. */
	usage?: ExtractionUsage | null;
	/** Prior failed extraction attempts before this success. */
	attempts: CaptureAttempt[];
}

/** Scope check verification result summary. */
export interface ScopeCheckResultSummary {
	/** Every changed path, repository-relative with forward slashes, sorted. */
	changed: string[];
	/** Files modified outside allowed patterns. */
	outside: string[];
	/** Required test files that were untouched. */
	untouchedTests: string[];
}

/** Verification action result summary. */
export interface VerificationActionResultSummary {
	/** Name or kind of verification action. */
	action: { kind: string; command?: string };
	/** Execution result if action ran. */
	result?: { exitCode: number; timedOut?: boolean };
}

/** Authoritative result of a code node derived from deterministic workspace evidence. */
export interface CodeNodeResult {
	/** Node outcome based on evidence. */
	outcome: "success" | "failure";
	/** Files changed in the worktree. */
	changedFiles: string[];
	/** Detailed scope check outcome if patterns were specified. */
	scopeCheck?: ScopeCheckResultSummary;
	/** Detected verification actions and execution results. */
	verification: VerificationActionResultSummary[];
	/** SHA of the created commit, if changes were committed. */
	commitSha?: string | null;
	/** Explanation if the code node failed verification or scope check. */
	error?: string;
}

/** Schema for a review finding. */
export const reviewFindingSchema = z.object({
	id: z.string(),
	category: z.string(),
	severity: z.enum(["info", "warning", "error"]),
	message: z.string(),
	evidence: z.string().optional(),
	location: z.string().optional(),
	remediation: z.string().optional(),
});

/** Inferred type for a validated review finding. */
export type ReviewFindingData = z.infer<typeof reviewFindingSchema>;

/** Schema for review node structured results. */
export const reviewResultSchema = z.object({
	findings: z.array(reviewFindingSchema),
	clean: z.boolean(),
	deviation_detected: z.boolean().optional(),
});

/** Inferred type for a validated review result. */
export type ReviewResultData = z.infer<typeof reviewResultSchema>;

/** Schema for planning node structured results. */
export const planningResultSchema = z.object({
	summary: z.string(),
	approach: z.string(),
	dependencies: z.array(z.string()).optional(),
	verification_plan: z.string(),
});

/** Inferred type for a validated planning result. */
export type PlanningResultData = z.infer<typeof planningResultSchema>;

/** Schema for plan alignment structured results. */
export const alignmentResultSchema = z.object({
	aligned: z.boolean(),
	rationale: z.string(),
	deviations: z.array(z.string()).optional(),
});

/** Inferred type for a validated alignment result. */
export type AlignmentResultData = z.infer<typeof alignmentResultSchema>;

/** Registry of supported capture schemas for inspection and extraction. */
export const CAPTURE_SCHEMAS: Record<string, z.ZodType> = {
	review: reviewResultSchema,
	planning: planningResultSchema,
	alignment: alignmentResultSchema,
};

/**
 * Look up a registered capture schema by name.
 *
 * @param name - Canonical schema name (e.g. "review", "planning", "alignment").
 * @returns The matching Zod schema, or undefined if not registered.
 */
export function getCaptureSchema(name: string): z.ZodType | undefined {
	return CAPTURE_SCHEMAS[name];
}

/**
 * Convert a Zod schema to a JSON schema without the top-level `$schema` key.
 *
 * @param schema - Zod schema to convert.
 * @returns JSON schema dictionary without `$schema`.
 */
export function captureJsonSchema(schema: z.ZodType): Record<string, unknown> {
	const json = (z as unknown as { toJSONSchema: (s: z.ZodType) => unknown }).toJSONSchema(schema) as Record<
		string,
		unknown
	>;
	if (json && typeof json === "object") {
		const clone = { ...json };
		delete clone.$schema;
		return clone;
	}
	return {};
}

/**
 * Validate a value against a Zod schema.
 *
 * @param schema - Target schema (must have safeParse).
 * @param value - Value to validate.
 * @returns True if value conforms to schema, false otherwise.
 * @throws Error if schema is not a valid Zod schema.
 */
export function validateCaptureSchema(schema: unknown, value: unknown): boolean {
	if (typeof (schema as any)?.safeParse !== "function") {
		throw new Error("Provided schema is not a Zod schema");
	}
	return (schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse(value).success;
}

/**
 * List all registered capture schemas with their JSON schema representations.
 *
 * @returns Mapping of schema names to JSON schema definitions.
 */
export function listCaptureSchemas(): Record<string, Record<string, unknown>> {
	const result: Record<string, Record<string, unknown>> = {};
	for (const [name, schema] of Object.entries(CAPTURE_SCHEMAS)) {
		result[name] = captureJsonSchema(schema);
	}
	return result;
}
