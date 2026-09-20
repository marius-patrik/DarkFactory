import type { CapabilityTier, CapabilityTierId, Difficulty, DifficultyTierMapping } from "./types.ts";

export interface CapabilityEscalationPolicy {
	order: readonly CapabilityTierId[];
	candidateTiers: Readonly<Record<string, CapabilityTierId>>;
	baselineTier: CapabilityTierId;
}

export function candidateTierKey(candidate: { provider: string; model: string; account: string }): string {
	return `${candidate.provider}/${candidate.model}@${candidate.account}`;
}

export function nextCapabilityTier(
	order: readonly CapabilityTierId[],
	current: CapabilityTierId | undefined,
): CapabilityTierId | undefined {
	if (!current) return undefined;
	const index = order.indexOf(current);
	return index >= 0 && index + 1 < order.length ? order[index + 1] : undefined;
}

function globMatch(pattern: string, value: string): boolean {
	const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	return new RegExp("^" + escaped.replace(/\*/g, ".*") + "$", "iu").test(value);
}

export function capabilityTierFor(
	candidate: { provider: string; model: string },
	tiers: readonly CapabilityTier[] | undefined,
	defaultTier: CapabilityTierId,
): CapabilityTierId {
	if (!tiers?.length) return defaultTier;
	const value = `${candidate.provider}/${candidate.model}`;
	for (const tier of tiers) if (tier.match.some((pattern) => globMatch(pattern, value))) return tier.id;
	return defaultTier;
}

export function tierRank(tier: CapabilityTierId | undefined, tiers: readonly CapabilityTier[] | undefined): number {
	if (!tier || !tiers) return -1;
	return tiers.findIndex((candidate) => candidate.id === tier);
}

export function difficultyForSize(size: "small" | "medium" | "large"): Difficulty {
	return size === "small" ? "easy" : size === "large" ? "hard" : "medium";
}

export function minimumTierFor(
	difficulty: Difficulty | undefined,
	explicitMinimum: CapabilityTierId | undefined,
	mapping: DifficultyTierMapping | undefined,
	defaultTier: CapabilityTierId,
): CapabilityTierId {
	if (explicitMinimum) return explicitMinimum;
	if (difficulty && mapping) return mapping[difficulty];
	return defaultTier;
}

export function assertTierConfiguration(
	tiers: readonly CapabilityTier[] | undefined,
	defaultTier: CapabilityTierId,
	mapping?: DifficultyTierMapping,
): void {
	if (!tiers?.length) return;
	const ids = new Set<string>();
	for (const tier of tiers) {
		if (ids.has(tier.id)) throw new Error(`Duplicate capability tier: ${tier.id}`);
		ids.add(tier.id);
	}
	if (!ids.has(defaultTier)) throw new Error(`Default capability tier "${defaultTier}" is not declared`);
	for (const [difficulty, tier] of Object.entries(mapping ?? {}))
		if (!ids.has(tier)) throw new Error(`Difficulty ${difficulty} references unknown capability tier "${tier}"`);
}
