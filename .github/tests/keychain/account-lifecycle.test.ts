import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type AccountRecord, FileCredentialStore } from "../src/index.ts";

const roots: string[] = [];
afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

async function temporaryHome(): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), "df-keychain-account-lifecycle-"));
	roots.push(path);
	return path;
}

async function seed(store: FileCredentialStore, id: string, slots: AccountRecord["slots"]): Promise<void> {
	const [provider, label] = id.split(":") as [string, string];
	await store.modifyAccount(
		id,
		async (): Promise<AccountRecord> => ({
			id,
			provider,
			label,
			metadata: { ownership: "df-owned" },
			slots,
		}),
	);
}

function oauth(access: string, refresh: string) {
	return { type: "oauth", access, refresh, expires: 2_000_000_000_000 } as const;
}

async function storedAccounts(home: string): Promise<string[]> {
	const persisted = JSON.parse(await readFile(join(home, "credentials.df"), "utf8")) as {
		accounts: Record<string, unknown>;
	};
	return Object.keys(persisted.accounts);
}

describe("credential account deletion", () => {
	test("deleting the last credential slot removes the account row instead of emptying it", async () => {
		const home = await temporaryHome();
		const store = new FileCredentialStore(home);
		await seed(store, "fixture:work", { oauth: oauth("ONLY-SLOT-ACCESS", "ONLY-SLOT-REFRESH") });

		await store.forAccount("fixture", "work").delete("fixture");

		expect(await store.readAccount("fixture:work")).toBeUndefined();
		expect(await store.listAccounts()).toEqual([]);
		expect(await storedAccounts(home)).toEqual([]);
	});

	test("deleting a credential removes every slot it holds, secrets included", async () => {
		const home = await temporaryHome();
		const store = new FileCredentialStore(home);
		await seed(store, "fixture:work", {
			oauth: oauth("DELETED-ACCESS-PLACEHOLDER", "DELETED-REFRESH-PLACEHOLDER"),
			"x-fixture-project": { type: "header", value: "DELETED-HEADER-PLACEHOLDER" },
		});

		await store.forAccount("fixture", "work").delete("fixture");

		expect(await store.readAccount("fixture:work")).toBeUndefined();
		const raw = await readFile(join(home, "credentials.df"), "utf8");
		expect(raw).not.toContain("DELETED-ACCESS-PLACEHOLDER");
		expect(raw).not.toContain("DELETED-REFRESH-PLACEHOLDER");
		expect(raw).not.toContain("DELETED-HEADER-PLACEHOLDER");
	});

	test("deleting one account never cascades to another account of the same provider", async () => {
		const home = await temporaryHome();
		const cleared: string[] = [];
		const store = new FileCredentialStore(home, undefined, async (provider, label) => {
			cleared.push(`${provider}/${label}`);
		});
		await seed(store, "fixture:keep", { oauth: oauth("KEEP-ACCESS", "KEEP-REFRESH") });
		await seed(store, "fixture:drop", { oauth: oauth("DROP-ACCESS", "DROP-REFRESH") });
		cleared.length = 0;

		expect(await store.deleteAccount("fixture:drop")).toBe(true);

		expect((await store.listAccounts()).map((account) => account.id)).toEqual(["fixture:keep"]);
		expect(await store.readCredential("fixture", "keep")).toMatchObject({ access: "KEEP-ACCESS" });
		expect(cleared).toEqual(["fixture/drop"]);
	});

	test("deleting an account that is not there is refused and writes nothing", async () => {
		const home = await temporaryHome();
		const cleared: string[] = [];
		const store = new FileCredentialStore(home, undefined, async (provider, label) => {
			cleared.push(`${provider}/${label}`);
		});
		await seed(store, "fixture:keep", { oauth: oauth("KEEP-ACCESS", "KEEP-REFRESH") });
		cleared.length = 0;

		expect(await store.deleteAccount("fixture:absent")).toBe(false);

		expect((await store.listAccounts()).map((account) => account.id)).toEqual(["fixture:keep"]);
		expect(await storedAccounts(home)).toEqual(["fixture:keep"]);
		expect(cleared).toEqual([]);
	});

	test("the store still loads after a delete and the remaining account stays usable", async () => {
		const home = await temporaryHome();
		const store = new FileCredentialStore(home);
		await seed(store, "fixture:work", { oauth: oauth("DROPPED-ACCESS", "DROPPED-REFRESH") });
		await seed(store, "fixture:keep", { oauth: oauth("KEPT-ACCESS", "KEPT-REFRESH") });
		await seed(store, "other:key", { api_key: { type: "api_key", value: "KEPT-KEY-PLACEHOLDER" } });

		await store.forAccount("fixture", "work").delete("fixture");

		const reopened = new FileCredentialStore(home);
		expect((await reopened.listAccounts()).map((account) => account.id)).toEqual(["fixture:keep", "other:key"]);
		expect(await reopened.readCredential("fixture", "keep")).toMatchObject({ access: "KEPT-ACCESS" });
		expect(await reopened.getSlot("other", "key", "api_key")).toEqual({
			type: "api_key",
			value: "KEPT-KEY-PLACEHOLDER",
		});
		expect(await reopened.readCredential("fixture", "work")).toBeUndefined();
	});

	test("an account store refuses to delete a credential belonging to a different provider", async () => {
		const home = await temporaryHome();
		const store = new FileCredentialStore(home);
		await seed(store, "fixture:work", { oauth: oauth("KEEP-ACCESS", "KEEP-REFRESH") });

		expect(() => store.forAccount("fixture", "work").delete("other")).toThrow(
			"Account store is bound to provider fixture",
		);
		expect(await store.readAccount("fixture:work")).toBeDefined();
	});
});
