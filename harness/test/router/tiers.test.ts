import { describe, expect, test } from "bun:test";
import type { ProviderConfig } from "../../src/providers/schema.ts";
import { buildRouterCatalog } from "../../src/router/catalog.ts";
import { capabilityTierFor, tierRank } from "../../src/router/tiers.ts";
import type { CapabilityTier } from "../../src/router/types.ts";

describe("capabilityTierFor", () => {
	const tiers: readonly CapabilityTier[] = [
		{ id: "light", match: ["*flash-lite*"] },
		{ id: "standard", match: ["*flash*"] },
		{ id: "strong", match: ["*pro*", "*ultra*"] },
	];

	test("matches google/gemini-3.5-flash-lite to light tier", () => {
		expect(capabilityTierFor({ provider: "google", model: "gemini-3.5-flash-lite" }, tiers, "default")).toBe("light");
	});

	test("first matching tier wins when multiple match", () => {
		// Both light and standard match flash-lite, but light comes first
		expect(capabilityTierFor({ provider: "google", model: "gemini-3.5-flash-lite" }, tiers, "default")).toBe("light");
	});

	test("unmatched model gets default tier", () => {
		expect(capabilityTierFor({ provider: "openai", model: "gpt-4" }, tiers, "default")).toBe("default");
	});

	test("undefined tiers returns default", () => {
		expect(capabilityTierFor({ provider: "google", model: "model" }, undefined, "default")).toBe("default");
	});

	test("empty tiers array returns default", () => {
		expect(capabilityTierFor({ provider: "google", model: "model" }, [], "default")).toBe("default");
	});
});

describe("tierRank", () => {
	const tiers: readonly CapabilityTier[] = [
		{ id: "light", match: [] },
		{ id: "standard", match: [] },
		{ id: "strong", match: [] },
	];

	test("orders tiers by index", () => {
		expect(tierRank("light", tiers)).toBe(0);
		expect(tierRank("standard", tiers)).toBe(1);
		expect(tierRank("strong", tiers)).toBe(2);
	});

	test("returns -1 for unknown tier", () => {
		expect(tierRank("unknown", tiers)).toBe(-1);
	});

	test("returns -1 for undefined tier", () => {
		expect(tierRank(undefined, tiers)).toBe(-1);
	});

	test("returns -1 for undefined tiers", () => {
		expect(tierRank("light", undefined)).toBe(-1);
	});
});

describe("buildRouterCatalog with capability tiers", () => {
	const providers: readonly ProviderConfig[] = [
		{
			id: "google",
			name: "Google",
			dialect: "google-generative-ai",
			baseUrl: "https://generativelanguage.googleapis.com",
			auth: [{ kind: "api_key", slot: "api_key", placement: "header" }],
			requiredCredentialSlots: [],
			models: { static: [{ id: "gemini-3.5-flash-lite", tier: "standard" }] },
			capabilities: { tools: true, reasoning: true, images: true },
		},
		{
			id: "openai",
			name: "OpenAI",
			dialect: "openai-completions",
			baseUrl: "https://api.openai.com",
			auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
			requiredCredentialSlots: [],
			models: { static: [{ id: "gpt-4", tier: "standard" }] },
			capabilities: { tools: true, reasoning: true, images: true },
		},
	];

	const capabilityTiers: readonly CapabilityTier[] = [
		{ id: "light", match: ["*flash-lite*"] },
		{ id: "standard", match: ["*flash*", "*gpt*"] },
		{ id: "strong", match: ["*pro*"] },
	];

	test("sets capabilityTier on each model based on match", () => {
		const models = buildRouterCatalog({
			providers,
			capabilityTiers,
			defaultTier: "default",
		});

		expect(models[0]?.capabilityTier).toBe("light"); // google/gemini-3.5-flash-lite matches *flash-lite*
		expect(models[1]?.capabilityTier).toBe("standard"); // openai/gpt-4 matches *gpt*
	});

	test("config override wins over capabilityTier", () => {
		const models = buildRouterCatalog({
			providers,
			capabilityTiers,
			defaultTier: "default",
			overrides: { "google/gemini-3.5-flash-lite": { capabilityTier: "strong" } },
		});

		expect(models[0]?.capabilityTier).toBe("strong"); // override wins
		expect(models[1]?.capabilityTier).toBe("standard"); // no override
	});

	test("defaults to standard when capabilityTiers undefined", () => {
		const models = buildRouterCatalog({
			providers,
			defaultTier: "standard",
		});

		// Without capabilityTiers, capabilityTier should be assigned by the function using defaults
		// Since tiers is undefined, it returns defaultTier which is "standard"
		expect(models[0]?.capabilityTier).toBe("standard");
		expect(models[1]?.capabilityTier).toBe("standard");
	});
});
