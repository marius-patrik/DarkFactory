import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { FileCredentialStore } from "../src/credentials.ts";
import { DEFAULT_CHAIN, loadDfConfig, localCredentialFallback } from "../src/config.ts";
import { BUILTIN_PROVIDER_CONFIG } from "../src/providers/schema.ts";

const roots: string[] = [];

async function home(): Promise<string> {
	const path = await mkdtemp(join(import.meta.dir, ".config-test-"));
	roots.push(path);
	return path;
}

afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

describe("local configuration and credential sources", () => {
	test("missing config supplies the Google/Gemini default", async () => {
		const missing = Object.assign(new Error("missing"), { code: "ENOENT" });
		expect(await loadDfConfig("C:/fixture", async () => { throw missing; })).toEqual({ defaultChain: DEFAULT_CHAIN });
	});

	test("loads chains and a relative account key path", async () => {
		const config = await loadDfConfig("C:/fixture", async () => JSON.stringify({
			defaultChain: "google/custom@default",
			cooldownTtlMs: 12_345,
			hardReasoningChain: "anthropic/hard@work",
			sensitiveChain: "local/private@main",
			credentialFiles: { "google:default": "secrets/gemini_api_key" },
		}));
		expect(config.credentialFiles?.["google:default"]).toBe("secrets/gemini_api_key");
		expect(config.cooldownTtlMs).toBe(12_345);
		const fixture = resolve("/fixture");
		const fallback = localCredentialFallback(fixture, config, BUILTIN_PROVIDER_CONFIG, {
			env: {},
			read: async (path: string) => {
				expect(path).toBe(join(fixture, "secrets", "gemini_api_key"));
				return "fixture-file-key\n";
			},
		});
		expect(await fallback("google", "default")).toEqual({ type: "api_key", key: "fixture-file-key" });
	});

	test("stored account wins over env, while env wins over the configured key file", async () => {
		const root = await home();
		let reads = 0;
		const config = { defaultChain: DEFAULT_CHAIN, credentialFiles: { "google:default": "unused" } };
		const fallback = localCredentialFallback(root, config, BUILTIN_PROVIDER_CONFIG, {
			env: { GEMINI_API_KEY: "fixture-env-key" },
			read: async () => { reads++; return "fixture-file-key"; },
		});
		const store = new FileCredentialStore(root, fallback);
		expect(await store.forAccount("google", "default").read("google")).toEqual({ type: "api_key", key: "fixture-env-key" });
		expect(reads).toBe(0);
		await store.setSlot("google:default", "api_key", { type: "api_key", value: "fixture-stored-key" });
		expect(await store.forAccount("google", "default").read("google")).toEqual({ type: "api_key", key: "fixture-stored-key" });
	});

	test("ambient API keys only resolve for the default account label", async () => {
		const root = await home();
		const fallback = localCredentialFallback(root, { defaultChain: DEFAULT_CHAIN }, BUILTIN_PROVIDER_CONFIG, {
			env: { GEMINI_API_KEY: "fixture-env-key" },
		});
		expect(await fallback("google", "default")).toEqual({ type: "api_key", key: "fixture-env-key" });
		expect(await fallback("google", "work")).toBeUndefined();
	});

	test("rejects malformed config without exposing its contents", async () => {
		await expect(loadDfConfig("C:/fixture", async () => "{secret-content")).rejects.toThrow("Invalid $DF_HOME/config.json JSON");
		await expect(loadDfConfig("C:/fixture", async () => JSON.stringify({ cooldownTtlMs: 0 }))).rejects.toThrow("positive integer");
	});

	test("validates and loads router policies, model overrides, and learning bounds", async () => {
		const config = await loadDfConfig("C:/fixture", async () => JSON.stringify({ router: {
			classifier: "cheap/classifier@default", candidates: ["acme/fast@work"],
			models: { "acme/fast": { tools: true, modalities: ["text", "image_gen"], quality: { review: 4 }, limitTier: "tight" } },
			policies: [{ id: "review", match: { kind: ["review"], needs: ["tools"] }, prefer: { candidates: ["acme/fast@work"], tiers: ["tight"] } }],
			learning: { windowMs: 1_000, maxPenalty: 10, maxRecords: 50 },
		} }));
		expect(config.router?.policies[0]?.id).toBe("review");
		expect(config.router?.models?.["acme/fast"]?.modalities).toEqual(["text", "image_gen"]);
		await expect(loadDfConfig("C:/fixture", async () => JSON.stringify({ router: { policies: [], candidates: ["missing-account/model"] } }))).rejects.toThrow("provider/model@account");
	});
});
