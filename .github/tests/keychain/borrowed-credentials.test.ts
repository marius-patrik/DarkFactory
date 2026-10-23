import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type AccountRecord,
	accountId,
	type BorrowedCredentialCoordinator,
	FileCredentialStore,
	type OAuthCredentialSlot,
} from "../src/index.ts";

const roots: string[] = [];

async function temporaryHome(): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), "df-keychain-borrowed-"));
	roots.push(path);
	return path;
}

afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

function oauth(access: string, refresh: string, expires = Date.now() + 3_600_000): OAuthCredentialSlot {
	return { type: "oauth", access, refresh, expires };
}

async function seedBorrowed(store: FileCredentialStore, credential = oauth("stored-access", "stored-refresh")) {
	const id = accountId("fixture", "work");
	await store.modifyAccount(
		id,
		async (): Promise<AccountRecord> => ({
			id,
			provider: "fixture",
			label: "work",
			metadata: {
				ownership: "borrowed",
				importer: "fixture-cli",
				source_path: ".fixture/auth.json",
			},
			slots: { oauth: credential },
		}),
	);
	return id;
}

describe("@darkfactory/keychain borrowed credential custody", () => {
	test("preserves borrowed ownership instead of silently converting the account", async () => {
		const home = await temporaryHome();
		const store = new FileCredentialStore(home);
		const id = await seedBorrowed(store);

		const account = await store.readAccount(id);
		expect(account?.metadata?.ownership).toBe("borrowed");
		expect(account?.metadata?.importer).toBe("fixture-cli");

		const persisted = JSON.parse(await readFile(join(home, "credentials.df"), "utf8")) as {
			accounts: Record<string, AccountRecord>;
		};
		expect(persisted.accounts[id]?.metadata?.ownership).toBe("borrowed");
	});

	test("re-reads borrowed credentials from the external-source coordinator", async () => {
		const home = await temporaryHome();
		const coordinator: BorrowedCredentialCoordinator = {
			prepare: async () => ({
				mode: "reimport-only",
				credential: oauth("source-access", "source-refresh"),
			}),
		};
		const store = new FileCredentialStore(home, undefined, undefined, coordinator);
		const id = await seedBorrowed(store);

		expect(await store.readCredential("fixture", "work")).toEqual({
			type: "oauth",
			access: "source-access",
			refresh: "source-refresh",
			expires: expect.any(Number),
		});
		expect((await store.readAccount(id))?.slots.oauth).toMatchObject({
			access: "stored-access",
			refresh: "stored-refresh",
		});
	});

	test("never runs the provider refresh callback for borrowed credentials", async () => {
		const home = await temporaryHome();
		const coordinator: BorrowedCredentialCoordinator = {
			prepare: async () => ({
				mode: "reimport-only",
				credential: oauth("source-access", "source-refresh"),
			}),
		};
		const store = new FileCredentialStore(home, undefined, undefined, coordinator);
		await seedBorrowed(store, oauth("expired-stored", "expired-refresh", Date.now() - 1));

		let refreshCalls = 0;
		const result = await store.forAccount("fixture", "work").modify("fixture", async () => {
			refreshCalls += 1;
			return oauth("df-refreshed", "df-refresh");
		});

		expect(refreshCalls).toBe(0);
		expect(result).toMatchObject({
			type: "oauth",
			access: "source-access",
			refresh: "source-refresh",
		});
	});

	test("fails closed when the authoritative borrowed source is expired", async () => {
		const home = await temporaryHome();
		const coordinator: BorrowedCredentialCoordinator = {
			prepare: async () => ({
				mode: "reimport-only",
				credential: oauth("expired-source", "source-refresh", Date.now() - 1),
			}),
		};
		const store = new FileCredentialStore(home, undefined, undefined, coordinator);
		await seedBorrowed(store);

		await expect(store.readCredential("fixture", "work")).rejects.toThrow("refresh it in the source CLI");
		let refreshCalls = 0;
		await expect(
			store.forAccount("fixture", "work").modify("fixture", async () => {
				refreshCalls += 1;
				return oauth("should-not-run", "should-not-run");
			}),
		).rejects.toThrow("refresh it in the source CLI");
		expect(refreshCalls).toBe(0);
	});

	test("df-owned credentials retain normal refresh semantics", async () => {
		const home = await temporaryHome();
		const store = new FileCredentialStore(home);
		const id = accountId("fixture", "owned");
		await store.modifyAccount(id, async () => ({
			id,
			provider: "fixture",
			label: "owned",
			metadata: { ownership: "df-owned" },
			slots: { oauth: oauth("old", "refresh", Date.now() - 1) },
		}));

		let refreshCalls = 0;
		const result = await store.forAccount("fixture", "owned").modify("fixture", async (current) => {
			refreshCalls += 1;
			expect(current?.type).toBe("oauth");
			return oauth("new", "refresh");
		});
		expect(refreshCalls).toBe(1);
		expect(result).toMatchObject({ type: "oauth", access: "new" });
		expect((await store.readAccount(id))?.slots.oauth).toMatchObject({ access: "new" });
	});
});
