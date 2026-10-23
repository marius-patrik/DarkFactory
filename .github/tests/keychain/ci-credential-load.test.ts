import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type AccountRecord,
	exportCredentialAccount,
	FileCredentialStore,
	generateVaultKey,
	importCredentialAccount,
} from "../src/index.ts";

/**
 * Account ids CI carries as `DF_ACCOUNT_*` secrets and feeds to `df account load <id> --from-env`,
 * as declared by `DF_ACCOUNT_LOAD_MAP` in `.github/scripts/agent_runner.py`.
 */
const CI_ACCOUNT_IDS = ["openai-codex:pipeline", "grok-sub:pipeline"] as const;

const roots: string[] = [];
afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

async function machineHome(vaultKey: string): Promise<string> {
	const home = await mkdtemp(join(tmpdir(), "df-keychain-ci-load-"));
	roots.push(home);
	await writeFile(join(home, "vault-key.df"), vaultKey, { encoding: "utf8", mode: 0o600 });
	return home;
}

function pipelineAccount(id: string, access: string, refresh: string): AccountRecord {
	const [provider, label] = id.split(":") as [string, string];
	return {
		id,
		provider,
		label,
		metadata: { ownership: "df-owned", sync: "machine-only", login: "oauth" },
		auth: { scopes: ["openid", "email"] },
		slots: { oauth: { type: "oauth", access, refresh, expires: 2_000_000_000_000 } },
	};
}

describe("CI-carried OAuth account records", () => {
	test("each CI account id round-trips through the export envelope and survives a store restart", async () => {
		const key = generateVaultKey();
		for (const id of CI_ACCOUNT_IDS) {
			const home = await machineHome(key);
			const source = pipelineAccount(id, `${id}-ACCESS-PLACEHOLDER`, `${id}-REFRESH-PLACEHOLDER`);

			// What `df account export` prints into the Actions secret, and what the runner feeds back
			// through `df account load <id> --from-env`: the authenticated envelope, never plaintext.
			const serialized = JSON.stringify(exportCredentialAccount(source, key));
			expect(serialized).not.toContain("ACCESS-PLACEHOLDER");
			expect(serialized).not.toContain("REFRESH-PLACEHOLDER");

			const store = new FileCredentialStore(home);
			await store.modifyAccount(id, async () => importCredentialAccount(JSON.parse(serialized), key, id));

			const reopened = new FileCredentialStore(home);
			expect((await reopened.listAccounts()).map((account) => account.id)).toEqual([id]);
			const loaded = await reopened.readAccount(id);
			expect(loaded?.slots.oauth).toEqual(source.slots.oauth);
			expect(loaded?.auth).toEqual({ scopes: ["openid", "email"] });
			expect(await reopened.readCredential(...(id.split(":") as [string, string]))).toMatchObject({
				type: "oauth",
				access: `${id}-ACCESS-PLACEHOLDER`,
			});
		}
	});

	test("a CI record the machine vault key cannot decrypt is refused and stores nothing", async () => {
		const home = await machineHome(generateVaultKey());
		const store = new FileCredentialStore(home);
		const envelope = exportCredentialAccount(
			pipelineAccount("openai-codex:pipeline", "UNREADABLE-ACCESS-PLACEHOLDER", "UNREADABLE-REFRESH-PLACEHOLDER"),
			generateVaultKey(),
		);

		expect(() => importCredentialAccount(envelope, generateVaultKey(), "openai-codex:pipeline")).toThrow(
			"Failed to decrypt credential export",
		);
		expect(await store.listAccounts()).toEqual([]);
	});

	test("a CI record for one provider cannot be loaded as another provider's account", async () => {
		const key = generateVaultKey();
		const home = await machineHome(key);
		const store = new FileCredentialStore(home);
		const envelope = exportCredentialAccount(
			pipelineAccount("grok-sub:pipeline", "GROK-ACCESS-PLACEHOLDER", "GROK-REFRESH-PLACEHOLDER"),
			key,
		);

		expect(() => importCredentialAccount(envelope, key, "openai-codex:pipeline")).toThrow("does not match");
		expect(await store.listAccounts()).toEqual([]);
	});

	test("a CI record is rejected before it is stored when it carries no usable credential slot", async () => {
		const key = generateVaultKey();
		const home = await machineHome(key);
		const store = new FileCredentialStore(home);
		const source = pipelineAccount("openai-codex:pipeline", "SLOTLESS-ACCESS", "SLOTLESS-REFRESH");
		const envelope = exportCredentialAccount({ ...source, slots: {} }, key);

		expect(() => importCredentialAccount(envelope, key, "openai-codex:pipeline")).toThrow(
			"at least one valid credential slot",
		);
		expect(await store.listAccounts()).toEqual([]);
	});
});
