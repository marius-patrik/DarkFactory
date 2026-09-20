import { describe, expect, test } from "bun:test";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import { z } from "zod";
import {
	CAPTURE_TOOL_NAME,
	captureContext,
	captureJsonSchema,
	forceCaptureTool,
	readCapture,
	validateCaptureSchema,
} from "../src/harness/capture-request.ts";

function clone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

describe("forceCaptureTool", () => {
	const dummyPayload = { foo: "bar", config: { temperature: 0.5 } };

	test("openai-completions adds correct tool_choice", () => {
		const payload = clone(dummyPayload);
		const result = forceCaptureTool("openai-completions", payload) as Record<string, unknown>;
		expect(result).toEqual({
			foo: "bar",
			config: { temperature: 0.5 },
			tool_choice: { type: "function", function: { name: CAPTURE_TOOL_NAME } },
		});
		expect(payload).toEqual(dummyPayload);
	});

	test("openai-responses adds correct tool_choice", () => {
		const payload = clone(dummyPayload);
		const result = forceCaptureTool("openai-responses", payload) as Record<string, unknown>;
		expect(result).toEqual({
			foo: "bar",
			config: { temperature: 0.5 },
			tool_choice: { type: "function", name: CAPTURE_TOOL_NAME },
		});
		expect(payload).toEqual(dummyPayload);
	});

	test("openai-codex-responses adds correct tool_choice", () => {
		const payload = clone(dummyPayload);
		const result = forceCaptureTool("openai-codex-responses", payload) as Record<string, unknown>;
		expect(result).toEqual({
			foo: "bar",
			config: { temperature: 0.5 },
			tool_choice: { type: "function", name: CAPTURE_TOOL_NAME },
		});
		expect(payload).toEqual(dummyPayload);
	});

	test("anthropic-messages adds correct tool_choice", () => {
		const payload = clone(dummyPayload);
		const result = forceCaptureTool("anthropic-messages", payload) as Record<string, unknown>;
		expect(result).toEqual({
			foo: "bar",
			config: { temperature: 0.5 },
			tool_choice: { type: "tool", name: CAPTURE_TOOL_NAME },
		});
		expect(payload).toEqual(dummyPayload);
	});

	test("google-generative-ai preserves existing config and adds toolConfig", () => {
		const payload = {
			model: "gemini-pro",
			contents: [{ role: "user", parts: [{ text: "hello" }] }],
			config: {
				temperature: 0.7,
				systemInstruction: "do something",
			},
		};
		const result = forceCaptureTool("google-generative-ai", payload) as Record<string, unknown>;
		expect(result).toEqual({
			model: "gemini-pro",
			contents: [{ role: "user", parts: [{ text: "hello" }] }],
			config: {
				temperature: 0.7,
				systemInstruction: "do something",
				toolConfig: {
					functionCallingConfig: {
						mode: "ANY",
						allowedFunctionNames: [CAPTURE_TOOL_NAME],
					},
				},
			},
		});
		expect(payload).toEqual({
			model: "gemini-pro",
			contents: [{ role: "user", parts: [{ text: "hello" }] }],
			config: {
				temperature: 0.7,
				systemInstruction: "do something",
			},
		});
	});

	test("unknown dialect returns payload unchanged", () => {
		const payload = clone(dummyPayload);
		const result = forceCaptureTool("cloudcode-agent", payload);
		expect(result).toBe(payload);
	});

	test("non-object payload is returned unchanged", () => {
		const payload = "just a string";
		const result = forceCaptureTool("openai-completions", payload as unknown);
		expect(result).toBe(payload);
	});
});

describe("captureContext", () => {
	test("creates context with unchanged answer and a single capture tool", () => {
		const answer = "The result is 42.";
		const schema = { type: "object", properties: { value: { type: "number" } }, required: ["value"] };
		const ctx = captureContext(answer, schema);
		expect(ctx.systemPrompt).toContain("extract the result from the user's message");
		expect(ctx.messages).toHaveLength(1);
		const msg = ctx.messages[0];
		expect(msg?.role).toBe("user");
		expect(msg?.content).toBe(answer);
		expect(ctx.tools).toHaveLength(1);
		const tool = ctx.tools?.[0];
		expect(tool?.name).toBe(CAPTURE_TOOL_NAME);
		expect(tool?.parameters).toEqual(schema as Record<string, unknown>);
	});
});

describe("readCapture", () => {
	test("returns arguments of capture tool call", () => {
		const message: AssistantMessage = {
			role: "assistant",
			content: [
				{ type: "text", text: "Here is the result" },
				{ type: "toolCall", name: CAPTURE_TOOL_NAME, arguments: { value: 42 } },
				{ type: "toolCall", name: "other", arguments: { foo: "bar" } },
			],
		} as unknown as AssistantMessage;
		const args = readCapture(message);
		expect(args).toEqual({ value: 42 });
	});

	test("ignores non-capture tool calls", () => {
		const message: AssistantMessage = {
			role: "assistant",
			content: [{ type: "toolCall", name: "other", arguments: { foo: "bar" } }],
		} as unknown as AssistantMessage;
		const args = readCapture(message);
		expect(args).toBeUndefined();
	});

	test("returns undefined for text-only messages", () => {
		const message: AssistantMessage = {
			role: "assistant",
			content: [{ type: "text", text: "Just text" }],
		} as unknown as AssistantMessage;
		const args = readCapture(message);
		expect(args).toBeUndefined();
	});
});

describe("captureJsonSchema and validateCaptureSchema", () => {
	const schema = z.object({
		name: z.string(),
		age: z.number().int().nonnegative(),
	});

	test("captureJsonSchema strips $schema key", () => {
		const json = captureJsonSchema(schema);
		expect(json.$schema).toBeUndefined();
		expect(json.type).toBe("object");
		expect(json.properties).toBeDefined();
	});

	test("validateCaptureSchema returns true for matching value", () => {
		expect(validateCaptureSchema(schema, { name: "Alice", age: 30 })).toBe(true);
	});

	test("validateCaptureSchema returns false for mismatched value", () => {
		expect(validateCaptureSchema(schema, { name: "Bob", age: "thirty" })).toBe(false);
	});

	test("validateCaptureSchema throws on non-Zod schema", () => {
		expect(() => validateCaptureSchema({} as unknown, { name: "Carol" })).toThrow();
	});
});
