import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
	fauxAssistantMessage,
	fauxProvider,
	fauxText,
	fauxThinking,
	fauxToolCall,
	type Provider,
} from "@earendil-works/pi-ai";
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai/utils/event-stream";
import { ChainExhaustedError, createFailoverSupervisor, type HarnessEvent } from "../src/harness/supervisor.ts";
import { BUILTIN_PROVIDER_CONFIG } from "../src/providers/schema.ts";
import { OutcomeStore } from "../src/router/outcomes.ts";

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

function runtimeProviders(...providers: Provider[]) {
	return { providers, authOptionalProviders: providers.map((provider) => provider.id) };
}

function throwingProvider(id: string, model: string, message: string): Provider {
	const faux = fauxProvider({ provider: id, models: [{ id: model }] });
	const error = Object.assign(new Error(message), { status: message.startsWith("429") ? 429 : 400 });
	return {
		...faux.provider,
		stream: () => {
			throw error;
		},
		streamSimple: () => {
			throw error;
		},
	};
}

describe("AgentSession harness", () => {
	test("failure events carry redacted messages and preserve useful clone errors in human-readable form", async () => {
		const { home, cwd } = await tempWorkspace();
		const first = throwingProvider("visible-a", "a", "The object can not be cloned. authorization=Bearer secret-value");
		const second = fauxProvider({ provider: "visible-b", models: [{ id: "b" }] });
		second.setResponses([fauxAssistantMessage("recovered")]);
		const events: HarnessEvent[] = [];
		const supervisor = await createFailoverSupervisor({
			chain: [
				{ provider: "visible-a", model: "a", account: "one" },
				{ provider: "visible-b", model: "b", account: "two" },
			],
			home,
			cwd,
			...runtimeProviders(first, second.provider),
			onEvent: (event) => events.push(event),
		});
		await supervisor.prompt("go");
		const step = events.find((event) => event.type === "step" && event.errorKind);
		const failover = events.find((event) => event.type === "failover");
		expect(step).toMatchObject({ errorMessage: "The object can not be cloned. authorization=[REDACTED]" });
		expect(failover).toMatchObject({ errorMessage: "The object can not be cloned. authorization=[REDACTED]" });
		supervisor.session.dispose();
	});

	test("model thinking never becomes answer text", async () => {
		// E2E #267: the posted plan started with Gemini's thought summary before the real plan.
		// A thought part must stream as a thinking event, never as answer text.
		const { home, cwd } = await tempWorkspace();
		const faux = fauxProvider({ provider: "think-faux", models: [{ id: "model" }] });
		faux.setResponses([
			fauxAssistantMessage([fauxThinking("Developing the Implementation Plan"), fauxText("the real plan")]),
		]);
		const events: HarnessEvent[] = [];
		const supervisor = await createFailoverSupervisor({
			chain: [{ provider: "think-faux", model: "model", account: "one" }],
			home,
			cwd,
			...runtimeProviders(faux.provider),
			onEvent: (event) => events.push(event),
		});
		try {
			const final = await supervisor.prompt("plan it");
			const answer = events
				.filter((event) => event.type === "text_delta")
				.map((event) => event.delta)
				.join("");
			expect(answer).toBe("the real plan");
			const thinking = events
				.filter((event) => event.type === "thinking_delta")
				.map((event) => event.delta)
				.join("");
			expect(thinking).toContain("Developing the Implementation Plan");
			expect(final.content.some((block) => block.type === "text" && block.text === "the real plan")).toBe(true);
		} finally {
			supervisor.session.dispose();
		}
	});

	test("an empty final answer fails over instead of ending the run", async () => {
		// E2E #267: gemini-3.6-flash stopped normally with zero output tokens; df returned the empty
		// answer as success and the pipeline blocked the Request as if every model were exhausted.
		const { home, cwd } = await tempWorkspace();
		const empty = fauxProvider({ provider: "empty-a", models: [{ id: "a" }] });
		empty.setResponses([fauxAssistantMessage([])]);
		const good = fauxProvider({ provider: "answer-b", models: [{ id: "b" }] });
		good.setResponses([fauxAssistantMessage("the plan")]);
		const events: HarnessEvent[] = [];
		const supervisor = await createFailoverSupervisor({
			chain: [
				{ provider: "empty-a", model: "a", account: "one" },
				{ provider: "answer-b", model: "b", account: "two" },
			],
			home,
			cwd,
			...runtimeProviders(empty.provider, good.provider),
			onEvent: (event) => events.push(event),
		});
		try {
			const final = await supervisor.prompt("plan it");
			expect(final.content.some((block) => block.type === "text" && block.text === "the plan")).toBe(true);
			expect(events.find((event) => event.type === "failover")).toMatchObject({ reason: "transient" });
			expect(events.find((event) => event.type === "step" && event.errorKind)).toMatchObject({
				errorMessage: "Model returned an empty response",
			});
		} finally {
			supervisor.session.dispose();
		}
	});

	test("a length stop without text or tool call fails over with the session and counts against the model", async () => {
		const { home, cwd } = await tempWorkspace();
		const thinker = fauxProvider({ provider: "budget-a", models: [{ id: "a" }] });
		thinker.setResponses([fauxAssistantMessage([fauxThinking("planning at length")], { stopReason: "length" })]);
		const good = fauxProvider({ provider: "answer-b", models: [{ id: "b" }] });
		good.setResponses([fauxAssistantMessage("the plan")]);
		const outcomes = new OutcomeStore(home);
		const events: HarnessEvent[] = [];
		const supervisor = await createFailoverSupervisor({
			chain: [
				{ provider: "budget-a", model: "a", account: "one" },
				{ provider: "answer-b", model: "b", account: "two" },
			],
			home,
			cwd,
			...runtimeProviders(thinker.provider, good.provider),
			onEvent: (event) => events.push(event),
			outcomeStore: outcomes,
			taskKind: "plan",
		});
		try {
			const final = await supervisor.prompt("plan it");
			expect(final.content.some((block) => block.type === "text" && block.text === "the plan")).toBe(true);
			expect(events.find((event) => event.type === "step" && event.errorKind)).toMatchObject({
				provider: "budget-a",
				stopReason: "length",
				errorMessage: "Model spent its output budget without an answer",
			});
			expect((await outcomes.penalties("plan")).get("budget-a/a@one")).toBeGreaterThan(0);
			expect((await outcomes.penalties("plan")).has("answer-b/b@two")).toBe(false);
		} finally {
			supervisor.session.dispose();
		}
	});

	test("a provider limit delivered as a zero-token answer fails over and makes the account unavailable", async () => {
		// pollinations answered HTTP 200 "The API key used for this request has reached its budget" with 0 output tokens.
		const { home, cwd } = await tempWorkspace();
		const brokeFaux = fauxProvider({ provider: "budget-p", models: [{ id: "p" }] });
		// The faux provider estimates usage from the text, so this provider streams the provider's reply with 0 output tokens.
		const zeroTokenAnswer = (model: { api: string; provider: string; id: string }) => {
			const stream = createAssistantMessageEventStream();
			const message = {
				...fauxAssistantMessage("The API key used for this request has reached its budget"),
				api: model.api,
				provider: model.provider,
				model: model.id,
			};
			message.usage = {
				input: 5,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				totalTokens: 5,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
			};
			queueMicrotask(() => {
				stream.push({ type: "done", reason: "stop", message });
				stream.end(message);
			});
			return stream;
		};
		const broke = {
			provider: { ...brokeFaux.provider, stream: zeroTokenAnswer, streamSimple: zeroTokenAnswer } as Provider,
		};
		const good = fauxProvider({ provider: "answer-b", models: [{ id: "b" }] });
		good.setResponses([fauxAssistantMessage("the plan")]);
		const base = BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "google")!;
		const policy = {
			observe: true,
			bodyRules: [{ type: "billing" as const, regex: "reached its budget", answerText: true }],
		};
		const events: HarnessEvent[] = [];
		const supervisor = await createFailoverSupervisor({
			chain: [
				{ provider: "budget-p", model: "p", account: "one" },
				{ provider: "answer-b", model: "b", account: "two" },
			],
			home,
			cwd,
			...runtimeProviders(broke.provider, good.provider),
			onEvent: (event) => events.push(event),
			providerConfigs: new Map([["budget-p", { ...base, id: "budget-p", limits: policy }]]),
		});
		try {
			const final = await supervisor.prompt("plan it");
			expect(final.content.some((block) => block.type === "text" && block.text === "the plan")).toBe(true);
			expect(events.find((event) => event.type === "limit")).toMatchObject({
				entry: { provider: "budget-p", account: "one", type: "billing" },
			});
			expect(events.find((event) => event.type === "step" && event.errorKind)).toMatchObject({
				errorKind: "quota_exhausted",
				errorMessage: "Provider answered with a billing limit message",
			});
		} finally {
			supervisor.session.dispose();
		}
	});

	test("a chain that only returns empty answers is exhausted, not successful", async () => {
		const { home, cwd } = await tempWorkspace();
		const empty = fauxProvider({ provider: "only-empty", models: [{ id: "e" }] });
		empty.setResponses([fauxAssistantMessage([])]);
		const supervisor = await createFailoverSupervisor({
			chain: [{ provider: "only-empty", model: "e", account: "one" }],
			home,
			cwd,
			...runtimeProviders(empty.provider),
		});
		try {
			let error: unknown;
			try {
				await supervisor.prompt("plan it");
			} catch (caught) {
				error = caught;
			}
			expect(error).toBeInstanceOf(ChainExhaustedError);
		} finally {
			supervisor.session.dispose();
		}
	});

	test("mixed fatal exhaustion exits 1 with the final redacted request error", () => {
		const error = new ChainExhaustedError(
			["quota_exhausted", "fatal"],
			[
				{ candidate: { provider: "a", model: "a", account: "one" }, kind: "quota_exhausted", message: "quota" },
				{
					candidate: { provider: "b", model: "b", account: "two" },
					kind: "fatal",
					message: "request failed token=hidden",
				},
			],
		);
		expect(error.exitCode).toBe(1);
		expect(error.message).toBe("request failed token=[REDACTED]");
	});

	test("only all-quota/rate and all-auth chains use their reserved exit codes", () => {
		expect(new ChainExhaustedError(["quota_exhausted", "rate_limited"]).exitCode).toBe(2);
		expect(new ChainExhaustedError(["auth", "auth"]).exitCode).toBe(3);
		expect(new ChainExhaustedError(["auth", "quota_exhausted"]).exitCode).toBe(1);
		// Observed 2026-09-15: every free candidate was daily-limited except one overloaded OpenRouter model, df exited 1 and the lane gave up instead of waiting.
		expect(new ChainExhaustedError(["quota_exhausted", "transient"]).exitCode).toBe(2);
		expect(new ChainExhaustedError(["transient"]).exitCode).toBe(2);
		expect(new ChainExhaustedError(["transient", "fatal"]).exitCode).toBe(1);
	});

	test("single-candidate fatal runs surface the redacted request error with exit 1", async () => {
		const { home, cwd } = await tempWorkspace();
		const provider = throwingProvider("fatal-one", "model", "bad request api_key=hidden");
		const supervisor = await createFailoverSupervisor({
			chain: [{ provider: "fatal-one", model: "model", account: "one" }],
			home,
			cwd,
			...runtimeProviders(provider),
		});
		try {
			let error: unknown;
			try {
				await supervisor.prompt("go");
			} catch (caught) {
				error = caught;
			}
			expect(error).toBeInstanceOf(ChainExhaustedError);
			if (!(error instanceof ChainExhaustedError)) throw new Error("Expected ChainExhaustedError");
			expect(error.exitCode).toBe(1);
			expect(error.message).toContain("api_key=[REDACTED]");
		} finally {
			supervisor.session.dispose();
		}
	});

	test("mixed quota then fatal runs exit 1 instead of claiming all candidates were limited", async () => {
		const { home, cwd } = await tempWorkspace();
		const quota = fauxProvider({ provider: "mixed-quota", models: [{ id: "q" }] });
		quota.setResponses([fauxAssistantMessage([], { stopReason: "error", errorMessage: "429 insufficient_quota" })]);
		const fatal = throwingProvider("mixed-fatal", "f", "request contract failed");
		const supervisor = await createFailoverSupervisor({
			chain: [
				{ provider: "mixed-quota", model: "q", account: "one" },
				{ provider: "mixed-fatal", model: "f", account: "two" },
			],
			home,
			cwd,
			...runtimeProviders(quota.provider, fatal),
		});
		try {
			let error: unknown;
			try {
				await supervisor.prompt("go");
			} catch (caught) {
				error = caught;
			}
			if (!(error instanceof ChainExhaustedError)) throw new Error("Expected ChainExhaustedError");
			expect(error.exitCode).toBe(1);
			expect(error.message).toContain("request contract failed");
			expect(error.message).not.toContain("exhausted or rate limited");
		} finally {
			supervisor.session.dispose();
		}
	});
	test("executes a built-in write tool and retains its result across user turns", async () => {
		const { home, cwd } = await tempWorkspace();
		const faux = fauxProvider({ provider: "faux-tools", models: [{ id: "model" }] });
		faux.setResponses([
			fauxAssistantMessage(fauxToolCall("write", { path: "note.txt", content: "tool-created" }, { id: "write-1" }), {
				stopReason: "toolUse",
			}),
			fauxAssistantMessage("created"),
			(context) => {
				expect(
					context.messages.some(
						(message) => message.role === "toolResult" && message.toolCallId === "write-1" && !message.isError,
					),
				).toBe(true);
				return fauxAssistantMessage("remembered");
			},
		]);
		const supervisor = await createFailoverSupervisor({
			chain: [{ provider: "faux-tools", model: "model", account: "one" }],
			home,
			cwd,
			...runtimeProviders(faux.provider),
		});
		await supervisor.prompt("Create the note");
		expect(await readFile(join(cwd, "note.txt"), "utf8")).toBe("tool-created");
		const second = await supervisor.prompt("What did you do?");
		expect(second.content.some((block) => block.type === "text" && block.text === "remembered")).toBe(true);
		expect(supervisor.session.sessionFile?.startsWith(join(home, "sessions"))).toBe(true);
		supervisor.session.dispose();
	});

	test("fails over turn two in the same session with turn-one and tool history intact", async () => {
		const { home, cwd } = await tempWorkspace();
		const a = fauxProvider({ provider: "faux-a", models: [{ id: "a" }] });
		const b = fauxProvider({ provider: "faux-b", models: [{ id: "b" }] });
		a.setResponses([
			fauxAssistantMessage(fauxToolCall("write", { path: "state.txt", content: "one" }, { id: "state-write" }), {
				stopReason: "toolUse",
			}),
			fauxAssistantMessage("turn one complete"),
			fauxAssistantMessage([], { stopReason: "error", errorMessage: '429 insufficient_quota; "retryDelay":"120s"' }),
		]);
		b.setResponses([
			(context) => {
				expect(
					context.messages.some(
						(message) =>
							message.role === "assistant" &&
							message.content.some((block) => block.type === "text" && block.text === "turn one complete"),
					),
				).toBe(true);
				expect(
					context.messages.some(
						(message) => message.role === "toolResult" && message.toolCallId === "state-write" && !message.isError,
					),
				).toBe(true);
				expect(context.messages.filter((message) => message.role === "user")).toHaveLength(2);
				expect(context.messages.some((message) => message.role === "assistant" && message.stopReason === "error")).toBe(
					false,
				);
				return fauxAssistantMessage("turn two recovered");
			},
		]);
		const events: HarnessEvent[] = [];
		const supervisor = await createFailoverSupervisor({
			chain: [
				{ provider: "faux-a", model: "a", account: "one" },
				{ provider: "faux-b", model: "b", account: "two" },
			],
			home,
			cwd,
			...runtimeProviders(a.provider, b.provider),
			onEvent: (event) => events.push(event),
		});
		const sessionId = supervisor.session.sessionId;
		await supervisor.prompt("turn one");
		const result = await supervisor.prompt("turn two");
		expect(result.content.some((block) => block.type === "text" && block.text === "turn two recovered")).toBe(true);
		expect(supervisor.session.sessionId).toBe(sessionId);
		expect(events.some((event) => event.type === "failover" && event.reason === "quota_exhausted")).toBe(true);
		expect(supervisor.activeCandidate.provider).toBe("faux-b");
		supervisor.session.dispose();
	});

	test("persists cooldown and skips that candidate in a new supervisor", async () => {
		const { home, cwd } = await tempWorkspace();
		const a = fauxProvider({ provider: "cool-a", models: [{ id: "a" }] });
		const b = fauxProvider({ provider: "cool-b", models: [{ id: "b" }] });
		a.setResponses([
			fauxAssistantMessage([], { stopReason: "error", errorMessage: '429 insufficient_quota; "retryDelay":"120s"' }),
		]);
		b.setResponses([fauxAssistantMessage("first"), fauxAssistantMessage("second")]);
		const chain = [
			{ provider: "cool-a", model: "a", account: "one" },
			{ provider: "cool-b", model: "b", account: "two" },
		];
		const first = await createFailoverSupervisor({ chain, home, cwd, ...runtimeProviders(a.provider, b.provider) });
		await first.prompt("go");
		first.session.dispose();

		const skipped: HarnessEvent[] = [];
		const second = await createFailoverSupervisor({
			chain,
			home,
			cwd,
			...runtimeProviders(a.provider, b.provider),
			onEvent: (event) => skipped.push(event),
		});
		expect(second.activeCandidate.provider).toBe("cool-b");
		await second.prompt("again");
		expect(a.state.callCount).toBe(1);
		expect(skipped.some((event) => event.type === "candidate_skipped" && event.candidate.provider === "cool-a")).toBe(
			true,
		);
		second.session.dispose();
	});

	test("holds a Google PerDay quota from a recorded 429 body until the Pacific roll-over, not the RetryInfo delay", async () => {
		const { home, cwd } = await tempWorkspace();
		const google = fauxProvider({ provider: "google", models: [{ id: "gemini-3-flash-preview" }] });
		const next = fauxProvider({ provider: "quota-next", models: [{ id: "next" }] });
		const quotaId = "GenerateRequestsPerDayPerProjectPerModel-FreeTier";
		google.setResponses([
			fauxAssistantMessage([], {
				stopReason: "error",
				errorMessage: `429: ${JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED", details: [{ violations: [{ quotaId }] }, { retryDelay: "41s" }] } })} (failed)`,
			}),
		]);
		next.setResponses([fauxAssistantMessage("recovered")]);
		const now = 1_700_000_000_000;
		const supervisor = await createFailoverSupervisor({
			chain: [
				{ provider: "google", model: "gemini-3-flash-preview", account: "default" },
				{ provider: "quota-next", model: "next", account: "default" },
			],
			home,
			cwd,
			now: () => now,
			...runtimeProviders(google.provider, next.provider),
			providerConfigs: new Map([["google", BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "google")!]]),
		});
		await supervisor.prompt("go");
		const limits = JSON.parse(await readFile(join(home, "limits.json"), "utf8")) as {
			entries: Record<string, { resetAt?: number }>;
		};
		// 1_700_000_000_000 is 2023-11-14 22:13 UTC; the next Pacific midnight is 2023-11-15 08:00 UTC.
		expect(Object.values(limits.entries)[0]?.resetAt).toBe(1_700_035_200_000);
		supervisor.session.dispose();
	});

	test("quota failovers do not consume the maximum successful turn budget", async () => {
		const { home, cwd } = await tempWorkspace();
		const a = fauxProvider({ provider: "budget-a", models: [{ id: "a" }] });
		const b = fauxProvider({ provider: "budget-b", models: [{ id: "b" }] });
		a.setResponses([fauxAssistantMessage([], { stopReason: "error", errorMessage: "429 insufficient_quota" })]);
		b.setResponses([fauxAssistantMessage("recovered")]);
		const supervisor = await createFailoverSupervisor({
			chain: [
				{ provider: "budget-a", model: "a", account: "one" },
				{ provider: "budget-b", model: "b", account: "two" },
			],
			home,
			cwd,
			...runtimeProviders(a.provider, b.provider),
		});
		const result = await supervisor.prompt("go", 1);
		expect(result.stopReason).toBe("stop");
		expect(a.state.callCount).toBe(1);
		expect(b.state.callCount).toBe(1);
		supervisor.session.dispose();
	});

	test("blocks a denied bash command through pi's tool_call hook", async () => {
		const { home, cwd } = await tempWorkspace();
		const faux = fauxProvider({ provider: "policy-faux", models: [{ id: "model" }] });
		faux.setResponses([
			fauxAssistantMessage(fauxToolCall("bash", { command: "echo forbidden" }, { id: "blocked-bash" }), {
				stopReason: "toolUse",
			}),
			(context) => {
				const result = context.messages.find(
					(message) => message.role === "toolResult" && message.toolCallId === "blocked-bash",
				);
				expect(result?.role).toBe("toolResult");
				if (result?.role !== "toolResult") throw new Error("blocked tool result missing");
				expect(result.isError).toBe(true);
				expect(result.content.some((block) => block.type === "text" && block.text.includes("denied by policy"))).toBe(
					true,
				);
				return fauxAssistantMessage("blocked safely");
			},
		]);
		const supervisor = await createFailoverSupervisor({
			chain: [{ provider: "policy-faux", model: "model", account: "one" }],
			home,
			cwd,
			...runtimeProviders(faux.provider),
			policy: { deny: ["command:echo forbidden"] },
		});
		const result = await supervisor.prompt("try command");
		expect(result.stopReason).toBe("stop");
		supervisor.session.dispose();
	});

	test("resumes a df-owned session by id", async () => {
		const { home, cwd } = await tempWorkspace();
		const firstProvider = fauxProvider({ provider: "resume-faux", models: [{ id: "model" }] });
		firstProvider.setResponses([fauxAssistantMessage("persisted answer")]);
		const chain = [{ provider: "resume-faux", model: "model", account: "one" }];
		const first = await createFailoverSupervisor({ chain, home, cwd, ...runtimeProviders(firstProvider.provider) });
		await first.prompt("persisted question");
		const sessionId = first.session.sessionId;
		first.session.dispose();

		const resumedProvider = fauxProvider({ provider: "resume-faux", models: [{ id: "model" }] });
		resumedProvider.setResponses([
			(context) => {
				expect(
					context.messages.some(
						(message) =>
							message.role === "assistant" &&
							message.content.some((block) => block.type === "text" && block.text === "persisted answer"),
					),
				).toBe(true);
				return fauxAssistantMessage("resumed answer");
			},
		]);
		const resumed = await createFailoverSupervisor({
			chain,
			home,
			cwd,
			resume: sessionId,
			...runtimeProviders(resumedProvider.provider),
		});
		expect(resumed.session.sessionId).toBe(sessionId);
		const result = await resumed.prompt("new question");
		expect(result.content.some((block) => block.type === "text" && block.text === "resumed answer")).toBe(true);
		resumed.session.dispose();
	});

	describe("failover continuation regression", () => {
		test("success: a turn-zero provider throw records the user prompt only once", async () => {
			const { home, cwd } = await tempWorkspace();
			const first = throwingProvider("turn-zero-a", "a", "429 too many requests");
			const second = fauxProvider({ provider: "turn-zero-b", models: [{ id: "b" }] });
			second.setResponses([
				(context) => {
					expect(context.messages.filter((message) => message.role === "user")).toHaveLength(1);
					return fauxAssistantMessage("recovered");
				},
			]);
			const supervisor = await createFailoverSupervisor({
				chain: [
					{ provider: "turn-zero-a", model: "a", account: "one" },
					{ provider: "turn-zero-b", model: "b", account: "two" },
				],
				home,
				cwd,
				...runtimeProviders(first, second.provider),
			});
			expect((await supervisor.prompt("once")).stopReason).toBe("stop");
			supervisor.session.dispose();
		});

		test("edge-input: failover after a completed tool call does not execute it again", async () => {
			const { home, cwd } = await tempWorkspace();
			const first = fauxProvider({ provider: "tool-fail-a", models: [{ id: "a" }] });
			const second = fauxProvider({ provider: "tool-fail-b", models: [{ id: "b" }] });
			first.setResponses([
				fauxAssistantMessage(fauxToolCall("write", { path: "once.txt", content: "once" }, { id: "once-call" }), {
					stopReason: "toolUse",
				}),
				fauxAssistantMessage([], { stopReason: "error", errorMessage: "429 insufficient_quota" }),
			]);
			second.setResponses([
				(context) => {
					expect(context.messages.filter((message) => message.role === "user")).toHaveLength(1);
					expect(
						context.messages.filter((message) => message.role === "toolResult" && message.toolCallId === "once-call"),
					).toHaveLength(1);
					return fauxAssistantMessage("continued");
				},
			]);
			const events: HarnessEvent[] = [];
			const supervisor = await createFailoverSupervisor({
				chain: [
					{ provider: "tool-fail-a", model: "a", account: "one" },
					{ provider: "tool-fail-b", model: "b", account: "two" },
				],
				home,
				cwd,
				...runtimeProviders(first.provider, second.provider),
				onEvent: (event) => events.push(event),
			});
			await supervisor.prompt("use tool");
			expect(events.filter((event) => event.type === "tool_start" && event.toolCallId === "once-call")).toHaveLength(1);
			supervisor.session.dispose();
		});

		test("denied-failure: stacked provider failures still preserve one user prompt", async () => {
			const { home, cwd } = await tempWorkspace();
			const first = throwingProvider("stack-a", "a", "429 too many requests");
			const second = throwingProvider("stack-b", "b", "bad request shape");
			const third = fauxProvider({ provider: "stack-c", models: [{ id: "c" }] });
			third.setResponses([
				(context) => {
					expect(context.messages.filter((message) => message.role === "user")).toHaveLength(1);
					return fauxAssistantMessage("stack recovered");
				},
			]);
			const supervisor = await createFailoverSupervisor({
				chain: [
					{ provider: "stack-a", model: "a", account: "one" },
					{ provider: "stack-b", model: "b", account: "two" },
					{ provider: "stack-c", model: "c", account: "three" },
				],
				home,
				cwd,
				...runtimeProviders(first, second, third.provider),
			});
			expect((await supervisor.prompt("one prompt")).stopReason).toBe("stop");
			supervisor.session.dispose();
		});

		test("abort errors remain terminal and do not advance the chain", async () => {
			const { home, cwd } = await tempWorkspace();
			const first = throwingProvider("abort-a", "a", "request was aborted");
			const second = fauxProvider({ provider: "abort-b", models: [{ id: "b" }] });
			second.setResponses([fauxAssistantMessage("must not run")]);
			const supervisor = await createFailoverSupervisor({
				chain: [
					{ provider: "abort-a", model: "a", account: "one" },
					{ provider: "abort-b", model: "b", account: "two" },
				],
				home,
				cwd,
				...runtimeProviders(first, second.provider),
			});
			await expect(supervisor.prompt("stop")).rejects.toThrow("aborted");
			expect(second.state.callCount).toBe(0);
			supervisor.session.dispose();
		});
	});
});
