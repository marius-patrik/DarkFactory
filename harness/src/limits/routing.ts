import type { Candidate } from "../failover.ts";
import type { ModelTier } from "../providers/schema.ts";
import type { LimitEntry } from "./types.ts";

export type TaskSize = "small" | "medium" | "large";
export interface TaskEstimate {
	size: TaskSize;
	contextTokens: number;
	expectedOutputTokens: number;
	expectedSteps: number;
}
export interface CapacityProfile {
	contextWindow?: number;
	tier?: ModelTier;
	reserve?: { requests?: number; tokens?: number };
}

export function inferTaskSize(prompt: string, contextTokens = Math.ceil(prompt.length / 4)): TaskSize {
	if (contextTokens >= 64_000 || prompt.length >= 20_000) return "large";
	if (contextTokens >= 8_000 || prompt.length >= 4_000) return "medium";
	return "small";
}

export function estimateTask(
	prompt: string,
	size: TaskSize = inferTaskSize(prompt),
	contextTokens = Math.ceil(prompt.length / 4),
): TaskEstimate {
	const expectedOutputTokens = size === "small" ? 2_000 : size === "medium" ? 8_000 : 16_000;
	const expectedSteps = size === "small" ? 1 : size === "medium" ? 4 : 10;
	return { size, contextTokens, expectedOutputTokens, expectedSteps };
}

export function assessCandidate(
	_candidate: Candidate,
	task: TaskEstimate,
	entries: readonly LimitEntry[],
	profile: CapacityProfile = {},
): { eligible: boolean; reason?: "context" | "capacity" | "limited" } {
	const oneStepTokens = task.contextTokens + task.expectedOutputTokens;
	if (profile.contextWindow !== undefined && oneStepTokens > profile.contextWindow)
		return { eligible: false, reason: "context" };
	for (const entry of entries) {
		const reserve =
			entry.dimension === "tokens"
				? (profile.reserve?.tokens ?? 0)
				: entry.dimension === "requests"
					? (profile.reserve?.requests ?? 0)
					: 0;
		if (entry.dimension === "tokens" && (entry.remaining ?? 0) - reserve < oneStepTokens)
			return { eligible: false, reason: "capacity" };
		if (entry.dimension === "requests" && (entry.remaining ?? 0) - reserve < 1)
			return { eligible: false, reason: "capacity" };
		if (!entry.dimension && (entry.remaining === undefined || entry.remaining <= reserve))
			return { eligible: false, reason: "limited" };
	}
	return { eligible: true };
}

export function orderCandidates<T extends Candidate>(
	candidates: readonly T[],
	size: TaskSize,
	tier: (candidate: T) => ModelTier | undefined,
): T[] {
	const score = (value: ModelTier | undefined) =>
		size === "small"
			? { tight: 0, standard: 1, bulk: 2 }[value ?? "standard"]
			: size === "large"
				? { bulk: 0, standard: 1, tight: 2 }[value ?? "standard"]
				: { standard: 0, tight: 1, bulk: 2 }[value ?? "standard"];
	return candidates
		.map((candidate, index) => ({ candidate, index }))
		.sort((a, b) => score(tier(a.candidate)) - score(tier(b.candidate)) || a.index - b.index)
		.map(({ candidate }) => candidate);
}
