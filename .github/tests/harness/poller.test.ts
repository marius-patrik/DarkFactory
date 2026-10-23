import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LimitLedger } from "../src/limits/ledger.ts";
import type { CatalogModel, ModelCatalog } from "../src/models/catalog.ts";
import { ModelPoller } from "../src/models/poller.ts";
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

async function poll(
	models: CatalogModel[],
	config: ProviderConfig = provider(),
	ledger?: LimitLedger,
	options: { account?: string; excludeGlobs?: string[] } = {},
) {
	return new ModelPoller({
		catalog: catalog(models),
		providers: [config],
		accounts: new Map(),
		ledger,
		excludeGlobs: options.excludeGlobs,
	}).poll(config.id, options.account ?? "default");
}

function stubLedger(
	ledger: LimitLedger,
	entries: Array<{ provider: string; account: string; model: string; type: string; resetAt: number }>,
): LimitLedger {
	ledger.list = async () => entries as any;
	ledger.forCandidate = async (candidate, now = Date.now()) =>
		entries.filter(
			(entry) =>
				entry.provider === candidate.provider &&
				entry.account === candidate.account &&
				entry.model === candidate.model &&
				entry.resetAt > now,
		) as any;
	return ledger;
}

describe("ModelPoller", () => {
	test("includes text-generation capable models and excludes image-only non-chat models", async () => {
		const result = await poll([
			{ id: "imagen", name: "imagen", modalities: ["image"] },
			{ id: "text-model", name: "Text Model", modalities: ["text"] },
		]);
		expect(result.usable.map((model) => model.id)).toEqual(["text-model"]);
	});

	test("excludes learned unavailable models via ledger", async () => {
		const dir = mkdtempSync(join(tmpdir(), "poller-test-"));
		const ledger = stubLedger(new LimitLedger(dir), [
			{ provider: "provider", account: "default", model: "text-model", type: "model", resetAt: Date.now() + 60_000 },
		]);
		const result = await poll([{ id: "text-model", name: "Text Model", modalities: ["text"] }], provider(), ledger);
		expect(result.usable).toEqual([]);
		rmSync(dir, { recursive: true, force: true });
	});

	test("excludes models matching routing exclude globs (model id only)", async () => {
		const result = await poll(
			[
				{ id: "model-a", name: "Model A", modalities: ["text"] },
				{ id: "other", name: "Other", modalities: ["text"] },
			],
			provider({ routing: { exclude: ["model-*"] } }),
		);
		expect(result.usable.map((model) => model.id)).toEqual(["other"]);
	});

	test("uses models.static only as context window and tier hints", async () => {
		const result = await poll(
			[{ id: "live-model", name: "Live Model", modalities: ["text"] }],
			provider({ models: { static: [{ id: "live-model", contextWindow: 1234, tier: "bulk" }] } }),
		);
		expect(result.usable as Array<CatalogModel & { contextWindow?: number; tier?: string }>).toEqual([
			{ id: "live-model", name: "Live Model", modalities: ["text"], contextWindow: 1234, tier: "bulk" },
		]);
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
			provider(),
		);
		expect(result.usable.map((model) => model.id)).toEqual(["model-paid", "model-free"]);
	});

	test("no pricing metadata includes all text models", async () => {
		const result = await poll(
			[
				{ id: "model-a", name: "Model A", modalities: ["text"] },
				{ id: "model-b", name: "Model B", modalities: ["text"] },
			],
			provider(),
		);
		expect(result.usable.map((model) => model.id)).toEqual(["model-a", "model-b"]);
	});

	test("excludes non-chat family models", async () => {
		const result = await poll([
			{ id: "gemini-embedding-001", name: "Gemini Embedding", modalities: ["embed"] },
			{ id: "text-embedding-3-small", name: "Text Embedding", modalities: ["embed"] },
			{ id: "gpt-image-1", name: "GPT Image", modalities: ["image"] },
			{ id: "whisper-large-v3", name: "Whisper", modalities: ["audio"] },
			{ id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", modalities: ["text"] },
			{ id: "llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct", modalities: ["text"] },
		]);
		expect(result.usable.map((model) => model.id)).toEqual(["gemini-3.8-flash", "llama-3.3-70b-instruct"]);
	});

	test("glob *-preview excludes gemini-3-flash-preview by model id", async () => {
		const result = await poll(
			[
				{ id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview", modalities: ["text"] },
				{ id: "gemini-3.8-flash", name: "Gemini 3.8", modalities: ["text"] },
			],
			provider({ routing: { exclude: ["*-preview"] } }),
		);
		expect(result.usable.map((model) => model.id)).toEqual(["gemini-3.8-flash"]);
	});

	test("ledger model entry excludes only that model", async () => {
		const dir = mkdtempSync(join(tmpdir(), "poller-test-"));
		const ledger = stubLedger(new LimitLedger(dir), [
			{ provider: "provider", account: "default", model: "other", type: "model", resetAt: Date.now() + 60_000 },
		]);
		const result = await poll(
			[
				{ id: "model-a", name: "Model A", modalities: ["text"] },
				{ id: "other", name: "Other", modalities: ["text"] },
			],
			provider(),
			ledger,
		);
		expect(result.usable.map((model) => model.id)).toEqual(["model-a"]);
		rmSync(dir, { recursive: true, force: true });
	});

	test("ledger billing entry excludes all models of that account", async () => {
		const dir = mkdtempSync(join(tmpdir(), "poller-test-"));
		const ledger = stubLedger(new LimitLedger(dir), [
			{ provider: "provider", account: "default", model: "some", type: "billing", resetAt: Date.now() + 60_000 },
		]);
		const result = await poll(
			[
				{ id: "model-a", name: "Model A", modalities: ["text"] },
				{ id: "other", name: "Other", modalities: ["text"] },
			],
			provider(),
			ledger,
		);
		expect(result.usable).toEqual([]);
		rmSync(dir, { recursive: true, force: true });
	});

	test("expired ledger entry excludes nothing", async () => {
		const dir = mkdtempSync(join(tmpdir(), "poller-test-"));
		const ledger = stubLedger(new LimitLedger(dir), [
			{ provider: "provider", account: "default", model: "model-a", type: "model", resetAt: Date.now() - 60_000 },
		]);
		const result = await poll(
			[
				{ id: "model-a", name: "Model A", modalities: ["text"] },
				{ id: "other", name: "Other", modalities: ["text"] },
			],
			provider(),
			ledger,
		);
		expect(result.usable.map((model) => model.id)).toEqual(["model-a", "other"]);
		rmSync(dir, { recursive: true, force: true });
	});
});
