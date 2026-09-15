// Capture request utilities
//
// This module provides functions to construct a capture tool, a context for
// invoking the tool, and utilities to force the use of the capture tool in
// provider payloads. It also includes a helper to extract the capture tool
// arguments from an assistant message.

import type { Context, AssistantMessage, Tool } from "@earendil-works/pi-ai";
import type { TSchema } from "typebox";
import type { ProviderDialect } from "../providers/schema";

/** The name of the capture tool. */
export const CAPTURE_TOOL_NAME = "capture";

/**
 * Construct a capture tool with the given JSON schema.
 *
 * @param jsonSchema - The JSON schema describing the expected result.
 * @returns A {@link Tool} definition for the capture tool.
 */
export function captureTool(jsonSchema: Record<string, unknown>): Tool {
  return {
    name: CAPTURE_TOOL_NAME,
    description: "Record the result extracted from the answer.",
    parameters: jsonSchema as unknown as TSchema,
    constrainedSampling: { type: "json_schema", strict: "prefer" },
  };
}

/**
 * Build a context that asks the model to extract a result from the answer
 * by calling the capture tool exactly once.
 *
 * @param answer - The answer text to be processed.
 * @param jsonSchema - The schema for the capture tool.
 * @returns A {@link Context} ready for a model request.
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
    tools: [captureTool(jsonSchema)],
  };
}

/**
 * Return a new payload that forces the use of the capture tool for the given
 * provider dialect. The original payload is never mutated.
 *
 * @param dialect - The provider dialect.
 * @param payload - The original request payload.
 * @returns A new payload with the appropriate `tool_choice` set, or the
 *          original payload unchanged when the dialect does not require a
 *          forced capture tool.
 */
export function forceCaptureTool(dialect: ProviderDialect, payload: unknown): unknown {
  // Non‑object payloads are returned unchanged.
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }
  const original = payload as Record<string, unknown>;
  // Helper to shallow‑copy the payload and add/override a top‑level key.
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
      // The payload shape is { model, contents, config? }
      const { model, contents, config } = original;
      const newConfig = {
        ...(config as Record<string, unknown> ?? {}),
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
      // For any other dialect we return the payload unchanged.
      return payload;
  }
}

/**
 * Extract the arguments of the first `capture` tool call from an assistant
 * message.
 *
 * @param message - The assistant message to inspect.
 * @returns The arguments object if a capture call is present, otherwise
 *          `undefined`.
 */
export function readCapture(message: AssistantMessage): Record<string, unknown> | undefined {
  // The shape of AssistantMessage is defined by pi‑ai. It contains a `content`
  // field that can be a string or an array of content blocks.
  const anyMsg = message as any;
  const contents = anyMsg.content;
  if (!Array.isArray(contents)) {
    return undefined;
  }
  for (const block of contents) {
    if (block && typeof block === "object" && block.type === "toolCall" && block.name === CAPTURE_TOOL_NAME) {
      return block.arguments as Record<string, unknown>;
    }
  }
  return undefined;
}
