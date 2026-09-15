import type { CatalogModel, ModelCatalog } from "./catalog.ts";
import type { ModelTier, ProviderConfig } from "../providers/schema.ts";

const NON_TEXT_MODALITIES = new Set(["embed", "embedding", "rerank", "tts", "whisper", "speech", "audio", "image", "video"]);
const CHAT_HINTS = ["chat", "instruct", "assistant", "claude", "gpt", "gemini", "llama", "mistral", "mixtral", "qwen", "deepseek", "command", "sonnet", "haiku", "opus"];

export type UsableCatalogModel = CatalogModel & { contextWindow?: number; tier?: ModelTier };

export interface ModelPollerOptions {
	catalog: ModelCatalog;
	providers: ProviderConfig[];
	accounts: Map<string, string[]>;
	excludeGlobs?: string[];
	learnedUnavailable?: Set<string>;
	now?: () => number;
}

export class ModelPoller {
	readonly #catalog: ModelCatalog;
	readonly #providers: Map<string, ProviderConfig>;
	readonly #accounts: Map<string, string[]>;
	readonly #excludeGlobs: string[];
	readonly #learnedUnavailable: Set<string>;
	readonly #now: () => number;

	constructor(options: ModelPollerOptions) {
		this.#catalog = options.catalog;
		this.#providers = new Map(options.providers.map((provider) => [provider.id, provider]));
		this.#accounts = options.accounts;
		this.#excludeGlobs = options.excludeGlobs ?? [];
		this.#learnedUnavailable = options.learnedUnavailable ?? new Set();
		this.#now = options.now ?? Date.now;
	}

	async poll(providerId: string, account?: string): Promise<{ usable: UsableCatalogModel[]; stale: string[] }> {
		void this.#accounts;
		void this.#now;
		const provider = this.#providers.get(providerId);
		const live = await this.#catalog.get(providerId, { ...(account ? { account } : {}) });
		const declared = new Map((provider?.models.static ?? []).map((model) => [model.id, model]));
		const liveIds = new Set(live.models.map((model) => model.id));
		const excludes = [...this.#excludeGlobs, ...(provider?.routing?.exclude ?? [])];
		const usable = live.models
			.filter((model) => isTextGenerationCapable(model))
			.filter((model) => {
				// Paid/free resolution
				const isFreeAccount = !!provider?.free?.kind;
				if (!isFreeAccount) return true; // paid accounts keep all text-generation models
				const pricing = (model as any).pricing;
				if (pricing?.prompt !== undefined) {
					return pricing.prompt === "0" || model.id.includes(":free") || model.id.includes("-free");
				}
				// No pricing metadata: include model
				return true;
			})
			.filter((model) => !isLearnedUnavailable(this.#learnedUnavailable, providerId, model.id, account))
			.filter((model) => !excludes.some((glob) => globMatch(glob, `${providerId}/${model.id}`)))
			.map((model): UsableCatalogModel => {
				const hint = declared.get(model.id);
				return {
					...model,
					...(hint?.contextWindow !== undefined ? { contextWindow: model.contextLength ?? hint.contextWindow } : {}),
					...(hint?.tier !== undefined ? { tier: hint.tier } : {}),
				};
			});
		const stale = [...declared.keys()].filter((id) => !liveIds.has(id)).sort();
		return { usable, stale };
	}
}

function isTextGenerationCapable(model: CatalogModel): boolean {
	const haystack = `${model.id} ${model.name}`.toLowerCase();
	if (CHAT_HINTS.some((hint) => haystack.includes(hint))) return true;
	const modalities = model.modalities?.map((modality) => modality.toLowerCase()) ?? [];
	if (modalities.length === 0) return true;
	if (modalities.includes("text")) return true;
	return !modalities.every((modality) => NON_TEXT_MODALITIES.has(modality));
}

function isLearnedUnavailable(unavailable: Set<string>, providerId: string, modelId: string, account?: string): boolean {
	return unavailable.has(modelId) || unavailable.has(`${providerId}/${modelId}`) || (!!account && unavailable.has(`${providerId}/${account}/${modelId}`));
}

function globMatch(pattern: string, value: string): boolean {
	const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]").replace(/\u0000/g, ".*");
	return new RegExp(`^${escaped}$`, "u").test(value);
}
