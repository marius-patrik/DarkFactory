import { describe, expect, test, beforeEach } from "bun:test";
import type { Context, Models } from "../src/failover.ts";
import { Candidate, runFailoverTurn, CandidateExhaustion } from "../src/failover.ts";
import { penalty, penalties } from "../src/penalty.ts";
import {
	fauxProvider,
	fauxAssistantMessage,
	createModels,
} from "@earendil-works/pi-ai";

beforeEach(() => {
	penalty.reset();
});

describe("runFailoverTurn length stop retry", () => {
	test("retries on length stop with no output and succeeds", async () => {
		const provider = fauxProvider({ provider: "test", models: [{ id: "model" }] });
		provider.setResponses([
			fauxAssistantMessage([], { stopReason: "length" }),
			fauxAssistantMessage("success"),
		]);
		const models = createModels();
		models.setProvider(provider.provider);
		const candidates: readonly Candidate[] = [{ provider: "test", account: "a", model: "model" }];
		const context: Context = { messages: [] };
		const result = await runFailoverTurn({
			candidates,
			context,
			modelsFor: () => models,
		});
		expect(result.message.content.some(c => (c as any).text === "success")).toBe(true);
		expect(penalties.find(p => p.kind === "lengthStopRetry")).toBeDefined();
	});

	test("fails after second length stop and failovers", async () => {
		const first = fauxProvider({ provider: "first", models: [{ id: "model" }] });
		first.setResponses([
			fauxAssistantMessage([], { stopReason: "length" }),
			fauxAssistantMessage([], { stopReason: "length" }),
		]);
		const second = fauxProvider({ provider: "second", models: [{ id: "model2" }] });
		second.setResponses([
			fauxAssistantMessage("ok"),
		]);
		const modelsMap = new Map<string, Models>();
		const models1 = createModels();
		models1.setProvider(first.provider);
		modelsMap.set(first.provider.id, models1);
		const models2 = createModels();
		models2.setProvider(second.provider);
		modelsMap.set(second.provider.id, models2);
		const candidates: readonly Candidate[] = [
			{ provider: "first", account: "a", model: "model" },
			{ provider: "second", account: "b", model: "model2" },
		];
		const context: Context = { messages: [] };
		const result = await runFailoverTurn({
			candidates,
			context,
			modelsFor: (c) => modelsMap.get(c.provider)!,
		});
		expect(result.candidate.provider).toBe("second");
		expect(penalties.some(p => p.kind === "lengthStopRetry")).toBe(true);
		expect(penalties.some(p => p.kind === "lengthStopFailover")).toBe(true);
	});
});
