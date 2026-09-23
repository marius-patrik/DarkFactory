import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fauxAssistantMessage, fauxProvider } from "@earendil-works/pi-ai";
import { createFailoverSupervisor } from "../src/harness/supervisor.ts";
import { LimitLedger } from "../src/limits/ledger.ts";
import { matchesModel, QuotaEngine, windowBounds } from "../src/limits/quota-engine.ts";
import { buildQuotaReport } from "../src/limits/quota-report.ts";
import { BUILTIN_PROVIDER_CONFIG, type DeclaredLimitConfig, type ProviderConfig } from "../src/providers/schema.ts";

const temporary: string[] = [];
async function home(): Promise<string> {
	const root = await mkdtemp(join(process.cwd(), ".harness-test-quota-"));
	temporary.push(root);
	return root;
}
afterEach(async () => {
	for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true });
});

function provider(id: string, declared: DeclaredLimitConfig[], extra: Partial<ProviderConfig> = {}): ProviderConfig {
	return {
		id,
		name: id,
		dialect: "openai-completions",
		baseUrl: `https://${id}.example/v1`,
		auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }],
		requiredCredentialSlots: ["api_key"],
		models: { static: [{ id: "m" }] },
		capabilities: { tools: true, reasoning: false, images: false },
		limits: { observe: true, declared },
		...extra,
	};
}

async function engineFor(
	configs: ProviderConfig[],
	root?: string,
): Promise<{ engine: QuotaEngine; ledger: LimitLedger; root: string }> {
	const dir = root ?? (await home());
	const ledger = new LimitLedger(dir);
	return {
		engine: new QuotaEngine(dir, ledger, new Map(configs.map((config) => [config.id, config]))),
		ledger,
		root: dir,
	};
}

const a = { provider: "p", account: "one", model: "m" };
const MIN = 60_000;

describe("declared limits", () => {
	test("model patterns match ids and globs", () => {
		expect(matchesModel(undefined, "x")).toBe(true);
		expect(matchesModel("*", "x")).toBe(true);
		expect(matchesModel("*:free", "nvidia/nemotron:free")).toBe(true);
		expect(matchesModel("*:free", "nvidia/nemotron")).toBe(false);
		expect(matchesModel("gemini-3.*-flash", "gemini-3.8-flash")).toBe(true);
		expect(matchesModel("gemini-3.*-flash", "gemini-3.8-flash-lite")).toBe(false);
	});

	test("fixed daily windows follow the provider roll-over; monthly windows the calendar month; rolling windows trail now", () => {
		const now = Date.UTC(2026, 8, 15, 5, 0, 0); // 22:00 PDT on 14 Sep
		const daily: DeclaredLimitConfig = {
			type: "daily",
			dimension: "requests",
			limit: 20,
			windowMs: 86_400_000,
			reset: "fixed",
		};
		expect(windowBounds(daily, { observe: true, dailyReset: "pacific-midnight" }, now)).toEqual({
			start: Date.UTC(2026, 8, 14, 7),
			resetAt: Date.UTC(2026, 8, 15, 7),
		});
		expect(windowBounds(daily, { observe: true }, now)).toEqual({
			start: Date.UTC(2026, 8, 15),
			resetAt: Date.UTC(2026, 8, 16),
		});
		expect(windowBounds({ ...daily, type: "monthly", windowMs: 30 * 86_400_000 }, undefined, now)).toEqual({
			start: Date.UTC(2026, 8, 1),
			resetAt: Date.UTC(2026, 9, 1),
		});
		expect(windowBounds({ type: "rate", limit: 5, windowMs: MIN }, undefined, now)).toEqual({ start: now - MIN });
	});
});

describe("admission control", () => {
	test("corrupt authoritative usage state fails closed instead of resetting usage to zero", async () => {
		const { engine, root } = await engineFor([
			provider("p", [{ type: "rate", dimension: "requests", limit: 5, windowMs: MIN, source: "docs" }]),
		]);
		await Bun.write(join(root, "usage.df"), "{broken");
		await expect(engine.status(a)).rejects.toThrow("Invalid usage file JSON");

		await Bun.write(join(root, "usage.df"), JSON.stringify({ version: 2, events: [] }));
		await expect(engine.admit(a)).rejects.toThrow("Invalid usage file");

		await Bun.write(join(root, "usage.df"), JSON.stringify({ version: 1, events: [{ id: "bad", provider: "p" }] }));
		await expect(engine.status(a)).rejects.toThrow("Invalid usage event");
	});

	test("5 RPM: the 6th request waits exactly until the oldest request leaves the window", async () => {
		const { engine } = await engineFor([
			provider("p", [{ type: "rate", dimension: "requests", limit: 5, windowMs: MIN, source: "docs" }]),
		]);
		const t0 = 1_800_000_000_000;
		for (let i = 0; i < 5; i++)
			await engine.record({ ...a, timestamp: t0 + i * 1_000, inputTokens: 10, outputTokens: 5, success: true });
		const verdict = await engine.admit(a, undefined, t0 + 5_000);
		expect(verdict.decision).toBe("wait");
		expect(verdict.waitUntil).toBe(t0 + MIN);
		expect((await engine.admit(a, undefined, t0 + MIN + 1)).decision).toBe("admit");
	});

	test("a fixed daily quota counts only since the roll-over and skips the candidate until the next one", async () => {
		const policy = { dailyReset: "pacific-midnight" as const };
		const { engine } = await engineFor([
			provider(
				"p",
				[{ type: "daily", dimension: "requests", limit: 20, windowMs: 86_400_000, reset: "fixed", source: "observed" }],
				{
					limits: {
						observe: true,
						...policy,
						declared: [
							{
								type: "daily",
								dimension: "requests",
								limit: 20,
								windowMs: 86_400_000,
								reset: "fixed",
								source: "observed",
							},
						],
					},
				},
			),
		]);
		const now = Date.UTC(2026, 8, 15, 5, 0, 0);
		await engine.record({
			...a,
			timestamp: Date.UTC(2026, 8, 14, 6, 59),
			inputTokens: 1,
			outputTokens: 1,
			success: true,
		}); // before the window
		for (let i = 0; i < 19; i++)
			await engine.record({
				...a,
				timestamp: Date.UTC(2026, 8, 14, 8) + i,
				inputTokens: 1,
				outputTokens: 1,
				success: true,
			});
		expect((await engine.admit(a, undefined, now)).decision).toBe("admit");
		await engine.record({ ...a, timestamp: now - 1, inputTokens: 1, outputTokens: 1, success: true });
		const verdict = await engine.admit(a, undefined, now);
		expect(verdict).toMatchObject({ decision: "skip", waitUntil: Date.UTC(2026, 8, 15, 7) });
		expect(verdict.entries[0]).toMatchObject({
			type: "daily",
			source: "declared",
			remaining: 0,
			resetAt: Date.UTC(2026, 8, 15, 7),
		});
	});

	test("a pooled limit is shared by the models it covers on one account, never across accounts", async () => {
		const { engine } = await engineFor([
			provider("p", [
				{
					model: "*",
					type: "monthly",
					dimension: "requests",
					limit: 3,
					windowMs: 30 * 86_400_000,
					reset: "fixed",
					pool: "p-monthly",
					source: "docs",
				},
			]),
		]);
		const now = Date.UTC(2026, 8, 15);
		await engine.record({
			provider: "p",
			account: "one",
			model: "x",
			timestamp: now - 3,
			inputTokens: 0,
			outputTokens: 0,
			success: true,
		});
		await engine.record({
			provider: "p",
			account: "one",
			model: "y",
			timestamp: now - 2,
			inputTokens: 0,
			outputTokens: 0,
			success: true,
		});
		await engine.record({
			provider: "p",
			account: "two",
			model: "m",
			timestamp: now - 1,
			inputTokens: 0,
			outputTokens: 0,
			success: true,
		});
		expect((await engine.admit(a, undefined, now)).decision).toBe("admit");
		await engine.record({
			provider: "p",
			account: "one",
			model: "z",
			timestamp: now,
			inputTokens: 0,
			outputTokens: 0,
			success: true,
		});
		expect((await engine.admit(a, undefined, now)).decision).toBe("skip");
		expect((await engine.admit({ ...a, account: "two" }, undefined, now)).decision).toBe("admit");
	});

	test("a token window admits a step only when the estimated tokens fit", async () => {
		const { engine } = await engineFor([
			provider("p", [{ type: "rate", dimension: "tokens", limit: 1_000, windowMs: MIN, source: "docs" }]),
		]);
		const t0 = 1_800_000_000_000;
		await engine.record({ ...a, timestamp: t0, inputTokens: 500, outputTokens: 100, success: true });
		await engine.record({ ...a, timestamp: t0 + 10_000, inputTokens: 250, outputTokens: 50, success: true });
		const task = { size: "small" as const, contextTokens: 150, expectedOutputTokens: 50, expectedSteps: 1 };
		expect((await engine.admit(a, { ...task, contextTokens: 50 }, t0 + 20_000)).decision).toBe("admit");
		expect(await engine.admit(a, task, t0 + 20_000)).toMatchObject({ decision: "wait", waitUntil: t0 + MIN });
	});

	test("a candidate waits for its LAST blocking limit: a short window next to a learned daily quota means the daily reset", async () => {
		const { engine, ledger } = await engineFor([
			provider("p", [{ type: "rate", dimension: "requests", limit: 1, windowMs: MIN, source: "docs" }]),
		]);
		const now = 1_800_000_000_000;
		await engine.record({ ...a, timestamp: now - 1_000, inputTokens: 1, outputTokens: 1, success: true });
		await ledger.record([
			{
				...a,
				type: "daily",
				dimension: "requests",
				observedAt: now,
				resetAt: now + 6 * 3_600_000,
				source: "body",
				remaining: 0,
			},
		]);
		expect(await engine.admit(a, undefined, now)).toMatchObject({ decision: "skip", waitUntil: now + 6 * 3_600_000 });
	});

	test("usage and concurrency limits are reported but not enforced", async () => {
		const { engine } = await engineFor([
			provider("p", [
				{
					type: "daily",
					dimension: "usage",
					limit: 10_000,
					windowMs: 86_400_000,
					reset: "fixed",
					source: "docs",
					note: "neurons",
				},
				{ type: "concurrency", dimension: "concurrency", limit: 1, windowMs: 1, source: "community" },
			]),
		]);
		expect((await engine.admit(a)).decision).toBe("admit");
		const status = await engine.status(a);
		expect(status.state).toBe("unknown");
		expect(status.items.map((item) => [item.enforced, item.used])).toEqual([
			[false, undefined],
			[false, undefined],
		]);
	});

	test("concurrent processes recording usage never lose events", async () => {
		const { engine, root } = await engineFor([
			provider("p", [{ type: "rate", dimension: "requests", limit: 100, windowMs: MIN, source: "docs" }]),
		]);
		const other = new QuotaEngine(root, new LimitLedger(root), engine.providerConfigs);
		const now = Date.now();
		await Promise.all(
			Array.from({ length: 20 }, (_, i) =>
				(i % 2 ? engine : other).record({ ...a, timestamp: now + i, inputTokens: 1, outputTokens: 1, success: true }),
			),
		);
		const file = JSON.parse(await readFile(join(root, "usage.df"), "utf8")) as { events: unknown[] };
		expect(file.events).toHaveLength(20);
		expect((await engine.status(a, now + 100)).items[0]).toMatchObject({ used: 20, remaining: 80, state: "available" });
	});

	test("events older than the longest declared window are pruned", async () => {
		const { engine, root } = await engineFor([
			provider("p", [{ type: "rate", dimension: "requests", limit: 100, windowMs: MIN, source: "docs" }]),
		]);
		const now = Date.now();
		await engine.record({ ...a, timestamp: now - 2 * 86_400_000, inputTokens: 1, outputTokens: 1, success: true });
		await engine.record({ ...a, timestamp: now, inputTokens: 1, outputTokens: 1, success: true });
		const file = JSON.parse(await readFile(join(root, "usage.df"), "utf8")) as {
			events: Array<{ timestamp: number }>;
		};
		expect(file.events.map((event) => event.timestamp)).toEqual([now]);
	});
});

describe("df quota report", () => {
	test("every provider appears with its credential state, free tier, and the source of each number; no network", async () => {
		const documented = provider(
			"docs-p",
			[
				{
					type: "rate",
					dimension: "requests",
					limit: 30,
					windowMs: MIN,
					source: "docs",
					sourceUrl: "https://docs-p.example/limits",
					checkedAt: "2026-09-15",
				},
			],
			{
				free: { kind: "permanent", keyUrl: "https://docs-p.example/keys", card: false },
			},
		);
		const anonymous = provider("anon-p", [], {
			auth: [{ kind: "api_key", slot: "api_key", placement: "bearer", optional: true }],
			requiredCredentialSlots: [],
			free: { kind: "anonymous", keyUrl: "https://anon-p.example" },
		});
		const configured = provider("have-p", [
			{ type: "daily", dimension: "requests", limit: 20, windowMs: 86_400_000, reset: "fixed", source: "observed" },
		]);
		const { engine } = await engineFor([documented, anonymous, configured]);
		const now = Date.UTC(2026, 8, 15, 12);
		const report = await buildQuotaReport({
			providers: [documented, anonymous, configured],
			engine,
			now,
			accounts: [{ provider: "have-p", label: "key2" }],
			chains: [{ provider: "have-p", account: "key2", model: "big-model" }],
		});
		expect(report.version).toBe(2);
		const byId = Object.fromEntries(report.providers.map((entry) => [entry.id, entry]));
		expect(byId["docs-p"]).toMatchObject({
			credentials: "missing",
			state: "no-account",
			accounts: [],
			free: { kind: "permanent", keyUrl: "https://docs-p.example/keys" },
		});
		expect(byId["docs-p"]!.declared[0]).toMatchObject({
			source: "docs",
			sourceUrl: "https://docs-p.example/limits",
			checkedAt: "2026-09-15",
		});
		expect(byId["anon-p"]).toMatchObject({ credentials: "anonymous", state: "unknown" });
		expect(byId["have-p"]!.accounts[0]!.models.map((model) => model.model)).toEqual(["m", "big-model"]);
		expect(byId["have-p"]!.accounts[0]!.models[0]!.items[0]).toMatchObject({
			type: "daily",
			limit: 20,
			used: 0,
			source: "observed",
			state: "available",
		});
	});
});

describe("df quota report data collection", () => {
	test("provider with free.data gets collection from free.data", async () => {
		const p = provider("free-data", [], {
			free: {
				kind: "permanent",
				keyUrl: "https://example.com/key",
				data: { collection: "logging", source: "test", sourceUrl: "https://example.com", checkedAt: "2026-09-15" },
			},
		});
		const { engine } = await engineFor([p]);
		const report = await buildQuotaReport({ providers: [p], accounts: [], chains: [], engine });
		const entry = report.providers.find((e) => e.id === "free-data")!;
		expect(entry.data).toMatchObject({
			collection: "logging",
			source: "test",
			sourceUrl: "https://example.com",
			checkedAt: "2026-09-15",
		});
	});

	test("provider with data only (no free) gets collection from data", async () => {
		const p = provider("data-only", [], {
			data: { collection: "training", source: "test2", sourceUrl: "https://example.org", checkedAt: "2026-09-15" },
		});
		const { engine } = await engineFor([p]);
		const report = await buildQuotaReport({ providers: [p], accounts: [], chains: [], engine });
		const entry = report.providers.find((e) => e.id === "data-only")!;
		expect(entry.data).toMatchObject({
			collection: "training",
			source: "test2",
			sourceUrl: "https://example.org",
			checkedAt: "2026-09-15",
		});
	});

	test("provider with neither free nor data gets collection unknown", async () => {
		const p = provider("no-data", [], {});
		const { engine } = await engineFor([p]);
		const report = await buildQuotaReport({ providers: [p], accounts: [], chains: [], engine });
		const entry = report.providers.find((e) => e.id === "no-data")!;
		expect(entry.data).toMatchObject({ collection: "unknown" });
	});

	test("free.data takes precedence over data", async () => {
		const p = provider("both", [], {
			free: {
				kind: "permanent",
				keyUrl: "https://example.com/key",
				data: { collection: "none", source: "test fixture", checkedAt: "2026-09-15" },
			},
			data: { collection: "training", source: "test fixture", checkedAt: "2026-09-15" },
		});
		const { engine } = await engineFor([p]);
		const report = await buildQuotaReport({ providers: [p], accounts: [], chains: [], engine });
		const entry = report.providers.find((e) => e.id === "both")!;
		expect(entry.data?.collection).toBe("none");
	});
});

describe("built-in provider data quality", () => {
	test("every declared limit says where its number comes from and when it was checked", () => {
		for (const config of BUILTIN_PROVIDER_CONFIG.providers) {
			for (const limit of config.limits?.declared ?? []) {
				expect({ provider: config.id, source: limit.source }).toMatchObject({
					source: expect.stringMatching(/^(docs|community|observed)$/u),
				});
				expect({ provider: config.id, checkedAt: Number.isNaN(Date.parse(limit.checkedAt ?? "")) }).toEqual({
					provider: config.id,
					checkedAt: false,
				});
				if (limit.source !== "observed")
					expect({ provider: config.id, url: limit.sourceUrl?.startsWith("https://") }).toEqual({
						provider: config.id,
						url: true,
					});
			}
			if (config.free) expect(config.free.keyUrl.startsWith("https://")).toBe(true);
		}
	});
});

describe("supervisor admission", () => {
	test("a blocked candidate is skipped without a model call and every call is recorded as usage", async () => {
		const root = await home();
		const cwd = join(root, "workspace");
		const limited = provider(
			"quota-a",
			[{ type: "rate", dimension: "requests", limit: 1, windowMs: MIN, source: "docs" }],
			{ requiredCredentialSlots: [] },
		);
		const open = provider("quota-b", [], { requiredCredentialSlots: [] });
		const configs = new Map([
			[limited.id, limited],
			[open.id, open],
		]);
		const ledger = new LimitLedger(root);
		const quota = new QuotaEngine(root, ledger, configs);
		const now = 1_800_000_000_000;
		await quota.record({
			provider: "quota-a",
			account: "default",
			model: "a",
			timestamp: now - 1_000,
			inputTokens: 1,
			outputTokens: 1,
			success: true,
		});
		const aProvider = fauxProvider({ provider: "quota-a", models: [{ id: "a" }] });
		aProvider.setResponses([fauxAssistantMessage("must not be called")]);
		const bProvider = fauxProvider({ provider: "quota-b", models: [{ id: "b" }] });
		bProvider.setResponses([fauxAssistantMessage("from b")]);
		const skipped: unknown[] = [];
		const supervisor = await createFailoverSupervisor({
			chain: [
				{ provider: "quota-a", model: "a", account: "default" },
				{ provider: "quota-b", model: "b", account: "default" },
			],
			home: root,
			cwd,
			now: () => now,
			providers: [aProvider.provider, bProvider.provider],
			authOptionalProviders: ["quota-a", "quota-b"],
			providerConfigs: configs,
			quota,
			maxWaitMs: 0,
			onEvent: (event) => {
				if (event.type === "candidate_skipped") skipped.push(event);
			},
		});
		const result = await supervisor.prompt("go");
		supervisor.session.dispose();
		expect(result.content.some((block) => block.type === "text" && block.text === "from b")).toBe(true);
		expect(skipped).toHaveLength(1);
		const usage = JSON.parse(await readFile(join(root, "usage.df"), "utf8")) as {
			events: Array<{ provider: string; success: boolean }>;
		};
		expect(usage.events.map((event) => [event.provider, event.success])).toEqual([
			["quota-a", true],
			["quota-b", true],
		]);
	}, 30_000);
});

describe("learned unavailability", () => {
	const now = 1_800_000_000_000;

	test("billing and model limits survive a ledger reload", async () => {
		const { ledger, root } = await engineFor([provider("p", [])]);
		await ledger.record([
			{ ...a, type: "billing", observedAt: now, resetAt: now + 86_400_000, source: "body" },
			{ ...a, model: "gone", type: "model", observedAt: now, resetAt: now + 21_600_000, source: "body" },
		]);
		const types = (await new LimitLedger(root).list()).map((entry) => entry.type);
		expect(types.sort()).toEqual(["billing", "model"]);
	});

	test("a billing, access or model limit makes the candidate unavailable even when it recovers within the admit wait", async () => {
		for (const type of ["billing", "access", "model"] as const) {
			const { engine, ledger } = await engineFor([provider("p", [])]);
			await ledger.record([{ ...a, type, observedAt: now, resetAt: now + 60_000, source: "body" }]);
			const status = await engine.status(a, now);
			expect(status).toMatchObject({ state: "unavailable", until: now + 60_000, reason: `learned ${type} (body)` });
			expect(status.items[0]?.state).toBe("unavailable");
		}
	});

	test("admission skips an unavailable candidate instead of waiting for a near recovery", async () => {
		const { engine, ledger } = await engineFor([provider("p", [])]);
		await ledger.record([{ ...a, type: "access", observedAt: now, resetAt: now + 60_000, source: "body" }]);
		const verdict = await engine.admit(a, undefined, now);
		expect(verdict).toMatchObject({ decision: "skip", waitUntil: now + 60_000 });
		expect(verdict.entries.map((entry) => entry.type)).toEqual(["access"]);
	});

	test("unavailability outranks a longer exhausted quota and an expired entry no longer counts", async () => {
		const { engine, ledger } = await engineFor([provider("p", [])]);
		await ledger.record([
			{
				...a,
				type: "daily",
				dimension: "requests",
				observedAt: now,
				resetAt: now + 6 * 3_600_000,
				source: "body",
				remaining: 0,
			},
			{ ...a, type: "access", observedAt: now, resetAt: now + 3_600_000, source: "body" },
		]);
		expect((await engine.status(a, now)).state).toBe("unavailable");
		expect((await engine.status(a, now + 2 * 3_600_000)).state).toBe("exhausted");
	});

	test("the quota report marks a provider unavailable when none of its models is usable", async () => {
		const configured = provider("gone-p", []);
		const { engine, ledger } = await engineFor([configured]);
		const candidate = { provider: "gone-p", account: "key", model: "m" };
		await ledger.record([
			{ ...candidate, type: "billing", observedAt: now, resetAt: now + 86_400_000, source: "body" },
		]);
		const report = await buildQuotaReport({
			providers: [configured],
			engine,
			now,
			accounts: [{ provider: "gone-p", label: "key" }],
			chains: [candidate],
		});
		expect(report.providers.find((entry) => entry.id === "gone-p")?.state).toBe("unavailable");
	});
});
