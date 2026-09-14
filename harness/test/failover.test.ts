import { describe, expect, test } from "bun:test";
import {
	createModels,
	fauxAssistantMessage,
	fauxProvider,
	fauxThinking,
	fauxToolCall,
	type Context,
	type Models,
} from "@earendil-works/pi-ai";
import { CandidateExhaustion, runFailoverTurn } from "../src/failover.ts";

describe("runFailoverTurn", () => {
	test("fails over a quota response and preserves cross-provider tool/thinking history", async () => {
		const first = fauxProvider({ provider: "faux-one", models: [{ id: "one" }] });
		const second = fauxProvider({ provider: "faux-two", models: [{ id: "two" }] });
		first.setResponses([
			fauxAssistantMessage([], { stopReason: "error", errorMessage: "429 insufficient_quota; reset in one hour token=hidden" }),
		]);
		second.setResponses([
			(context, options) => {
				expect(options?.headers).toEqual({ "x-account-project": "test-project" });
				const historical = context.messages[1];
				expect(historical?.role).toBe("assistant");
				if (historical?.role !== "assistant") throw new Error("history missing");
				expect(historical.provider).toBe("origin-provider");
				expect(historical.content.some((block) => block.type === "thinking" && block.thinking === "inspect state")).toBe(true);
				expect(historical.content.some((block) => block.type === "toolCall" && block.name === "lookup")).toBe(true);
				expect(context.messages[2]?.role).toBe("toolResult");
				return fauxAssistantMessage("hand-off complete");
			},
		]);

		const context: Context = {
			messages: [
				{ role: "user", content: "Earlier request", timestamp: 1 },
				{
					...fauxAssistantMessage([
						fauxThinking("inspect state"),
						fauxToolCall("lookup", { key: "value" }, { id: "call-1" }),
					], { stopReason: "toolUse", timestamp: 2 }),
					provider: "origin-provider",
					model: "origin-model",
				},
				{ role: "toolResult", toolCallId: "call-1", toolName: "lookup", content: [{ type: "text", text: "result" }], isError: false, timestamp: 3 },
				{ role: "user", content: "Continue", timestamp: 4 },
			],
		};
		const collections = new Map<string, Models>();
		for (const handle of [first, second]) {
			const models = createModels();
			models.setProvider(handle.provider);
			collections.set(handle.provider.id, models);
		}
		const text: string[] = [];
		const candidates = [
				{ provider: "faux-one", account: "a", model: "one" },
				{ provider: "faux-two", account: "b", model: "two" },
			] as const;
		const exhaustion = new CandidateExhaustion();
		const result = await runFailoverTurn({
			candidates,
			context,
			modelsFor: (candidate) => collections.get(candidate.provider)!,
			headersFor: (candidate): Record<string, string> => candidate.provider === "faux-two" ? { "x-account-project": "test-project" } : {},
			onText: (delta) => text.push(delta),
			exhaustion,
		});

		expect(result.candidate.provider).toBe("faux-two");
		expect(result.message.stopReason).toBe("stop");
		expect(text.join("")).toBe("hand-off complete");
		expect(result.steps.map((step) => step.classification)).toEqual(["quota_exhausted", undefined]);
		expect(result.steps.map((step) => step.errorMessage)).toEqual(["429 insufficient_quota; reset in one hour token=[REDACTED]", null]);
		expect(first.state.callCount).toBe(1);
		expect(second.state.callCount).toBe(1);
		expect(exhaustion.isExhausted(candidates[0])).toBe(true);
		expect(exhaustion.isExhausted(candidates[1])).toBe(false);
	});
});
