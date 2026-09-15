import type {
	AssistantMessage,
	Context,
	Models,
	ProviderHeaders,
	ProviderResponse,
	StopReason,
	Usage,
} from "@earendil-works/pi-ai";
import { classifyFailure, type FailureClassification } from "./quota.ts";
import type { ProviderConfig } from "./providers/schema.ts";
import { redactErrorMessage } from "./redaction.ts";

/** Candidate represents a possible provider/model/account combination for a request. */
/**
 * Represents a possible provider/model/account combination for a request.
 */
export interface Candidate {
	/** Provider identifier used for the request. */
	provider: string;
	/** Account identifier within the provider. */
	account: string;
	/** Model name requested from the provider. */
	model: string;
}

/** StepEvent describes a single attempt step in the failover process. */
/**
 * Describes a single attempt step in the failover process.
 */
export interface StepEvent {
	/** The type of step, always "attempt" for a request attempt. */
	type: "attempt";
	/** Provider identifier used for the request. */
	provider: string;
	/** Account identifier within the provider. */
	account: string;
	/** Model name requested from the provider. */
	model: string;
	/** Reason why the request stopped, or "threw" if an exception occurred. */
	stopReason: StopReason | "threw";
	/** Usage metrics returned by the provider, if any. */
	usage: Usage | null;
	/** Classified error class, if the request failed. */
	errorClass: string | null;
	/** Human‑readable error message, if the request failed. */
	errorMessage: string | null;
	/** Optional classification of the failure kind. */
	classification?: FailureClassification["kind"];
	/** Duration of the attempt in milliseconds. */
	durationMs: number;
	/** Optional timestamp (ms since epoch) when the candidate can be retried. */
	resetAt?: number;
	/** Optional pool identifier for quota management. */
	pool?: string;
}

/** Options controlling a failover turn execution. */
/**
 * Options controlling a failover turn execution.
 */
export interface RunTurnOptions {
	/** Ordered list of candidate providers to attempt. */
	candidates: readonly Candidate[];
	/** Conversation context passed to each provider. */
	context: Context;
	/** Returns the model registry for a given candidate. */
	modelsFor(candidate: Candidate): Models;
	/** Optional function to provide request headers for a candidate. */
	headersFor?(candidate: Candidate): ProviderHeaders | Promise<ProviderHeaders>;
	/** Optional custom fetch implementation for a candidate. */
	fetchFor?(candidate: Candidate): typeof globalThis.fetch;
	/** Optional callback invoked for each text delta received. */
	onText?(text: string): void;
	/** Optional callback invoked after each attempt step. */
	onStep?(event: StepEvent): void;
	/** Optional function to override the current timestamp (ms). */
	now?: () => number;
	/** Optional shared exhaustion tracker across turns. */
	exhaustion?: CandidateExhaustion;
	/** Optional map of provider‑specific configuration objects. */
	providerConfigs?: ReadonlyMap<string, ProviderConfig>;
}

/** Result of a successful failover turn, containing the final message and metadata. */
/**
 * Result of a successful failover turn, containing the final message and metadata.
 */
export interface TurnResult {
	/** The assistant's response message. */
	message: AssistantMessage;
	/** The candidate that produced the successful response. */
	candidate: Candidate;
	/** Ordered list of all attempt steps taken. */
	steps: StepEvent[];
}

/**
 * Error thrown when a terminal attempt fails and the failover process should stop.
 * This error indicates that the failure is not recoverable via exhaustion.
 */
class TerminalAttemptError extends Error {}

/**
 * Generate a unique identifier string for a candidate.
 * The identifier is used for tracking exhaustion state.
 *
 * @param candidate - The candidate to generate an identifier for.
 * @returns A string in the form "provider/model@account".
 */
function candidateId(candidate: Candidate): string {
	return `${candidate.provider}/${candidate.model}@${candidate.account}`;
}

/** Tracks exhaustion state for candidates based on quota or rate‑limit failures. */
/**
 * Tracks exhaustion state for candidates based on quota or rate‑limit failures.
 */
export class CandidateExhaustion {
	private readonly entries = new Map<string, number | undefined>();

	/** Mark a candidate as exhausted until the optional reset timestamp. */
	/**
 * Mark a candidate as exhausted until the optional reset timestamp.
 * @param candidate - The candidate to mark.
 * @param resetAt - Unix timestamp (ms) when the candidate may be retried.
 */
 mark(candidate: Candidate, resetAt?: number): void {
		this.entries.set(candidateId(candidate), resetAt);
	}

	/** Determine whether a candidate is currently exhausted. */
	/**
 * Determine whether a candidate is currently exhausted.
 * @param candidate - The candidate to check.
 * @param now - Current timestamp (ms). Defaults to `Date.now()`.
 * @returns `true` if exhausted, otherwise `false`.
 */
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

	/** Retrieve the reset timestamp for an exhausted candidate, if any. */
	/**
 * Retrieve the reset timestamp for an exhausted candidate, if any.
 * @param candidate - The candidate to query.
 * @returns The reset timestamp in milliseconds, or `undefined` if not exhausted.
 */
 getResetAt(candidate: Candidate): number | undefined {
		return this.entries.get(candidateId(candidate));
	}
}

/**
 * Executes a failover turn over the supplied candidates.
 *
 * The function attempts each candidate in order until one succeeds.
 * It records each attempt as a {@link StepEvent} and returns the final
 * {@link TurnResult}.  Errors are classified and may trigger exhaustion
 * tracking via {@link CandidateExhaustion}.  Optional callbacks allow
 * observation of intermediate text deltas and step events.
 */
/**
 * Executes a failover turn over the supplied candidates.
 *
 * The function attempts each candidate in order until one succeeds.
 * It records each attempt as a {@link StepEvent} and returns the final
 * {@link TurnResult}. Errors are classified and may trigger exhaustion
 * tracking via {@link CandidateExhaustion}. Optional callbacks allow
 * observation of intermediate text deltas and step events.
 *
 * @param options - Configuration and callbacks for the failover turn.
 * @returns A promise resolving to the successful {@link TurnResult}.
 * @throws When all candidates are exhausted or a terminal error occurs.
 */
export async function runFailoverTurn(options: RunTurnOptions): Promise<TurnResult> {
	if (options.candidates.length === 0) throw new Error("Failover chain is empty");
	const exhausted = options.exhaustion ?? new CandidateExhaustion();
	const steps: StepEvent[] = [];
	let lastFailure = "No candidate was attempted";

	for (const candidate of options.candidates) {
		if (exhausted.isExhausted(candidate)) continue;
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
				continue;
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
				continue;
			}
			throw error;
		}
	}
	throw new Error(`All failover candidates exhausted: ${lastFailure}`);
}
