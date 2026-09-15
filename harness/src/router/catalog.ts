import type { CatalogResult } from "../models/catalog.ts";
import type { ProviderConfig } from "../providers/schema.ts";
import type { ModelCapability, ModelCapabilityOverride, ModelModality, RouterConfig } from "./types.ts";

function key(provider: string, model: string, account?: string): string { return `${provider}/${model}${account ? `@${account}` : ""}`; }

function globMatch(pattern: string, value: string): boolean {
	// Escape regex special characters except '*'
	const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	const regexStr = "^" + escaped.replace(/\*/g, ".*") + "$";
	return new RegExp(regexStr, "iu").test(value);
}

export function buildRouterCatalog(options: {
	providers: readonly ProviderConfig[];
	catalogs?: ReadonlyMap<string, CatalogResult>;
	accounts?: ReadonlyMap<string, readonly string[]>;
	overrides?: RouterConfig["models"];
}): ModelCapability[] {
	const result: ModelCapability[] = [];
	for (const provider of options.providers) {
		if (provider.routing?.enabled === false) continue;
		const live = options.catalogs?.get(provider.id);
		const catalogModels = live?.models ?? provider.models.static.map((model) => ({ id: model.id, name: model.name ?? model.id }));
		const accounts = options.accounts?.get(provider.id) ?? ["default"];
		for (const account of accounts) for (const catalog of catalogModels) {
			const declared = provider.models.static.find((model) => model.id === catalog.id);
			const override: ModelCapabilityOverride = options.overrides?.[key(provider.id, catalog.id, account)] ?? options.overrides?.[key(provider.id, catalog.id)] ?? {};
			const inputs = declared?.input ?? (provider.capabilities.images ? ["text", "image"] : ["text"]);
			const methods = (catalog as { supportedMethods?: string[] }).supportedMethods?.join(" ") ?? "";
			const modalities: ModelModality[] = [...new Set<ModelModality>([...inputs, ...(/image/iu.test(methods) ? ["image_gen" as const] : []), ...(/video/iu.test(methods) ? ["video_gen" as const] : [])])];
			if (provider.routing?.exclude?.some((p) => globMatch(p, catalog.id))) continue;
			result.push({
				candidate: { provider: provider.id, model: catalog.id, account },
				contextWindow: declared?.contextWindow ?? 128_000,
				tools: provider.capabilities.tools,
				reasoning: declared?.reasoning ?? provider.capabilities.reasoning,
				modalities,
				quality: {}, limitTier: declared?.tier ?? "standard", reserve: provider.limits?.reserve,
				collection: provider.free?.data?.collection ?? provider.data?.collection ?? "unknown",
				source: live?.source ?? "builtin", ...override,
			});
		}
	}
	return result;
}
