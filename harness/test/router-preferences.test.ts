import { describe, expect, test } from "bun:test";
import type { ModelCapability, RouterConfig } from "@darkfactory/protocol/model";
import { routeTask } from "../src/router/router.ts";

/** A model in the live catalogue. */
function candidate(
	provider: string,
	model: string,
	limitTier: ModelCapability["limitTier"],
	options: Partial<ModelCapability> = {},
): ModelCapability {
	return {
		candidate: { provider, model, account: "default" },
		contextWindow: 1_000_000,
		tools: true,
		reasoning: true,
		modalities: ["text"],
		quality: { chat: 50 },
		limitTier,
		collection: "none",
		...options,
	};
}

const dataCollection = { normal: ["none", "unknown"], sensitive: ["none"] };

/**
 * A catalogue that includes two Space Bunny builds, neither of which any configuration names by
 * id — only by prefix — plus paid and free alternatives.
 */
const catalogue = [
	candidate("google", "gemini-3.8-flash", "standard"),
	candidate("opencode-zen", "space-bunny-free", "bulk"),
	candidate("kilo-gateway", "stealth/space-bunny-alpha", "bulk"),
	candidate("groq", "openai/gpt-oss-120b", "bulk"),
	candidate("anthropic", "claude-opus-4-8", "tight"),
];

describe("soft routing preferences", () => {
	test("a named model prefix outranks the rest of the live catalogue", async () => {
		const config: RouterConfig = {
			policies: [{ id: "p", match: { sensitivity: ["normal"] }, prefer: { preferModels: ["space-bunny"] } }],
			dataCollection,
		};
		const route = await routeTask(
			{ prompt: "explain this", node: { sensitivity: "normal" } },
			{ config, models: catalogue },
		);
		// Both Space Bunny builds are reachable from one declared prefix, including the nested
		// `stealth/space-bunny-alpha` id a provider published after the configuration was written.
		const chosen = route.chain.slice(0, 2).map((entry) => entry.model);
		expect(chosen).toContain("space-bunny-free");
		expect(chosen).toContain("stealth/space-bunny-alpha");
	});

	test("preferences rank first without excluding anything", async () => {
		const config: RouterConfig = {
			policies: [{ id: "p", match: { sensitivity: ["normal"] }, prefer: { preferProviders: ["groq"] } }],
			dataCollection,
		};
		const route = await routeTask(
			{ prompt: "explain this", node: { sensitivity: "normal" } },
			{ config, models: catalogue },
		);
		// Groq is tried first...
		expect(route.chain[0]?.provider).toBe("groq");
		// ...and every other model is still a live fallback rather than being filtered out.
		expect(route.ranked.length).toBe(catalogue.length);
	});

	test("a soft preference resolves against the catalogue, not a declared chain", async () => {
		const config: RouterConfig = {
			policies: [{ id: "p", match: { sensitivity: ["normal"] }, prefer: { preferModels: ["space-bunny"] } }],
			dataCollection,
		};
		const route = await routeTask(
			{ prompt: "explain this", node: { sensitivity: "normal" } },
			{ config, models: catalogue, defaultChain: "google/gemini-3.8-flash@default" },
		);
		// A declared chain is a ceiling: had it been used, no model published after it was written
		// would be visible at all.
		expect(route.ranked.map((entry) => entry.candidate.model)).toContain("space-bunny-free");
	});

	test("without a preference the declared chain is still the ceiling", async () => {
		const config: RouterConfig = { policies: [], dataCollection };
		const route = await routeTask(
			{ prompt: "explain this", node: { sensitivity: "normal" } },
			{ config, models: catalogue, defaultChain: "google/gemini-3.8-flash@default" },
		);
		expect(route.chain.map((entry) => entry.model)).toEqual(["gemini-3.8-flash"]);
	});

	test("preferFree puts zero-cost models ahead without excluding paid ones", async () => {
		const config: RouterConfig = {
			policies: [{ id: "p", match: { sensitivity: ["normal"] }, prefer: { preferFree: true } }],
			dataCollection,
		};
		const route = await routeTask(
			{ prompt: "explain this", node: { sensitivity: "normal" } },
			{ config, models: catalogue },
		);
		const top = route.ranked[0]?.candidate.model ?? "";
		expect(catalogue.find((m) => m.candidate.model === top)?.limitTier).toBe("bulk");
		expect(route.ranked.length).toBe(catalogue.length);
	});

	test("declared order is the precedence, not whether the match was exact", async () => {
		const config: RouterConfig = {
			policies: [
				{ id: "p", match: { sensitivity: ["normal"] }, prefer: { preferModels: ["space-bunny", "space-bunny-free"] } },
			],
			dataCollection,
		};
		const route = await routeTask(
			{ prompt: "explain this", node: { sensitivity: "normal" } },
			{ config, models: catalogue },
		);
		// `space-bunny` is listed first, so the family it names wins even though
		// `space-bunny-free` would have matched exactly. Whoever writes the list decides.
		expect(route.chain[0]?.model).toBe("stealth/space-bunny-alpha");
	});

	test("a sensitive policy still refuses a model that trains on prompts", async () => {
		const models = [
			candidate("google", "gemini-3.8-flash", "standard"),
			candidate("opencode-zen", "space-bunny-free", "bulk"),
			candidate("anthropic", "claude-opus-4-8", "tight", { collection: "training" }),
		];
		const config: RouterConfig = {
			policies: [
				{ id: "normal", match: { sensitivity: ["normal"] }, prefer: { preferModels: ["space-bunny"] } },
				{ id: "sensitive", match: { sensitivity: ["sensitive"] }, prefer: { preferFree: false } },
			],
			dataCollection,
		};
		const route = await routeTask({ prompt: "explain this", node: { sensitivity: "sensitive" } }, { config, models });
		expect(route.ranked.map((entry) => entry.candidate.model)).not.toContain("claude-opus-4-8");
	});
});
