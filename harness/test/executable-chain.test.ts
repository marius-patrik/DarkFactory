import { expect, test } from "bun:test";
import { executableChainFor } from "../src/cli.ts";
import type { RankedCandidate } from "../src/router/types.ts";

const candidate = (provider: string, model: string) => ({ provider, model, account: "plskynech" });
const ranked = (status: RankedCandidate["status"], provider: string, model: string, reason: string): RankedCandidate => ({
	candidate: candidate(provider, model), rank: 0, status, reason, score: 0, details: [],
});

test("limit-skipped candidates follow the chosen chain so the run can wait for them", () => {
	// Observed 2026-09-15: every chosen model was missing from its live catalog, the rate-limited ones were dropped and df exited 1.
	const route = {
		chain: [candidate("zai", "glm-4.7-flash"), candidate("deepseek", "deepseek-chat")],
		ranked: [
			ranked("skipped", "mistral", "mistral-medium-latest", "limited"),
			ranked("chosen", "zai", "glm-4.7-flash", "explicit selection"),
			ranked("skipped", "cline-gateway", "laguna", "quota exhausted until 2026-09-16T10:32:30.283Z"),
			ranked("skipped", "inception", "mercury-2", "capacity"),
			ranked("skipped", "novita", "tiny", "missing tools"),
			ranked("chosen", "deepseek", "deepseek-chat", "explicit selection"),
		],
	};
	expect(executableChainFor(route)).toEqual([
		candidate("zai", "glm-4.7-flash"),
		candidate("deepseek", "deepseek-chat"),
		candidate("mistral", "mistral-medium-latest"),
		candidate("cline-gateway", "laguna"),
		candidate("inception", "mercury-2"),
	]);
});

test("an empty chosen chain still runs the limit-skipped candidates, without duplicates", () => {
	const route = {
		chain: [],
		ranked: [ranked("skipped", "mistral", "m", "limited"), ranked("skipped", "mistral", "m", "capacity")],
	};
	expect(executableChainFor(route)).toEqual([candidate("mistral", "m")]);
});
