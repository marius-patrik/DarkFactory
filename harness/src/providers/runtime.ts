import type { ApiKeyAuth, Model, Provider, ProviderStreams, StreamOptions } from "@earendil-works/pi-ai";
import { createModels, createProvider, type CreateModelsOptions, type MutableModels } from "@earendil-works/pi-ai";
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic-messages.lazy";
import { googleGenerativeAIApi } from "@earendil-works/pi-ai/api/google-generative-ai.lazy";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { openAIResponsesApi } from "@earendil-works/pi-ai/api/openai-responses.lazy";
import { openAICodexResponsesApi } from "@earendil-works/pi-ai/api/openai-codex-responses.lazy";
import { cloudcodeAgentApi } from "./cloudcode-agent.ts";
import { createConfiguredOAuth } from "./oauth.ts";
import type { ApiKeyAuthConfig, ProviderConfig, ProviderConfigFile } from "./schema.ts";

const COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
function configuredApiKey(config: ApiKeyAuthConfig): ApiKeyAuth {
	return {
		name: "API key",
		async login(interaction) { const key = (await interaction.prompt({ type: "secret", message: "API key" })).trim(); if (!key) throw new Error("API key cannot be empty"); return { type: "api_key", key }; },
		async resolve({ ctx, credential }) {
			let key = credential?.key;
			for (const env of config.env ?? []) { key ??= await ctx.env(env); if (key) break; }
			const anonymous = !key && !!config.anonymousValue;
			key ??= config.anonymousValue;
			if (!key) return config.optional ? { auth: {}, source: "Anonymous" } : undefined;
			// pi's SDK-backed dialects read only `apiKey`; placement adds the configured header on top.
			if (config.placement === "bearer") return { auth: { apiKey: key, headers: { Authorization: `Bearer ${key}` } }, source: anonymous ? "Anonymous" : "API key" };
			if (config.placement === "header") return { auth: { apiKey: key, headers: { [config.name ?? "x-api-key"]: key } }, source: "API key" };
			return { auth: { apiKey: key }, source: "API key" };
		},
	};
}
/** Prepares a replay payload by injecting a thought signature placeholder into function calls.
 *
 * @param config - The provider configuration, which may contain the replay placeholder.
 * @param payload - The payload to process.
 * @returns The modified payload with thought signatures, or the original if no changes are needed. */
export function prepareReplayPayload(config: ProviderConfig, payload: unknown): unknown {
	const placeholder = config.replay?.foreignToolCallThoughtSignature;
	if (!placeholder) return payload;
	if (!payload || typeof payload !== "object" || !Array.isArray((payload as { contents?: unknown }).contents)) return payload;
	// Copy only the path to each changed part: real payloads carry non-cloneable values (abort signals, tool handlers).
	let changed = false;
	const contents = (payload as { contents: unknown[] }).contents.map((content) => {
		if (!content || typeof content !== "object") return content;
		const parts = (content as { parts?: unknown }).parts;
		if (!Array.isArray(parts)) return content;
		const index = parts.findIndex((part) => part && typeof part === "object" && "functionCall" in part);
		if (index < 0 || typeof (parts[index] as Record<string, unknown>).thoughtSignature === "string") return content;
		changed = true;
		const nextParts = parts.slice();
		nextParts[index] = { ...(parts[index] as Record<string, unknown>), thoughtSignature: placeholder };
		return { ...(content as Record<string, unknown>), parts: nextParts };
	});
	return changed ? { ...(payload as Record<string, unknown>), contents } : payload;
}

function replayOptions(config: ProviderConfig, options: StreamOptions | undefined): StreamOptions {
	return {
		...options,
		onPayload: async (payload, requestModel) => {
			const upstream = await options?.onPayload?.(payload, requestModel);
			return prepareReplayPayload(config, upstream ?? payload);
		},
	};
}

function streams(config: ProviderConfig): ProviderStreams {
	let base: ProviderStreams;
	switch (config.dialect) {
		case "openai-completions": base = openAICompletionsApi(); break;
		case "openai-responses": base = openAIResponsesApi(); break;
		case "openai-codex-responses": base = openAICodexResponsesApi(); break;
		case "anthropic-messages": base = anthropicMessagesApi(); break;
		case "google-generative-ai": base = googleGenerativeAIApi(); break;
		case "cloudcode-agent": base = cloudcodeAgentApi(config); break;
	}
	return {
		stream: (requestModel, context, options) => base.stream(requestModel, context, replayOptions(config, options)),
		streamSimple: (requestModel, context, options) => base.streamSimple(requestModel, context, replayOptions(config, options)),
	};
}
function model(config: ProviderConfig, entry: ProviderConfig["models"]["static"][number]): Model<any> {
	return { id: entry.id, name: entry.name ?? entry.id, api: config.dialect, provider: config.id, baseUrl: config.baseUrl, reasoning: entry.reasoning ?? config.capabilities.reasoning, input: entry.input ?? (config.capabilities.images ? ["text", "image"] : ["text"]), cost: COST, contextWindow: entry.contextWindow ?? 128_000, maxTokens: entry.maxTokens ?? 32_768 };
}
/** Creates a Provider from a ProviderConfig by resolving auth and building the API streams.
 *
 * @param config - The provider configuration.
 * @returns A fully constructed Provider object. */
export function providerFromConfig(config: ProviderConfig): Provider {
	const apiKey = config.auth.find((entry): entry is ApiKeyAuthConfig => entry.kind === "api_key");
	const oauth = config.auth.find((entry) => entry.kind === "oauth");
	return createProvider({ id: config.id, name: config.name, baseUrl: config.baseUrl, headers: config.staticHeaders, auth: { ...(apiKey ? { apiKey: configuredApiKey(apiKey) } : {}), ...(oauth ? { oauth: createConfiguredOAuth(oauth) } : {}) }, models: config.models.static.map((entry) => model(config, entry)), api: streams(config) });
}
/** Registry that manages provider configurations and their instantiated providers.
 *
 * Stores provider configs and lazily creates Provider instances for enabled providers. */
export class ProviderRegistry {
	/** The list of all provider configurations from the config file. */
	readonly entries: readonly ProviderConfig[];
	/** The list of enabled Provider instances built from the configurations. */
	readonly providers: readonly Provider[];
	private readonly byId: Map<string, ProviderConfig>;
	constructor(file: ProviderConfigFile) {
		this.entries = file.providers;
		this.byId = new Map(file.providers.map((entry) => [entry.id, entry]));
		this.providers = this.entries.filter((entry) => entry.enabled !== false).map(providerFromConfig);
	}
	/** Retrieves a ProviderConfig by its identifier.
	 *
	 * @param id - The provider identifier to look up.
	 * @returns The matching ProviderConfig, or undefined if not found. */
	config(id: string): ProviderConfig | undefined { return this.byId.get(id); }
	/** Creates a MutableModels instance populated with all enabled providers.
	 *
	 * @param options - Optional model creation options.
	 * @returns A MutableModels with all registry providers registered. */
	models(options?: CreateModelsOptions): MutableModels { const result = createModels(options); result.clearProviders(); for (const provider of this.providers) result.setProvider(provider); return result; }
}
