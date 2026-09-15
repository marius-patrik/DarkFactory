import type { CatalogModel, ModelCatalog } from "./catalog.ts";
import type { ModelTier, ProviderConfig } from "../providers/schema.ts";
import type { LimitLedger } from "../limits/ledger.ts";
import { matchesModel } from "../limits/quota-engine.ts";

const NON_TEXT_MODALITIES = new Set([
	"embed",
	"embedding",
	"rerank",
	"tts",
	"whisper",
	"speech",
	"audio",
	"image",
	"video",
]);
const CHAT_HINTS = [
	"chat",
	"instruct",
	"assistant",
	"claude",
	"gpt",
	"gemini",
	"llama",
	"mistral",
	"mixtral",
	"qwen",
	"deepseek",
	"command",
	"sonnet",
	"haiku",
	"opus",
];

export type UsableCatalogModel = CatalogModel & { contextWindow?: number; tier?: ModelTier };

export interface ModelPollerOptions {
	catalog: ModelCatalog;
	providers: ProviderConfig[];
	accounts: Map<string, string[]>;
	excludeGlobs?: string[];
	/** @deprecated Learned unavailability now comes from the limit ledger. Accepted for compatibility only. */
	learnedUnavailable?: Set<string>;
	ledger?: LimitLedger;
	now?: () => number;
}

export class ModelPoller {
	readonly #catalog: ModelCatalog;
	readonly #providers: Map<string, ProviderConfig>;
	readonly #excludeGlobs: string[];
	readonly #learnedUnavailable: Set<string>;
	readonly #ledger?: LimitLedger;
	readonly #now: () => number;

	constructor(options: ModelPollerOptions) {
		this.#catalog = options.catalog;
		this.#providers = new Map(options.providers.map((provider) => [provider.id, provider]));
		this.#excludeGlobs = options.excludeGlobs ?? [];
		this.#learnedUnavailable = options.learnedUnavailable ?? new Set();
		this.#ledger = options.ledger;
		this.#now = options.now ?? Date.now;
	}

	async poll(providerId: string, account?: string): Promise<{ usable: UsableCatalogModel[]; stale: string[] }> {
		const now = this.#now();
		const provider = this.#providers.get(providerId);
		const live = await this.#catalog.get(providerId, { ...(account ? { account } : {}) });
		const declared = new Map((provider?.models.static ?? []).map((model) => [model.id, model]));
		const liveIds = new Set(live.models.map((model) => model.id));
		const rawExcludes = [...this.#excludeGlobs, ...(provider?.routing?.exclude ?? [])];
		// Strip provider prefix from globs if present, because matchesModel expects model id only
		const excludes = rawExcludes.map((g) => {
			const slash = g.indexOf("/");
			return slash >= 0 ? g.slice(slash + 1) : g;
		});

		// Learned unavailability (#318) for this provider account, read once: billing/access block the whole account,
		// a model limit blocks that model.
		const learned =
			this.#ledger && account
				? (await this.#ledger.list()).filter(
						(entry) => entry.provider === providerId && entry.account === account && entry.resetAt > now,
					)
				: [];
		const accountUnavailable = learned.some((entry) => isAccountUnavailableType(entry.type));
		const unavailableModels = new Set(learned.filter((entry) => entry.type === "model").map((entry) => entry.model));

		const usable: UsableCatalogModel[] = [];
		for (const model of live.models) {
			if (!isTextGenerationCapable(model)) continue;
			// Paid/free resolution
			const isFreeAccount = !!provider?.free?.kind;
			if (isFreeAccount) {
				const pricing = (model as any).pricing;
				if (pricing?.prompt !== undefined) {
					if (pricing.prompt !== "0" && !model.id.includes(":free") && !model.id.includes("-free")) continue;
				}
			}
			// Exclusion globs match the model id only
			if (excludes.some((glob) => matchesModel(glob, model.id))) continue;
			// Account-wide unavailability from the ledger
			if (accountUnavailable) continue;
			if (unavailableModels.has(model.id)) continue;
			// Legacy learned unavailable set
			if (
				this.#learnedUnavailable.has(model.id) ||
				this.#learnedUnavailable.has(`${providerId}/${model.id}`) ||
				(!!account && this.#learnedUnavailable.has(`${providerId}/${account}/${model.id}`))
			)
				continue;
			const hint = declared.get(model.id);
			usable.push({
				...model,
				...(hint?.contextWindow !== undefined ? { contextWindow: model.contextLength ?? hint.contextWindow } : {}),
				...(hint?.tier !== undefined ? { tier: hint.tier } : {}),
			});
		}
		const stale = [...declared.keys()].filter((id) => !liveIds.has(id)).sort();
		return { usable, stale };
	}
}

function isAccountUnavailableType(type: unknown): boolean {
	return type === "billing" || type === "access";
}

function isTextGenerationCapable(model: CatalogModel): boolean {
	const haystack = `${model.id} ${model.name}`.toLowerCase();
	// Non-chat families first: these are not text-generation capable unless modalities explicitly include "text"
	if (
		/embed|rerank|tts|whisper|transcri|speech|moderation|image|imagen|dall-e|video|veo|sora|audio|music/.test(haystack)
	) {
		const modalities = model.modalities?.map((modality) => modality.toLowerCase()) ?? [];
		if (!modalities.includes("text")) return false;
	}
	if (CHAT_HINTS.some((hint) => haystack.includes(hint))) return true;
	const modalities = model.modalities?.map((modality) => modality.toLowerCase()) ?? [];
	if (modalities.length === 0) return true;
	if (modalities.includes("text")) return true;
	return !modalities.every((modality) => NON_TEXT_MODALITIES.has(modality));
}
