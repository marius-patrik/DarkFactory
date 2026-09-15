import { describe, expect, test } from "bun:test";
import type { ModelCatalog } from "../src/models/catalog.ts";
import { ModelPoller } from "../src/models/poller.ts";
import type { ProviderConfig } from "../src/providers/schema.ts";
import { buildRouterCatalog } from "../src/router/catalog.ts";
import { routeTask } from "../src/router/router.ts";
import type { ModelCapability, RouterConfig } from "../src/router/types.ts";

const provider = (extra: Partial<ProviderConfig> = {}): ProviderConfig => ({
	id: "provider",
	name: "Provider",
	dialect: "openai-completions",
	baseUrl: "https://example.invalid",
	auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
	requiredCredentialSlots: ["api_key"],
	models: { static: [{ id: "gpt-good", contextWindow: 64_000, tier: "tight" }, { id: "gpt-excluded", tier: "bulk" }] },
	capabilities: { tools: true, reasoning: true, images: false },
	...extra,
});

const config: RouterConfig = { policies: [{ id: "all", match: {}, prefer: { tiers: ["tight", "standard", "bulk"] } }] };
const capability = (model: string): ModelCapability => ({ candidate: { provider: "provider", model, account: "default" }, contextWindow: 128_000, tools: true, reasoning: true, modalities: ["text"], quality: {}, limitTier: "standard" });

describe("router catalog ModelPoller integration", () => {
	test("Router catalog uses usable models from ModelPoller", async () => {
		const poller = new ModelPoller({
			catalog: { get: async () => ({ provider: "provider", source: "live", models: [
				{ id: "gpt-good", name: "GPT Good" },
				{ id: "gpt-unavailable", name: "GPT Unavailable" },
				{ id: "gpt-excluded", name: "GPT Excluded" },
			] }) } as unknown as ModelCatalog,
			providers: [provider({ routing: { exclude: ["provider/gpt-excluded"] } })],
			accounts: new Map([["provider", ["default"]]]),
			learnedUnavailable: new Set(["provider/gpt-unavailable"]),
		});
		const models = await buildRouterCatalog({ providers: [provider({ routing: { exclude: ["provider/gpt-excluded"] } })], modelPoller: poller });
		expect(models.map((model) => model.candidate.model)).toEqual(["gpt-good"]);
		expect(models[0]?.contextWindow).toBe(64_000);
		expect(models[0]?.limitTier).toBe("tight");
	});

	test("Router excludes models matching config globs", async () => {
		const poller = new ModelPoller({
			catalog: { get: async () => ({ provider: "provider", source: "live", models: [{ id: "gpt-good", name: "GPT Good" }, { id: "gpt-excluded", name: "GPT Excluded" }] }) } as unknown as ModelCatalog,
			providers: [provider({ routing: { exclude: ["provider/*excluded"] } })],
			accounts: new Map([["provider", ["default"]]]),
		});
		const models = await buildRouterCatalog({ providers: [provider({ routing: { exclude: ["provider/*excluded"] } })], modelPoller: poller });
		const result = await routeTask({ prompt: "Summarize this" }, { config, models });
		expect(result.chain.map((candidate) => candidate.model)).toEqual(["gpt-good"]);
	});

	test("Router falls back to current behavior when no ModelPoller is provided", async () => {
		const result = await routeTask({ prompt: "Summarize this" }, { config, models: [capability("gpt-excluded"), capability("gpt-good")] });
		expect(result.chain.map((candidate) => candidate.model)).toEqual(["gpt-excluded", "gpt-good"]);
	});
});
