import { describe, test, expect } from "bun:test";
import { resolveRouting } from "../../src/harness/routing.ts";
import type { DfConfig } from "../../src/config.ts";

describe("resolveRouting without defaultChain", () => {
	test("falls back to empty chain when defaultChain is absent", async () => {
		const cfg: DfConfig = {} as DfConfig;
		const decision = await resolveRouting(cfg, { prompt: "hello" });
		expect(decision.source).toBe("default");
		expect(decision.chain).toEqual([]);
	});

	test("works when hardReasoningChain is missing", async () => {
		const cfg: DfConfig = { defaultChain: "google/gemini-3.8-flash@default" };
		const decision = await resolveRouting(cfg, { prompt: "hello" });
		expect(decision.source).toBe("default");
		expect(decision.chain).toHaveLength(1);
	});

	test("works when sensitiveChain is missing", async () => {
		const cfg: DfConfig = { defaultChain: "google/gemini-3.8-flash@default" };
		const decision = await resolveRouting(cfg, { prompt: "hello" });
		expect(decision.source).toBe("default");
		expect(decision.chain).toHaveLength(1);
	});
});
