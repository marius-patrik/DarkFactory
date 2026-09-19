import { describe, expect, test } from "bun:test";
import { LimitLedger } from "../src/limits/ledger.ts";
import type { HarnessRuntime } from "../src/harness/runtime.ts";
import {
	FailoverSupervisor,
	type HarnessEvent,
	type RunDeadline,
	RunTimeoutError,
} from "../src/harness/supervisor.ts";
import { parseDurationMs } from "../src/cli.ts";

describe("df run execution budget", () => {
	test("parses the pipeline Go-style durations without changing max-turn semantics", () => {
		expect(parseDurationMs("15m0s")).toBe(900_000);
		expect(parseDurationMs("1h2m3s")).toBe(3_723_000);
		expect(parseDurationMs("250ms")).toBe(250);
		expect(() => parseDurationMs("15 minutes")).toThrow("Invalid --timeout duration");
		expect(() => parseDurationMs("0s")).toThrow("positive finite duration");
	});

	test("aborts an in-flight agent operation and emits a typed timeout", async () => {
		let aborts = 0;
		const events: HarnessEvent[] = [];
		const session = {
			sessionId: "budget-test",
			sessionManager: {
				buildSessionContext: () => ({ messages: [] }),
				branch: () => undefined,
				resetLeaf: () => undefined,
			},
			agent: {
				state: { messages: [] },
				abort: () => {
					aborts++;
				},
				continue: async () => new Promise<never>(() => undefined),
			},
			subscribe: () => () => undefined,
			prompt: async () => new Promise<never>(() => undefined),
		};
		const runtime = {
			session,
			validateCandidate: async () => undefined,
			bindCandidate: async () => undefined,
			takeResponses: () => [],
			probeCandidate: async () => true,
		} as unknown as HarnessRuntime;
		const ledger = {
			recover: async () => [],
			forCandidate: async () => [],
			blocking: async () => [],
			list: async () => [],
		} as unknown as LimitLedger;
		const supervisor = new FailoverSupervisor(
			{
				chain: [{ provider: "faux", account: "test", model: "hang" }],
				runtime,
				ledger,
				onEvent: (event) => events.push(event),
			},
			0,
		);
		const startedAt = Date.now();
		const budget: RunDeadline = { startedAt, deadlineAt: startedAt + 25, budgetMs: 25 };

		let caught: unknown;
		try {
			await supervisor.prompt("never finish", 100, budget);
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(RunTimeoutError);
		const timeout = caught as RunTimeoutError;
		expect(timeout.exitCode).toBe(4);
		expect(timeout.sessionId).toBe("budget-test");
		expect(timeout.elapsedMs).toBeGreaterThanOrEqual(20);
		expect(aborts).toBe(1);
		expect(events.filter((event) => event.type === "timeout")).toHaveLength(1);
	});

	test("an already-spent total deadline fails before another candidate attempt", async () => {
		let validations = 0;
		const session = {
			sessionId: "expired-budget",
			sessionManager: { buildSessionContext: () => ({ messages: [] }) },
			agent: { state: { messages: [] }, abort: () => undefined, continue: async () => undefined },
			subscribe: () => () => undefined,
			prompt: async () => undefined,
		};
		const runtime = {
			session,
			validateCandidate: async () => {
				validations++;
			},
			bindCandidate: async () => undefined,
			takeResponses: () => [],
			probeCandidate: async () => true,
		} as unknown as HarnessRuntime;
		const ledger = {
			recover: async () => [],
			forCandidate: async () => [],
			blocking: async () => [],
			list: async () => [],
		} as unknown as LimitLedger;
		const supervisor = new FailoverSupervisor({
			chain: [
				{ provider: "faux", account: "a", model: "one" },
				{ provider: "faux", account: "b", model: "two" },
			],
			runtime,
			ledger,
		});
		const now = Date.now();

		await expect(
			supervisor.prompt("do work", 100, { startedAt: now - 100, deadlineAt: now - 1, budgetMs: 99 }),
		).rejects.toBeInstanceOf(RunTimeoutError);
		expect(validations).toBe(0);
	});
});
