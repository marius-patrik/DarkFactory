import { describe, expect, test } from "bun:test";
import type { AssistantMessage, Model, SimpleStreamOptions } from "@earendil-works/pi-ai";
import { z } from "zod";
import {
	CaptureError,
	captureJsonSchema,
	captureResult,
	validateCaptureSchema,
} from "../src/harness/result-capture.ts";

/** Local mock for helper stream creators */
function createAssistantMessageEventStream() {
	let resolve: (value: any) => void;
	let reject: (reason?: any) => void;
	const promise = new Promise<any>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return {
		push(event: any) {
			if (event.type === "done") {
				resolve(event.message);
			} else if (event.type === "error") {
				reject(new Error("error"));
			}
		},
		end() {},
		result() {
			return promise;
		},
	};
}

/** Simple mock model */
function mockModel(id: string): Model<any> {
	return { id, api: "api", provider: "prov" } as any;
}

/** Helper to build a fake stream that returns a capture tool call with given args. */
function fakeCaptureStream(
	args: Record<string, unknown>,
	fail?: boolean,
): (model: Model<any>, context: any, options?: SimpleStreamOptions) => any {
	return (_model, _context, _options) => {
		const events = createAssistantMessageEventStream();
		// simulate async behavior
		(async () => {
			if (fail) {
				const errorMessage: AssistantMessage = {
					role: "assistant",
					content: [],
					api: "api",
					provider: "prov",
					model: "model",
					usage: {
						input: 0,
						output: 0,
						cacheRead: 0,
						cacheWrite: 0,
						totalTokens: 0,
						cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
					},
					stopReason: "error",
					timestamp: Date.now(),
				};
				events.push({ type: "error", reason: "error", error: errorMessage });
				events.end();
				return;
			}
			const captureToolCall = { type: "toolCall", name: "capture", arguments: args };
			const message: AssistantMessage = { role: "assistant", content: [captureToolCall] } as any;
			events.push({ type: "done", reason: "stop", message });
			events.end();
		})();
		return events;
	};
}

/** Helper to build a fake stream that returns no capture call (plain text). */
function fakeNoCaptureStream(text: string): (model: Model<any>, context: any, options?: SimpleStreamOptions) => any {
	return (_model, _context, _options) => {
		const events = createAssistantMessageEventStream();
		(async () => {
			const message: AssistantMessage = { role: "assistant", content: [{ type: "text", text }] } as any;
			events.push({ type: "done", reason: "stop", message });
			events.end();
		})();
		return events;
	};
}

/** Simple schema for tests */
const personSchema = z.object({ name: z.string(), age: z.number() });

describe("captureJsonSchema", () => {
	test("converts zod schema to json schema and removes $schema", () => {
		const schema = z.object({
			name: z.string(),
			count: z.number(),
		});
		const jsonSchema = captureJsonSchema(schema);
		expect(jsonSchema).toBeDefined();
		expect((jsonSchema as any)["type"]).toBe("object");
		expect((jsonSchema as any)["properties"]).toBeDefined();
	});
});

describe("captureResult", () => {
	test("succeeds on first candidate", async () => {
		const candidates = [
			{
				dialect: "openai-completions" as any,
				model: mockModel("modelA"),
				stream: fakeCaptureStream({ name: "Alice", age: 30 }),
			},
		];
		const result = await captureResult({ answer: "Hello", schema: personSchema, candidates });
		expect(result.value).toEqual({ name: "Alice", age: 30 });
		expect(result.model).toBe("modelA");
		expect(result.attempts).toHaveLength(0);
	});

	test("retries on schema failure", async () => {
		const candidates = [
			{
				dialect: "openai-completions" as any,
				model: mockModel("modelA"),
				stream: fakeCaptureStream({ name: "Bob", age: "thirty" }), // wrong type
			},
			{
				dialect: "openai-completions" as any,
				model: mockModel("modelB"),
				stream: fakeCaptureStream({ name: "Bob", age: 40 }),
			},
		];
		const result = await captureResult({ answer: "Hello", schema: personSchema, candidates });
		expect(result.value).toEqual({ name: "Bob", age: 40 });
		expect(result.model).toBe("modelB");
		expect(result.attempts).toHaveLength(1);
		expect(result.attempts[0]!.model).toBe("modelA");
		expect(result.attempts[0]!.error).toContain("schema validation failed");
	});

	test("throws CaptureError when all fail", async () => {
		const candidates = [
			{ dialect: "openai-completions" as any, model: mockModel("modelA"), stream: fakeNoCaptureStream("plain text") },
			{
				dialect: "openai-completions" as any,
				model: mockModel("modelB"),
				stream: fakeCaptureStream({ name: "Bob", age: "bad" }),
			},
		];
		await expect(captureResult({ answer: "Hello", schema: personSchema, candidates })).rejects.toThrow(CaptureError);
		try {
			await captureResult({ answer: "Hello", schema: personSchema, candidates });
		} catch (e) {
			const error = e as CaptureError;
			expect(error.attempts.length).toBe(2);
			expect(error.attempts[0]?.model).toBe("modelA");
			expect(error.attempts[1]?.model).toBe("modelB");
		}
	});
});

// Existing validator tests remain unchanged

describe("validateCaptureSchema", () => {
	const schema = z.object({
		name: z.string(),
		age: z.number().int().nonnegative(),
		tags: z.array(z.string()).optional(),
	});
	test("returns true for matching payload", () => {
		const payload = { name: "Alice", age: 30, tags: ["admin", "user"] };
		expect(validateCaptureSchema(schema, payload)).toBe(true);
	});
	test("returns false for mismatched payload", () => {
		const payload = { name: "Bob", age: "thirty" };
		expect(validateCaptureSchema(schema, payload)).toBe(false);
	});
	test("throws on non‑Zod schema", () => {
		const badSchema = { not: "a schema" } as any;
		const payload = { name: "Carol", age: 25 };
		expect(() => validateCaptureSchema(badSchema, payload)).toThrow();
	});
});
