import type {
	AssistantMessage,
	Context,
	Models,
	ProviderHeaders,
	ProviderResponse,
	StopReason,
	Usage,
} from "@earendil-works/pi-ai";

export type { Context, Models } from "@earendil-works/pi-ai";
import { classifyFailure, type FailureClassification } from "./quota.ts";
import type { ProviderConfig } from "./providers/schema.ts";
import { redactErrorMessage } from "./redaction.ts";
import { penalty } from "./penalty.ts";

export interface Candidate {
	provider: string;
	account: string;
	model: string;
}

export interface StepEvent {
	type: "attempt";
	provider: string;
	account: string;
	model: string;
	stopReason: StopReason | "threw";
	usage: Usage | null;
	errorClass: string | null;
	errorMessage: string | null;
	classification?: FailureClassification["kind"];
	durationMs: number;
	resetAt?: number;
	pool?: string;
}

export interface RunTurnOptions {
	candidates: readonly Candidate[];
	context: Context;
	modelsFor(candidate: Candidate): Models;
	headersFor?(candidate: Candidate): ProviderHeaders | Promise<ProviderHeaders>;
	fetchFor?(candidate: Candidate): typeof globalThis.fetch;
	onText?(text: string): void;
	onStep?(event: StepEvent): void;
	now?: () => number;
	exhaustion?: CandidateExhaustion;
	providerConfigs?: ReadonlyMap<string, ProviderConfig>;
}

export interface TurnResult {
	message: AssistantMessage;
	candidate: Candidate;
	steps: StepEvent[];
}

class TerminalAttemptError extends Error {}

function candidateId(candidate: Candidate): string {
	return `${candidate.provider}/${candidate.model}@${candidate.account}`;
}

export class CandidateExhaustion {
	private readonly entries = new Map<string, number | undefined>();

	mark(candidate: Candidate, resetAt?: number): void {
		this.entries.set(candidateId(candidate), resetAt);
	}

	isExhausted(candidate: Candidate, now = Date.now()): boolean {
		const key = candidateId(candidate);
		if (!this.entries.has(key)) return false;
		const resetAt = this.entries.get(key);
		if (resetAt !== undefined && resetAt <= now) {
			this.entries.delete(key);
			return false;
		}
		return true;
	}

	getResetAt(candidate: Candidate): number | undefined {
		return this.entries.get(candidateId(candidate));
	}
}

/** Runs exactly one provider request per candidate; maxRetries:0 keeps failover fast. */
export async function runFailoverTurn(options: RunTurnOptions): Promise<TurnResult> {
	if (options.candidates.length === 0) throw new Error("Failover chain is empty");
	const exhausted = options.exhaustion ?? new CandidateExhaustion();
	const steps: StepEvent[] = [];
	let lastFailure = "No candidate was attempted";

	for (const candidate of options.candidates) {
		if (exhausted.isExhausted(candidate)) continue;
		let retryAttempt = 0;
		let shouldFailover = false;
		while (retryAttempt < 2) {
			const isRetry = retryAttempt > 0;
			if (isRetry) {
				penalty.record('lengthStopRetry', { candidate, retryAttempt });
			}
			const started = (options.now ?? performance.now)();
			let response: ProviderResponse | undefined;
			try {
				const models = options.modelsFor(candidate);
				const model = models.getModel(candidate.provider, candidate.model);
				if (!model) throw new Error(`Unknown model ${candidate.provider}/${candidate.model}`);
				const headers = await options.headersFor?.(candidate);
				const stream = models.streamSimple(model, options.context, {
					...(headers ? { headers } : {}),
					...(options.fetchFor ? { fetch: options.fetchFor(candidate) } : {}),
					maxRetries: 0,
					maxRetryDelayMs: 1_000,
					onResponse(value) { response = value; },
				});
				for await (const event of stream) {
					if (event.type === "text_delta") options.onText?.(event.delta);
				}
				const message = await stream.result();
				const durationMs = Math.max(0, (options.now ?? performance.now)() - started);
				const hasOutput = message.content.some((c) => c.type === "text" && (c as any).text?.length > 0) || message.content.some((c) => c.type === "toolCall");
				if (message.stopReason === "length" && !hasOutput && !isRetry) {
					// length stop with no output, retry
					retryAttempt++;
					continue; // retry loop
				}
				if (message.stopReason === "length" && !hasOutput && isRetry) {
					// second length stop, record failover penalty and break to next candidate
					penalty.record('lengthStopFailover', { candidate, retryAttempt });
					shouldFailover = true;
					break;
				}
				if (message.stopReason !== "error" && message.stopReason !== "aborted") {
					const event: StepEvent = {
						type: "attempt", ...candidate, stopReason: message.stopReason, usage: message.usage,
						errorClass: null, durationMs,
						errorMessage: null,
					};
					steps.push(event);
					options.onStep?.(event);
					return { message, candidate, steps };
				}
				const config = options.providerConfigs?.get(candidate.provider);
				const failure = classifyFailure({ message, response }, config?.quota ? { rules: config.quota.rules, model: candidate.model } : undefined);
				lastFailure = redactErrorMessage(message.errorMessage ?? message.stopReason);
				const event: StepEvent = {
					type: "attempt", ...candidate, stopReason: message.stopReason, usage: message.usage,
					durationMs, classification: failure.kind, errorClass: failure.errorClass ?? null, errorMessage: lastFailure, resetAt: failure.resetAt, pool: failure.pool,
				};
				steps.push(event);
				options.onStep?.(event);
				if (failure.kind === "quota_exhausted" || failure.kind === "rate_limited") {
					exhausted.mark(candidate, failure.resetAt);
					break;
				}
				throw new TerminalAttemptError(lastFailure);
			} catch (error) {
				if (error instanceof TerminalAttemptError) throw error;
				const config = options.providerConfigs?.get(candidate.provider);
				const failure = classifyFailure({ error, response }, config?.quota ? { rules: config.quota.rules, model: candidate.model } : undefined);
				const durationMs = Math.max(0, (options.now ?? performance.now)() - started);
				lastFailure = redactErrorMessage(error);
				const event: StepEvent = {
					type: "attempt", ...candidate, stopReason: "threw", usage: null, durationMs,
					classification: failure.kind, errorClass: failure.errorClass ?? null, errorMessage: lastFailure, resetAt: failure.resetAt, pool: failure.pool,
				};
				steps.push(event);
				options.onStep?.(event);
				if (failure.kind === "quota_exhausted" || failure.kind === "rate_limited") {
					exhausted.mark(candidate, failure.resetAt);
					break;
				}
				throw error;
			}
		}
		if (shouldFailover) {
			continue; // move to next candidate
		}
	}
	throw new Error(`All failover candidates exhausted: ${lastFailure}`);
}
