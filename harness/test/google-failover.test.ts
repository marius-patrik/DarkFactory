import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fauxAssistantMessage, fauxProvider } from "@earendil-works/pi-ai";
import { ChainExhaustedError, createFailoverSupervisor, type HarnessEvent } from "../src/harness/supervisor.ts";
import { LimitLedger } from "../src/limits/ledger.ts";
import { BUILTIN_PROVIDER_CONFIG } from "../src/providers/schema.ts";
import { classifyFailure } from "../src/quota.ts";

const temporary: string[] = [];

async function tempWorkspace(): Promise<{ root: string; home: string; cwd: string }> {
	const root = await mkdtemp(join(process.cwd(), ".harness-test-"));
	temporary.push(root);
	const home = join(root, "home");
	const cwd = join(root, "workspace");
	await Bun.write(join(cwd, ".keep"), "");
	return { root, home, cwd };
}

afterEach(async () => {
	for (const path of temporary.splice(0)) {
		if (!path.startsWith(process.cwd())) throw new Error(`Refusing cleanup outside workspace: ${path}`);
		await rm(path, { recursive: true, force: true });
	}
});

const googleRules = BUILTIN_PROVIDER_CONFIG.providers.find((p) => p.id === "google")!.quota!.rules;

describe("Google Gemini free-tier real fixtures classification", () => {
	const now = 1_700_000_000_000;

	test("real-01: per-minute requests limit is rate_limited with resetAt hint and jitter", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-01.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("rate_limited");
		expect(classification.resetAt).toBe(now + 28_000 + 1000);
	});

	test("real-02: 503 UNAVAILABLE with high demand is transient with 30s cooldown", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-02.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("transient");
		expect(classification.resetAt).toBe(now + 30_000);
	});

	test("real-03: nested 503 UNAVAILABLE is transient with 30s cooldown", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-03.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("transient");
		expect(classification.resetAt).toBe(now + 30_000);
	});

	test("real-04: per-minute requests limit is rate_limited", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-04.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("rate_limited");
		expect(classification.resetAt).toBe(now + 28_000 + 1000);
	});

	test("real-05: per-day requests limit is quota_exhausted with RetryInfo", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-05.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("quota_exhausted");
		expect(classification.resetAt).toBe(now + 22_000);
	});

	test("real-06: 503 UNAVAILABLE is transient with 30s cooldown", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-06.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("transient");
		expect(classification.resetAt).toBe(now + 30_000);
	});

	test("real-07: per-day requests limit is quota_exhausted with RetryInfo", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-07.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("quota_exhausted");
		expect(classification.resetAt).toBe(now + 4_000);
	});

	test("real-08: 503 UNAVAILABLE is transient with 30s cooldown", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-08.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("transient");
		expect(classification.resetAt).toBe(now + 30_000);
	});

	test("real-09: per-minute input-token limit is rate_limited with token pool", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-09.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("rate_limited");
		expect(classification.resetAt).toBe(now + 46_000 + 1000);
		expect(classification.pool).toContain("token");
	});

	test("real-10: 503 UNAVAILABLE is transient with 30s cooldown", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-10.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("transient");
		expect(classification.resetAt).toBe(now + 30_000);
	});

	test("real-11: per-minute input-token limit is rate_limited with token pool", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-11.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("rate_limited");
		expect(classification.resetAt).toBe(now + 18_000 + 1000);
		expect(classification.pool).toContain("token");
	});

	test("real-12: per-minute input-token limit is rate_limited with token pool", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-12.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("rate_limited");
		expect(classification.resetAt).toBe(now + 35_000 + 1000);
		expect(classification.pool).toContain("token");
	});

	test("real-13: per-minute input-token limit is rate_limited with token pool", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-13.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("rate_limited");
		expect(classification.resetAt).toBe(now + 21_000 + 1000);
		expect(classification.pool).toContain("token");
	});

	test("real-14: 503 UNAVAILABLE is transient with 30s cooldown", async () => {
		const raw = JSON.parse(await readFile(join(__dirname, "fixtures/google-errors/real-14.json"), "utf8"));
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: raw.errorMessage }), now },
			{ rules: googleRules, model: raw.model },
		);
		expect(classification.kind).toBe("transient");
		expect(classification.resetAt).toBe(now + 30_000);
	});

	test("extracts 'Please retry in N s' from text message if RetryInfo is missing", () => {
		const text =
			"Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests. Please retry in 15.5s.";
		const classification = classifyFailure(
			{ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: text }), now },
			{ rules: googleRules, model: "gemini-3.6-flash" },
		);
		expect(classification.resetAt).toBeDefined();
		expect(classification.resetAt).toBe(now + 16_000 + 1000);
	});
});


describe("Supervisor waiting instead of exiting", () => {
	test("waits when all candidates are cooling down within maxWaitMs and retries successfully", async () => {
		const { home, cwd } = await tempWorkspace();
		let simNow = 1_000_000;
		const events: HarnessEvent[] = [];

		const a = fauxProvider({ provider: "wait-a", models: [{ id: "a" }] });
		a.setResponses([
			// First call fails with 20s rate limit
			fauxAssistantMessage([], {
				stopReason: "error",
				errorMessage: '429 rate limit {"error":{"details":[{"retryDelay":"20s"}]}}',
			}),
			// After waiting, second call succeeds
			fauxAssistantMessage("recovered after wait"),
		]);

		const sleepCalls: number[] = [];
		const supervisor = await createFailoverSupervisor({
			chain: [{ provider: "wait-a", model: "a", account: "default" }],
			home,
			cwd,
			now: () => simNow,
			sleep: async (ms) => {
				sleepCalls.push(ms);
				simNow += ms;
			},
			providers: [a.provider],
			authOptionalProviders: ["wait-a"],
			onEvent: (event) => events.push(event),
		});

		const result = await supervisor.prompt("test waiting");
		expect(result.content.some((b) => b.type === "text" && b.text === "recovered after wait")).toBe(true);
		expect(events.some((e) => e.type === "waiting")).toBe(true);
		expect(events.some((e) => e.type === "recovered")).toBe(true);
		expect(sleepCalls.length).toBeGreaterThan(0);
		supervisor.session.dispose();
	}, 30_000);

	test("exits with exitCode 2 when nothing resets within maxWaitMs", async () => {
		const { home, cwd } = await tempWorkspace();
		const simNow = 1_000_000;
		const a = fauxProvider({ provider: "wait-a", models: [{ id: "a" }] });
		// Fails with 10 minute retryDelay (exceeding 5 min default)
		a.setResponses([
			fauxAssistantMessage([], {
				stopReason: "error",
				errorMessage: '429 rate limit {"error":{"details":[{"retryDelay":"600s"}]}}',
			}),
		]);

		const supervisor = await createFailoverSupervisor({
			chain: [{ provider: "wait-a", model: "a", account: "default" }],
			home,
			cwd,
			now: () => simNow,
			maxWaitMs: 300_000,
			providers: [a.provider],
			authOptionalProviders: ["wait-a"],
		});

		let error: unknown;
		try {
			await supervisor.prompt("test wait exceeded");
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(ChainExhaustedError);
		expect((error as ChainExhaustedError).exitCode).toBe(2);
		supervisor.session.dispose();
	});

	// Observed 2026-09-15: gemini-3.8-flash held a 60 s token window AND a daily quota until Pacific midnight; df waited
	// for the token window, retried, got the daily 429 again and looped for hours.
	test("a candidate with a short and a daily limit is not waited for until the daily limit clears", async () => {
		const { home, cwd } = await tempWorkspace();
		const simNow = 1_000_000;
		const b = { provider: "wait-b", model: "b", account: "default" };
		await new LimitLedger(home).record([
			{
				...b,
				type: "rate",
				dimension: "tokens",
				observedAt: simNow,
				resetAt: simNow + 60_000,
				source: "body",
				remaining: 0,
			},
			{
				...b,
				type: "daily",
				dimension: "requests",
				observedAt: simNow,
				resetAt: simNow + 6 * 3_600_000,
				source: "body",
				remaining: 0,
			},
		]);
		const bProvider = fauxProvider({ provider: "wait-b", models: [{ id: "b" }] });
		const sleepCalls: number[] = [];
		let error: unknown;
		try {
			const supervisor = await createFailoverSupervisor({
				chain: [b],
				home,
				cwd,
				now: () => simNow,
				maxWaitMs: 300_000,
				sleep: async (ms) => {
					sleepCalls.push(ms);
				},
				providers: [bProvider.provider],
				authOptionalProviders: ["wait-b"],
			});
			supervisor.session.dispose();
		} catch (caught) {
			error = caught;
		}
		expect(sleepCalls).toEqual([]);
		expect(error).toBeInstanceOf(ChainExhaustedError);
		expect((error as ChainExhaustedError).exitCode).toBe(2);
	});

	test("after a failure, df waits for the candidate that is fully ready first, not the first limit to expire", async () => {
		const { home, cwd } = await tempWorkspace();
		const simNow = 1_000_000;
		const b = { provider: "wait-b", model: "b", account: "default" };
		const a = fauxProvider({ provider: "wait-a", models: [{ id: "a" }] });
		a.setResponses([
			fauxAssistantMessage([], {
				stopReason: "error",
				errorMessage: '429 rate limit {"error":{"details":[{"retryDelay":"120s"}]}}',
			}),
			fauxAssistantMessage("a recovered"),
		]);
		const bProvider = fauxProvider({ provider: "wait-b", models: [{ id: "b" }] });
		const sleepCalls: number[] = [];
		let now = simNow;
		const supervisor = await createFailoverSupervisor({
			chain: [{ provider: "wait-a", model: "a", account: "default" }, b],
			home,
			cwd,
			now: () => now,
			maxWaitMs: 300_000,
			sleep: async (ms) => {
				sleepCalls.push(ms);
				now += ms;
			},
			providers: [a.provider, bProvider.provider],
			authOptionalProviders: ["wait-a", "wait-b"],
		});
		await new LimitLedger(home).record([
			{
				...b,
				type: "rate",
				dimension: "tokens",
				observedAt: simNow,
				resetAt: simNow + 60_000,
				source: "body",
				remaining: 0,
			},
			{
				...b,
				type: "daily",
				dimension: "requests",
				observedAt: simNow,
				resetAt: simNow + 6 * 3_600_000,
				source: "body",
				remaining: 0,
			},
		]);
		const result = await supervisor.prompt("go");
		expect(result.content.some((block) => block.type === "text" && block.text === "a recovered")).toBe(true);
		expect(sleepCalls.every((ms) => ms >= 120_000)).toBe(true);
		supervisor.session.dispose();
	}, 30_000);

	test("abort remains terminal and never waits", async () => {
		const { home, cwd } = await tempWorkspace();
		const a = fauxProvider({ provider: "abort-a", models: [{ id: "a" }] });
		a.setResponses([fauxAssistantMessage([], { stopReason: "aborted", errorMessage: "operation was aborted" })]);
		let waited = false;
		const supervisor = await createFailoverSupervisor({
			chain: [{ provider: "abort-a", model: "a", account: "default" }],
			home,
			cwd,
			sleep: async () => {
				waited = true;
			},
			providers: [a.provider],
			authOptionalProviders: ["abort-a"],
		});

		await expect(supervisor.prompt("abort me")).rejects.toThrow(/aborted/);
		expect(waited).toBe(false);
		supervisor.session.dispose();
	});
});

describe("Token-per-minute awareness", () => {
	test("prefers next candidate immediately on input-token-per-minute failure rather than waiting on failed model", async () => {
		const { home, cwd } = await tempWorkspace();
		let simNow = 1_000_000;
		const events: HarnessEvent[] = [];

		const tokenError = JSON.stringify({
			error: {
				code: 429,
				message:
					"Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count",
				status: "RESOURCE_EXHAUSTED",
				details: [
					{ violations: [{ quotaId: "GenerateContentInputTokensPerModelPerMinute-FreeTier" }] },
					{ retryDelay: "2s" }, // Short delay on model A
				],
			},
		});

		const ab = fauxProvider({ provider: "google", models: [{ id: "gemini-3.5-flash" }, { id: "gemini-3.6-flash" }] });
		ab.setResponses([
			fauxAssistantMessage([], { stopReason: "error", errorMessage: tokenError }),
			fauxAssistantMessage("candidate B handled the prompt"),
		]);

		let waitedForA = false;
		const supervisor = await createFailoverSupervisor({
			chain: [
				{ provider: "google", model: "gemini-3.5-flash", account: "default" },
				{ provider: "google", model: "gemini-3.6-flash", account: "default" },
			],
			home,
			cwd,
			now: () => simNow,
			sleep: async (ms) => {
				waitedForA = true;
				simNow += ms;
			},
			providers: [ab.provider],
			authOptionalProviders: ["google"],
			providerConfigs: new Map([["google", BUILTIN_PROVIDER_CONFIG.providers.find((p) => p.id === "google")!]]),
			onEvent: (e) => events.push(e),
		});

		const result = await supervisor.prompt("big prompt");
		expect(
			result.content.some((block) => block.type === "text" && block.text === "candidate B handled the prompt"),
		).toBe(true);
		// Crucial: did NOT wait 2s for model A; switched immediately to model B!
		expect(waitedForA).toBe(false);
		expect(events.some((e) => e.type === "failover" && e.to.model === "gemini-3.6-flash")).toBe(true);
		supervisor.session.dispose();
	});
});
