import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LimitLedger } from "../src/limits/ledger.ts";
import { defaultLimit, mergeReset, observeLimits } from "../src/limits/observe.ts";
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
		const entries = observeLimits(
			candidate,
			{
				status: 200,
				headers: {
					"x-ratelimit-limit-requests": "50",
					"x-ratelimit-remaining-requests": "0",
					"x-ratelimit-reset-requests": "30s",
					"anthropic-ratelimit-tokens-limit": "250000",
					"anthropic-ratelimit-tokens-remaining": "50000",
					"anthropic-ratelimit-tokens-reset": new Date(now + 60_000).toISOString(),
				},
			},
			policy,
			now,
		);
		expect(entries.map((entry) => [entry.dimension, entry.remaining, entry.limit])).toEqual([
			["requests", 0, 50],
			["tokens", 50_000, 250_000],
		]);
		expect(entries[0]?.resetAt).toBe(now + 30_000);
	});

	test("normalizes body windows, monthly 403s, and malformed input safely", () => {
		const now = Date.parse("2026-09-14T10:00:00Z");
		expect(
			observeLimits(
				candidate,
				{ status: 429, body: "usage limit has been reached. Resets in 4h43m5s" },
				policy,
				now,
			)[0],
		).toMatchObject({ type: "window", resetAt: now + 16_985_000, source: "body" });
		expect(
			observeLimits(candidate, { status: 403, body: "monthly limit reached for billing cycle" }, policy, now)[0]?.type,
		).toBe("monthly");
		expect(
			observeLimits(candidate, { status: 200, headers: { "x-ratelimit-remaining-requests": "wat" } }, policy, now),
		).toEqual([]);
	});

	test("parses a provider-configured clock-time recovery", () => {
		const now = new Date(2026, 8, 14, 7, 0, 0).getTime();
		const configured: LimitPolicyConfig = { observe: true, bodyRules: [{ type: "window", regex: "try again at" }] };
		expect(
			observeLimits(candidate, { status: 429, body: "Usage limit reached; try again at 7:50 AM" }, configured, now)[0]
				?.resetAt,
		).toBe(new Date(2026, 8, 14, 7, 50, 0).getTime());
	});
});

describe("persisted limit ledger", () => {
	test("migrates quota.json and returns entries automatically after reset", async () => {
		const root = await home();
		await writeFile(
			join(root, "quota.df"),
			JSON.stringify({
				version: 1,
				entries: {
					"google/flash@one": { ...candidate, kind: "rate_limited", markedAt: 1_000, resetAt: 2_000 },
				},
			}),
		);
		const ledger = new LimitLedger(root);
		expect((await ledger.blocking(candidate, 1_500))[0]?.type).toBe("rate");
		expect(await ledger.blocking(candidate, 2_000)).toEqual([]);
		expect(await Bun.file(join(root, "limits.df")).exists()).toBe(true);
	});

	test("stores simultaneous request and token limits without overwriting", async () => {
		const ledger = new LimitLedger(await home());
		await ledger.record([
			{
				...candidate,
				type: "rate",
				dimension: "requests",
				observedAt: 1,
				resetAt: 100,
				source: "header",
				remaining: 0,
			},
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
		expect(await Bun.file(join(root, "limits-audit.df")).text()).toContain('"action":"clear"');
	});

	test("an enabled probe can defer unknown-reset recovery", async () => {
		const ledger = new LimitLedger(await home(), { fallbackTtlMs: 100 });
		await ledger.record([
			{ ...candidate, type: "overload", observedAt: 1, resetAt: 2, source: "default", remaining: 0 },
		]);
		expect(await ledger.recover(2, async () => false)).toEqual([]);
		expect(await ledger.blocking(candidate, 50)).toHaveLength(1);
		// Backed off: the next probe is after twice the last window, not after the fallback TTL.
		expect(await ledger.recover(102, async () => true)).toEqual([]);
		expect(await ledger.recover(202, async () => true)).toHaveLength(1);
	});
});

describe("limit-aware routing", () => {
	const estimate: TaskEstimate = {
		size: "large",
		contextTokens: 120_000,
		expectedOutputTokens: 10_000,
		expectedSteps: 2,
	};
	test("120k context skips a 250k TPM model after 200k was used", () => {
		const verdict = assessCandidate(
			candidate,
			estimate,
			[
				{
					...candidate,
					type: "rate",
					dimension: "tokens",
					observedAt: 1,
					resetAt: 999_999,
					source: "header",
					remaining: 50_000,
					limit: 250_000,
				},
			],
			{ contextWindow: 200_000, tier: "tight", reserve: policy.reserve },
		);
		expect(verdict.eligible).toBe(false);
		expect(verdict.reason).toBe("capacity");
	});

	test("small work prefers tight tier while large work prefers bulk", () => {
		const chain = [
			{ provider: "bulk", account: "a", model: "big" },
			{ provider: "tight", account: "a", model: "small" },
		];
		const tiers = (item: (typeof chain)[number]) =>
			item.provider === "tight" ? ("tight" as const) : ("bulk" as const);
		expect(orderCandidates(chain, "small", tiers)[0]?.provider).toBe("tight");
		expect(orderCandidates(chain, "large", tiers)[0]?.provider).toBe("bulk");
	});
});

describe("limits reset when the provider says, not on a short timer", () => {
	// Observed 2026-09-14: OpenRouter reported its free daily limit with an exact reset, Groq and
	// opencode-zen hit daily limits, and df recorded resets 191-755 seconds out, so the lanes kept
	// retrying exhausted models ("blind cycling").
	const openRouterDaily =
		'429: {"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day","code":429,"metadata":{"headers":{"X-RateLimit-Limit":"50","X-RateLimit-Remaining":"0","X-RateLimit-Reset":"1789430400000"},"limit_source":"openrouter_free_tier_daily"}}';
	const now = Date.UTC(2026, 8, 14, 17, 40, 0);

	test("a reset embedded in an error body is used, and per-day wording makes it daily", () => {
		const entries = observeLimits(
			{ provider: "openrouter", account: "default", model: "m" },
			{ status: 429, body: openRouterDaily },
			{ observe: true, standardHeaders: true },
			now,
		);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			type: "daily",
			resetAt: 1789430400000,
			remaining: 0,
			limit: 50,
			source: "body",
		});
	});

	test("a short rule reset never shortens a later reset the provider reported", () => {
		expect(mergeReset(now + 60_000, 1789430400000)).toBe(1789430400000);
		expect(mergeReset(now + 60_000, undefined)).toBe(now + 60_000);
	});

	test("a daily limit without a reported reset lasts until the provider's daily boundary", () => {
		const utc = defaultLimit(
			{ provider: "groq", account: "default", model: "m" },
			"daily",
			now,
			undefined,
			undefined,
			undefined,
			{ observe: true },
		);
		expect(utc.resetAt).toBe(Date.UTC(2026, 8, 15, 0, 0, 0));
		const pacific = defaultLimit(
			{ provider: "google", account: "default", model: "m" },
			"daily",
			now,
			undefined,
			undefined,
			undefined,
			{ observe: true, dailyReset: "pacific-midnight" },
		);
		expect(pacific.resetAt).toBe(Date.UTC(2026, 8, 15, 7, 0, 0));
	});

	test("a per-day quota body with a seconds retry hint holds until the daily roll-over", () => {
		// Observed 2026-09-14: Gemini PerDay 429s carry "retryDelay": "4s"; df recorded resets 4 s out and kept re-sending.
		const geminiDaily =
			'{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"4s"}]}}';
		const google: LimitPolicyConfig = {
			observe: true,
			dailyReset: "pacific-midnight",
			bodyRules: [{ type: "daily", dimension: "requests", regex: "PerDay" }],
		};
		const [entry] = observeLimits(
			{ provider: "google", account: "key2", model: "gemini-3.6-flash" },
			{ status: 429, body: geminiDaily },
			google,
			now,
		);
		expect(entry).toMatchObject({ type: "daily", source: "body", resetAt: Date.UTC(2026, 8, 15, 7, 0, 0) });
		const perMinute = geminiDaily.replace(
			"GenerateRequestsPerDayPerProjectPerModel-FreeTier",
			"GenerateRequestsPerMinutePerProjectPerModel-FreeTier",
		);
		const rate: LimitPolicyConfig = {
			observe: true,
			dailyReset: "pacific-midnight",
			bodyRules: [{ type: "rate", dimension: "requests", regex: "PerMinute" }],
		};
		expect(
			observeLimits(
				{ provider: "google", account: "key2", model: "gemini-3.6-flash" },
				{ status: 429, body: perMinute },
				rate,
				now,
			)[0],
		).toMatchObject({ type: "rate", resetAt: now + 4_000 });
	});

	test("a failed recovery probe backs off instead of retrying on the fallback timer", async () => {
		const ledger = new LimitLedger(await home(), { fallbackTtlMs: 100 });
		await ledger.record([
			{ ...candidate, type: "overload", observedAt: 0, resetAt: 1_000, source: "default", remaining: 0 },
		]);
		expect(await ledger.recover(1_000, async () => false)).toEqual([]);
		const [first] = await ledger.list();
		expect(first!.resetAt - 1_000).toBeGreaterThanOrEqual(2_000);
		expect(await ledger.recover(first!.resetAt, async () => false)).toEqual([]);
		const [second] = await ledger.list();
		expect(second!.resetAt - first!.resetAt).toBeGreaterThanOrEqual(2 * (first!.resetAt - 1_000));
	});
});
