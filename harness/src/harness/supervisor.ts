import type { AssistantMessage, StopReason, Usage } from "@earendil-works/pi-ai";
import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import type { Candidate } from "../failover.ts";
import { classifyFailure, type FailureKind } from "../quota.ts";
import { createHarnessRuntime, type HarnessRuntime, type HarnessRuntimeOptions } from "./runtime.ts";
import { QuotaStore } from "./quota-store.ts";
import type { ProviderConfig } from "../providers/schema.ts";
import { redactErrorMessage } from "../redaction.ts";

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
	| { type: "tool_start"; toolCallId: string; toolName: string; input: unknown }
	| { type: "tool_end"; toolCallId: string; toolName: string; isError: boolean }
	| { type: "failover"; from: Candidate; to: Candidate; reason: string; errorMessage: string }
	| { type: "candidate_skipped"; candidate: Candidate; reason: FailureKind; resetAt?: number }
	| { type: "candidate_unavailable"; candidate: Candidate; message: string };

export interface CandidateFailureReason {
	candidate: Candidate;
	kind: FailureKind;
	message: string;
}

export class ChainExhaustedError extends Error {
	readonly exitCode: 1 | 2 | 3;
	readonly failures: readonly FailureKind[];
	readonly reasons: readonly CandidateFailureReason[];

	constructor(failures: readonly FailureKind[], reasons: readonly CandidateFailureReason[] = []) {
		const authOnly = failures.length > 0 && failures.every((kind) => kind === "auth");
		const quotaOnly = failures.length > 0 && failures.every((kind) => kind === "quota_exhausted" || kind === "rate_limited");
		const safeReasons = reasons.map((reason) => ({ ...reason, message: redactErrorMessage(reason.message) }));
		const finalMessage = safeReasons.at(-1)?.message;
		super(authOnly ? "All failover candidates failed authentication" : quotaOnly ? "All failover candidates are exhausted or rate limited" : finalMessage ? redactErrorMessage(finalMessage) : "All failover candidates failed");
		this.name = "ChainExhaustedError";
		this.exitCode = authOnly ? 3 : quotaOnly ? 2 : 1;
		this.failures = [...failures];
		this.reasons = safeReasons;
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
	quota: QuotaStore;
	onEvent?: (event: HarnessEvent) => void;
	now?: () => number;
	providerConfigs?: ReadonlyMap<string, ProviderConfig>;
}

export interface CreateSupervisorOptions extends Omit<HarnessRuntimeOptions, "candidate"> {
	chain: readonly Candidate[];
	onEvent?: (event: HarnessEvent) => void;
	now?: () => number;
	cooldownTtlMs?: number;
	ephemeralProviders?: readonly string[];
}

function isAssistant(message: unknown): message is AssistantMessage {
	return !!message && typeof message === "object" && (message as { role?: unknown }).role === "assistant";
}

function isTerminalAbort(thrown: unknown, final: AssistantMessage | undefined): boolean {
	if (final?.stopReason === "aborted") return true;
	if (final?.errorMessage && /(?:request|operation|run) (?:was )?aborted/i.test(final.errorMessage)) return true;
	if (!(thrown instanceof Error)) return false;
	return thrown.name === "AbortError" || /(?:request|operation|run) (?:was )?aborted/i.test(thrown.message);
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

	private async nextCandidate(reason: FailureKind, errorMessage: string): Promise<boolean> {
		const from = this.activeCandidate;
		for (let index = this.activeIndex + 1; index < this.options.chain.length; index++) {
			const candidate = this.options.chain[index]!;
			const cooldown = await this.options.quota.active(candidate, (this.options.now ?? Date.now)());
			if (cooldown) {
				this.failures.push(cooldown.kind);
				this.reasons.push({ candidate, kind: cooldown.kind, message: `Candidate is cooling down (${cooldown.kind})` });
				this.emit({ type: "candidate_skipped", candidate, reason: cooldown.kind, ...(cooldown.resetAt === undefined ? {} : { resetAt: cooldown.resetAt }) });
				continue;
			}
			this.activeIndex = index;
			await this.options.runtime.bindCandidate(candidate);
			this.emit({ type: "failover", from, to: candidate, reason, errorMessage });
			return true;
		}
		return false;
	}

	/** Runs one user prompt; failed provider responses are branched away before continuation. */
	async prompt(prompt: string, maxTurns = 100): Promise<AssistantMessage> {
		if (!prompt.trim()) throw new Error("Prompt cannot be empty");
		const initialUserCount = this.session.sessionManager.buildSessionContext().messages.filter((message) => message.role === "user").length;
		let promptRecorded = false;
		let totalTurns = 0;

		while (true) {
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
			}
			if (totalTurns >= maxTurns && final?.stopReason !== "stop") throw new MaxTurnsError(maxTurns);

			if (!thrown && final && final.stopReason !== "error" && final.stopReason !== "aborted") {
				this.emit({ type: "step", ...candidate, stopReason: final.stopReason, usage: final.usage, errorClass: null, errorKind: null, errorMessage: null, failoverReason: null });
				return final;
			}

			const response = this.options.runtime.takeResponse();
			const config = this.options.providerConfigs?.get(candidate.provider);
			const failure = classifyFailure({ error: thrown, message: final, response, now: (this.options.now ?? Date.now)() }, config?.quota ? { rules: config.quota.rules, model: candidate.model } : undefined);
			const stopReason = final?.stopReason ?? "threw";
			const errorMessage = redactErrorMessage(thrown instanceof Error ? thrown.message : final?.errorMessage ?? `Agent stopped: ${stopReason}`);
			this.emit({
				type: "step", ...candidate, stopReason, usage: final?.usage ?? null,
				errorClass: failure.errorClass ?? null, errorKind: failure.kind, errorMessage,
				failoverReason: isTerminalAbort(thrown, final) ? null : failure.kind,
				...(failure.resetAt === undefined ? {} : { resetAt: failure.resetAt }),
			});
			if (isTerminalAbort(thrown, final)) {
				if (thrown instanceof Error) throw thrown;
				throw new Error(final?.errorMessage ?? `Agent stopped: ${stopReason}`);
			}

			this.failures.push(failure.kind);
			this.reasons.push({ candidate, kind: failure.kind, message: errorMessage });
			const resetAt = failure.resetAt ?? (failure.kind === "rate_limited" ? (this.options.now ?? Date.now)() + 60_000 : undefined);
			await this.options.quota.mark(candidate, failure.kind, resetAt, (this.options.now ?? Date.now)());

			// SessionManager is authoritative: branch away only a failed assistant leaf,
			// preserve accepted user/tool-result entries, then synchronize agent state.
			const leaf = this.session.sessionManager.getLeafEntry();
			if (leaf?.type === "message" && leaf.message.role === "assistant" &&
				(leaf.message.stopReason === "error" || leaf.message.stopReason === "aborted")) {
				if (leaf.parentId) this.session.sessionManager.branch(leaf.parentId);
				else this.session.sessionManager.resetLeaf();
			}
			const persisted = this.session.sessionManager.buildSessionContext().messages;
			this.session.agent.state.messages = persisted;
			promptRecorded = persisted.filter((message) => message.role === "user").length > initialUserCount;

			if (!await this.nextCandidate(failure.kind, errorMessage)) throw new ChainExhaustedError(this.failures, this.reasons);
		}
	}
}

export async function createFailoverSupervisor(options: CreateSupervisorOptions): Promise<FailoverSupervisor> {
	if (options.chain.length === 0) throw new Error("Failover chain is empty");
	const home = options.home ?? process.env.DF_HOME;
	if (!home) throw new Error("DF_HOME is required for the harness runtime");
	const ephemeral = new Set(options.ephemeralProviders ?? []);
	const quota = new QuotaStore(home, { fallbackTtlMs: options.cooldownTtlMs, persist: (candidate) => !ephemeral.has(candidate.provider) });
	let activeIndex = -1;
	const initialFailures: FailureKind[] = [];
	const initialReasons: CandidateFailureReason[] = [];
	for (let index = 0; index < options.chain.length; index++) {
		const candidate = options.chain[index]!;
		const cooldown = await quota.active(candidate, (options.now ?? Date.now)());
		if (!cooldown) { activeIndex = index; break; }
		initialFailures.push(cooldown.kind);
		initialReasons.push({ candidate, kind: cooldown.kind, message: `Candidate is cooling down (${cooldown.kind})` });
		options.onEvent?.({ type: "candidate_skipped", candidate, reason: cooldown.kind, ...(cooldown.resetAt === undefined ? {} : { resetAt: cooldown.resetAt }) });
	}
	if (activeIndex < 0) throw new ChainExhaustedError(initialFailures, initialReasons);
	const runtime = await createHarnessRuntime({ ...options, candidate: options.chain[activeIndex]! });
	return new FailoverSupervisor({ chain: options.chain, runtime, quota, onEvent: options.onEvent, now: options.now, providerConfigs: options.providerConfigs }, activeIndex);
}
