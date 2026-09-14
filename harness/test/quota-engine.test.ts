import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { QuotaEngine } from "../src/limits/quota-engine.ts";
import { LimitLedger } from "../src/limits/ledger.ts";
import { loadProviderConfig } from "../src/providers/schema.ts";
import { defaultDfHome } from "../src/credentials.ts";

describe("Quota Engine", () => {
	let testHome: string;
	let ledger: LimitLedger;
	let engine: QuotaEngine;
	let providerConfigs: Awaited<ReturnType<typeof loadProviderConfig>>;

	beforeEach(async () => {
		testHome = await mkdtemp(join(tmpdir(), "df-quota-test-"));
		ledger = new LimitLedger(testHome);
		providerConfigs = await loadProviderConfig(testHome);
		engine = new QuotaEngine(testHome, ledger, new Map(providerConfigs.providers.map((p) => [p.id, p])));
	});

	afterEach(async () => {
		await rm(testHome, { recursive: true, force: true });
	});

	it("1. parses declared limits from provider config", async () => {
		const google = providerConfigs.providers.find((p) => p.id === "google");
		expect(google).toBeDefined();
		expect(google?.limits?.declared).toBeDefined();
		const rpm = google?.limits?.declared?.find((d) => d.type === "rate" && d.dimension === "requests");
		expect(rpm).toBeDefined();
		expect(rpm?.limit).toBe(5);
		expect(rpm?.source).toBe("docs");
		expect(rpm?.reset).toBe("rolling");
	});

	it("2. rolling window counting under concurrency (two parallel tasks)", async () => {
		const candidate = { provider: "google", account: "default", model: "gemini-3.8-flash" };
		const now = Date.now();

		await Promise.all([
			engine.record({ provider: "google", account: "default", model: "gemini-3.8-flash", timestamp: now - 10_000, inputTokens: 100, outputTokens: 50, success: true }),
			engine.record({ provider: "google", account: "default", model: "gemini-3.8-flash", timestamp: now - 5_000, inputTokens: 200, outputTokens: 100, success: true }),
		]);

		const reqCount = await engine.queryUsage(candidate, 60_000, "requests", undefined, now);
		expect(reqCount).toBe(2);

		const tokenCount = await engine.queryUsage(candidate, 60_000, "tokens", undefined, now);
		expect(tokenCount).toBe(450); // 100+50 + 200+100
	});

	it("3. admission control: 5 requests at t0..t4 (1s apart) with 5 RPM -> 6th at t5 waits until t0+60s exactly", async () => {
		const candidate = { provider: "google", account: "default", model: "gemini-3.8-flash" };
		const now = Date.now();

		// 5 requests at t0..t4 (1s apart), recorded relative to now
		for (let i = 0; i < 5; i++) {
			await engine.record({ provider: "google", account: "default", model: "gemini-3.8-flash", timestamp: now - 1_000 * i, inputTokens: 10, outputTokens: 10, success: true });
		}

		const verdict = await engine.admit(candidate, undefined, now);
		expect(verdict.decision).toBe("wait");
		// Oldest request is at now-4s; with the google reserve of 1 request the second-oldest (now-3s) must leave the window.
		expect(verdict.waitUntil! - now).toBe(57_000);
	});

	it("3b. usage pruning: events older than 24h are pruned on record, counts unchanged", async () => {
		const candidate = { provider: "google", account: "default", model: "gemini-3.8-flash" };
		const now = Date.now();

		// Record an old event (> 24h old, e.g. 26 hours ago)
		await engine.record({ provider: "google", account: "default", model: "gemini-3.8-flash", timestamp: now - 26 * 3600_000, inputTokens: 100, outputTokens: 100, success: true });

		// Record a recent event
		await engine.record({ provider: "google", account: "default", model: "gemini-3.8-flash", timestamp: now - 10_000, inputTokens: 50, outputTokens: 50, success: true });

		// Check count in 60s window (should only count the recent one, not the 26h old one)
		const count = await engine.queryUsage(candidate, 60_000, "requests", undefined, now);
		expect(count).toBe(1);

		// Read usage.json directly to verify old event is gone
		const raw = JSON.parse(await import("node:fs/promises").then(m => m.readFile(engine.path, "utf8"))) as { events: Array<{ timestamp: number }> };
		expect(raw.events.some(e => e.timestamp < now - 24 * 3600_000)).toBe(false);
	});

	it("4. learned 429 daily limit blocks until reset and survives restart", async () => {
		const candidate = { provider: "google", account: "default", model: "gemini-3.8-flash" };
		const now = Date.now();
		const resetAt = now + 3600_000;

		await ledger.record([{
			...candidate,
			type: "daily",
			dimension: "requests",
			observedAt: now,
			resetAt,
			source: "header",
			remaining: 0,
		}]);

		// Verify blocking/status
		let statuses = await engine.status(candidate, now);
		let daily = statuses.find((s) => s.type === "daily");
		expect(daily?.state).toBe("exhausted");
		expect(daily?.resetAt).toBe(resetAt);

		// Test survival across restart (new ledger and engine instance reading same testHome)
		const ledger2 = new LimitLedger(testHome);
		const engine2 = new QuotaEngine(testHome, ledger2, new Map(providerConfigs.providers.map((p) => [p.id, p])));
		statuses = await engine2.status(candidate, now);
		daily = statuses.find((s) => s.type === "daily");
		expect(daily?.state).toBe("exhausted");
		expect(daily?.resetAt).toBe(resetAt);
	});

	it("5. df quota status shape from fixture state without network", async () => {
		const candidate = { provider: "google", account: "default", model: "gemini-3.8-flash" };
		const statuses = await engine.status(candidate, Date.now());
		expect(statuses.length).toBeGreaterThan(0);
		for (const s of statuses) {
			expect(s.provider).toBe("google");
			expect(s.account).toBe("default");
			expect(s.model).toBe("gemini-3.8-flash");
			expect(typeof s.type).toBe("string");
			expect(typeof s.used).toBe("number");
			expect(typeof s.state).toBe("string");
			expect(typeof s.source).toBe("string");
		}
	});

	it("6. router / assessment prefers candidate with remaining capacity", async () => {
		const candidate1 = { provider: "google", account: "default", model: "gemini-3.8-flash" };
		const candidate2 = { provider: "openrouter", account: "default", model: "openrouter/free" };

		// Exhaust candidate1 (record 20 requests today)
		const now = Date.now();
		for (let i = 0; i < 20; i++) {
			await engine.record({ ...candidate1, timestamp: now - i * 100, inputTokens: 10, outputTokens: 10, success: true });
		}

		const status1 = await engine.status(candidate1, now);
		const status2 = await engine.status(candidate2, now);

		const c1Exhausted = status1.some((s) => s.state === "exhausted" || (s.remaining !== undefined && s.remaining <= 0));
		const c2Available = status2.some((s) => s.state === "available" && (s.remaining === undefined || s.remaining > 0));

		expect(c1Exhausted).toBe(true);
		expect(c2Available).toBe(true);
	});
});
