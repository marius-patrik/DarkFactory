import type { LimitLedger } from "../limits/ledger.ts";
import { matchesModel } from "../limits/quota-engine.ts";
import type { ModelTier, ProviderConfig } from "../providers/schema.ts";
import type { CatalogModel, ModelCatalog } from "./catalog.ts";

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
	ledger?: LimitLedger;
	now?: () => number;
}

/** A model the live listing offered but the poller did not accept, with the reason. */
export interface ExcludedModel {
	/** Model id as listed by the provider. */
	id: string;
	/** Why the model is not usable for this account. */
	reason: string;
}

/** Result of {@link ModelPoller.poll} for one provider account. */
export interface PollResult {
	/** Models df may route to. */
	usable: UsableCatalogModel[];
	/** Declared (static) model ids the live listing no longer has. */
	stale: string[];
	/** Listed models that were not accepted, with reasons. */
	excluded: ExcludedModel[];
}

export class ModelPoller {
	readonly #catalog: ModelCatalog;
	readonly #providers: Map<string, ProviderConfig>;
	readonly #excludeGlobs: string[];
	readonly #ledger?: LimitLedger;
	readonly #now: () => number;

	constructor(options: ModelPollerOptions) {
		this.#catalog = options.catalog;
		this.#providers = new Map(options.providers.map((provider) => [provider.id, provider]));
		this.#excludeGlobs = options.excludeGlobs ?? [];
		this.#ledger = options.ledger;
		this.#now = options.now ?? Date.now;
	}

	async poll(providerId: string, account?: string): Promise<PollResult> {
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
		const excluded: ExcludedModel[] = [];
		const isFreeTier = !!provider?.free?.kind;
		for (const model of live.models) {
			const reason = !isTextGenerationCapable(model)
				? "not a text-generation model"
				: isFreeTier &&
						model.pricing?.prompt !== undefined &&
						model.pricing.prompt !== "0" &&
						!model.id.includes(":free") &&
						!model.id.includes("-free")
					? "paid model on a free tier"
					: excludes.some((glob) => matchesModel(glob, model.id))
						? "excluded by routing.exclude"
						: accountUnavailable
							? "account unavailable (learned billing or access limit)"
							: unavailableModels.has(model.id)
								? "model unavailable (learned model limit)"
								: undefined;
			if (reason) {
				excluded.push({ id: model.id, reason });
				continue;
			}
			const hint = declared.get(model.id);
			usable.push({
				...model,
				...(hint?.contextWindow !== undefined ? { contextWindow: model.contextLength ?? hint.contextWindow } : {}),
				...(hint?.tier !== undefined ? { tier: hint.tier } : {}),
			});
		}
		const stale = [...declared.keys()].filter((id) => !liveIds.has(id)).sort();
		return { usable, stale, excluded };
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
