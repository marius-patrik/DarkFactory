import { describe, expect, test } from "bun:test";
import { fauxAssistantMessage, fauxToolCall, type Context } from "@earendil-works/pi-ai";
import { prepareReplayPayload, providerFromConfig, ProviderRegistry } from "../src/providers/runtime.ts";
import { BUILTIN_PROVIDER_CONFIG, loadProviderConfig, parseProviderConfigFile, type ProviderConfig } from "../src/providers/schema.ts";
import { createConfiguredOAuth } from "../src/providers/oauth.ts";
import { resolveGeneratedHeaders } from "../src/harness/runtime.ts";

function openAICompatible(id = "fixture-cloud"): ProviderConfig {
	return {
		id, name: "Fixture Cloud", dialect: "openai-completions", baseUrl: "https://fixture.invalid/v1",
		auth: [{ kind: "api_key", slot: "api_key", placement: "header", name: "x-fixture-key" }],
		requiredCredentialSlots: ["api_key"], staticHeaders: { "x-client": "df-test" },
		models: { static: [{ id: "fixture-free", reasoning: true }], list: { path: "/models", itemsPath: "data", idPath: "id", namePath: "name" } },
		quota: { rules: [{ kind: "rate_limited", statuses: [429], regex: "busy" }] },
		capabilities: { tools: true, reasoning: true, images: false },
	};
}

describe("config-driven provider registry", () => {
	test("Google-to-Google hand-off marks a foreign completed function call with the configured placeholder", () => {
		const google = BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "google")!;
		const replay = prepareReplayPayload(google, { contents: [{ role: "model", parts: [{ functionCall: { name: "read", args: {} } }, { functionCall: { name: "other", args: {} } }] }] }) as { contents: Array<{ parts: Array<{ thoughtSignature?: string }> }> };
		expect(replay.contents[0]!.parts[0]!.thoughtSignature).toBe("skip_thought_signature_validator");
		expect(replay.contents[0]!.parts[1]!.thoughtSignature).toBeUndefined();
	});

	test("replay patching tolerates non-cloneable payload fields (abort signal, tool handlers) and leaves unrelated payloads untouched", () => {
		const google = BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "google")!;
		const abortSignal = new AbortController().signal;
		const handler = () => undefined;
		const payload = { config: { abortSignal, tools: [{ handler }] }, contents: [{ role: "model", parts: [{ functionCall: { name: "read", args: {} } }] }] };
		const replay = prepareReplayPayload(google, payload) as typeof payload & { contents: Array<{ parts: Array<{ thoughtSignature?: string }> }> };
		expect(replay.contents[0]!.parts[0]!.thoughtSignature).toBe("skip_thought_signature_validator");
		expect(replay.config.abortSignal).toBe(abortSignal);
		expect(payload.contents[0]!.parts[0]).not.toHaveProperty("thoughtSignature");
		const plain = { config: { abortSignal }, contents: [{ role: "user", parts: [{ text: "hi" }] }] };
		expect(prepareReplayPayload(google, plain)).toBe(plain);
	});

	test("Google-to-Google hand-off patches the serialized wire payload after pi strips the foreign signature", async () => {
		const google = BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "google")!;
		const provider = providerFromConfig(google);
		const target = provider.getModels().find((entry) => entry.id === "gemini-3.5-flash-lite")!;
		const source = fauxAssistantMessage({ ...fauxToolCall("read", { path: "x" }, { id: "call-1" }), thoughtSignature: "YWJjZA==" }, { stopReason: "toolUse" });
		Object.assign(source, { api: "google-generative-ai", provider: "google", model: "gemini-3-flash-preview" });
		const context: Context = { messages: [
			{ role: "user", content: "go", timestamp: 1 },
			source,
			{ role: "toolResult", toolCallId: "call-1", toolName: "read", content: [{ type: "text", text: "ok" }], isError: false, timestamp: 3 },
		] };
		let wire: { contents?: Array<{ parts?: Array<{ functionCall?: unknown; thoughtSignature?: string }> }> } = {};
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
			const text = input instanceof Request ? await input.clone().text() : String(init?.body ?? "");
			wire = JSON.parse(text) as typeof wire;
			throw new Error("captured mock request");
		}) as unknown as typeof fetch;
		try {
			for await (const _event of provider.stream(target, context, { apiKey: "mock-key" })) { /* drain */ }
		} finally {
			globalThis.fetch = originalFetch;
		}
		const call = wire.contents?.flatMap((content) => content.parts ?? []).find((part) => part.functionCall);
		expect(call?.thoughtSignature).toBe("skip_thought_signature_validator");
	});

	test("Google-to-OpenAI-compatible hand-off does not inject Google replay metadata", () => {
		const openai = openAICompatible("openai-target");
		const replay = prepareReplayPayload(openai, { contents: [{ role: "model", parts: [{ functionCall: { name: "read", args: {} } }] }] }) as { contents: Array<{ parts: Array<{ thoughtSignature?: string }> }> };
		expect(replay.contents[0]!.parts[0]!.thoughtSignature).toBeUndefined();
	});
	test("success: adding an OpenAI-compatible provider is only a config entry", async () => {
		const entry = openAICompatible();
		const registry = new ProviderRegistry(parseProviderConfigFile({ version: 1, providers: [entry] }));
		const models = registry.models({
			credentials: { read: async () => ({ type: "api_key", key: "secret" }), list: async () => [], modify: async (_id, fn) => fn(undefined), delete: async () => undefined },
			authContext: { env: async () => undefined, fileExists: async () => false },
		});
		const model = models.getModel(entry.id, "fixture-free")!;
		expect(model).toMatchObject({ provider: entry.id, api: "openai-completions", baseUrl: "https://fixture.invalid/v1" });
		expect(await models.getAuth(model)).toMatchObject({ auth: { headers: { "x-fixture-key": "secret" } } });
		expect(models.getProvider(entry.id)?.headers).toEqual({ "x-client": "df-test" });
	});

	test("edge-input: rejects duplicate ids and unsupported dialects at the boundary", () => {
		const entry = openAICompatible();
		expect(() => parseProviderConfigFile({ version: 1, providers: [entry, entry] })).toThrow("duplicate provider");
		expect(() => parseProviderConfigFile({ version: 1, providers: [{ ...entry, dialect: "bespoke-api" }] })).toThrow("unsupported dialect");
		expect(() => parseProviderConfigFile({ version: 1, providers: [{ ...entry, limits: { observe: true, bodyRules: [{ type: "window", regex: "[" }] } }] })).toThrow("regex is invalid");
	});

	test("local providers replace same-id defaults and append new entries", async () => {
		const google = { ...openAICompatible("google"), name: "Local Google Override" };
		const custom = openAICompatible("custom");
		const loaded = await loadProviderConfig("C:/fixture", async () => JSON.stringify({ version: 1, providers: [google, custom] }));
		expect(loaded.providers.find((entry) => entry.id === "google")?.name).toBe("Local Google Override");
		expect(loaded.providers.some((entry) => entry.id === "anthropic")).toBe(true);
		expect(loaded.providers.at(-1)?.id).toBe("custom");
	});

	test("denied provider remains declared but is not registered", () => {
		const registry = new ProviderRegistry(BUILTIN_PROVIDER_CONFIG);
		expect(BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "google-antigravity")?.enabled).toBe(false);
		expect(registry.providers.some((entry) => entry.id === "google-antigravity")).toBe(false);
	});

	test("built-ins contain the required providers and importer declarations", () => {
		const ids = BUILTIN_PROVIDER_CONFIG.providers.map((entry) => entry.id);
		expect(ids).toEqual(["google", "anthropic", "openai-codex", "grok-sub", "kimi-coding", "openrouter", "groq", "cerebras", "opencode-zen", "google-antigravity"]);
		expect(BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "opencode-zen")?.models.static[0]?.id).toBe("big-pickle");
		expect(BUILTIN_PROVIDER_CONFIG.providers.flatMap((entry) => entry.importers ?? []).map((entry) => entry.id).sort()).toEqual(["antigravity", "claude", "codex", "grok", "kimi"]);
		const codexOauth = BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "openai-codex")?.auth.find((entry) => entry.kind === "oauth");
		expect(codexOauth?.redirectUri).toBe("http://localhost:1455/auth/callback");
		expect(BUILTIN_PROVIDER_CONFIG.providers.every((entry) => entry.limits?.observe === true)).toBe(true);
	});

	test("generated headers keep session values stable and group request ids", () => {
		const zen = BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "opencode-zen")!;
		const cache = new Map<string, string>();
		const first = resolveGeneratedHeaders(zen, "df-session", cache);
		const second = resolveGeneratedHeaders(zen, "df-session", cache);
		expect(first["x-opencode-session"]).toMatch(/^ses_[A-Za-z0-9]{26}$/);
		expect(second["x-opencode-session"]).toBe(first["x-opencode-session"]);
		expect(second["x-opencode-request"]).not.toBe(first["x-opencode-request"]);
		const codex = BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "openai-codex")!;
		const headers = resolveGeneratedHeaders(codex, "df-session", new Map());
		expect(headers["session-id"]).toBe(headers["x-client-request-id"]);
	});

	test("optional API auth can supply a configured anonymous SDK sentinel", async () => {
		const zen = BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "opencode-zen")!;
		const models = new ProviderRegistry(parseProviderConfigFile({ version: 1, providers: [zen] })).models({
			credentials: { read: async () => undefined, list: async () => [], modify: async () => undefined, delete: async () => undefined },
			authContext: { env: async () => undefined, fileExists: async () => false },
		});
		expect(await models.getAuth("opencode-zen")).toMatchObject({ auth: { apiKey: "public" }, source: "Anonymous" });
	});

	test("provider factory is generic across all configured dialects", () => {
		for (const config of BUILTIN_PROVIDER_CONFIG.providers) expect(providerFromConfig(config).getModels().length).toBeGreaterThan(0);
	});

	test("query API keys are handed to the dialect without provider branching", async () => {
		const entry = openAICompatible("query-auth");
		entry.auth = [{ kind: "api_key", slot: "api_key", placement: "query", name: "key" }];
		const models = new ProviderRegistry({ version: 1, providers: [entry] }).models({
			credentials: { read: async () => ({ type: "api_key", key: "query-secret" }), list: async () => [], modify: async (_id, fn) => fn(undefined), delete: async () => undefined },
			authContext: { env: async () => undefined, fileExists: async () => false },
		});
		expect(await models.getAuth(entry.id)).toMatchObject({ auth: { apiKey: "query-secret" } });
	});

	test("optional key auth resolves an anonymous provider", async () => {
		const entry = openAICompatible("anonymous");
		entry.auth = [{ kind: "api_key", slot: "api_key", placement: "bearer", optional: true }];
		entry.requiredCredentialSlots = [];
		const models = new ProviderRegistry({ version: 1, providers: [entry] }).models({ authContext: { env: async () => undefined, fileExists: async () => false } });
		expect(await models.getAuth(entry.id)).toMatchObject({ auth: {}, source: "Anonymous" });
	});

	test("malformed OAuth declarations fail validation before registration", () => {
		const entry = openAICompatible("bad-oauth");
		entry.auth = [{ kind: "oauth", slot: "oauth", flow: "device_code", tokenEndpoint: "https://token.invalid", clientId: { value: "client" }, scopes: [] }];
		expect(() => parseProviderConfigFile({ version: 1, providers: [entry] })).toThrow("deviceCodeEndpoint");
	});

	test("importer target providers are mandatory because runtime has no provider defaults", () => {
		const entry = openAICompatible("import-target");
		entry.importers = [{ id: "fixture", parser: "kimi-code", path: "fixture.json", fieldMapping: {} } as never];
		expect(() => parseProviderConfigFile({ version: 1, providers: [entry] })).toThrow("targetProvider");
	});

	test("importers reject unsupported parser types", () => {
		const entry = openAICompatible("import-policy");
		entry.importers = [{ id: "fixture", parser: "unknown-parser", targetProvider: "import-policy", fieldMapping: {} } as never];
		expect(() => parseProviderConfigFile({ version: 1, providers: [entry] })).toThrow("unsupported importer parser");
	});

	test("each built-in declares credential slots, capabilities, and a model source", () => {
		for (const entry of BUILTIN_PROVIDER_CONFIG.providers) {
			expect(Array.isArray(entry.requiredCredentialSlots)).toBe(true);
			expect(entry.capabilities).toMatchObject({ tools: expect.any(Boolean), reasoning: expect.any(Boolean), images: expect.any(Boolean) });
			expect(entry.models.static.length > 0 || entry.models.list).toBeTruthy();
		}
	});

	test("generic PKCE exchanges mocked JSON tokens from config", async () => {
		const flows = new Set(BUILTIN_PROVIDER_CONFIG.providers.flatMap((entry) => entry.auth).filter((auth) => auth.kind === "oauth").map((auth) => auth.flow));
		expect(flows).toEqual(new Set(["device_code", "pkce"]));
		const config = BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "anthropic")!.auth.find((auth) => auth.kind === "oauth")!;
		const calls: Array<{ url: string; contentType: string | null }> = [];
		const oauth = createConfiguredOAuth(config, { now: () => 1_000, fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
			calls.push({ url: String(input), contentType: new Headers(init?.headers).get("content-type") });
			return Response.json({ access_token: "access", refresh_token: "refresh", expires_in: 60 });
		}) as typeof fetch });
		const result = await oauth.login({ signal: new AbortController().signal, prompt: async () => "code", notify: () => undefined });
		expect(result).toMatchObject({ access: "access", refresh: "refresh", expires: 61_000 });
		expect(calls).toEqual([{ url: "https://platform.claude.com/v1/oauth/token", contentType: "application/json" }]);
	});
});
