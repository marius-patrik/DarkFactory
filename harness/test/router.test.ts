import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import type { Candidate } from "../src/failover.ts";
import { LimitLedger } from "../src/limits/ledger.ts";
import { classifyTask } from "../src/router/profile.ts";
import { buildRouterCatalog } from "../src/router/catalog.ts";
import { OutcomeStore } from "../src/router/outcomes.ts";
import { routeTask } from "../src/router/router.ts";
import type { ModelCapability, RouterConfig } from "../src/router/types.ts";

const temporary: string[] = [];
afterEach(async () => {
	for (const path of temporary.splice(0)) {
		if (!path.startsWith(process.cwd())) throw new Error(`Refusing cleanup outside workspace: ${path}`);
		await rm(path, { recursive: true, force: true });
	}
});

const candidate = (provider: string, model: string, tier: ModelCapability["limitTier"], extra: Partial<ModelCapability> = {}): ModelCapability => ({
	candidate: { provider, model, account: "default" }, contextWindow: 128_000,
	tools: true, reasoning: true, modalities: ["text"], quality: {}, limitTier: tier, ...extra,
});

describe("task profiles", () => {
	test("derives kind, size, needs, and sensitivity from every input surface", async () => {
		const profile = await classifyTask({
			prompt: "Review this patch for race conditions", attachedFiles: [{ name: "screen.png", tokens: 70_000, modality: "image" }],
			node: { needs: ["tools"], sensitivity: "sensitive" }, flags: { size: "large" },
		});
		expect(profile).toEqual({ kind: "review", size: "large", needs: ["tools", "vision", "long_context", "reasoning"], sensitivity: "sensitive", contextTokens: 70_010 });
	});

	test("uses the optional classifier only for ambiguous prompts", async () => {
		let calls = 0;
		const classify = async () => { calls++; return "classify" as const; };
		expect((await classifyTask({ prompt: "Please implement a cache" }, { classifier: "cheap/model@default" }, classify)).kind).toBe("implement");
		expect((await classifyTask({ prompt: "Could you handle this?" }, { classifier: "cheap/model@default" }, classify)).kind).toBe("classify");
		expect(calls).toBe(1);
		expect((await classifyTask({ prompt: "password=fixture-secret-value" }, { classifier: "cheap/model@default" }, classify)).sensitivity).toBe("sensitive");
		expect(calls).toBe(1);
	});
});

describe("policy routing", () => {
	test("orders by policy and quality, then explains capability and ledger skips", async () => {
		const home = await mkdtemp(join(process.cwd(), ".router-test-")); temporary.push(home);
		const ledger = new LimitLedger(home);
		await ledger.record([{ provider: "tight", model: "reviewer", account: "default", type: "daily", observedAt: 1, resetAt: 99_999, source: "rule" }]);
		const models = [
			candidate("tight", "reviewer", "tight", { quality: { review: 3 } }),
			candidate("bulk", "coder", "bulk", { quality: { review: 2 } }),
			candidate("text", "no-tools", "standard", { tools: false, quality: { review: 5 } }),
		];
		const config: RouterConfig = { policies: [{ id: "small-review", match: { kind: ["review"], size: ["small"] }, prefer: { tiers: ["tight", "standard", "bulk"] } }] };
		const result = await routeTask({ prompt: "Review this small diff", flags: { needs: ["tools"] } }, { config, models, ledger, now: () => 1_000 });
		expect(result.ranked.map((item) => [item.candidate.provider, item.status, item.reason])).toEqual([
			["tight", "skipped", "limited"], ["bulk", "chosen", "policy small-review"], ["text", "skipped", "missing tools"],
		]);
		expect(result.chain).toEqual([{ provider: "bulk", model: "coder", account: "default" }]);
	});

	test("explicit and graph routes win; sensitive routing cannot escape sensitiveChain", async () => {
		const models = [candidate("safe", "private", "standard"), candidate("other", "fast", "tight")];
		const config: RouterConfig = { policies: [{ id: "all", match: {}, prefer: { tiers: ["tight"] } }] };
		const explicit = await routeTask({ prompt: "password=fixture-secret", explicitChain: "other/fast@default", node: { chain: "safe/private@default" } }, { config, models });
		expect(explicit.source).toBe("explicit");
		expect(explicit.chain[0]?.provider).toBe("other");
		const sensitive = await routeTask({ prompt: "password=fixture-secret" }, { config, models, sensitiveChain: "safe/private@default" });
		expect(sensitive.source).toBe("sensitive");
		expect(sensitive.ranked.map((item) => item.candidate.provider)).toEqual(["safe"]);
		const hardSensitive = await routeTask({ prompt: "password=fixture-secret", reasoning: "hard" }, { config, models, sensitiveChain: "safe/private@default", hardReasoningChain: "other/fast@default" });
		expect(hardSensitive.source).toBe("sensitive");
		expect(hardSensitive.chain[0]?.provider).toBe("safe");
	});

	test("merges live models with provider capabilities and per-model config overrides", () => {
		const models = buildRouterCatalog({
			providers: [{ id: "generic", name: "Generic", dialect: "openai-completions", baseUrl: "https://example.invalid", auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }], requiredCredentialSlots: ["api_key"], models: { static: [{ id: "fallback", tier: "tight" }] }, capabilities: { tools: false, reasoning: false, images: false } }],
			catalogs: new Map([["generic", { provider: "generic", source: "live", models: [{ id: "fresh", name: "Fresh", supportedMethods: ["generateImage"] }] }]]),
			overrides: { "generic/fresh": { reasoning: true, contextWindow: 1_000_000, limitTier: "bulk", quality: { image: 5 } } },
		});
		expect(models).toEqual([{ candidate: { provider: "generic", model: "fresh", account: "default" }, contextWindow: 1_000_000, tools: false, reasoning: true, modalities: ["text", "image_gen"], quality: { image: 5 }, limitTier: "bulk", reserve: undefined, source: "live" }]);
	});
});

describe("router learning", () => {
	test("persists outcomes and applies a bounded decaying failure penalty per task kind", async () => {
		const home = await mkdtemp(join(process.cwd(), ".router-test-")); temporary.push(home);
		const store = new OutcomeStore(home, { windowMs: 1_000, maxPenalty: 20 });
		const target: Candidate = { provider: "tight", model: "reviewer", account: "default" };
		await store.record({ candidate: target, kind: "review", success: false, failureKind: "transient", tokens: 10, durationMs: 50, observedAt: 1_000 });
		expect((await store.penalties("review", 1_000)).get("tight/reviewer@default")).toBe(20);
		expect((await store.penalties("implement", 1_000)).size).toBe(0);
		 expect((await store.penalties("review", 2_000)).get("tight/reviewer@default")).toBeUndefined();
	});

	test("down-ranks a recently failing model only within the matching task kind", async () => {
		const home = await mkdtemp(join(process.cwd(), ".router-test-")); temporary.push(home);
		const store = new OutcomeStore(home, { windowMs: 10_000, maxPenalty: 20 });
		const first = candidate("one", "same-tier", "standard"); const second = candidate("two", "same-tier", "standard");
		await store.record({ candidate: first.candidate, kind: "review", success: false, failureKind: "transient", tokens: 0, durationMs: 1, observedAt: 1_000 });
		const config: RouterConfig = { policies: [{ id: "review", match: { kind: ["review"] }, prefer: {} }] };
		const routed = await routeTask({ prompt: "Review it" }, { config, models: [first, second], outcomes: store, now: () => 1_000 });
		expect(routed.chain.map((item) => item.provider)).toEqual(["two", "one"]);
		expect(routed.ranked[1]?.details.join(" ")).toContain("recent-failure penalty");
	});
});
