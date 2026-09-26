import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfiguredBorrowedCredentialCoordinator, type ExternalKeyring, FileCredentialStore } from "../src/index.ts";

const roots: string[] = [];

async function temporaryHome(): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), "df-keychain-source-"));
	roots.push(path);
	return path;
}

afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

describe("ConfiguredBorrowedCredentialCoordinator", () => {
	test("reimports a mapped file source without modifying it", async () => {
		const root = await temporaryHome();
		await mkdir(join(root, ".tool"), { recursive: true });
		const sourcePath = join(root, ".tool", "auth.json");
		const source = {
			profiles: {
				work: {
					access: "source-access",
					refresh: "source-refresh",
					expires: 2_000_000_000,
					account_id: "acct-work",
				},
			},
			untouched: "keep-me",
		};
		const original = JSON.stringify(source, null, 2);
		await writeFile(sourcePath, original, "utf8");

		const coordinator = new ConfiguredBorrowedCredentialCoordinator(root, [
			{
				id: "fixture-cli",
				path: ".tool/auth.json",
				fields: {
					access: "profiles.*.access",
					refresh: "profiles.*.refresh",
					expires: "profiles.*.expires",
					accountId: "profiles.*.account_id",
				},
				expires: "epoch_seconds",
			},
		]);
		const store = new FileCredentialStore(join(root, "df"), undefined, undefined, coordinator);
		await store.modifyAccount("fixture:work", async () => ({
			id: "fixture:work",
			provider: "fixture",
			label: "work",
			metadata: {
				ownership: "borrowed",
				importer: "fixture-cli",
				source_entry: "work",
			},
			slots: {
				oauth: { type: "oauth", access: "stale", refresh: "stale", expires: Date.now() + 60_000 },
			},
		}));

		const credential = await store.readCredential("fixture", "work");
		expect(credential).toMatchObject({
			type: "oauth",
			access: "source-access",
			refresh: "source-refresh",
			accountId: "acct-work",
			expires: 2_000_000_000_000,
		});
		expect(await readFile(sourcePath, "utf8")).toBe(original);
	});

	test("supports read-only external keyring sources", async () => {
		const keyring: ExternalKeyring = {
			listServices: async () => [{ service: "Fixture CLI", account: "work" }],
			read: async (service, account) => {
				expect(service).toBe("Fixture CLI");
				expect(account).toBe("work");
				return JSON.stringify({
					access: "keyring-access",
					refresh: "keyring-refresh",
					expires: "2033-05-18T03:33:20.000Z",
				});
			},
		};
		const coordinator = new ConfiguredBorrowedCredentialCoordinator(
			await temporaryHome(),
			[
				{
					id: "fixture-keyring",
					keyring: { service: "Fixture CLI", account: "work" },
					fields: { access: "access", refresh: "refresh", expires: "expires" },
					expires: "iso",
				},
			],
			keyring,
		);
		const plan = await coordinator.prepare({
			id: "fixture:work",
			provider: "fixture",
			label: "work",
			metadata: { ownership: "borrowed", importer: "fixture-keyring" },
			slots: { oauth: { type: "oauth", access: "stale", refresh: "stale", expires: 0 } },
		});
		expect(plan.mode).toBe("reimport-only");
		expect(plan.credential).toMatchObject({ access: "keyring-access", refresh: "keyring-refresh" });
		expect(plan.credential.expires).toBe(Date.parse("2033-05-18T03:33:20.000Z"));
	});
});
