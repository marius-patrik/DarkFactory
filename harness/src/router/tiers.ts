import { matchesModel } from "../limits/quota-engine.ts";
import type { CapabilityTier } from "./types.ts";

/**
 * Returns the ID of the first tier whose match globs match `${provider}/${model}`,
 * or the defaultTier if no match is found.
 */
export function capabilityTierFor(
	candidate: { provider: string; model: string },
	tiers: readonly CapabilityTier[] | undefined,
	defaultTier: string,
): string {
	if (!tiers || tiers.length === 0) return defaultTier;
	for (const tier of tiers) {
		if (tier.match?.some((glob) => matchesModel(glob, candidate.provider + "/" + candidate.model))) {
			return tier.id;
		}
	}
	return defaultTier;
}

/**
 * Returns the index of the tier in tiers, or -1 if unknown/undefined.
 */
export function tierRank(tier: string | undefined, tiers: readonly CapabilityTier[] | undefined): number {
	if (!tier || !tiers) return -1;
	const idx = tiers.findIndex((t) => t.id === tier);
	return idx >= 0 ? idx : -1;
}
