import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import type { Candidate } from "../src/failover.ts";
import { LimitLedger } from "../src/limits/ledger.ts";
import { QuotaEngine } from "../src/limits/quota-engine.ts";
import type { DeclaredLimitConfig, ProviderConfig } from "../src/providers/schema.ts";
import { buildRouterCatalog } from "../src/router/catalog.ts";
import { OutcomeStore } from "../src/router/outcomes.ts";
import { classifyTask } from "../src/router/profile.ts";
import { routeTask } from "../src/router/router.ts";
import type { ModelCapability, RouterConfig, TaskProfile } from "../src/router/types.ts";
import { tierRank } from "../src/router/types.ts";

const temporary: string[] = [];
afterEach(async () => {
	for (const path of temporary.splice(0)) {
		if (!path.startsWith(process.cwd())) throw new Error(`Refusing cleanup outside workspace: ${path}`);
		await rm(path, { recursive: true, force: true });
	}
});

const candidate = (
	provider: string,
	model: string,
	tier: ModelCapability["limitTier"],
	extra: Partial<ModelCapability> = {},
): ModelCapability => ({
	candidate: { provider, model, account: "default" },
	contextWindow: 128_000,
	tools: true,
	reasoning: true,
	modalities: ["text"],
	quality: {},
	limitTier: tier,
	...extra,
});

describe("task profiles", () => {
	test("derives kind, size, needs, and sensitivity from every input surface", async () => {
		const profile = await classifyTask({
			prompt: "Review this patch for race conditions",
			attachedFiles: [{ name: "screen.png", tokens: 70_000, modality: "image" }],
			node: { needs: ["tools"], sensitivity: "sensitive" },
			flags: { size: "large" },
		});
		expect(profile).toEqual({
			kind: "review",
			size: "large",
			needs: ["tools", "vision", "long_context", "reasoning"],
			sensitivity: "sensitive",
			contextTokens: 70_010,
		});
	});

	test("uses the optional classifier only for ambiguous prompts", async () => {
		let calls = 0;
		const classify = async () => {
			calls++;
			return "classify" as const;
		};
		expect(
			(await classifyTask({ prompt: "Please implement a cache" }, { classifier: "cheap/model@default" }, classify))
				.kind,
		).toBe("implement");
		expect(
			(await classifyTask({ prompt: "Could you handle this?" }, { classifier: "cheap/model@default" }, classify)).kind,
		).toBe("classify");
		expect(calls).toBe(1);
		expect(
			(await classifyTask({ prompt: "password=fixture-secret-value" }, { classifier: "cheap/model@default" }, classify))
				.sensitivity,
		).toBe("sensitive");
		expect(calls).toBe(1);
	});
});

describe("policy routing", () => {
	test("orders by policy and quality, then explains capability and ledger skips", async () => {
		const home = await mkdtemp(join(process.cwd(), ".router-test-"));
		temporary.push(home);
		const ledger = new LimitLedger(home);
		await ledger.record([
			{
				provider: "tight",
				model: "reviewer",
				account: "default",
				type: "daily",
				observedAt: 1,
				resetAt: 99_999,
				source: "rule",
			},
		]);
		const models = [
			candidate("tight", "reviewer", "tight", { quality: { review: 3 } }),
			candidate("bulk", "coder", "bulk", { quality: { review: 2 } }),
			candidate("text", "no-tools", "standard", { tools: false, quality: { review: 5 } }),
		];
		const config: RouterConfig = {
			policies: [
				{
					id: "small-review",
					match: { kind: ["review"], size: ["small"] },
					prefer: { tiers: ["tight", "standard", "bulk"] },
				},
			],
		};
		const result = await routeTask(
			{ prompt: "Review this small diff", flags: { needs: ["tools"] } },
			{ config, models, ledger, now: () => 1_000 },
		);
		expect(result.ranked.map((item) => [item.candidate.provider, item.status, item.reason])).toEqual([
			["tight", "skipped", "limited"],
			["bulk", "chosen", "policy small-review"],
			["text", "skipped", "missing tools"],
		]);
		expect(result.chain).toEqual([{ provider: "bulk", model: "coder", account: "default" }]);
	});

	test("explicit and graph routes win; sensitive routing cannot escape sensitiveChain", async () => {
		const models = [
			{
				candidate: { provider: "safe", model: "private", account: "default" },
				contextWindow: 128_000,
				tools: true,
				reasoning: true,
				modalities: ["text"] as ModelCapability["modalities"],
				quality: {},
				limitTier: "standard" as ModelCapability["limitTier"],
				collection: "none" as ModelCapability["collection"],
			},
			{
				candidate: { provider: "other", model: "fast", account: "default" },
				contextWindow: 128_000,
				tools: true,
				reasoning: true,
				modalities: ["text"] as ModelCapability["modalities"],
				quality: {},
				limitTier: "tight" as ModelCapability["limitTier"],
				collection: "none" as ModelCapability["collection"],
			},
		];
		const config: RouterConfig = { policies: [{ id: "all", match: {}, prefer: { tiers: ["tight"] } }] };
		const explicit = await routeTask(
			{
				prompt: "password=fixture-secret",
				explicitChain: "other/fast@default",
				node: { chain: "safe/private@default" },
			},
			{ config, models },
		);
		expect(explicit.source).toBe("explicit");
		expect(explicit.chain[0]?.provider).toBe("other");
		const sensitive = await routeTask(
			{ prompt: "password=fixture-secret" },
			{ config, models, sensitiveChain: "safe/private@default" },
		);
		expect(sensitive.source).toBe("sensitive");
		expect(sensitive.ranked.map((item) => item.candidate.provider)).toEqual(["safe"]);
		const hardSensitive = await routeTask(
			{ prompt: "password=fixture-secret", reasoning: "hard" },
			{ config, models, sensitiveChain: "safe/private@default", hardReasoningChain: "other/fast@default" },
		);
		expect(hardSensitive.source).toBe("sensitive");
		expect(hardSensitive.chain[0]?.provider).toBe("safe");
	});

	test("merges live models with provider capabilities and per-model config overrides", () => {
		const models = buildRouterCatalog({
			providers: [
				{
					id: "generic",
					name: "Generic",
					dialect: "openai-completions",
					baseUrl: "https://example.invalid",
					auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
					requiredCredentialSlots: ["api_key"],
					models: { static: [{ id: "fallback", tier: "tight" }] },
					capabilities: { tools: false, reasoning: false, images: false },
				},
			],
			catalogs: new Map([
				[
					"generic",
					{
						provider: "generic",
						source: "live",
						models: [{ id: "fresh", name: "Fresh", supportedMethods: ["generateImage"] }],
					},
				],
			]),
			overrides: {
				"generic/fresh": { reasoning: true, contextWindow: 1_000_000, limitTier: "bulk", quality: { image: 5 } },
			},
		});
		expect(models).toEqual([
			{
				candidate: { provider: "generic", model: "fresh", account: "default" },
				contextWindow: 1_000_000,
				tools: false,
				reasoning: true,
				modalities: ["text", "image_gen"] as ModelCapability["modalities"],
				quality: { image: 5 },
				limitTier: "bulk" as ModelCapability["limitTier"],
				reserve: undefined,
				collection: "unknown" as ModelCapability["collection"],
				source: "live",
			},
		]);
	});
});

describe("router learning", () => {
	test("persists outcomes and applies a bounded decaying failure penalty per task kind", async () => {
		const home = await mkdtemp(join(process.cwd(), ".router-test-"));
		temporary.push(home);
		const store = new OutcomeStore(home, { windowMs: 1_000, maxPenalty: 20 });
		const target: Candidate = { provider: "tight", model: "reviewer", account: "default" };
		await store.record({
			candidate: target,
			kind: "review",
			success: false,
			failureKind: "transient",
			tokens: 10,
			durationMs: 50,
			observedAt: 1_000,
		});
		expect((await store.penalties("review", 1_000)).get("tight/reviewer@default")).toBe(20);
		expect((await store.penalties("implement", 1_000)).size).toBe(0);
		expect((await store.penalties("review", 2_000)).get("tight/reviewer@default")).toBeUndefined();
	});

	test("down-ranks a recently failing model only within the matching task kind", async () => {
		const home = await mkdtemp(join(process.cwd(), ".router-test-"));
		temporary.push(home);
		const store = new OutcomeStore(home, { windowMs: 10_000, maxPenalty: 20 });
		const first = candidate("one", "same-tier", "standard");
		const second = candidate("two", "same-tier", "standard");
		await store.record({
			candidate: first.candidate,
			kind: "review",
			success: false,
			failureKind: "transient",
			tokens: 0,
			durationMs: 1,
			observedAt: 1_000,
		});
		const config: RouterConfig = { policies: [{ id: "review", match: { kind: ["review"] }, prefer: {} }] };
		const routed = await routeTask(
			{ prompt: "Review it" },
			{ config, models: [first, second], outcomes: store, now: () => 1_000 },
		);
		expect(routed.chain.map((item) => item.provider)).toEqual(["two", "one"]);
		expect(routed.ranked[1]?.details.join(" ")).toContain("recent-failure penalty");
	});
});

describe("quota-aware ranking", () => {
	const declared = (id: string, limits: DeclaredLimitConfig[]): ProviderConfig => ({
		id,
		name: id,
		dialect: "openai-completions",
		baseUrl: `https://${id}.example/v1`,
		auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
		requiredCredentialSlots: [],
		models: { static: [{ id: "m" }] },
		capabilities: { tools: true, reasoning: false, images: false },
		limits: { observe: true, declared: limits },
	});
	const rpm: DeclaredLimitConfig[] = [
		{ type: "rate", dimension: "requests", limit: 5, windowMs: 60_000, source: "docs" },
	];
	const daily: DeclaredLimitConfig[] = [
		{ type: "daily", dimension: "requests", limit: 2, windowMs: 86_400_000, reset: "fixed", source: "observed" },
	];
	const now = Date.UTC(2026, 8, 15, 12);

	async function engine(configs: ProviderConfig[]): Promise<QuotaEngine> {
		const home = await mkdtemp(join(process.cwd(), ".harness-test-router-"));
		temporary.push(home);
		return new QuotaEngine(home, new LimitLedger(home), new Map(configs.map((config) => [config.id, config])));
	}
	const use = (quota: QuotaEngine, provider: string, times: number) =>
		Promise.all(
			Array.from({ length: times }, (_, i) =>
				quota.record({
					provider,
					account: "default",
					model: "m",
					timestamp: now - 1_000 - i,
					inputTokens: 1,
					outputTokens: 1,
					success: true,
				}),
			),
		);

	test("a policy route prefers the candidate with more remaining capacity", async () => {
		const quota = await engine([declared("busy", rpm), declared("idle", rpm)]);
		await use(quota, "busy", 4);
		const config: RouterConfig = { policies: [{ id: "all", match: {}, prefer: { tiers: ["standard"] } }] };
		const result = await routeTask(
			{ prompt: "Summarize this" },
			{
				config,
				models: [candidate("busy", "m", "standard"), candidate("idle", "m", "standard")],
				quota,
				now: () => now,
			},
		);
		expect(result.chain.map((item) => item.provider)).toEqual(["idle", "busy"]);
		expect(result.ranked[0]!.details).toContain("capacity 100%");
		expect(result.ranked[1]!.details).toContain("capacity 20%");
	});

	test("an exhausted candidate is skipped with the time it clears", async () => {
		const quota = await engine([declared("spent", daily), declared("fresh", daily)]);
		await use(quota, "spent", 2);
		const config: RouterConfig = { policies: [{ id: "all", match: {}, prefer: { tiers: ["standard"] } }] };
		const result = await routeTask(
			{ prompt: "Summarize this" },
			{
				config,
				models: [candidate("spent", "m", "standard"), candidate("fresh", "m", "standard")],
				quota,
				now: () => now,
			},
		);
		const spent = result.ranked.find((item) => item.candidate.provider === "spent")!;
		expect(spent.status).toBe("skipped");
		expect(spent.reason).toBe(`quota exhausted until ${new Date(Date.UTC(2026, 8, 16)).toISOString()}`);
		expect(result.chain.map((item) => item.provider)).toEqual(["fresh"]);
	});

	test("a candidate with learned unavailability is skipped with its reason, however soon it recovers", async () => {
		const home = await mkdtemp(join(process.cwd(), ".harness-test-router-"));
		temporary.push(home);
		const ledger = new LimitLedger(home);
		const quota = new QuotaEngine(
			home,
			ledger,
			new Map([declared("billed", rpm), declared("fresh", rpm)].map((config) => [config.id, config])),
		);
		const resetAt = now + 60_000;
		await ledger.record([
			{ provider: "billed", account: "default", model: "m", type: "billing", observedAt: now, resetAt, source: "body" },
		]);
		const config: RouterConfig = { policies: [{ id: "all", match: {}, prefer: { tiers: ["standard"] } }] };
		const result = await routeTask(
			{ prompt: "Summarize this" },
			{
				config,
				models: [candidate("billed", "m", "standard"), candidate("fresh", "m", "standard")],
				quota,
				now: () => now,
			},
		);
		const billed = result.ranked.find((item) => item.candidate.provider === "billed")!;
		expect(billed.status).toBe("skipped");
		expect(billed.reason).toBe(`unavailable (learned billing (body)) until ${new Date(resetAt).toISOString()}`);
		expect(result.chain.map((item) => item.provider)).toEqual(["fresh"]);
	});

	test("an explicit chain keeps its order and only drops exhausted members", async () => {
		const quota = await engine([declared("first", rpm), declared("second", daily), declared("third", rpm)]);
		await use(quota, "first", 4);
		await use(quota, "second", 2);
		const config: RouterConfig = { policies: [] };
		const models = [
			candidate("first", "m", "standard"),
			candidate("second", "m", "standard"),
			candidate("third", "m", "standard"),
		];
		const result = await routeTask(
			{ prompt: "Summarize this", explicitChain: "first/m@default,second/m@default,third/m@default" },
			{ config, models, quota, now: () => now },
		);
		expect(result.chain.map((item) => item.provider)).toEqual(["first", "third"]);
		expect(result.ranked.find((item) => item.candidate.provider === "second")!.status).toBe("skipped");
	});

	test("exposes provider data-collection in capability", () => {
		const providers: ProviderConfig[] = [
			{
				id: "p1",
				name: "P1",
				dialect: "openai-completions",
				baseUrl: "https://example",
				auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
				requiredCredentialSlots: [],
				models: { static: [{ id: "m" }] },
				capabilities: { tools: false, reasoning: false, images: false },
				data: { collection: "none", source: "test", checkedAt: "2020-01-01" },
			},
			{
				id: "p2",
				name: "P2",
				dialect: "openai-completions",
				baseUrl: "https://example",
				auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
				requiredCredentialSlots: [],
				models: { static: [{ id: "m" }] },
				capabilities: { tools: false, reasoning: false, images: false },
				data: { collection: "logging", source: "test", checkedAt: "2020-01-01" },
			},
			{
				id: "p3",
				name: "P3",
				dialect: "openai-completions",
				baseUrl: "https://example",
				auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
				requiredCredentialSlots: [],
				models: { static: [{ id: "m" }] },
				capabilities: { tools: false, reasoning: false, images: false },
				data: { collection: "training", source: "test", checkedAt: "2020-01-01" },
			},
			{
				id: "p4",
				name: "P4",
				dialect: "openai-completions",
				baseUrl: "https://example",
				auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
				requiredCredentialSlots: [],
				models: { static: [{ id: "m" }] },
				capabilities: { tools: false, reasoning: false, images: false },
				data: { collection: "unknown", source: "test", checkedAt: "2020-01-01" },
			},
			{
				id: "p5",
				name: "P5",
				dialect: "openai-completions",
				baseUrl: "https://example",
				auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
				requiredCredentialSlots: [],
				models: { static: [{ id: "m" }] },
				capabilities: { tools: false, reasoning: false, images: false },
			},
		];
		const caps = buildRouterCatalog({ providers });
		const map = new Map(caps.map((c) => [c.candidate.provider, (c as any).collection]));
		expect(map.get("p1")).toBe("none");
		expect(map.get("p2")).toBe("logging");
		expect(map.get("p3")).toBe("training");
		expect(map.get("p4")).toBe("unknown");
		expect(map.get("p5")).toBe("unknown");
	});

	test("free.data.collection overrides provider.data.collection for free-tier providers", () => {
		const providers: ProviderConfig[] = [
			{
				id: "p1",
				name: "P1",
				dialect: "openai-completions",
				baseUrl: "https://example",
				auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
				requiredCredentialSlots: [],
				models: { static: [{ id: "m" }] },
				capabilities: { tools: false, reasoning: false, images: false },
				data: { collection: "none", source: "test", checkedAt: "2020-01-01" },
				free: {
					kind: "permanent",
					keyUrl: "https://example",
					data: { collection: "training", source: "test", checkedAt: "2020-01-01" },
				},
			},
			{
				id: "p2",
				name: "P2",
				dialect: "openai-completions",
				baseUrl: "https://example",
				auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
				requiredCredentialSlots: [],
				models: { static: [{ id: "m" }] },
				capabilities: { tools: false, reasoning: false, images: false },
				data: { collection: "none", source: "test", checkedAt: "2020-01-01" },
			},
			{
				id: "p3",
				name: "P3",
				dialect: "openai-completions",
				baseUrl: "https://example",
				auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
				requiredCredentialSlots: [],
				models: { static: [{ id: "m" }] },
				capabilities: { tools: false, reasoning: false, images: false },
			},
		];
		const caps = buildRouterCatalog({ providers });
		const map = new Map(caps.map((c) => [c.candidate.provider, c.collection]));
		expect(map.get("p1")).toBe("training");
		expect(map.get("p2")).toBe("none");
		expect(map.get("p3")).toBe("unknown");
	});
});

/** Added tier override and unknown exclusion tests */

describe("tier override and unknown exclusion", () => {
	test("tier override respects free data collection for sensitive and normal tasks", async () => {
		// Provider with logging collection but free tier overrides to none
		const providers = [
			{
				id: "p1",
				name: "Provider1",
				dialect: "openai-completions",
				baseUrl: "https://example",
				auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
				requiredCredentialSlots: [],
				models: { static: [{ id: "m" }] },
				capabilities: { tools: false, reasoning: false, images: false },
				data: { collection: "logging", source: "test", checkedAt: "2020-01-01" },
				free: {
					kind: "permanent",
					keyUrl: "https://example",
					data: { collection: "none", source: "test", checkedAt: "2020-01-01" },
				},
			},
		];
		// Override the collection for the model to respect free tier override
		const models = buildRouterCatalog({
			providers: providers as ProviderConfig[],
			overrides: { "p1/m": { collection: "none" } },
		});
		const config: RouterConfig = {
			policies: [],
			dataCollection: { sensitive: ["none"], normal: ["none", "logging", "training", "unknown"] },
		};
		// Sensitive task should succeed because collection is overridden to "none"
		const sensitive = await routeTask(
			{ prompt: "secret", node: { sensitivity: "sensitive" }, explicitChain: "p1/m@default" },
			{ config, models },
		);
		expect(sensitive.chain.length).toBe(1);
		// Normal task should also succeed (unknown allowed) but we use same provider
		const normal = await routeTask(
			{ prompt: "normal", node: { sensitivity: "normal" }, explicitChain: "p1/m@default" },
			{ config, models },
		);
		expect(normal.chain.length).toBe(1);
	});

	test("unknown collection is excluded for sensitive tasks but allowed for normal tasks", async () => {
		const providers = [
			{
				id: "p2",
				name: "Provider2",
				dialect: "openai-completions",
				baseUrl: "https://example",
				auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
				requiredCredentialSlots: [],
				models: { static: [{ id: "m" }] },
				capabilities: { tools: false, reasoning: false, images: false },
				// No data field => defaults to unknown
			},
		];
		const models = buildRouterCatalog({ providers: providers as ProviderConfig[] });
		const config: RouterConfig = {
			policies: [],
			dataCollection: { sensitive: ["none"], normal: ["none", "logging", "training", "unknown"] },
		};
		// Sensitive task should be rejected
		await expect(
			routeTask(
				{ prompt: "secret", node: { sensitivity: "sensitive" }, explicitChain: "p2/m@default" },
				{ config, models },
			),
		).rejects.toThrow(/No provider allowed for sensitive work: data collection must be one of "none"/);
		// Normal task should succeed
		const normal = await routeTask(
			{ prompt: "normal", node: { sensitivity: "normal" }, explicitChain: "p2/m@default" },
			{ config, models },
		);
		expect(normal.chain.length).toBe(1);
	});
});

describe("empty model list", () => {
	test("routeTask with models: [] and no explicit chain rejects with No usable model guidance", async () => {
		const config: RouterConfig = { policies: [] };
		await expect(routeTask({ prompt: "hello" }, { config, models: [] })).rejects.toThrow("No usable model");
	});
	test("explicit chain is unaffected when models list is empty", async () => {
		const models: ModelCapability[] = [];
		const config: RouterConfig = { policies: [] };
		const result = await routeTask({ prompt: "hello", explicitChain: "p1/m@default" }, { config, models });
		expect(result.chain[0]?.provider).toBe("p1");
	});
});

describe("data–collection policy", () => {
	test("sensitive task with allowed collection none succeeds", async () => {
		const models = [candidate("p1", "m", "standard", { collection: "none" })];
		const config: RouterConfig = { policies: [] };
		const result = await routeTask(
			{ prompt: "secret", node: { sensitivity: "sensitive" }, explicitChain: "p1/m@default" },
			{ config, models },
		);
		expect(result.chain.length).toBe(1);
	});

	test("sensitive task with only logging collection fails", async () => {
		const models = [candidate("p2", "m", "standard", { collection: "logging" })];
		const config: RouterConfig = { policies: [] };
		await expect(
			routeTask(
				{ prompt: "secret", node: { sensitivity: "sensitive" }, explicitChain: "p2/m@default" },
				{ config, models },
			),
		).rejects.toThrow(/No provider allowed for sensitive work: data collection must be one of "none"/);
	});

	test("explicit chain with disallowed provider for sensitive task is rejected", async () => {
		const models = [
			candidate("p2", "m", "standard", { collection: "logging" }),
			candidate("p1", "m", "standard", { collection: "none" }),
		];
		const config: RouterConfig = { policies: [] };
		await expect(
			routeTask(
				{ prompt: "secret", explicitChain: "p2/m@default", node: { sensitivity: "sensitive" } },
				{ config, models },
			),
		).rejects.toThrow(/No provider allowed for sensitive work: data collection must be one of "none"/);
	});

	test("normal task can use any collection", async () => {
		const models = [candidate("p2", "m", "standard", { collection: "logging" })];
		const config: RouterConfig = { policies: [] };
		const result = await routeTask({ prompt: "normal", node: { sensitivity: "normal" } }, { config, models });
		expect(result.chain.length).toBe(1);
	});
	test("sensitive task with explicit chain and missing collection is rejected", async () => {
		// Candidate not in models => defaults to unknown collection
		const models: ModelCapability[] = []; // no models
		const config: RouterConfig = { policies: [] };
		await expect(
			routeTask(
				{ prompt: "secret", explicitChain: "p1/m@default", node: { sensitivity: "sensitive" } },
				{ config, models },
			),
		).rejects.toThrow(/No provider allowed for sensitive work: data collection must be one of "none"/);
	});
	test("sensitive task without sensitiveChain routes to none and skips training and unknown", async () => {
		const models = [
			candidate("p1", "m", "standard", { collection: "none" }),
			candidate("p2", "m", "standard", { collection: "training" }),
			candidate("p3", "m", "standard", { collection: "unknown" }),
		];
		const config: RouterConfig = { policies: [] };
		const result = await routeTask({ prompt: "secret", node: { sensitivity: "sensitive" } }, { config, models });
		// Should choose the none provider
		expect(result.chain.length).toBe(1);
		expect(result.chain[0]?.provider).toBe("p1");
		// The other two should not be in the result
		expect(result.ranked).toHaveLength(1);
		expect(result.ranked[0]!.candidate.provider).toBe("p1");
	});
	test("sensitive task with no none collection throws fail-closed error", async () => {
		const models = [
			candidate("p1", "m", "standard", { collection: "training" }),
			candidate("p2", "m", "standard", { collection: "unknown" }),
		];
		const config: RouterConfig = { policies: [] };
		await expect(
			routeTask({ prompt: "secret", node: { sensitivity: "sensitive" } }, { config, models }),
		).rejects.toThrow(/No provider allowed for sensitive work: data collection must be one of "none"/);
	});
	test("normal task accepts unknown providers", async () => {
		const models = [candidate("p1", "m", "standard", { collection: "unknown" })];
		const config: RouterConfig = { policies: [] };
		const result = await routeTask({ prompt: "normal", node: { sensitivity: "normal" } }, { config, models });
		expect(result.chain.length).toBe(1);
		expect(result.chain[0]?.provider).toBe("p1");
	});
});

describe("new types and helpers", () => {
	test("tierRank ordering", () => {
		expect(tierRank("light")).toBe(0);
		expect(tierRank("standard")).toBe(1);
		expect(tierRank("strong")).toBe(2);
		expect(tierRank("custom", ["custom", "light"])).toBe(0);
	});

	test("TaskProfile includes difficulty field", () => {
		const profile: TaskProfile = {
			kind: "review",
			size: "small",
			needs: [],
			sensitivity: "normal",
			contextTokens: 0,
			difficulty: "easy",
		};
		expect(profile.difficulty).toBe("easy");
	});

	test("RouterConfig includes new optional fields", () => {
		const cfg: RouterConfig = {
			policies: [],
			capabilityTiers: [{ id: "c1", match: ["provider/model"] }],
			defaultTier: "c1",
			difficultyTiers: { easy: "c1", medium: "c2", hard: "c3" },
		};
		expect(cfg.capabilityTiers?.[0]?.id).toBe("c1");
		expect(cfg.defaultTier).toBe("c1");
		expect(cfg.difficultyTiers?.easy).toBe("c1");
	});

	test("ModelCapability includes capabilityTier", () => {
		const mc = candidate("prov", "mod", "standard", { capabilityTier: "c1" });
		expect(mc.capabilityTier).toBe("c1");
	});
});
