import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createModels, fauxProvider, type OAuthCredential, type Provider } from "@earendil-works/pi-ai";
import { FileCredentialStore, accountId } from "../src/credentials.ts";
import { QuotaStore } from "../src/harness/quota-store.ts";
import { ConfiguredBorrowedCredentialCoordinator } from "../src/import/borrowed-credentials.ts";
import type { ProviderConfig } from "../src/providers/schema.ts";

const roots: string[] = [];

async function temporaryHome(): Promise<string> {
	const path = await mkdtemp(join(import.meta.dir, ".df-home-"));
	roots.push(path);
	return path;
}

afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

function oauth(refresh: string, access: string): OAuthCredential {
	return { type: "oauth", refresh, access, expires: Date.now() - 1 };
}

describe("FileCredentialStore", () => {
	test("cross-process writers preserve every credential account", async () => {
		const root = await temporaryHome();
		const workers = Array.from({ length: 12 }, (_, index) => Bun.spawn([
			process.execPath,
			join(import.meta.dir, "fixtures", "store-writer.ts"),
			"credentials",
			root,
			String(index),
		], { stdout: "pipe", stderr: "pipe" }));
		const results = await Promise.all(workers.map(async (worker) => ({
			exit: await worker.exited,
			stderr: await new Response(worker.stderr).text(),
		})));
		expect(results).toEqual(Array.from({ length: 12 }, () => ({ exit: 0, stderr: "" })));
		expect(await new FileCredentialStore(root).listAccounts()).toHaveLength(12);
	});

	test("credential changes clear cooldowns for that account", async () => {
		const root = await temporaryHome();
		const quota = new QuotaStore(root);
		const candidate = { provider: "fixture", model: "model", account: "work" };
		await quota.mark(candidate, "auth", undefined, Date.now());
		const store = new FileCredentialStore(root, undefined, undefined, (provider, label) => quota.clearAccount(provider, label));
		await store.setSlot("fixture:work", "api_key", { type: "api_key", value: "updated" });
		expect(await quota.active(candidate)).toBeUndefined();
	});

	test("models accounts as named, typed multi-slot records", async () => {
		const store = new FileCredentialStore(await temporaryHome());
		await store.setSlot(accountId("google-antigravity", "work"), "oauth", oauth("refresh-work", "access-work"));
		await store.setSlot(accountId("google-antigravity", "work"), "x-goog-user-project", { type: "header", value: "project-work" });
		await store.setSlot(accountId("api-provider", "team"), "api_key", { type: "api_key", value: "test-key" });
		await store.setSlot(accountId("api-provider", "team"), "OpenAI-Organization", { type: "header", value: "org-test" });
		await store.setSlot(accountId("web-subscription", "personal"), "session", { type: "cookie", value: "session=test" });
		await store.setSlot(accountId("web-subscription", "personal"), "bearer", { type: "other", value: "test-bearer" });

		const accounts = await store.listAccounts();
		expect(accounts.map((account) => [account.id, account.slots.map((slot) => `${slot.name}:${slot.type}`)])).toEqual([
			["api-provider:team", ["api_key:api_key", "OpenAI-Organization:header"]],
			["google-antigravity:work", ["oauth:oauth", "x-goog-user-project:header"]],
			["web-subscription:personal", ["bearer:other", "session:cookie"]],
		]);
		expect(await store.requestHeaders("google-antigravity", "work")).toEqual({ "x-goog-user-project": "project-work" });
		expect(await store.requestHeaders("api-provider", "team")).toEqual({ "OpenAI-Organization": "org-test" });
		expect(await store.requestHeaders("web-subscription", "personal")).toEqual({ Cookie: "session=test" });
		expect(await store.forAccount("api-provider", "team").read("api-provider")).toEqual({ type: "api_key", key: "test-key" });
		expect(await store.forAccount("web-subscription", "personal").read("web-subscription")).toBeUndefined();
	});

	test("concurrent OAuth refreshes for two accounts preserve their own slots", async () => {
		const store = new FileCredentialStore(await temporaryHome());
		for (const label of ["work", "personal"]) {
			await store.setSlot(accountId("same-provider", label), "oauth", oauth(`refresh-${label}`, `old-${label}`));
			await store.setSlot(accountId("same-provider", label), "x-account", { type: "header", value: label });
		}

		const makeModels = (label: string) => {
			const faux = fauxProvider({ provider: "same-provider", models: [{ id: "model" }] });
			const provider: Provider = {
				...faux.provider,
				auth: {
					oauth: {
						name: "test oauth",
						login: async () => oauth("unused", "unused"),
						refresh: async (credential) => ({ ...credential, access: `new-${credential.refresh}`, expires: Date.now() + 3_600_000 }),
						toAuth: async (credential) => ({ apiKey: credential.access }),
					},
				},
			};
			const models = createModels({ credentials: store.forAccount("same-provider", label) });
			models.setProvider(provider);
			return models;
		};

		const [work, personal] = await Promise.all([
			makeModels("work").getAuth("same-provider"),
			makeModels("personal").getAuth("same-provider"),
		]);
		expect(work?.auth.apiKey).toBe("new-refresh-work");
		expect(personal?.auth.apiKey).toBe("new-refresh-personal");
		expect(await store.getSlot("same-provider", "work", "oauth")).toMatchObject({ type: "oauth", access: "new-refresh-work" });
		expect(await store.getSlot("same-provider", "personal", "oauth")).toMatchObject({ type: "oauth", access: "new-refresh-personal" });
		expect(await store.getSlot("same-provider", "work", "x-account")).toEqual({ type: "header", value: "work" });
		expect(await store.getSlot("same-provider", "personal", "x-account")).toEqual({ type: "header", value: "personal" });
	});

	test("malformed storage fails without echoing secret input", async () => {
		const home = await temporaryHome();
		await mkdir(home, { recursive: true });
		await writeFile(join(home, "credentials.json"), "not-json-secret-material", "utf8");
		await expect(new FileCredentialStore(home).listAccounts()).rejects.toThrow("Invalid credentials file JSON");
	});

	function borrowedConfig(keyring = false, refreshMode: "write-back" | "reimport-only" | "never" = "reimport-only"): ProviderConfig {
		return {
			id: "borrowed", name: "Borrowed", dialect: "openai-completions", baseUrl: "https://example.test/v1",
			auth: [{ kind: "oauth", slot: "oauth", flow: "pkce", authorizationEndpoint: "https://example.test/auth", tokenEndpoint: "https://example.test/token", clientId: { value: "client" }, scopes: [] }],
			requiredCredentialSlots: ["oauth"], models: { static: [{ id: "model" }] }, capabilities: { tools: true, reasoning: false, images: false },
			importers: [{ id: "fixture", parser: keyring ? "antigravity-keyring" : "kimi-code", ...(keyring ? { keyring: { service: "fixture", account: "main" } } : { path: "source.json" }), targetProvider: "borrowed", refresh: refreshMode, formats: { expires: keyring ? "iso" : "epoch_milliseconds" }, fieldMapping: keyring ? { access: "token.access_token", refresh: "token.refresh_token", expires: "token.expiry" } : { access: "access", refresh: "refresh", expires: "expires" } }],
		};
	}

	async function borrowedStore(root: string, config: ProviderConfig, keyringValue?: string) {
		const source = join(root, "source");
		await mkdir(source, { recursive: true });
		const coordinator = new ConfiguredBorrowedCredentialCoordinator(source, [config], { read: async () => keyringValue });
		const store = new FileCredentialStore(join(root, "df"), undefined, coordinator);
		await store.modifyAccount("borrowed:main", async () => ({ id: "borrowed:main", provider: "borrowed", label: "main", metadata: { importer: "fixture", ...(keyringValue ? { source_kind: "keyring", source_service: "fixture", source_account: "main" } : { source_path: "source.json" }) }, slots: { oauth: { type: "oauth", access: "df-stale", refresh: "df-stale-refresh", expires: 1 } } }));
		return { source, store };
	}

	test("borrowed success: re-reads and adopts a newer valid source without refreshing", async () => {
		const root = await temporaryHome();
		const config = borrowedConfig();
		const { source, store } = await borrowedStore(root, config);
		await writeFile(join(source, "source.json"), JSON.stringify({ access: "source-current", refresh: "source-refresh", expires: Date.now() + 60_000, untouched: { keep: true } }));
		let refreshes = 0;
		const faux = fauxProvider({ provider: "borrowed", models: [{ id: "model" }] });
		const models = createModels({ credentials: store.forAccount("borrowed", "main") });
		models.setProvider({ ...faux.provider, auth: { oauth: { name: "fixture", login: async () => oauth("x", "x"), refresh: async (current) => { refreshes++; return current; }, toAuth: async (current) => ({ apiKey: current.access }) } } });
		expect((await models.getAuth("borrowed"))?.auth.apiKey).toBe("source-current");
		expect(refreshes).toBe(0);
		expect(await store.getSlot("borrowed", "main", "oauth")).toMatchObject({ access: "source-current", refresh: "source-refresh" });
	});

	test("borrowed edge: an expired file source is reimport-only and is never refreshed or written back", async () => {
		const root = await temporaryHome();
		const config = borrowedConfig(false, "reimport-only");
		const { source, store } = await borrowedStore(root, config);
		const original = JSON.stringify({ access: "source-expired", refresh: "source-refresh", expires: 1, untouched: { keep: true } });
		await writeFile(join(source, "source.json"), original, { mode: 0o600 });
		let refreshes = 0;
		const faux = fauxProvider({ provider: "borrowed", models: [{ id: "model" }] });
		const models = createModels({ credentials: store.forAccount("borrowed", "main") });
		models.setProvider({ ...faux.provider, auth: { oauth: { name: "fixture", login: async () => oauth("x", "x"), refresh: async (current) => { refreshes++; return { ...current, access: "rotated-access" }; }, toAuth: async (current) => ({ apiKey: current.access }) } } });
		await expect(models.getAuth("borrowed")).rejects.toThrow(/run the source CLI/);
		expect(refreshes).toBe(0);
		expect(await readFile(join(source, "source.json"), "utf8")).toBe(original);
	});

	test("borrowed denied: an expired keyring source is re-read but never refreshed", async () => {
		const root = await temporaryHome();
		const config = borrowedConfig(true);
		const raw = JSON.stringify({ token: { access_token: "expired", refresh_token: "refresh", expiry: new Date(1).toISOString() } });
		const { store } = await borrowedStore(root, config, raw);
		let refreshes = 0;
		const faux = fauxProvider({ provider: "borrowed", models: [{ id: "model" }] });
		const models = createModels({ credentials: store.forAccount("borrowed", "main") });
		models.setProvider({ ...faux.provider, auth: { oauth: { name: "fixture", login: async () => oauth("x", "x"), refresh: async (current) => { refreshes++; return current; }, toAuth: async (current) => ({ apiKey: current.access }) } } });
		await expect(models.getAuth("borrowed")).rejects.toThrow(/run the source CLI/);
		expect(refreshes).toBe(0);
	});

	test("borrowed write-back: rotates tokens and writes back to source preserving other fields", async () => {
		const root = await temporaryHome();
		const config = borrowedConfig(false, "write-back");
		const { source, store } = await borrowedStore(root, config);
		await writeFile(join(source, "source.json"), JSON.stringify({ access: "source-expired", refresh: "source-refresh", expires: 1, untouched: { keep: true } }));
		let refreshes = 0;
		const faux = fauxProvider({ provider: "borrowed", models: [{ id: "model" }] });
		const models = createModels({ credentials: store.forAccount("borrowed", "main") });
		models.setProvider({ ...faux.provider, auth: { oauth: { name: "fixture", login: async () => oauth("x", "x"), refresh: async (current) => { refreshes++; return { ...current, access: "rotated-access", refresh: "rotated-refresh", expires: Date.now() + 3_600_000 }; }, toAuth: async (current) => ({ apiKey: current.access }) } } });
		await models.getAuth("borrowed");
		expect(refreshes).toBe(1);
		const sourceContent = JSON.parse(await readFile(join(source, "source.json"), "utf8"));
		expect(sourceContent.access).toBe("rotated-access");
		expect(sourceContent.refresh).toBe("rotated-refresh");
		expect(sourceContent.untouched).toEqual({ keep: true });
		expect(sourceContent.expires).toBeGreaterThan(Date.now());
	});

	test("borrowed write-back: concurrent refreshes do not double-exchange (lock)", async () => {
		const root = await temporaryHome();
		const config = borrowedConfig(false, "write-back");
		const { source, store } = await borrowedStore(root, config);
		await writeFile(join(source, "source.json"), JSON.stringify({ access: "source-expired", refresh: "source-refresh", expires: 1 }));
		let refreshCount = 0;
		const faux = fauxProvider({ provider: "borrowed", models: [{ id: "model" }] });
		const provider = { ...faux.provider, auth: { oauth: { name: "fixture", login: async () => oauth("x", "x"), refresh: async (current) => { refreshCount++; await Bun.sleep(10); return { ...current, access: `rotated-${refreshCount}`, refresh: `rotated-refresh-${refreshCount}`, expires: Date.now() + 3_600_000 }; }, toAuth: async (current) => ({ apiKey: current.access }) } } };
		const models1 = createModels({ credentials: store.forAccount("borrowed", "main") });
		models1.setProvider(provider);
		const models2 = createModels({ credentials: store.forAccount("borrowed", "main") });
		models2.setProvider(provider);
		await Promise.all([models1.getAuth("borrowed"), models2.getAuth("borrowed")]);
		// Only one refresh should have happened due to locking
		expect(refreshCount).toBe(1);
	});
});