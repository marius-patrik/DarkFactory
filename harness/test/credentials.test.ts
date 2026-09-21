import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { importCodexAccount } from "@darkfactory/keychain/import/codex";
import { createModels, fauxProvider, type OAuthCredential, type Provider } from "@earendil-works/pi-ai";
import { accountId, FileCredentialStore, validateAccountRecord } from "@darkfactory/keychain";
import { QuotaStore } from "../src/harness/quota-store.ts";

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
		const workers = Array.from({ length: 12 }, (_, index) =>
			Bun.spawn(
				[process.execPath, join(import.meta.dir, "fixtures", "store-writer.ts"), "credentials", root, String(index)],
				{ stdout: "pipe", stderr: "pipe" },
			),
		);
		const results = await Promise.all(
			workers.map(async (worker) => ({
				exit: await worker.exited,
				stderr: await new Response(worker.stderr).text(),
			})),
		);
		expect(results).toEqual(Array.from({ length: 12 }, () => ({ exit: 0, stderr: "" })));
		expect(await new FileCredentialStore(root).listAccounts()).toHaveLength(12);
	});

	test("credential changes clear cooldowns for that account", async () => {
		const root = await temporaryHome();
		const quota = new QuotaStore(root);
		const candidate = { provider: "fixture", model: "model", account: "work" };
		await quota.mark(candidate, "auth", undefined, Date.now());
		const store = new FileCredentialStore(root, undefined, (provider, label) => quota.clearAccount(provider, label));
		await store.setSlot("fixture:work", "api_key", { type: "api_key", value: "updated" });
		expect(await quota.active(candidate)).toBeUndefined();
	});

	test("models accounts as named, typed multi-slot records", async () => {
		const store = new FileCredentialStore(await temporaryHome());
		await store.setSlot(accountId("google-antigravity", "work"), "oauth", oauth("refresh-work", "access-work"));
		await store.setSlot(accountId("google-antigravity", "work"), "x-goog-user-project", {
			type: "header",
			value: "project-work",
		});
		await store.setSlot(accountId("api-provider", "team"), "api_key", { type: "api_key", value: "test-key" });
		await store.setSlot(accountId("api-provider", "team"), "OpenAI-Organization", {
			type: "header",
			value: "org-test",
		});
		await store.setSlot(accountId("web-subscription", "personal"), "session", {
			type: "cookie",
			value: "session=test",
		});
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
		expect(await store.forAccount("api-provider", "team").read("api-provider")).toEqual({
			type: "api_key",
			key: "test-key",
		});
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
						refresh: async (credential) => ({
							...credential,
							access: `new-${credential.refresh}`,
							expires: Date.now() + 3_600_000,
						}),
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
		expect(await store.getSlot("same-provider", "work", "oauth")).toMatchObject({
			type: "oauth",
			access: "new-refresh-work",
		});
		expect(await store.getSlot("same-provider", "personal", "oauth")).toMatchObject({
			type: "oauth",
			access: "new-refresh-personal",
		});
		expect(await store.getSlot("same-provider", "work", "x-account")).toEqual({ type: "header", value: "work" });
		expect(await store.getSlot("same-provider", "personal", "x-account")).toEqual({
			type: "header",
			value: "personal",
		});
	});

	test("malformed storage fails without echoing secret input", async () => {
		const home = await temporaryHome();
		await mkdir(home, { recursive: true });
		await writeFile(join(home, "credentials.df"), "not-json-secret-material", "utf8");
		await expect(new FileCredentialStore(home).listAccounts()).rejects.toThrow("Invalid credentials file JSON");
	});

	function testJwt(payload: Record<string, unknown>): string {
		return `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.`;
	}

	test("import creates a df-owned account and later refreshes never touch the source file", async () => {
		const root = await temporaryHome();
		const sourceDir = join(root, "source");
		await mkdir(join(sourceDir, ".codex"), { recursive: true });
		const sourceFile = join(sourceDir, ".codex", "auth.json");
		const srcJwt = testJwt({ exp: 2_000_000_000, "https://api.openai.com/auth": { chatgpt_account_id: "codex-acct" } });
		const initialSourceContent = JSON.stringify({
			tokens: {
				access_token: srcJwt,
				refresh_token: "src-refresh-token",
				account_id: "codex-acct",
			},
			auth_mode: "chatgpt",
			untouched: { marker: "original-data" },
		});
		await writeFile(sourceFile, initialSourceContent, "utf8");

		const store = new FileCredentialStore(join(root, "df"));
		const reader = {
			home: sourceDir,
			read: async (p: string) => {
				try {
					return await readFile(join(sourceDir, p), "utf8");
				} catch {
					return undefined;
				}
			},
		};
		await importCodexAccount(store, "work", reader, "openai-codex", "openai");

		const imported = await store.readAccount("openai-codex:work");
		expect(imported?.metadata?.ownership).toBe("df-owned");
		expect(imported?.metadata?.importedFrom).toBe("codex");
		expect(imported?.slots.oauth).toMatchObject({ access: srcJwt, refresh: "src-refresh-token" });

		let refreshes = 0;
		const faux = fauxProvider({ provider: "openai-codex", models: [{ id: "model" }] });
		const models = createModels({ credentials: store.forAccount("openai-codex", "work") });
		models.setProvider({
			...faux.provider,
			auth: {
				oauth: {
					name: "fixture",
					login: async () => oauth("x", "x"),
					refresh: async (current) => {
						refreshes++;
						return { ...current, access: "df-refreshed-access", refresh: "df-refreshed-refresh" };
					},
					toAuth: async (current) => ({ apiKey: current.access }),
				},
			},
		});

		const authResult = await store.forAccount("openai-codex", "work").modify("openai-codex", async (curr) => {
			refreshes++;
			return { ...(curr as OAuthCredential), access: "df-refreshed-access", refresh: "df-refreshed-refresh" };
		});
		expect(refreshes).toBe(1);
		expect(authResult).toMatchObject({ access: "df-refreshed-access", refresh: "df-refreshed-refresh" });

		const storedAfter = await store.readAccount("openai-codex:work");
		expect(storedAfter?.slots.oauth).toMatchObject({ access: "df-refreshed-access", refresh: "df-refreshed-refresh" });
		expect(storedAfter?.metadata?.ownership).toBe("df-owned");

		expect(await readFile(sourceFile, "utf8")).toBe(initialSourceContent);
	});

	test("borrowed accounts preserve external ownership without rewriting persisted state", async () => {
		const root = await temporaryHome();
		const storePath = join(root, "credentials.df");
		const oldStore = {
			version: 2,
			accounts: {
				"borrowed:main": {
					id: "borrowed:main",
					provider: "borrowed",
					label: "main",
					metadata: {
						importer: "fixture",
						ownership: "borrowed",
						source_path: "source.json",
					},
					slots: {
						oauth: {
							type: "oauth",
							access: "tok-access",
							refresh: "tok-refresh",
							expires: Date.now() + 100_000,
						},
					},
				},
			},
		};
		await writeFile(storePath, JSON.stringify(oldStore, null, 2), "utf8");

		const store = new FileCredentialStore(root);
		const account = await store.readAccount("borrowed:main");
		expect(account).toBeDefined();
		expect(account?.metadata?.ownership).toBe("borrowed");
		expect(account?.metadata?.importer).toBe("fixture");
		expect(account?.metadata?.importedFrom).toBeUndefined();
		expect(account?.slots.oauth).toMatchObject({ access: "tok-access", refresh: "tok-refresh" });

		const diskFile = JSON.parse(await readFile(storePath, "utf8"));
		expect(diskFile.accounts["borrowed:main"].metadata.ownership).toBe("borrowed");
		expect(diskFile.accounts["borrowed:main"].metadata.importer).toBe("fixture");
		expect(diskFile.accounts["borrowed:main"].slots.oauth.access).toBe("tok-access");
	});

	test("export/load round trip preserves tokens as df-owned with 0600 permissions", async () => {
		const root1 = await temporaryHome();
		const store1 = new FileCredentialStore(root1);
		await store1.setSlot("openai-codex:test", "oauth", {
			type: "oauth",
			access: "acc-secret",
			refresh: "ref-secret",
			expires: Date.now() + 3600_000,
			accountId: "acct-test",
		});
		await store1.setSlot("openai-codex:test", "header-slot", {
			type: "header",
			value: "custom-header",
		});

		const exported = await store1.readAccount("openai-codex:test");
		expect(exported).toBeDefined();
		const jsonLine = JSON.stringify(exported);
		expect(jsonLine).not.toContain("\n");

		const root2 = await temporaryHome();
		const store2 = new FileCredentialStore(root2);
		const envVarName = "TEST_DF_ACCOUNT_EXPORT";
		process.env[envVarName] = jsonLine;
		try {
			const validated = validateAccountRecord(JSON.parse(jsonLine), "openai-codex:pipeline");
			expect(validated.id).toBe("openai-codex:pipeline");
			await store2.modifyAccount("openai-codex:pipeline", async () => ({
				...validated,
				metadata: { ...(validated.metadata ?? {}), ownership: "df-owned" },
			}));

			const loaded = await store2.readAccount("openai-codex:pipeline");
			expect(loaded).toBeDefined();
			expect(loaded?.metadata?.ownership).toBe("df-owned");
			expect(loaded?.slots.oauth).toMatchObject({
				access: "acc-secret",
				refresh: "ref-secret",
				accountId: "acct-test",
			});
			expect(loaded?.slots["header-slot"]).toMatchObject({
				type: "header",
				value: "custom-header",
			});

			const fileStat = await stat(store2.path);
			if (process.platform !== "win32") {
				expect(fileStat.mode & 0o777).toBe(0o600);
			}
		} finally {
			delete process.env[envVarName];
		}
	});

	test("load rejects malformed records", () => {
		expect(() => validateAccountRecord("string", "p:l")).toThrow("must be an object");
		expect(() => validateAccountRecord(null, "p:l")).toThrow("must be an object");
		expect(() => validateAccountRecord([1, 2], "p:l")).toThrow("must be an object");
		expect(() => validateAccountRecord({}, "p:l")).toThrow("must contain at least one valid credential slot");
		expect(() => validateAccountRecord({ slots: {} }, "p:l")).toThrow(
			"must contain at least one valid credential slot",
		);
		expect(() => validateAccountRecord({ slots: { oauth: { type: "oauth", access: "" } } }, "p:l")).toThrow(
			"Invalid credential slot",
		);
		expect(() =>
			validateAccountRecord(
				{ slots: { oauth: { type: "oauth", access: "a", refresh: "r", expires: "not-a-number" } } },
				"p:l",
			),
		).toThrow("Invalid credential slot");
		expect(() => validateAccountRecord({ slots: { api_key: { type: "api_key", value: "" } } }, "p:l")).toThrow(
			"Invalid credential slot",
		);
		expect(() =>
			validateAccountRecord(
				{ provider: "other", label: "l", slots: { api_key: { type: "api_key", value: "key" } } },
				"p:l",
			),
		).toThrow("does not match");
	});
});
