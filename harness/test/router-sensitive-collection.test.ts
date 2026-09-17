import { describe, expect, test } from "bun:test";
import { routeTask } from "../src/router/router.ts";
import type { ModelCapability, RouterConfig } from "../src/router/types.ts";

function model(provider: string, collection: ModelCapability["collection"]): ModelCapability {
	return {
		candidate: { provider, model: "m", account: "default" },
		contextWindow: 128_000,
		tools: true,
		reasoning: true,
		modalities: ["text"],
		quality: {},
		limitTier: "standard",
		collection,
	};
}

describe("sensitive data-collection diagnostics", () => {
	const config: RouterConfig = {
		policies: [],
		dataCollection: { sensitive: ["none"] },
	};

	test("keeps eligible providers and explains rejected candidates", async () => {
		const result = await routeTask(
			{ prompt: "review", node: { sensitivity: "sensitive" } },
			{ config, models: [model("private", "none"), model("logging", "logging")] },
		);
		expect(result.chain.map((candidate) => candidate.provider)).toEqual(["private"]);
		const rejected = result.ranked.find((candidate) => candidate.candidate.provider === "logging");
		expect(rejected).toMatchObject({
			status: "skipped",
			reason: 'data collection "logging" is not allowed for sensitive work',
		});
		expect(rejected?.details.join(" ")).toContain('allowed: "none"');
	});

	test("no-provider error names every rejected candidate and the configuration action", async () => {
		await expect(
			routeTask(
				{ prompt: "review", node: { sensitivity: "sensitive" } },
				{ config, models: [model("logging", "logging"), model("unknown", "unknown")] },
			),
		).rejects.toThrow(
			/logging\/m@default: data\.collection="logging" \(rejected\).*unknown\/m@default: data\.collection="unknown" \(rejected\).*router\.dataCollection\.sensitive.*provider data\.collection/s,
		);
	});
});
