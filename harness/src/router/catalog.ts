import type { CatalogModel, CatalogResult } from "../models/catalog.ts";
import type { ModelPoller } from "../models/poller.ts";
import type { ProviderConfig } from "../providers/schema.ts";
import type { ModelCapability, ModelCapabilityOverride, ModelModality, RouterConfig } from "./types.ts";

function key(provider: string, model: string, account?: string): string { return `${provider}/${model}${account ? `@${account}` : ""}`; }

type Poller = ModelPoller & { getUsableModels?: (providerId: string, account?: string) => Promise<ModelCapability[]> };

type BuildOptions = {
	providers: readonly ProviderConfig[];
	catalogs?: ReadonlyMap<string, CatalogResult>;
	accounts?: ReadonlyMap<string, readonly string[]>;
	overrides?: RouterConfig["models"];
};

type BuildOptionsWithPoller = BuildOptions & { modelPoller: Poller };

function capabilityFromCatalog(provider: ProviderConfig, catalog: CatalogModel & { contextWindow?: number; tier?: ModelCapability["limitTier"] }, account: string, source: ModelCapability["source"], overrides?: RouterConfig["models"]): ModelCapability {
	const declared = provider.models.static.find((model) => model.id === catalog.id);
	const override: ModelCapabilityOverride = overrides?.[key(provider.id, catalog.id, account)] ?? overrides?.[key(provider.id, catalog.id)] ?? {};
	const inputs = declared?.input ?? (provider.capabilities.images ? ["text", "image"] : ["text"]);
	const methods = catalog.supportedMethods?.join(" ") ?? "";
	const modalities: ModelModality[] = [...new Set<ModelModality>([...inputs, ...(/image/iu.test(methods) ? ["image_gen" as const] : []), ...(/video/iu.test(methods) ? ["video_gen" as const] : [])])];
	return {
		candidate: { provider: provider.id, model: catalog.id, account },
		contextWindow: declared?.contextWindow ?? catalog.contextWindow ?? catalog.contextLength ?? 128_000,
		tools: provider.capabilities.tools,
		reasoning: declared?.reasoning ?? provider.capabilities.reasoning,
		modalities,
		quality: {}, limitTier: declared?.tier ?? catalog.tier ?? "standard", reserve: provider.limits?.reserve,
		source, ...override,
	};
}

export function getUsableModels(providerId: string, account?: string): Promise<ModelCapability[]>;
export function getUsableModels(providerId: string, account: string | undefined, context: { modelPoller: Poller; provider: ProviderConfig; overrides?: RouterConfig["models"] }): Promise<ModelCapability[]>;
export async function getUsableModels(providerId: string, account = "default", context?: { modelPoller: Poller; provider: ProviderConfig; overrides?: RouterConfig["models"] }): Promise<ModelCapability[]> {
	if (!context) throw new Error("getUsableModels requires a ModelPoller context");
	if (context.modelPoller.getUsableModels) return context.modelPoller.getUsableModels(providerId, account);
	const { usable } = await context.modelPoller.poll(providerId, account);
	return usable.map((model) => capabilityFromCatalog(context.provider, model, account, "live", context.overrides));
}

export function buildRouterCatalog(options: BuildOptions): ModelCapability[];
export function buildRouterCatalog(options: BuildOptionsWithPoller): Promise<ModelCapability[]>;
export function buildRouterCatalog(options: BuildOptions | BuildOptionsWithPoller): ModelCapability[] | Promise<ModelCapability[]> {
	if ("modelPoller" in options) return buildRouterCatalogFromPoller(options);
	const result: ModelCapability[] = [];
	for (const provider of options.providers) {
		const live = options.catalogs?.get(provider.id);
		const catalogModels = live?.models ?? provider.models.static.map((model) => ({ id: model.id, name: model.name ?? model.id }));
		const accounts = options.accounts?.get(provider.id) ?? ["default"];
		for (const account of accounts) for (const catalog of catalogModels) result.push(capabilityFromCatalog(provider, catalog, account, live?.source ?? "builtin", options.overrides));
	}
	return result;
}

async function buildRouterCatalogFromPoller(options: BuildOptionsWithPoller): Promise<ModelCapability[]> {
	const result: ModelCapability[] = [];
	for (const provider of options.providers) {
		const accounts = options.accounts?.get(provider.id) ?? ["default"];
		for (const account of accounts) result.push(...await getUsableModels(provider.id, account, { modelPoller: options.modelPoller, provider, overrides: options.overrides }));
	}
	return result;
}
