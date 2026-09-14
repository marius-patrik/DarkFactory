import { describe, expect, test } from "bun:test";
import { DEFAULT_CHAIN, type DfConfig } from "../src/config.ts";
import { defaultSensitiveDataHook, resolveRouting } from "../src/harness/routing.ts";

const config: DfConfig = {
	defaultChain: DEFAULT_CHAIN,
	hardReasoningChain: "anthropic/claude-hard@work,openai/gpt-hard@backup",
	sensitiveChain: "local/private@sensitive,anthropic/claude-safe@backup",
};

describe("model routing policy", () => {
	test("uses Gemini 3.8 Flash by default and has no Antigravity default", async () => {
		const route = await resolveRouting({ defaultChain: DEFAULT_CHAIN }, { prompt: "hello" });
		expect(route.source).toBe("default");
		expect(route.chain.slice(0, 3).map((entry) => `${entry.provider}/${entry.model}@${entry.account}`)).toEqual([
			"google/gemini-3.8-flash@default", "google/gemini-3.7-flash@default", "google/gemini-3.6-flash@default",
		]);
		expect(JSON.stringify(route.chain)).not.toContain("gemini-2.5");
		expect(new Set(route.chain.map((entry) => entry.provider)).size).toBeGreaterThan(2);
		expect(JSON.stringify(route.chain)).not.toContain("antigravity");
	});

	test("explicit user and graph routes override every automatic policy", async () => {
		const explicit = await resolveRouting(config, {
			prompt: "password=very-secret-value",
			reasoning: "hard",
			explicitChain: "grok-sub/grok-4.6@main,google/gemini-backup@default",
			node: { chain: "local/node@private", reasoning: "hard" },
		});
		expect(explicit.source).toBe("explicit");
		expect(explicit.chain.map((item) => item.provider)).toEqual(["grok-sub", "google"]);

		const graph = await resolveRouting(config, {
			prompt: "password=very-secret-value",
			reasoning: "hard",
			node: { model: "openai/node-model@work" },
		});
		expect(graph).toMatchObject({ source: "graph", chain: [{ provider: "openai", model: "node-model", account: "work" }] });
	});

	test("sensitive prompts and tool results select the configured sensitive failover chain", async () => {
		expect((await resolveRouting(config, { prompt: "contact dev@example.com" })).source).toBe("sensitive");
		expect((await resolveRouting(config, { prompt: "inspect output", toolResults: [{ token: "access_token=fixture-secret-123" }] })).source).toBe("sensitive");
		expect((await resolveRouting(config, {
			prompt: "custom classification",
			sensitiveHook: { detect: async () => true },
		})).source).toBe("sensitive");
	});

	test("hard routing retains the whole configured cross-provider failover chain", async () => {
		const route = await resolveRouting(config, { prompt: "prove this", reasoning: "hard" });
		expect(route.source).toBe("hard");
		expect(route.chain.map((item) => item.provider)).toEqual(["anthropic", "openai"]);
	});

	test("default detector ignores prose that names credentials without containing one", () => {
		expect(defaultSensitiveDataHook.detect({ prompt: "Explain how an API key works", toolResults: [] })).toBe(false);
	});
});
