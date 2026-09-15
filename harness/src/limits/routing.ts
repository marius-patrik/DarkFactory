import type { Candidate } from "../failover.ts";
import type { ModelTier } from "../providers/schema.ts";
import type { LimitEntry } from "./types.ts";

/**
 * Size categories for a task based on its prompt length and token count.
 */
export type TaskSize = "small" | "medium" | "large";
/**
 * Estimate of a task's resource requirements.
 */
export interface TaskEstimate {
  /** Size category of the task */
  size: TaskSize;
  /** Number of tokens in the prompt context */
  contextTokens: number;
  /** Estimated number of output tokens */
  expectedOutputTokens: number;
  /** Estimated number of steps required */
  expectedSteps: number;
}
/**
 * Capacity profile of a provider, optionally specifying context window, model tier, and reserved quota.
 */
export interface CapacityProfile {
  /** Optional context window limit */
  contextWindow?: number;
  /** Optional model tier */
  tier?: ModelTier;
  /** Optional reserve for requests/tokens */
  reserve?: { requests?: number; tokens?: number };
}

/**
 * Infers the appropriate {@link TaskSize} for a given prompt.
 *
 * @param prompt - The prompt text.
 * @param contextTokens - Approximate token count of the prompt (defaults to length/4).
 * @returns The inferred task size.
 */
export function inferTaskSize(prompt: string, contextTokens = Math.ceil(prompt.length / 4)): TaskSize {
	if (contextTokens >= 64_000 || prompt.length >= 20_000) return "large";
	if (contextTokens >= 8_000 || prompt.length >= 4_000) return "medium";
	return "small";
}

/**
 * Estimates the resource usage for a task of a given size.
 *
 * @param prompt - The prompt text (used only to infer size when not provided).
 * @param size - Desired task size; if omitted, inferred from prompt.
 * @param contextTokens - Approximate token count of the prompt (defaults to length/4).
 * @returns An object describing the task estimate.
 */
export function estimateTask(prompt: string, size: TaskSize = inferTaskSize(prompt), contextTokens = Math.ceil(prompt.length / 4)): TaskEstimate {
	const expectedOutputTokens = size === "small" ? 2_000 : size === "medium" ? 8_000 : 16_000;
	const expectedSteps = size === "small" ? 1 : size === "medium" ? 4 : 10;
	return { size, contextTokens, expectedOutputTokens, expectedSteps };
}

/**
 * Result of assessing a candidate's eligibility for a task.
 */
interface AssessResult {
  /** Whether the candidate is eligible */
  eligible: boolean;
  /** Reason for ineligibility, if any */
  reason?: "context" | "capacity" | "limited";
}
/**
 * Determines whether a candidate can handle a task given current limits and capacity.
 *
 * The function checks the candidate's remaining quota against the task's token and request
 * requirements, taking into account any reserved quota in the provider's capacity profile.
 * It also verifies that the task fits within the provider's context window limit, if one is
 * defined.
 *
 * @param _candidate - The candidate being assessed (currently unused, reserved for future extensions).
 * @param task - The estimated resource usage for the task.
 * @param entries - The set of limit entries associated with the candidate's provider.
 * @param profile - Optional capacity profile providing context window size and reserved quota.
 * @returns An {@link AssessResult} indicating eligibility and, if ineligible, the reason.
 */
export function assessCandidate(_candidate: Candidate, task: TaskEstimate, entries: readonly LimitEntry[], profile: CapacityProfile = {}): AssessResult {
	const oneStepTokens = task.contextTokens + task.expectedOutputTokens;
	if (profile.contextWindow !== undefined && oneStepTokens > profile.contextWindow) return { eligible: false, reason: "context" };
	for (const entry of entries) {
		const reserve = entry.dimension === "tokens" ? profile.reserve?.tokens ?? 0 : entry.dimension === "requests" ? profile.reserve?.requests ?? 0 : 0;
		if (entry.dimension === "tokens" && (entry.remaining ?? 0) - reserve < oneStepTokens) return { eligible: false, reason: "capacity" };
		if (entry.dimension === "requests" && (entry.remaining ?? 0) - reserve < 1) return { eligible: false, reason: "capacity" };
		if (!entry.dimension && (entry.remaining === undefined || entry.remaining <= reserve)) return { eligible: false, reason: "limited" };
	}
	return { eligible: true };
}

/**
 * Orders candidates based on model tier suitability for the given task size.
 *
 * @param candidates - List of candidates to order.
 * @param size - Desired task size.
 * @param tier - Function returning the model tier for a candidate.
 * @returns Candidates sorted by suitability.
 */
export function orderCandidates<T extends Candidate>(candidates: readonly T[], size: TaskSize, tier: (candidate: T) => ModelTier | undefined): T[] {
	const score = (value: ModelTier | undefined) => size === "small" ? ({ tight: 0, standard: 1, bulk: 2 }[value ?? "standard"]) : size === "large" ? ({ bulk: 0, standard: 1, tight: 2 }[value ?? "standard"]) : ({ standard: 0, tight: 1, bulk: 2 }[value ?? "standard"]);
	return candidates.map((candidate, index) => ({ candidate, index })).sort((a, b) => score(tier(a.candidate)) - score(tier(b.candidate)) || a.index - b.index).map(({ candidate }) => candidate);
}
