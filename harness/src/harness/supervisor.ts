import type { AssistantMessage, StopReason, Usage } from "@earendil-works/pi-ai";
import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import type { Candidate } from "../failover.ts";
import { classifyFailure, type FailureClassification, type FailureKind } from "../quota.ts";
import { createHarnessRuntime, type HarnessRuntime, type HarnessRuntimeOptions } from "./runtime.ts";
import { LimitLedger } from "../limits/ledger.ts";
import { defaultLimit, observeAnswer, observeLimits } from "../limits/observe.ts";
import { assessCandidate, type TaskEstimate } from "../limits/routing.ts";
import type { LimitEntry } from "../limits/types.ts";
import type { QuotaEngine } from "../limits/quota-engine.ts";
import type { ProviderConfig } from "../providers/schema.ts";
import { redactErrorMessage } from "../redaction.ts";
import type { OutcomeStore } from "../router/outcomes.ts";
import type { TaskKind } from "../router/types.ts";

export interface HarnessStepEvent {
	type: "step";
	provider: string;
	account: string;
	model: string;
	stopReason: StopReason | "threw";
	usage: Usage | null;
	errorClass: string | null;
	errorKind: FailureKind | null;
	errorMessage: string | null;
	failoverReason: FailureKind | null;
	resetAt?: number;
}

export type HarnessEvent =
	| HarnessStepEvent
	| { type: "text_delta"; delta: string }
	| { type: "thinking_delta"; delta: string }
	| { type: "tool_start"; toolCallId: string; toolName: string; input: unknown }
	| { type: "tool_end"; toolCallId: string; toolName: string; isError: boolean }
	| { type: "failover"; from: Candidate; to: Candidate; reason: string; errorMessage: string }
	| { type: "candidate_skipped"; candidate: Candidate; reason: FailureKind; resetAt?: number }
	| { type: "candidate_unavailable"; candidate: Candidate; message: string }
	| { type: "limit"; entry: LimitEntry }
	| { type: "recovered"; entry: LimitEntry }
	| { type: "waiting"; candidate?: Candidate; reason: FailureKind | string; until: number; limits?: readonly LimitEntry[] };

export interface CandidateFailureReason {
	candidate: Candidate;
	kind: FailureKind;
	message: string;
}

export class ChainExhaustedError extends Error {
	readonly exitCode: 1 | 2 | 3;
	readonly failures: readonly FailureKind[];
	readonly reasons: readonly CandidateFailureReason[];
	readonly limits: readonly LimitEntry[];

	constructor(failures: readonly FailureKind[], reasons: readonly CandidateFailureReason[] = [], limits: readonly LimitEntry[] = []) {
		const authOnly = failures.length > 0 && failures.every((kind) => kind === "auth");
		// Quota, rate limits and overload all clear on their own: the caller should wait and retry (exit 2), not give up.
		const quotaOnly = failures.length > 0 && failures.every((kind) => kind === "quota_exhausted" || kind === "rate_limited" || kind === "transient");
		const safeReasons = reasons.map((reason) => ({ ...reason, message: redactErrorMessage(reason.message) }));
		const finalMessage = safeReasons.at(-1)?.message;
		super(authOnly ? "All failover candidates failed authentication" : quotaOnly ? "All failover candidates are exhausted or rate limited" : finalMessage ? redactErrorMessage(finalMessage) : "All failover candidates failed");
		this.name = "ChainExhaustedError";
		this.exitCode = authOnly ? 3 : quotaOnly ? 2 : 1;
		this.failures = [...failures];
		this.reasons = safeReasons;
		this.limits = limits;
	}
}

export class MaxTurnsError extends Error {
	constructor(limit: number) {
		super(`Maximum turn count reached (${limit})`);
		this.name = "MaxTurnsError";
	}
}

export interface SupervisorOptions {
	chain: readonly Candidate[];
	runtime: HarnessRuntime;
	ledger: LimitLedger;
	onEvent?: (event: HarnessEvent) => void;
	now?: () => number;
	providerConfigs?: ReadonlyMap<string, ProviderConfig>;
	maxWaitMs?: number;
	sleep?: (ms: number) => Promise<void>;
	taskEstimate?: TaskEstimate;
	outcomeStore?: OutcomeStore;
	taskKind?: TaskKind;
	/** Admission control: asked before every model call; every call is recorded as usage. */
	quota?: QuotaEngine;
}

export interface CreateSupervisorOptions extends Omit<HarnessRuntimeOptions, "candidate"> {
	chain: readonly Candidate[];
	onEvent?: (event: HarnessEvent) => void;
	now?: () => number;
	cooldownTtlMs?: number;
	maxWaitMs?: number;
	sleep?: (ms: number) => Promise<void>;
	ephemeralProviders?: readonly string[];
	taskEstimate?: TaskEstimate;
	monitorRecovery?: boolean;
	outcomeStore?: OutcomeStore;
	taskKind?: TaskKind;
	quota?: QuotaEngine;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isInputTokenLimit(failure: FailureClassification, errorMessage: string): boolean {
	if (failure.pool && /token.*minute|minute.*token/i.test(failure.pool)) return true;
	if (/GenerateContentInputTokens/i.test(errorMessage)) return true;
	if (/generate_content_free_tier_input_token_count/i.test(errorMessage)) return true;
	if (/input[-_ ]?token/i.test(errorMessage) && /minute/i.test(errorMessage)) return true;
	return false;
}

function isAssistant(message: unknown): message is AssistantMessage {
	return !!message && typeof message === "object" && (message as { role?: unknown }).role === "assistant";
}

function usageTokens(usage: Usage | null | undefined): number {
	if (!usage || typeof usage !== "object") return 0;
	const record = usage as unknown as Record<string, unknown>;
	if (typeof record.totalTokens === "number") return record.totalTokens;
	return [record.input, record.output, record.cacheRead, record.cacheWrite].reduce<number>((total, value) => total + (typeof value === "number" ? value : 0), 0);
}

function isTerminalAbort(thrown: unknown, final: AssistantMessage | undefined): boolean {
	if (final?.stopReason === "aborted") return true;
	if (final?.errorMessage && /(?:request|operation|run) (?:was )?aborted/i.test(final.errorMessage)) return true;
	if (!(thrown instanceof Error)) return false;
	return thrown.name === "AbortError" || /(?:request|operation|run) (?:was )?aborted/i.test(thrown.message);
}

/**
 * A stop that carries no text and no tool call. Some models end a turn with zero output tokens; others spend the whole
 * output budget on reasoning and stop with `length` (cline-gateway laguna-s-2.1 after 18 minutes of F30-2). Either way
 * the run must fail over with its session instead of ending with an empty answer.
 */
function isEmptyAnswer(message: AssistantMessage): boolean {
	return (message.stopReason === "stop" || message.stopReason === "length") && !message.content.some((block) =>
		(block.type === "text" && block.text.trim() !== "") || block.type === "toolCall");
}

export class FailoverSupervisor {
	private activeIndex: number;
	private readonly failures: FailureKind[] = [];
	private readonly reasons: CandidateFailureReason[] = [];

	constructor(private readonly options: SupervisorOptions, activeIndex = 0) {
		if (options.chain.length === 0) throw new Error("Failover chain is empty");
		this.activeIndex = activeIndex;
	}

	get session() { return this.options.runtime.session; }

	get activeCandidate(): Candidate { return this.options.chain[this.activeIndex]!; }

	private emit(event: HarnessEvent): void { this.options.onEvent?.(event); }
	private async recordOutcome(candidate: Candidate, success: boolean, usage: Usage | null | undefined, durationMs: number, failureKind?: FailureKind): Promise<void> {
		if (!this.options.outcomeStore || !this.options.taskKind) return;
		await this.options.outcomeStore.record({ candidate, kind: this.options.taskKind, success, ...(failureKind ? { failureKind } : {}), tokens: usageTokens(usage), durationMs: Math.max(0, durationMs), observedAt: (this.options.now ?? Date.now)() });
	}

	private async recordUsage(candidate: Candidate, usage: Usage | null | undefined, success: boolean): Promise<void> {
		if (!this.options.quota) return;
		const record = (usage ?? {}) as unknown as Record<string, unknown>;
		const count = (key: string) => typeof record[key] === "number" ? record[key] as number : 0;
		await this.options.quota.record({ ...candidate, timestamp: (this.options.now ?? Date.now)(), inputTokens: count("input") + count("cacheRead") + count("cacheWrite"), outputTokens: count("output"), success });
	}

	private policy(candidate: Candidate) { return this.options.providerConfigs?.get(candidate.provider)?.limits; }

	private profile(candidate: Candidate) {
		const config = this.options.providerConfigs?.get(candidate.provider);
		const model = config?.models.static.find((entry) => entry.id === candidate.model);
		return { contextWindow: model?.contextWindow, tier: model?.tier, reserve: config?.limits?.reserve };
	}

	private pools(candidate: Candidate): string[] {
		return (this.policy(candidate)?.defaults ?? []).flatMap((entry) => entry.pool ? [entry.pool.replace(":model", `:${candidate.model}`)] : []);
	}

	private confirmRecovery = async (entry: LimitEntry): Promise<boolean> => {
		const probe = this.options.providerConfigs?.get(entry.provider)?.limits?.probe;
		return !probe?.enabled || this.options.runtime.probeCandidate(entry);
	};

	async recoverNow(now = (this.options.now ?? Date.now)()): Promise<LimitEntry[]> {
		const recovered = await this.options.ledger.recover(now, this.confirmRecovery);
		for (const entry of recovered) this.emit({ type: "recovered", entry });
		return recovered;
	}

	private async usable(candidate: Candidate, now: number): Promise<{ usable: boolean; entries: LimitEntry[] }> {
		await this.recoverNow(now);
		if (this.options.quota) {
			const verdict = await this.options.quota.admit(candidate, this.options.taskEstimate, now);
			if (verdict.decision !== "admit") return { usable: false, entries: verdict.entries };
		}
		const learned = await this.options.ledger.forCandidate(candidate, now, this.pools(candidate));
		const entries = [...learned];
		for (const item of this.policy(candidate)?.defaults ?? []) {
			if (entries.some((entry) => entry.type === item.type && entry.dimension === item.dimension)) continue;
			entries.push({ ...candidate, type: item.type, ...(item.dimension ? { dimension: item.dimension } : {}), ...(item.pool ? { pool: item.pool.replace(":model", `:${candidate.model}`) } : {}), observedAt: now, resetAt: now + item.windowMs, source: "default", remaining: item.limit, limit: item.limit });
		}
		const verdict = this.options.taskEstimate ? assessCandidate(candidate, this.options.taskEstimate, entries, this.profile(candidate)) : { eligible: (await this.options.ledger.blocking(candidate, now, this.policy(candidate)?.reserve, this.pools(candidate))).length === 0 };
		// Only limits that actually block are cooldowns; an unexhausted default window must never be waited for.
		return { usable: verdict.eligible, entries: entries.filter((entry) => entry.remaining === undefined || entry.remaining <= 0) };
	}

	private async nextCandidate(failure: FailureClassification, errorMessage: string): Promise<boolean> {
		const from = this.activeCandidate;
		const nowFn = this.options.now ?? Date.now;
		const sleep = this.options.sleep ?? defaultSleep;
		const maxWaitMs = this.options.maxWaitMs ?? 5 * 60_000;
		const tokenLimit = isInputTokenLimit(failure, errorMessage);

		const candidateIndices = [...Array(this.options.chain.length).keys()];
		const orderedIndices = [...candidateIndices.slice(this.activeIndex + 1), ...candidateIndices.slice(0, this.activeIndex)];

		// First pass: try to find an active candidate (not cooling down).
		// If tokenLimit, prefer candidates with other model/account immediately.
		if (tokenLimit) {
			for (const index of orderedIndices) {
				const candidate = this.options.chain[index]!;
				if (candidate.model === from.model && candidate.account === from.account) continue;
				const status = await this.usable(candidate, nowFn());
				if (status.usable) {
					this.activeIndex = index;
					await this.options.runtime.bindCandidate(candidate);
					this.emit({ type: "failover", from, to: candidate, reason: failure.kind, errorMessage });
					return true;
				}
			}
		}

		for (const index of orderedIndices) {
			const candidate = this.options.chain[index]!;
			const status = await this.usable(candidate, nowFn());
			if (!status.usable) {
				const blocked = status.entries[0];
				this.emit({ type: "candidate_skipped", candidate, reason: blocked?.type === "auth" ? "auth" : blocked?.type === "overload" ? "transient" : blocked?.type === "rate" ? "rate_limited" : "quota_exhausted", ...(blocked ? { resetAt: blocked.resetAt } : {}) });
				continue;
			}
			this.activeIndex = index;
			await this.options.runtime.bindCandidate(candidate);
			this.emit({ type: "failover", from, to: candidate, reason: failure.kind, errorMessage });
			return true;
		}

		// When every candidate is cooling down, check if earliest reset is within maxWaitMs
		const allCooldowns: Array<{ index: number; candidate: Candidate; cooldown: LimitEntry }> = [];
		for (let index = 0; index < this.options.chain.length; index++) {
			const candidate = this.options.chain[index]!;
			const status = await this.usable(candidate, nowFn());
			for (const cooldown of status.entries) allCooldowns.push({ index, candidate, cooldown });
		}

		if (allCooldowns.length === 0) return false;

		let candidatesToConsider = allCooldowns;
		if (tokenLimit) {
			const otherCandidates = allCooldowns.filter(
				(item) => item.candidate.model !== from.model || item.candidate.account !== from.account
			);
			if (otherCandidates.length > 0) candidatesToConsider = otherCandidates;
		}

		// A candidate is usable only when ALL of its limits have cleared: a 60 s token window next to a
		// daily quota means the candidate is ready at the daily reset, not in 60 s.
		const readyAt = new Map<number, number>();
		for (const item of candidatesToConsider) readyAt.set(item.index, Math.max(readyAt.get(item.index) ?? 0, item.cooldown.resetAt));
		candidatesToConsider.sort((a, b) => readyAt.get(a.index)! - readyAt.get(b.index)! || b.cooldown.resetAt - a.cooldown.resetAt);
		const earliest = candidatesToConsider[0]!;
		const waitMs = readyAt.get(earliest.index)! - nowFn();

		if (waitMs > maxWaitMs) {
			return false;
		}

		this.emit({
			type: "waiting",
			candidate: earliest.candidate,
			reason: earliest.cooldown.type,
			until: readyAt.get(earliest.index)!, limits: allCooldowns.map((item) => item.cooldown),
		});

		await sleep(Math.max(0, waitMs));
		await this.recoverNow(nowFn());
		this.activeIndex = earliest.index;
		await this.options.runtime.bindCandidate(earliest.candidate);
		this.emit({ type: "failover", from, to: earliest.candidate, reason: failure.kind, errorMessage });
		return true;
	}

	/** Runs one user prompt; failed provider responses are branched away before continuation. */
	async prompt(prompt: string, maxTurns = 100): Promise<AssistantMessage> {
		if (!prompt.trim()) throw new Error("Prompt cannot be empty");
		const initialUserCount = this.session.sessionManager.buildSessionContext().messages.filter((message) => message.role === "user").length;
		let promptRecorded = false;
		let totalTurns = 0;

		while (true) {
			const attemptStartedAt = (this.options.now ?? Date.now)();
			const preflight = await this.usable(this.activeCandidate, (this.options.now ?? Date.now)());
			if (!preflight.usable) {
				const entry = preflight.entries[0];
				const kind: FailureKind = entry?.type === "auth" ? "auth" : entry?.type === "overload" ? "transient" : entry?.type === "rate" ? "rate_limited" : "quota_exhausted";
				if (!await this.nextCandidate({ kind, ...(entry ? { resetAt: entry.resetAt, pool: entry.pool } : {}) }, "proactive limit/capacity skip")) throw new ChainExhaustedError([...this.failures, kind], this.reasons, await this.options.ledger.list());
			}
			const candidate = this.activeCandidate;
			const turnMessages: AssistantMessage[] = [];
			let thrown: unknown;
			try {
				await this.options.runtime.validateCandidate(candidate);
			} catch (error) {
				thrown = error;
			}
			const unsubscribe = this.session.subscribe((event: AgentSessionEvent) => {
				if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
					this.emit({ type: "text_delta", delta: event.assistantMessageEvent.delta });
				} else if (event.type === "message_update" && event.assistantMessageEvent.type === "thinking_delta") {
					// Thought content (e.g. Gemini parts with `thought: true`, which pi-ai maps to
					// thinking blocks) is model-internal reasoning: it streams as its own event and
					// never as answer text, so the parsed answer stays thought-free.
					this.emit({ type: "thinking_delta", delta: event.assistantMessageEvent.delta });
				} else if (event.type === "tool_execution_start") {
					this.emit({ type: "tool_start", toolCallId: event.toolCallId, toolName: event.toolName, input: event.args });
				} else if (event.type === "tool_execution_end") {
					this.emit({ type: "tool_end", toolCallId: event.toolCallId, toolName: event.toolName, isError: event.isError });
				} else if (event.type === "turn_end" && isAssistant(event.message)) {
					turnMessages.push(event.message);
					if (event.message.stopReason !== "error" && event.message.stopReason !== "aborted") {
						totalTurns++;
						if (totalTurns >= maxTurns && event.message.stopReason === "toolUse") this.session.agent.abort();
					}
				}
			});
			try {
				if (!thrown) {
					if (promptRecorded) await this.session.agent.continue();
					else await this.session.prompt(prompt, { source: "rpc", expandPromptTemplates: false });
				}
			} catch (error) {
				thrown = error;
			} finally {
				unsubscribe();
			}

			const final = turnMessages.at(-1);
			for (const message of turnMessages.slice(0, -1)) {
				this.emit({ type: "step", ...candidate, stopReason: message.stopReason, usage: message.usage, errorClass: null, errorKind: null, errorMessage: null, failoverReason: null });
				await this.recordOutcome(candidate, true, message.usage, 0);
				await this.recordUsage(candidate, message.usage, true);
			}
			if (totalTurns >= maxTurns && final?.stopReason !== "stop") throw new MaxTurnsError(maxTurns);

			const emptyAnswer = !thrown && final !== undefined && isEmptyAnswer(final);
			// A provider limit delivered as the answer text (HTTP 200, zero output tokens) is not an answer either.
			const answerLimits = !thrown && final && !emptyAnswer && final.stopReason !== "error" && final.stopReason !== "aborted"
				? observeAnswer(candidate, final.content.flatMap((block) => block.type === "text" ? [block.text] : []).join("\n"), final.usage?.output ?? -1, this.policy(candidate), (this.options.now ?? Date.now)())
				: [];
			if (!thrown && final && final.stopReason !== "error" && final.stopReason !== "aborted" && !emptyAnswer && answerLimits.length === 0) {
				const responses = this.options.runtime.takeResponses();
				const policy = this.policy(candidate);
				const learned = responses.flatMap((response) => observeLimits(candidate, response, policy, (this.options.now ?? Date.now)()));
				await this.options.ledger.record(learned);
				for (const entry of learned) this.emit({ type: "limit", entry });
				this.emit({ type: "step", ...candidate, stopReason: final.stopReason, usage: final.usage, errorClass: null, errorKind: null, errorMessage: null, failoverReason: null });
				await this.recordOutcome(candidate, true, final.usage, (this.options.now ?? Date.now)() - attemptStartedAt);
				await this.recordUsage(candidate, final.usage, true);
				return final;
			}

			const response = this.options.runtime.takeResponses().at(-1);
			const config = this.options.providerConfigs?.get(candidate.provider);
			// An empty answer is not an answer: fail over like a transient provider error.
			const failure: FailureClassification = emptyAnswer
				? { kind: "transient", errorClass: "EmptyResponse" }
				: answerLimits.length > 0
				? { kind: "quota_exhausted", errorClass: "AnswerLimit", resetAt: Math.max(...answerLimits.map((entry) => entry.resetAt)) }
				: classifyFailure({ error: thrown, message: final, response, now: (this.options.now ?? Date.now)() }, config?.quota ? { rules: config.quota.rules, model: candidate.model } : undefined);
			const stopReason = final?.stopReason ?? "threw";
			const errorMessage = emptyAnswer ? (final?.stopReason === "length" ? "Model spent its output budget without an answer" : "Model returned an empty response") : answerLimits.length > 0 ? `Provider answered with a ${answerLimits[0]!.type} limit message` : redactErrorMessage(thrown instanceof Error ? thrown.message : final?.errorMessage ?? `Agent stopped: ${stopReason}`);
			this.emit({
				type: "step", ...candidate, stopReason, usage: final?.usage ?? null,
				errorClass: failure.errorClass ?? null, errorKind: failure.kind, errorMessage,
				failoverReason: isTerminalAbort(thrown, final) ? null : failure.kind,
				...(failure.resetAt === undefined ? {} : { resetAt: failure.resetAt }),
			});
			await this.recordOutcome(candidate, false, final?.usage, (this.options.now ?? Date.now)() - attemptStartedAt, failure.kind);
			// A rejected request still counts against request limits on most providers.
			if (final !== undefined || thrown !== undefined) await this.recordUsage(candidate, final?.usage, false);
			if (isTerminalAbort(thrown, final)) {
				if (thrown instanceof Error) throw thrown;
				throw new Error(final?.errorMessage ?? `Agent stopped: ${stopReason}`);
			}

			this.failures.push(failure.kind);
			this.reasons.push({ candidate, kind: failure.kind, message: errorMessage });
			const observedAt = (this.options.now ?? Date.now)();
			const observed = observeLimits(candidate, { status: response?.status ?? failure.status ?? 0, headers: response?.headers, body: errorMessage }, this.policy(candidate), observedAt)
				.map((entry) => failure.resetAt === undefined || entry.resetAt >= failure.resetAt ? entry : { ...entry, resetAt: failure.resetAt, source: "rule" as const });
			const dailyWording = /per[- ]?day|perday|\bdaily\b/iu.test(errorMessage);
			const type = (failure.kind === "rate_limited" || failure.kind === "quota_exhausted") && dailyWording ? "daily" : failure.kind === "rate_limited" ? "rate" : failure.kind === "quota_exhausted" ? (/monthly|billing cycle/iu.test(errorMessage) ? "monthly" : /resets? in|weekly|\b5h/iu.test(errorMessage) ? "window" : "daily") : failure.kind === "transient" ? "overload" : failure.kind === "auth" ? "auth" : undefined;
			const limits = answerLimits.length > 0 ? answerLimits : observed.length > 0 ? observed : type ? [defaultLimit(candidate, type, observedAt, type === "daily" ? failure.resetAt : failure.resetAt ?? (failure.kind === "rate_limited" ? observedAt + 60_000 : undefined), undefined, failure.pool, this.policy(candidate))] : [];
			await this.options.ledger.record(limits);
			for (const entry of limits) this.emit({ type: "limit", entry });

			// SessionManager is authoritative: branch away only a failed assistant leaf,
			// preserve accepted user/tool-result entries, then synchronize agent state.
			const leaf = this.session.sessionManager.getLeafEntry();
			if (leaf?.type === "message" && leaf.message.role === "assistant" &&
				(leaf.message.stopReason === "error" || leaf.message.stopReason === "aborted" || isEmptyAnswer(leaf.message) || (answerLimits.length > 0 && leaf.message === final))) {
				if (leaf.parentId) this.session.sessionManager.branch(leaf.parentId);
				else this.session.sessionManager.resetLeaf();
			}
			const persisted = this.session.sessionManager.buildSessionContext().messages;
			this.session.agent.state.messages = persisted;
			promptRecorded = persisted.filter((message) => message.role === "user").length > initialUserCount;

			if (!await this.nextCandidate(failure, errorMessage)) throw new ChainExhaustedError(this.failures, this.reasons, await this.options.ledger.list());
		}
	}
}

export async function createFailoverSupervisor(options: CreateSupervisorOptions): Promise<FailoverSupervisor> {
	if (options.chain.length === 0) throw new Error("Failover chain is empty");
	const home = options.home ?? process.env.DF_HOME;
	if (!home) throw new Error("DF_HOME is required for the harness runtime");
	const ephemeral = new Set(options.ephemeralProviders ?? []);
	const ledger = new LimitLedger(home, { fallbackTtlMs: options.cooldownTtlMs, persist: (candidate) => !ephemeral.has(candidate.provider) });
	let activeIndex = -1;
	const initialFailures: FailureKind[] = [];
	const initialReasons: CandidateFailureReason[] = [];
	const quotaBlocks: LimitEntry[] = [];
	for (let index = 0; index < options.chain.length; index++) {
		const candidate = options.chain[index]!;
		for (const entry of await ledger.recover((options.now ?? Date.now)())) options.onEvent?.({ type: "recovered", entry });
		const config = options.providerConfigs?.get(candidate.provider);
		const pools = (config?.limits?.defaults ?? []).flatMap((entry) => entry.pool ? [entry.pool.replace(":model", `:${candidate.model}`)] : []);
		const currentNow = (options.now ?? Date.now)();
		if (options.quota) {
			const admission = await options.quota.admit(candidate, options.taskEstimate, currentNow);
			if (admission.decision !== "admit") {
				// Learned limits are already in the ledger; only declared-limit blocks are added to what the wait considers.
				quotaBlocks.push(...admission.entries.filter((entry) => entry.source === "declared"));
				const kind: FailureKind = admission.entries.some((entry) => entry.type === "daily" || entry.type === "monthly") ? "quota_exhausted" : "rate_limited";
				initialFailures.push(kind);
				initialReasons.push({ candidate, kind, message: `Candidate is limited (${admission.reason ?? "quota"})` });
				options.onEvent?.({ type: "candidate_skipped", candidate, reason: kind, ...(admission.waitUntil === undefined ? {} : { resetAt: admission.waitUntil }) });
				continue;
			}
		}
		const persistedEntries = await ledger.forCandidate(candidate, currentNow, pools);
		const entries = [...persistedEntries];
		for (const item of config?.limits?.defaults ?? []) {
			if (entries.some((entry) => entry.type === item.type && entry.dimension === item.dimension)) continue;
			entries.push({ ...candidate, type: item.type, ...(item.dimension ? { dimension: item.dimension } : {}), ...(item.pool ? { pool: item.pool.replace(":model", `:${candidate.model}`) } : {}), observedAt: currentNow, resetAt: currentNow + item.windowMs, source: "default", remaining: item.limit, limit: item.limit });
		}
		const model = config?.models.static.find((entry) => entry.id === candidate.model);
		const verdict = options.taskEstimate ? assessCandidate(candidate, options.taskEstimate, entries, { contextWindow: model?.contextWindow, tier: model?.tier, reserve: config?.limits?.reserve }) : { eligible: (await ledger.blocking(candidate, currentNow, config?.limits?.reserve, pools)).length === 0 };
		if (verdict.eligible) { activeIndex = index; break; }
		const cooldown = persistedEntries[0];
		const kind: FailureKind = !cooldown ? "rate_limited" : cooldown.type === "auth" ? "auth" : cooldown.type === "overload" ? "transient" : cooldown.type === "rate" ? "rate_limited" : "quota_exhausted";
		initialFailures.push(kind);
		initialReasons.push({ candidate, kind, message: cooldown ? `Candidate is limited (${cooldown.type})` : "Candidate cannot fit one task step" });
		options.onEvent?.({ type: "candidate_skipped", candidate, reason: kind, ...(cooldown ? { resetAt: cooldown.resetAt } : {}) });
	}
	if (activeIndex < 0) {
		const limits = [...await ledger.list(), ...quotaBlocks];
		// Wait for the candidate whose limits ALL clear first, never for one limit of a candidate that has others.
		const nowAt = (options.now ?? Date.now)();
		const readyByCandidate = new Map<string, LimitEntry>();
		for (const entry of limits.filter((item) => item.resetAt > nowAt && options.chain.some((candidate) => candidate.provider === item.provider && candidate.account === item.account && candidate.model === item.model))) {
			const key = `${entry.provider}/${entry.model}@${entry.account}`;
			const current = readyByCandidate.get(key);
			if (!current || entry.resetAt > current.resetAt) readyByCandidate.set(key, entry);
		}
		const earliest = [...readyByCandidate.values()].sort((a, b) => a.resetAt - b.resetAt)[0];
		const waitMs = earliest ? earliest.resetAt - (options.now ?? Date.now)() : Infinity;
		if (earliest && waitMs <= (options.maxWaitMs ?? 5 * 60_000)) {
			options.onEvent?.({ type: "waiting", reason: earliest.type, until: earliest.resetAt, limits });
			await (options.sleep ?? defaultSleep)(Math.max(0, waitMs));
			for (const entry of await ledger.recover((options.now ?? Date.now)())) options.onEvent?.({ type: "recovered", entry });
			activeIndex = options.chain.findIndex((candidate) => candidate.provider === earliest.provider && candidate.account === earliest.account && candidate.model === earliest.model);
		}
		if (activeIndex < 0) throw new ChainExhaustedError(initialFailures, initialReasons, limits);
	}
	const runtime = await createHarnessRuntime({ ...options, candidate: options.chain[activeIndex]! });
	const supervisor = new FailoverSupervisor({ chain: options.chain, runtime, ledger, onEvent: options.onEvent, now: options.now, providerConfigs: options.providerConfigs, maxWaitMs: options.maxWaitMs, sleep: options.sleep, taskEstimate: options.taskEstimate, outcomeStore: options.outcomeStore, taskKind: options.taskKind, ...(options.quota ? { quota: options.quota } : {}) }, activeIndex);
	if (options.monitorRecovery) {
		const timer = setInterval(() => { void supervisor.recoverNow(); }, 1_000);
		timer.unref?.();
	}
	return supervisor;
}
