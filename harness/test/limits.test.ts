import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LimitLedger } from "../src/limits/ledger.ts";
import { observeLimits } from "../src/limits/observe.ts";
import { assessCandidate, orderCandidates, type TaskEstimate } from "../src/limits/routing.ts";
import type { LimitPolicyConfig } from "../src/providers/schema.ts";

const temporary: string[] = [];
const candidate = { provider: "google", account: "one", model: "flash" };
const policy: LimitPolicyConfig = {
	observe: true,
	standardHeaders: true,
	reserve: { requests: 1, tokens: 1_000 },
	defaults: [{ type: "rate", dimension: "tokens", limit: 250_000, windowMs: 60_000 }],
	bodyRules: [
		{ type: "monthly", regex: "monthly limit|billing cycle", resetAfterMs: 30 * 86_400_000 },
		{ type: "window", regex: "Resets in", durationRegex: "Resets in ([0-9hms]+)" },
	],
};

async function home(): Promise<string> {
	const path = await mkdtemp(join(process.cwd(), ".limits-"));
	temporary.push(path);
	return path;
}

afterEach(async () => {
	for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true });
});

describe("limit observation", () => {
	test("learns request and token capacity from successful standard headers", () => {
		const now = 1_700_000_000_000;
		const entries = observeLimits(candidate, { status: 200, headers: {
			"x-ratelimit-limit-requests": "50", "x-ratelimit-remaining-requests": "0", "x-ratelimit-reset-requests": "30s",
			"anthropic-ratelimit-tokens-limit": "250000", "anthropic-ratelimit-tokens-remaining": "50000", "anthropic-ratelimit-tokens-reset": new Date(now + 60_000).toISOString(),
		} }, policy, now);
		expect(entries.map((entry) => [entry.dimension, entry.remaining, entry.limit])).toEqual([
			["requests", 0, 50], ["tokens", 50_000, 250_000],
		]);
		expect(entries[0]?.resetAt).toBe(now + 30_000);
	});

	test("normalizes body windows, monthly 403s, and malformed input safely", () => {
		const now = Date.parse("2026-09-14T10:00:00Z");
		expect(observeLimits(candidate, { status: 429, body: "usage limit has been reached. Resets in 4h43m5s" }, policy, now)[0]).toMatchObject({ type: "window", resetAt: now + 16_985_000, source: "body" });
		expect(observeLimits(candidate, { status: 403, body: "monthly limit reached for billing cycle" }, policy, now)[0]?.type).toBe("monthly");
		expect(observeLimits(candidate, { status: 200, headers: { "x-ratelimit-remaining-requests": "wat" } }, policy, now)).toEqual([]);
	});

	test("parses a provider-configured clock-time recovery", () => {
		const now = new Date(2026, 8, 14, 7, 0, 0).getTime();
		const configured: LimitPolicyConfig = { observe: true, bodyRules: [{ type: "window", regex: "try again at" }] };
		expect(observeLimits(candidate, { status: 429, body: "Usage limit reached; try again at 7:50 AM" }, configured, now)[0]?.resetAt).toBe(new Date(2026, 8, 14, 7, 50, 0).getTime());
	});
});

describe("persisted limit ledger", () => {
	test("migrates quota.json and returns entries automatically after reset", async () => {
		const root = await home();
		await writeFile(join(root, "quota.json"), JSON.stringify({ version: 1, entries: {
			"google/flash@one": { ...candidate, kind: "rate_limited", markedAt: 1_000, resetAt: 2_000 },
		} }));
		const ledger = new LimitLedger(root);
		expect((await ledger.blocking(candidate, 1_500))[0]?.type).toBe("rate");
		expect(await ledger.blocking(candidate, 2_000)).toEqual([]);
		expect(await Bun.file(join(root, "limits.json")).exists()).toBe(true);
	});

	test("stores simultaneous request and token limits without overwriting", async () => {
		const ledger = new LimitLedger(await home());
		await ledger.record([
			{ ...candidate, type: "rate", dimension: "requests", observedAt: 1, resetAt: 100, source: "header", remaining: 0 },
			{ ...candidate, type: "rate", dimension: "tokens", observedAt: 1, resetAt: 100, source: "header", remaining: 20 },
		]);
		expect(await ledger.list()).toHaveLength(2);
	});

	test("manual clear is selector-scoped and audit logged", async () => {
		const root = await home();
		const ledger = new LimitLedger(root);
		await ledger.record([{ ...candidate, type: "daily", observedAt: 1, resetAt: 100, source: "rule", remaining: 0 }]);
		expect(await ledger.clear("google:one")).toBe(1);
		expect(await ledger.list()).toEqual([]);
		expect(await Bun.file(join(root, "limits-audit.jsonl")).text()).toContain('"action":"clear"');
	});

	test("an enabled probe can defer unknown-reset recovery", async () => {
		const ledger = new LimitLedger(await home(), { fallbackTtlMs: 100 });
		await ledger.record([{ ...candidate, type: "overload", observedAt: 1, resetAt: 2, source: "default", remaining: 0 }]);
		expect(await ledger.recover(2, async () => false)).toEqual([]);
		expect(await ledger.blocking(candidate, 50)).toHaveLength(1);
		expect(await ledger.recover(102, async () => true)).toHaveLength(1);
	});
});

describe("limit-aware routing", () => {
	const estimate: TaskEstimate = { size: "large", contextTokens: 120_000, expectedOutputTokens: 10_000, expectedSteps: 2 };
	test("120k context skips a 250k TPM model after 200k was used", () => {
		const verdict = assessCandidate(candidate, estimate, [{ ...candidate, type: "rate", dimension: "tokens", observedAt: 1, resetAt: 999_999, source: "header", remaining: 50_000, limit: 250_000 }], { contextWindow: 200_000, tier: "tight", reserve: policy.reserve });
		expect(verdict.eligible).toBe(false);
		expect(verdict.reason).toBe("capacity");
	});

	test("small work prefers tight tier while large work prefers bulk", () => {
		const chain = [{ provider: "bulk", account: "a", model: "big" }, { provider: "tight", account: "a", model: "small" }];
		const tiers = (item: typeof chain[number]) => item.provider === "tight" ? "tight" as const : "bulk" as const;
		expect(orderCandidates(chain, "small", tiers)[0]?.provider).toBe("tight");
		expect(orderCandidates(chain, "large", tiers)[0]?.provider).toBe("bulk");
	});
});
