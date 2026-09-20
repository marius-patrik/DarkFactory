import type { AssistantMessageEventStream, Context, Model, SimpleStreamOptions } from "@earendil-works/pi-ai";
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { captureContext, forceCaptureTool, readCapture } from "./capture-request.ts";

/** Validate a value against a Zod schema. */
export function validateCaptureSchema(schema: unknown, value: unknown): boolean {
	if (!schema || typeof schema !== "object" || !("safeParse" in schema)) {
		throw new Error("Provided schema is not a Zod schema");
	}
	const anySchema = schema as { safeParse: (v: unknown) => { success: boolean } };
	return anySchema.safeParse(value).success;
}

/**
 * Candidate for capture using a specific model and provider dialect.
 */
export interface CaptureCandidate {
	/** Provider dialect, e.g., "openai-completions". */
	dialect: import("../providers/schema.ts").ProviderDialect;
	/** Model to query. */
	model: Model<any>;
	/** Stream function for the model. */
	stream: (model: Model<any>, context: Context, options?: SimpleStreamOptions) => AssistantMessageEventStream;
	/** Optional stream options. */
	options?: SimpleStreamOptions;
}

/** Attempt record for a model that failed to capture. */
export interface CaptureAttempt {
	/** Model identifier. */
	model: string;
	/** Error message describing the failure. */
	error: string;
}

/** Error thrown when all capture candidates fail. */
export class CaptureError extends Error {
	/** List of attempts made. */
	readonly attempts: CaptureAttempt[];
	constructor(attempts: CaptureAttempt[]) {
		super(`All capture candidates failed (${attempts.length} attempts)`);
		this.attempts = attempts;
	}
}

/** Convert a Zod schema to a JSON schema without the top‑level `$schema` key. */
export function captureJsonSchema(schema: z.ZodType): Record<string, unknown> {
	let json = zodToJsonSchema(schema) as Record<string, unknown>;
	if (json && typeof json === "object") {
		if ("$schema" in json) {
			delete json["$schema"];
		}
		// If it's empty, try to ensure we have a valid object schema if it's an object
		if (Object.keys(json).length === 0 && (schema as any)._def?.typeName === "ZodObject") {
			json = { type: "object", properties: {}, required: [] };
		}
	}
	if (json.type !== "object") {
		throw new Error("captureResult requires a Zod object schema for tool parameters.");
	}
	return json;
}

/**
 * Extract a typed result from an answer using capture tool candidates.
 *
 * @param answer   - The raw answer text to be processed.
 * @param schema   - Zod schema describing the expected result type.
 * @param candidates - Ordered list of capture candidates.
 * @returns Parsed value, the model that succeeded, and any failed attempts.
 * @throws CaptureError when every candidate fails.
 */
export async function captureResult<T>(params: {
	answer: string;
	schema: z.ZodType<T>;
	candidates: CaptureCandidate[];
}): Promise<{ value: T; model: string; attempts: CaptureAttempt[] }> {
	const { answer, schema, candidates } = params;
	const attempts: CaptureAttempt[] = [];

	for (const candidate of candidates) {
		const context = captureContext(answer, captureJsonSchema(schema));
		try {
			const stream = candidate.stream(candidate.model, context, {
				...candidate.options,
				onPayload: async (payload, model) => {
					// The caller's hook runs first; its replacement payload (if any) is what gets the forced capture tool.
					const upstream = await candidate.options?.onPayload?.(payload, model);
					return forceCaptureTool(candidate.dialect, upstream ?? payload);
				},
			});
			if (typeof (stream as any).result !== "function") {
				throw new Error("Stream does not have a result method");
			}
			const message = await (stream as any).result();
			const capture = readCapture(message);
			if (!capture) {
				attempts.push({ model: candidate.model.id, error: "no capture tool call" });
				continue;
			}
			const parsed = schema.safeParse(capture);
			if (!parsed.success) {
				attempts.push({ model: candidate.model.id, error: "schema validation failed" });
				continue;
			}
			return { value: parsed.data, model: candidate.model.id, attempts };
		} catch (e: any) {
			if (e instanceof CaptureError) {
				throw e;
			}
			attempts.push({ model: candidate.model.id, error: e?.message ?? String(e) });
		}
	}

	throw new CaptureError(attempts);
}
