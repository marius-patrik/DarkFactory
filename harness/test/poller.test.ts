import { describe, expect, test } from "bun:test";
import { ModelPoller } from "../src/models/poller.ts";
import type { CatalogModel, ModelCatalog } from "../src/models/catalog.ts";
import type { ProviderConfig } from "../src/providers/schema.ts";

function catalog(models: CatalogModel[]): ModelCatalog {
	return { get: async (provider: string) => ({ provider, models, source: "live" as const }) } as ModelCatalog;
}

function provider(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
	return {
		id: "provider",
		name: "Provider",
		dialect: "openai-responses",
		baseUrl: "https://example.invalid",
		auth: [{ kind: "api_key", slot: "api", placement: "bearer" }],
		requiredCredentialSlots: ["api"],
		models: { static: [{ id: "text-model" }] },
		capabilities: { tools: false, reasoning: false, images: false },
		...overrides,
	};
}

async function poll(models: CatalogModel[], config: ProviderConfig = provider(), learnedUnavailable = new Set<string>()) {
	return new ModelPoller({ catalog: catalog(models), providers: [config], accounts: new Map(), learnedUnavailable }).poll(config.id);
}

describe("ModelPoller", () => {
	test("includes text-generation capable models and excludes image-only non-chat models", async () => {
		const result = await poll([
			{ id: "imagen", name: "imagen", modalities: ["image"] },
			{ id: "text-model", name: "Text Model", modalities: ["text"] },
		]);
		expect(result.usable.map((model) => model.id)).toEqual(["text-model"]);
	});

	test("excludes learned unavailable models", async () => {
		const result = await poll(
			[{ id: "text-model", name: "Text Model", modalities: ["text"] }],
			provider(),
			new Set(["provider/text-model"]),
		);
		expect(result.usable).toEqual([]);
	});

	test("excludes models matching routing exclude globs", async () => {
		const result = await poll(
			[{ id: "model-a", name: "Model A", modalities: ["text"] }, { id: "other", name: "Other", modalities: ["text"] }],
			provider({ routing: { exclude: ["provider/model-*"] } }),
		);
		expect(result.usable.map((model) => model.id)).toEqual(["other"]);
	});

	test("uses models.static only as context window and tier hints", async () => {
		const result = await poll(
			[{ id: "live-model", name: "Live Model", modalities: ["text"] }],
			provider({ models: { static: [{ id: "live-model", contextWindow: 1234, tier: "bulk" }] } }),
		);
		expect(result.usable as Array<CatalogModel & { contextWindow?: number; tier?: string }>).toEqual([{ id: "live-model", name: "Live Model", modalities: ["text"], contextWindow: 1234, tier: "bulk" }]);
	});

	test("reports stale declared model ids missing from live catalog", async () => {
		const result = await poll(
			[{ id: "live-model", name: "Live Model", modalities: ["text"] }],
			provider({ models: { static: [{ id: "live-model" }, { id: "missing-model" }] } }),
		);
		expect(result.stale).toEqual(["missing-model"]);
	});

	test("free model filtering: free-tier account", async () => {
		const result = await poll(
			[
				{ id: "model-paid", name: "Paid Model", modalities: ["text"], pricing: { prompt: "0.001" } },
				{ id: "model-free", name: "Free Model", modalities: ["text"], pricing: { prompt: "0" } },
				{ id: "model:free", name: "Free ID Model", modalities: ["text"], pricing: {} },
			],
			provider({ free: { kind: "permanent", keyUrl: "https://example.com" } }),
		);
		expect(result.usable.map((model) => model.id)).toEqual(["model-free", "model:free"]);
	});

	test("paid account includes all models regardless of pricing", async () => {
		const result = await poll(
			[
				{ id: "model-paid", name: "Paid Model", modalities: ["text"], pricing: { prompt: "0.001" } },
				{ id: "model-free", name: "Free Model", modalities: ["text"], pricing: { prompt: "0" } },
			],
			provider()
		);
		expect(result.usable.map((model) => model.id)).toEqual(["model-paid", "model-free"]);
	});

	test("no pricing metadata includes all text models", async () => {
		const result = await poll(
			[
				{ id: "model-a", name: "Model A", modalities: ["text"] },
				{ id: "model-b", name: "Model B", modalities: ["text"] },
			],
			provider()
		);
		expect(result.usable.map((model) => model.id)).toEqual(["model-a", "model-b"]);
	});

});
