import type { Candidate } from "../failover.ts";
import type { QuotaEngine } from "../limits/quota-engine.ts";

import { parseChain } from "../harness/routing.ts";
import { assessCandidate, estimateTask } from "../limits/routing.ts";
import type { LimitLedger } from "../limits/ledger.ts";
import { classifyTask, type CheapClassifier } from "./profile.ts";
import type { OutcomeStore } from "./outcomes.ts";
import type { ModelCapability, RankedCandidate, RouteResult, RouterConfig, RouterInput, RouterPolicy, TaskNeed, TaskProfile } from "./types.ts";

const candidateKey = (value: Candidate) => `${value.provider}/${value.model}@${value.account}`;
const DEFAULT_TIER_ORDER = { small: ["tight", "standard", "bulk"], medium: ["standard", "bulk", "tight"], large: ["bulk", "standard", "tight"] } as const;

function matches(policy: RouterPolicy, profile: TaskProfile): boolean {
	const match = policy.match;
	return (!match.kind || match.kind.includes(profile.kind)) && (!match.size || match.size.includes(profile.size)) &&
		(!match.sensitivity || match.sensitivity.includes(profile.sensitivity)) && (!match.needs || match.needs.every((need) => profile.needs.includes(need)));
}

function missingNeed(model: ModelCapability, need: TaskNeed, profile: TaskProfile): boolean {
	if (need === "tools") return !model.tools;
	if (need === "reasoning") return !model.reasoning;
	if (need === "vision") return !model.modalities.includes("image");
	if (need === "long_context") return model.contextWindow < profile.contextTokens;
	if (need === "image_gen") return !model.modalities.includes("image_gen");
	return !model.modalities.includes("video_gen");
}

export interface RouteDependencies {
	quota?: QuotaEngine;
	config: RouterConfig;
	models: readonly ModelCapability[];
	ledger?: LimitLedger;
	outcomes?: OutcomeStore;
	sensitiveChain?: string;
	hardReasoningChain?: string;
	defaultChain?: string;
	classify?: CheapClassifier;
	now?: () => number;
}

export async function routeTask(input: RouterInput, dependencies: RouteDependencies): Promise<RouteResult> {
	const profile = await classifyTask(input, dependencies.config, dependencies.classify);
	const explicit = input.explicitChain ?? input.explicitModel;
	const graph = input.node?.chain ?? input.node?.model;
	const constrained = profile.sensitivity === "sensitive" ? dependencies.sensitiveChain : undefined;
	if (profile.sensitivity === "sensitive" && !constrained && !explicit && !graph) throw new Error("Sensitive task requires sensitiveChain");
	const hard = input.reasoning === "hard" || input.node?.reasoning === "hard" ? dependencies.hardReasoningChain : undefined;
	const source: RouteResult["source"] = explicit ? "explicit" : graph ? "graph" : constrained ? "sensitive" : hard ? "hard" : "policy";
	const policy = source === "policy" ? dependencies.config.policies.find((entry) => matches(entry, profile)) : undefined;
	const forced = explicit ?? graph ?? constrained ?? hard;
	const useGenerationCatalog = !!policy && !policy.prefer.candidates && !dependencies.config.candidates && (profile.needs.includes("image_gen") || profile.needs.includes("video_gen"));
	const preferred = forced ? parseChain(forced) : policy?.prefer.candidates?.map((entry) => parseChain(entry)[0]!) ?? dependencies.config.candidates?.map((entry) => parseChain(entry)[0]!) ?? (useGenerationCatalog ? [] : dependencies.defaultChain ? parseChain(dependencies.defaultChain) : []);
	const byKey = new Map(dependencies.models.map((model) => [candidateKey(model.candidate), model]));
	const universe: ModelCapability[] = forced || preferred.length > 0 ? preferred.map((candidate): ModelCapability => byKey.get(candidateKey(candidate)) ?? {
		candidate, contextWindow: Number.MAX_SAFE_INTEGER, tools: true, reasoning: true, modalities: ["text"], quality: {}, limitTier: "standard",
	}) : [...dependencies.models];
	const penalties = dependencies.outcomes && dependencies.config.learning?.enabled !== false ? await dependencies.outcomes.penalties(profile.kind, dependencies.now?.()) : new Map<string, number>();
	const preference = new Map(preferred.map((candidate, index) => [candidateKey(candidate), index]));
	const tierOrder = policy?.prefer.tiers ?? [...DEFAULT_TIER_ORDER[profile.size]];
	const forcedOrder = !!forced || !!policy?.prefer.candidates;
	const scored = universe.map((model, index) => {
		const preferredIndex = preference.get(candidateKey(model.candidate));
		const tierIndex = tierOrder.indexOf(model.limitTier);
		const qualityKind = policy?.prefer.quality ?? profile.kind;
		const quality = model.quality[qualityKind] ?? 0;
		const learning = penalties.get(candidateKey(model.candidate)) ?? 0;
		const capabilityPenalty = profile.needs.some((need) => missingNeed(model, need, profile)) ? 10_000 : 0;
		const orderScore = preferredIndex === undefined ? 1_000 : forcedOrder ? preferredIndex * 100 : preferredIndex / 10_000;
		const score = orderScore + (forced ? 0 : tierIndex < 0 ? 300 : tierIndex * 100) - (forced ? 0 : quality) + learning + (forced ? 0 : capabilityPenalty) + index / 100_000;
		return { model, score, quality, learning };
	}).sort((a, b) => a.score - b.score);
	    const now = dependencies.now?.() ?? Date.now();
	const isForced = !!forced;
	const adjusted = await Promise.all(scored.map(async (item) => {
		const missing = forced && (source === "explicit" || source === "graph") ? undefined : profile.needs.find((need) => missingNeed(item.model, need, profile));
		let skip: string | undefined = missing ? `missing ${missing}` : undefined;
		if (!skip && dependencies.ledger) {
			const entries = await dependencies.ledger.forCandidate(item.model.candidate, now);
			const estimate = estimateTask(input.prompt, profile.size, profile.contextTokens);
			const verdict = assessCandidate(item.model.candidate, estimate, entries, item.model);
			if (!verdict.eligible) skip = verdict.reason ?? "limited";
		}
		let quotaStatus;
		if (dependencies.quota) {
			quotaStatus = await dependencies.quota.status(item.model.candidate, now);
			if (quotaStatus.state === "unavailable") {
				skip = `unavailable (${quotaStatus.reason}) until ${new Date(quotaStatus.until!).toISOString()}`;
			} else if (quotaStatus.state === "exhausted") {
				skip = "quota exhausted until " + new Date(quotaStatus.until!).toISOString();
			} else if (quotaStatus.state === "waiting") {
				if (!isForced) item.score += 50;
			} else if (quotaStatus.state === "available") {
				if (!isForced) {
					const enforcedItems = quotaStatus.items.filter(i => i.enforced && i.limit && i.limit > 0);
					let fraction = 1;
					if (enforcedItems.length > 0) {
						fraction = Math.min(...enforcedItems.map(i => (i.remaining ?? 0) / (i.limit ?? 1)));
					}
					item.score -= 10 * fraction;
				}
			}
		}
		return { item, skip, quotaStatus };
	}));
	adjusted.sort((a, b) => a.item.score - b.item.score);
	const ranked: RankedCandidate[] = [];
	for (const [index, entry] of adjusted.entries()) {
		const { item, skip, quotaStatus } = entry;
		const details: string[] = [`tier ${item.model.limitTier}`, `quality ${item.quality}`];
		if (item.learning > 0) details.push(`recent-failure penalty ${item.learning.toFixed(2)}`);
		if (!skip && quotaStatus) {
			if (quotaStatus.state === "waiting") {
				details.push("waiting until " + new Date(quotaStatus.until!).toISOString());
			} else if (quotaStatus.state === "available") {
				const enforcedItems = quotaStatus.items.filter(i => i.enforced && i.limit && i.limit > 0);
				let fraction = 1;
				if (enforcedItems.length > 0) {
					fraction = Math.min(...enforcedItems.map(i => (i.remaining ?? 0) / (i.limit ?? 1)));
				}
				const percent = Math.round(fraction * 100);
				details.push("capacity " + percent + "%");
			}
		}
		ranked.push({
			candidate: item.model.candidate,
			rank: index + 1,
			status: skip ? "skipped" : "chosen",
			reason: skip ?? (source === "policy" ? `policy ${policy?.id ?? "default"}` : `${source} selection`),
			score: item.score,
			details,
		});
	}
	return { profile, source: source === "policy" && !policy ? "default" : source, ...(policy ? { policy: policy.id } : {}), ranked, chain: ranked.filter((item) => item.status === "chosen").map((item) => item.candidate) };
}
