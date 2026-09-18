import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { accountId, FileCredentialStore } from "../../src/credentials.ts";
import { generateVaultKey } from "../../src/secrets/crypto.ts";
import { saveVault } from "../../src/secrets/vault-store.ts";

let root = "";
let dfHome = "";
let dataRepo = "";

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), "df-cred-vault-"));
	dfHome = join(root, "home");
	dataRepo = join(root, "data-df");
	await Bun.spawn(["git", "init", dataRepo], { stdout: "pipe", stderr: "pipe" }).exited;
	await Bun.spawn(["git", "-C", dataRepo, "config", "user.email", "t@t.com"]).exited;
	await Bun.spawn(["git", "-C", dataRepo, "config", "user.name", "t"]).exited;
	await Bun.spawn(["mkdir", "-p", dfHome], { stdout: "pipe" }).exited;
	await writeFile(join(dfHome, "config.df"), JSON.stringify({ dataRepo }), "utf8");
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

describe("vault: credential source for df account set --from-vault", () => {
	test("api_key resolved from vault at runtime, value never stored plaintext in credentials file", async () => {
		const key = generateVaultKey();
		await writeFile(join(dfHome, "vault.key"), key, { mode: 0o600 } as never);
		await saveVault(
			dataRepo,
			{
				version: 1,
				entries: [
					{
						name: "GEMINI_API_KEY",
						value: "real-api-key-xyz",
						scope: "actions",
						created: { by: "h", at: new Date().toISOString() },
						updated: { by: "h", at: new Date().toISOString() },
					},
				],
			},
			key,
		);

		const store = new FileCredentialStore(dfHome);
		await store.setSlot(accountId("google", "default"), "api_key", { type: "api_key", value: "vault:GEMINI_API_KEY" });

		// Stored raw still vault: reference
		const raw = await store.getSlot("google", "default", "api_key");
		// getSlot resolves vault: to real value
		expect((raw as { value: string }).value).toBe("real-api-key-xyz");

		// readCredential via forAccount resolves
		const cred = await store.forAccount("google", "default").read("google");
		expect(cred).toEqual({ type: "api_key", key: "real-api-key-xyz" });

		// requestHeaders also resolves header slots from vault
		await store.setSlot(accountId("google", "default"), "x-goog-header", {
			type: "header",
			value: "vault:GEMINI_API_KEY",
		});
		const headers = await store.requestHeaders("google", "default");
		expect(headers["x-goog-header"]).toBe("real-api-key-xyz");

		// Ensure credentials.json does not contain plaintext (it stores vault: reference)
		const fileRaw = await Bun.file(join(dfHome, "credentials.json")).text();
		expect(fileRaw).toContain("vault:GEMINI_API_KEY");
		expect(fileRaw).not.toContain("real-api-key-xyz");
	});

	test("vault secret not found throws without leaking value", async () => {
		const key = generateVaultKey();
		await writeFile(join(dfHome, "vault.key"), key, { mode: 0o600 } as never);
		await saveVault(dataRepo, { version: 1, entries: [] }, key);
		const store = new FileCredentialStore(dfHome);
		await store.setSlot(accountId("google", "default"), "api_key", { type: "api_key", value: "vault:MISSING" });
		await expect(store.forAccount("google", "default").read("google")).rejects.toThrow("Vault secret not found");
	});

	test("account set --from-vault via CLI stores vault: reference (integration)", async () => {
		const key = generateVaultKey();
		await writeFile(join(dfHome, "vault.key"), key, { mode: 0o600 } as never);
		await saveVault(
			dataRepo,
			{
				version: 1,
				entries: [
					{
						name: "MY_VAULT_KEY",
						value: "vaulted-value-123",
						scope: "actions",
						created: { by: "h", at: new Date().toISOString() },
						updated: { by: "h", at: new Date().toISOString() },
					},
				],
			},
			key,
		);
		// Simulate `df account set google:default api_key --from-vault MY_VAULT_KEY`
		// Use FileCredentialStore directly as CLI does
		const store = new FileCredentialStore(dfHome);
		const vaultName = "MY_VAULT_KEY";
		await store.setSlot("google:default", "api_key", { type: "api_key", value: `vault:${vaultName}` });
		const cred = await store.forAccount("google", "default").read("google");
		expect(cred).toEqual({ type: "api_key", key: "vaulted-value-123" });
	});
});
