import type { CatalogResult } from "../models/catalog.ts";
import type { ProviderConfig } from "../providers/schema.ts";
import type { ModelCapability, ModelCapabilityOverride, ModelModality, RouterConfig } from "./types.ts";

function key(provider: string, model: string, account?: string): string { return `${provider}/${model}${account ? `@${account}` : ""}`; }

/**
 * Builds a catalog of model capabilities from provider information.
 *
 * @param options - Configuration options:
 *   @param options.providers – List of provider configurations.
 *   @param options.catalogs – Optional map of provider IDs to fetched catalog results.
 *   @param options.accounts – Optional map of provider IDs to account identifiers.
 *   @param options.overrides – Optional router config overrides for specific models.
 * @returns An array of {@link ModelCapability} objects describing each model.
 */
export function buildRouterCatalog(options: {
	providers: readonly ProviderConfig[];
	catalogs?: ReadonlyMap<string, CatalogResult>;
	accounts?: ReadonlyMap<string, readonly string[]>;
	overrides?: RouterConfig["models"];
}): ModelCapability[] {
	const result: ModelCapability[] = [];
	for (const provider of options.providers) {
		const live = options.catalogs?.get(provider.id);
		const catalogModels = live?.models ?? provider.models.static.map((model) => ({ id: model.id, name: model.name ?? model.id }));
		const accounts = options.accounts?.get(provider.id) ?? ["default"];
		for (const account of accounts) for (const catalog of catalogModels) {
			const declared = provider.models.static.find((model) => model.id === catalog.id);
			const override: ModelCapabilityOverride = options.overrides?.[key(provider.id, catalog.id, account)] ?? options.overrides?.[key(provider.id, catalog.id)] ?? {};
			const inputs = declared?.input ?? (provider.capabilities.images ? ["text", "image"] : ["text"]);
			const methods = (catalog as { supportedMethods?: string[] }).supportedMethods?.join(" ") ?? "";
			const modalities: ModelModality[] = [...new Set<ModelModality>([...inputs, ...(/image/iu.test(methods) ? ["image_gen" as const] : []), ...(/video/iu.test(methods) ? ["video_gen" as const] : [])])];
			result.push({
				candidate: { provider: provider.id, model: catalog.id, account },
				contextWindow: declared?.contextWindow ?? 128_000,
				tools: provider.capabilities.tools,
				reasoning: declared?.reasoning ?? provider.capabilities.reasoning,
				modalities,
				quality: {}, limitTier: declared?.tier ?? "standard", reserve: provider.limits?.reserve,
				source: live?.source ?? "builtin", ...override,
			});
		}
	}
	return result;
}
