import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { FileCredentialStore } from "@darkfactory/keychain";
import { fauxProvider, type Provider } from "@earendil-works/pi-ai";
import { type CatalogFetch, ModelCatalog } from "../src/models/catalog.ts";
import { providerFromConfig } from "../src/providers/runtime.ts";
import { BUILTIN_PROVIDER_CONFIG, type ProviderConfig } from "../src/providers/schema.ts";

const temporary: string[] = [];

async function home(): Promise<string> {
	const path = await mkdtemp(join(process.cwd(), ".catalog-test-"));
	temporary.push(path);
	return path;
}

afterEach(async () => {
	for (const path of temporary.splice(0)) {
		if (!path.startsWith(process.cwd())) throw new Error(`Refusing cleanup outside workspace: ${path}`);
		await rm(path, { recursive: true, force: true });
	}
});

function configured(id: string): { provider: Provider; config: ProviderConfig } {
	const config = BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === id);
	if (!config) throw new Error(`Missing test provider ${id}`);
	return { provider: providerFromConfig(config), config };
}

describe("ModelCatalog integration boundary", () => {
	test("success: fetches OpenAI-compatible /models and reuses the fresh cache", async () => {
		const root = await home();
		const store = new FileCredentialStore(root);
		await store.setSlot("openai:test", "api_key", { type: "api_key", value: "fixture-key" });
		let calls = 0;
		const fetcher: CatalogFetch = async (input, init) => {
			calls++;
			expect(String(input)).toBe("https://api.openai.com/v1/models");
			expect(new Headers(init?.headers).get("authorization")).toBe("Bearer fixture-key");
			return Response.json({ data: [{ id: "gpt-live", display_name: "GPT Live" }] });
		};
		const base = configured("openrouter");
		const config = {
			...base.config,
			id: "sample-openai",
			name: "Sample",
			baseUrl: "https://api.openai.com/v1",
			models: { ...base.config.models, list: { ...base.config.models.list!, namePath: "display_name" } },
		};
		const provider = providerFromConfig(config);
		await store.setSlot("sample-openai:test", "api_key", { type: "api_key", value: "fixture-key" });
		const catalog = new ModelCatalog({
			home: root,
			providers: [provider],
			providerConfigs: [config],
			store,
			fetch: fetcher,
			now: () => 1_000,
		});
		const live = await catalog.get("sample-openai", { account: "test" });
		const cached = await catalog.get("sample-openai", { account: "test" });
		expect(live).toMatchObject({ source: "live", models: [{ id: "gpt-live", name: "GPT Live" }] });
		expect(cached.source).toBe("cache");
		expect(await Bun.file(join(root, "models", "sample-openai.df")).exists()).toBe(true);
		expect(await Bun.file(join(root, "models", "sample-openai.json")).exists()).toBe(false);
		expect(calls).toBe(1);
	});

	test("provider-shape: normalizes Anthropic's data envelope and required headers", async () => {
		const root = await home();
		const store = new FileCredentialStore(root);
		await store.setSlot("anthropic:work", "oauth", {
			type: "oauth",
			access: "fixture-anthropic",
			refresh: "refresh",
			expires: Date.now() + 60_000,
		});
		const setup = configured("anthropic");
		const catalog = new ModelCatalog({
			home: root,
			providers: [setup.provider],
			providerConfigs: [setup.config],
			store,
			fetch: async (input, init) => {
				expect(String(input)).toBe("https://api.anthropic.com/v1/models");
				const headers = new Headers(init?.headers);
				expect(headers.get("authorization")).toBe("Bearer fixture-anthropic");
				expect(headers.get("anthropic-version")).toBe("2023-06-01");
				return Response.json({ data: [{ id: "claude-live", display_name: "Claude Live" }] });
			},
		});
		expect((await catalog.get("anthropic", { account: "work" })).models[0]).toEqual({
			id: "claude-live",
			name: "Claude Live",
		});
	});

	test("Google paginates and records content, image, and video generation methods", async () => {
		const root = await home();
		const store = new FileCredentialStore(root);
		await store.setSlot("google:default", "api_key", { type: "api_key", value: "fixture-google" });
		const calls: string[] = [];
		const setup = configured("google");
		const catalog = new ModelCatalog({
			home: root,
			providers: [setup.provider],
			providerConfigs: [setup.config],
			store,
			fetch: async (input, init) => {
				const url = String(input);
				calls.push(url);
				expect(new Headers(init?.headers).get("x-goog-api-key")).toBe("fixture-google");
				if (calls.length === 1)
					return Response.json({
						models: [
							{
								name: "models/gemini-3.8-flash",
								displayName: "Gemini 3.8 Flash",
								supportedGenerationMethods: ["generateContent", "countTokens"],
							},
							{ name: "models/imagen-live", displayName: "Imagen Live", supportedGenerationMethods: ["predict"] },
						],
						nextPageToken: "page two",
					});
				return Response.json({
					models: [
						{ name: "models/veo-live", displayName: "Veo Live", supportedGenerationMethods: ["predictLongRunning"] },
					],
				});
			},
		});
		const live = await catalog.get("google", { account: "default" });
		expect(calls).toEqual([
			"https://generativelanguage.googleapis.com/v1beta/models",
			"https://generativelanguage.googleapis.com/v1beta/models?pageToken=page+two",
		]);
		expect(live.models).toEqual([
			{
				id: "gemini-3.8-flash",
				name: "Gemini 3.8 Flash",
				supportedMethods: ["countTokens", "generateContent"],
				modalities: ["text"],
			},
			{ id: "imagen-live", name: "Imagen Live", supportedMethods: ["predict"], modalities: ["image"] },
			{ id: "veo-live", name: "Veo Live", supportedMethods: ["predictLongRunning"] },
		]);
		expect((await catalog.get("google", { account: "default" })).models).toEqual(live.models);
	});

	test("provider-shape: posts Antigravity project and normalizes keyed models", async () => {
		const root = await home();
		const store = new FileCredentialStore(root);
		await store.setSlot("google-antigravity:work", "oauth", {
			type: "oauth",
			access: "fixture-access",
			refresh: "fixture-refresh",
			expires: Date.now() + 60_000,
		});
		await store.setSlot("google-antigravity:work", "x-antigravity-project", {
			type: "header",
			value: "fixture-project",
		});
		const setup = configured("google-antigravity");
		const catalog = new ModelCatalog({
			home: root,
			providers: [setup.provider],
			providerConfigs: [setup.config],
			store,
			fetch: async (input, init) => {
				expect(String(input)).toEndWith(":fetchAvailableModels");
				expect(init?.method).toBe("POST");
				expect(new Headers(init?.headers).get("authorization")).toBe("Bearer fixture-access");
				expect(await new Response(init?.body).json()).toEqual({ project: "fixture-project" });
				return Response.json({ models: { "gemini-live": { displayName: "Gemini Live" } } });
			},
		});
		expect((await catalog.get("google-antigravity", { account: "work" })).models).toEqual([
			{ id: "gemini-live", name: "Gemini Live" },
		]);
	});

	test("edge-input: malformed online payload does not fall back to built-ins", async () => {
		const root = await home();
		const store = new FileCredentialStore(root);
		await store.setSlot("openai:test", "api_key", { type: "api_key", value: "fixture-key" });
		const base = configured("openrouter");
		const config = { ...base.config, id: "sample-openai", name: "Sample", baseUrl: "https://api.openai.com/v1" };
		const provider = providerFromConfig(config);
		await store.setSlot("sample-openai:test", "api_key", { type: "api_key", value: "fixture-key" });
		const catalog = new ModelCatalog({
			home: root,
			providers: [provider],
			providerConfigs: [config],
			store,
			fetch: async () => Response.json({ data: [null, {}] }),
		});
		await expect(catalog.get("sample-openai", { account: "test" })).rejects.toThrow("contained no valid models");
	});

	test("denied-network: offline mode alone uses the built-in fallback", async () => {
		const root = await home();
		let fetched = false;
		const setup = configured("openrouter");
		const catalog = new ModelCatalog({
			home: root,
			providers: [setup.provider],
			providerConfigs: [setup.config],
			offline: true,
			fetch: async () => {
				fetched = true;
				throw new Error("must not fetch");
			},
		});
		const result = await catalog.get("openrouter", { refresh: true });
		expect(result.source).toBe("builtin");
		expect(result.models.length).toBeGreaterThan(0);
		expect(fetched).toBe(false);
	});

	test("uses a provider's own pi-ai discovery hook when available", async () => {
		const root = await home();
		const faux = fauxProvider({ provider: "dynamic", models: [{ id: "baseline" }] });
		const dynamic: Provider = {
			...faux.provider,
			refreshModels: async (context) => {
				await context.publish({
					persist: {
						models: [{ ...faux.getModel(), id: "discovered", name: "Discovered" }],
						checkedAt: 1,
						lastModified: 1,
					},
				});
			},
		};
		const catalog = new ModelCatalog({
			home: root,
			providers: [dynamic],
			fetch: async () => {
				throw new Error("direct fetch should not run");
			},
		});
		expect(await catalog.get("dynamic")).toMatchObject({
			source: "live",
			models: [{ id: "discovered", name: "Discovered" }],
		});
	});
	test("query placement puts the API key in the URL, not a header", async () => {
		const root = await home();
		const store = new FileCredentialStore(root);
		const base = configured("openrouter");
		const config: ProviderConfig = {
			...base.config,
			id: "sample-query",
			name: "Sample",
			baseUrl: "https://example.test/v1",
			auth: [{ kind: "api_key", slot: "api_key", placement: "query", name: "key" }],
		};
		await store.setSlot("sample-query:test", "api_key", { type: "api_key", value: "fixture-key" });
		const fetcher: CatalogFetch = async (input, init) => {
			expect(new URL(String(input)).searchParams.get("key")).toBe("fixture-key");
			expect(new Headers(init?.headers).get("authorization")).toBeNull();
			return Response.json({ data: [{ id: "q-model", name: "Q" }] });
		};
		const catalog = new ModelCatalog({
			home: root,
			providers: [providerFromConfig(config)],
			providerConfigs: [config],
			store,
			fetch: fetcher,
		});
		expect(await catalog.get("sample-query", { account: "test" })).toMatchObject({
			source: "live",
			models: [{ id: "q-model" }],
		});
	});

	test("dialect default: openai-completions fetches GET /models with display_name mapping", async () => {
		const root = await home();
		const store = new FileCredentialStore(root);
		await store.setSlot("sample-openai-dialect:test", "api_key", { type: "api_key", value: "fixture-key" });
		const fetcher: CatalogFetch = async (input, init) => {
			expect(String(input)).toBe("https://api.openai.com/v1/models");
			expect(init?.method).toBe("GET");
			return Response.json({ data: [{ id: "gpt-4", display_name: "GPT-4" }] });
		};
		const base = configured("groq");
		const config = {
			...base.config,
			id: "sample-openai-dialect",
			name: "Sample Dialect",
			baseUrl: "https://api.openai.com/v1",
			models: { static: base.config.models.static },
		};
		const provider = providerFromConfig(config);
		const catalog = new ModelCatalog({
			home: root,
			providers: [provider],
			providerConfigs: [config],
			store,
			fetch: fetcher,
			now: () => 1_000,
		});
		expect((await catalog.get("sample-openai-dialect", { account: "test" })).models).toEqual([
			{ id: "gpt-4", name: "GPT-4" },
		]);
	});

	test("dialect default: google-generative-ai fetches GET /models with stripIdPrefix and methodsPath", async () => {
		const root = await home();
		const store = new FileCredentialStore(root);
		await store.setSlot("sample-google-dialect:default", "api_key", { type: "api_key", value: "fixture-google" });
		const fetcher: CatalogFetch = async (input, _init) => {
			expect(String(input)).toBe("https://generativelanguage.googleapis.com/v1beta/models");
			return Response.json({
				models: [
					{ name: "models/gemini-pro", displayName: "Gemini Pro", supportedGenerationMethods: ["generateContent"] },
				],
			});
		};
		const base = configured("google");
		const config = {
			...base.config,
			id: "sample-google-dialect",
			name: "Sample Google Dialect",
			baseUrl: "https://generativelanguage.googleapis.com/v1beta",
			models: { static: base.config.models.static },
		};
		const provider = providerFromConfig(config);
		const catalog = new ModelCatalog({
			home: root,
			providers: [provider],
			providerConfigs: [config],
			store,
			fetch: fetcher,
			now: () => 1_000,
		});
		expect((await catalog.get("sample-google-dialect", { account: "default" })).models).toEqual([
			{ id: "gemini-pro", name: "Gemini Pro", supportedMethods: ["generateContent"], modalities: ["text"] },
		]);
	});

	test("config list overrides dialect default: Cloudflare-style POST /models/search", async () => {
		const root = await home();
		const store = new FileCredentialStore(root);
		await store.setSlot("cloudflare-override:test", "api_key", { type: "api_key", value: "fixture-key" });
		const fetcher: CatalogFetch = async (input, init) => {
			expect(String(input)).toBe("https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai/v1/models/search");
			expect(init?.method).toBe("POST");
			return Response.json({ result: [{ name: "cf-model" }] });
		};
		const base = configured("cloudflare-workers-ai");
		const config = {
			...base.config,
			id: "cloudflare-override",
			name: "Cloudflare Override",
			models: {
				static: base.config.models.static,
				list: { path: "/models/search", method: "POST", itemsPath: "result", idPath: "name", namePath: "name" },
			},
		} as ProviderConfig;
		const provider = providerFromConfig(config);
		const catalog = new ModelCatalog({
			home: root,
			providers: [provider],
			providerConfigs: [config],
			store,
			fetch: fetcher,
			now: () => 1_000,
		});
		expect((await catalog.get("cloudflare-override", { account: "test" })).models).toEqual([
			{ id: "cf-model", name: "cf-model" },
		]);
	});

	test("failed refresh serves the cache but reports the live error", async () => {
		const root = await home();
		const store = new FileCredentialStore(root);
		const base = configured("openrouter");
		const config = { ...base.config, id: "sample-stale", name: "Sample" };
		await store.setSlot("sample-stale:test", "api_key", { type: "api_key", value: "fixture-key" });
		let status = 200;
		const fetcher: CatalogFetch = async () =>
			status === 200
				? Response.json({ data: [{ id: "cached-model", name: "C" }] })
				: new Response("denied", { status });
		const catalog = new ModelCatalog({
			home: root,
			providers: [providerFromConfig(config)],
			providerConfigs: [config],
			store,
			fetch: fetcher,
		});
		expect((await catalog.get("sample-stale", { account: "test" })).error).toBeUndefined();
		status = 403;
		const stale = await catalog.get("sample-stale", { account: "test", refresh: true });
		expect(stale).toMatchObject({ source: "cache", models: [{ id: "cached-model" }] });
		expect(stale.error).toContain("HTTP 403");
	});

	test("metadata extraction: contextLength, modalities, tools, pricing", async () => {
		const root = await home();
		const store = new FileCredentialStore(root);
		await store.setSlot("meta-provider:test", "api_key", { type: "api_key", value: "fixture-key" });
		const base = configured("openrouter");
		const config = {
			...base.config,
			id: "meta-provider",
			name: "Meta",
			baseUrl: "https://api.fake.com/v1",
			models: {
				static: base.config.models.static,
				list: { path: "/models", method: "GET" as const, itemsPath: "data", idPath: "id", namePath: "display_name" },
			},
		} as ProviderConfig;
		const provider = providerFromConfig(config);
		const fetcher: CatalogFetch = async () =>
			Response.json({
				data: [
					{ id: "context-model", display_name: "Context Model", context_length: 128000 },
					{ id: "input-limit-model", display_name: "Input Limit Model", inputTokenLimit: 4096 },
					{ id: "modalities-model", display_name: "Modalities Model", modalities: ["text", "image"] },
					{ id: "methods-model", display_name: "Methods Model", supportedMethods: ["generateContent"] },
					{ id: "tools-model", display_name: "Tools Model", supported_parameters: ["tools"] },
					{ id: "priced-model", display_name: "Priced Model", pricing: { prompt: "0" } },
				],
			});
		const catalog = new ModelCatalog({
			home: root,
			providers: [provider],
			providerConfigs: [config],
			store,
			fetch: fetcher,
		});
		const result = await catalog.get("meta-provider", { account: "test" });
		expect(result.source).toBe("live");
		expect(result.models.find((model) => model.id === "context-model")?.contextLength).toBe(128000);
		expect(result.models.find((model) => model.id === "input-limit-model")?.contextLength).toBe(4096);
		expect(result.models.find((model) => model.id === "modalities-model")?.modalities).toEqual(["text", "image"]);
		expect(result.models.find((model) => model.id === "methods-model")?.modalities).toEqual(["text"]);
		expect(result.models.find((model) => model.id === "tools-model")?.tools).toBe(true);
		expect(result.models.find((model) => model.id === "priced-model")?.pricing).toEqual({ prompt: "0", free: true });
	});
});
