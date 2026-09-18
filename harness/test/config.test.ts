import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadDfConfig, localCredentialFallback } from "../src/config.ts";
import { FileCredentialStore } from "../src/credentials.ts";
import { BUILTIN_PROVIDER_CONFIG } from "../src/providers/schema.ts";

const LOCAL_CHAIN = "google/gemini-3.8-flash@default,groq/openai/gpt-oss-120b@default";

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
		expect(
			await loadDfConfig("C:/fixture", async () => {
				throw missing;
			}),
		).toEqual({});
	});

	test("loads chains and a relative account key path", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-test-"));
		await writeFile(
			join(temp, "config.df"),
			JSON.stringify({
				defaultChain: "google/custom@default",
				cooldownTtlMs: 12_345,
				hardReasoningChain: "anthropic/hard@work",
				sensitiveChain: "local/private@main",
				credentialFiles: { "google:default": "secrets/gemini_api_key" },
			}),
		);
		const config = await loadDfConfig(temp);
		expect(config.credentialFiles?.["google:default"]).toBe("secrets/gemini_api_key");
		expect(config.cooldownTtlMs).toBe(12_345);
		const fallback = localCredentialFallback(temp, config, BUILTIN_PROVIDER_CONFIG, {
			env: {},
			read: async (path: string) => {
				expect(path).toBe(join(temp, "secrets", "gemini_api_key"));
				return "fixture-file-key\n";
			},
		});
		expect(await fallback("google", "default")).toEqual({ type: "api_key", key: "fixture-file-key" });
	});

	test("stored account wins over env, while env wins over the configured key file", async () => {
		const root = await home();
		let reads = 0;
		const config = { defaultChain: LOCAL_CHAIN, credentialFiles: { "google:default": "unused" } };
		const fallback = localCredentialFallback(root, config, BUILTIN_PROVIDER_CONFIG, {
			env: { GEMINI_API_KEY: "fixture-env-key" },
			read: async () => {
				reads++;
				return "fixture-file-key";
			},
		});
		const store = new FileCredentialStore(root, fallback);
		expect(await store.forAccount("google", "default").read("google")).toEqual({
			type: "api_key",
			key: "fixture-env-key",
		});
		expect(reads).toBe(0);
		await store.setSlot("google:default", "api_key", { type: "api_key", value: "fixture-stored-key" });
		expect(await store.forAccount("google", "default").read("google")).toEqual({
			type: "api_key",
			key: "fixture-stored-key",
		});
	});

	test("ambient API keys only resolve for the default account label", async () => {
		const root = await home();
		const fallback = localCredentialFallback(root, { defaultChain: LOCAL_CHAIN }, BUILTIN_PROVIDER_CONFIG, {
			env: { GEMINI_API_KEY: "fixture-env-key" },
		});
		expect(await fallback("google", "default")).toEqual({ type: "api_key", key: "fixture-env-key" });
		expect(await fallback("google", "work")).toBeUndefined();
	});

	test("rejects malformed config without exposing its contents", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-test-"));
		await writeFile(join(temp, "config.df"), "{secret-content");
		await expect(loadDfConfig(temp)).rejects.toThrow("Invalid config.df JSON");
		await writeFile(join(temp, "config.df"), JSON.stringify({ cooldownTtlMs: 0 }));
		await expect(loadDfConfig(temp)).rejects.toThrow("positive integer");
	});

	test("validates and loads router policies, model overrides, and learning bounds", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-test-"));
		await writeFile(
			join(temp, "config.df"),
			JSON.stringify({
				router: {
					classifier: "cheap/classifier@default",
					candidates: ["acme/fast@work"],
					models: {
						"acme/fast": { tools: true, modalities: ["text", "image_gen"], quality: { review: 4 }, limitTier: "tight" },
					},
					policies: [
						{
							id: "review",
							match: { kind: ["review"], needs: ["tools"] },
							prefer: { candidates: ["acme/fast@work"], tiers: ["tight"] },
						},
					],
					learning: { windowMs: 1_000, maxPenalty: 10, maxRecords: 50 },
				},
			}),
		);
		const config = await loadDfConfig(temp);
		expect(config.router?.policies[0]?.id).toBe("review");
		expect(config.router?.models?.["acme/fast"]?.modalities).toEqual(["text", "image_gen"]);
		const temp2 = await mkdtemp(join(tmpdir(), "df-test-"));
		await writeFile(
			join(temp2, "config.df"),
			JSON.stringify({ router: { policies: [], candidates: ["missing-account/model"] } }),
		);
		await expect(loadDfConfig(temp2)).rejects.toThrow("provider/model@account");
	});

	test("throws error when both .darkfactory/config.df and root config.df exist simultaneously", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-test-"));
		await mkdir(join(temp, ".darkfactory"));
		await writeFile(join(temp, ".darkfactory", "config.df"), "{}");
		await writeFile(join(temp, "config.df"), "{}");
		await expect(loadDfConfig(temp)).rejects.toThrow("exist; only one is allowed");
	});
});
