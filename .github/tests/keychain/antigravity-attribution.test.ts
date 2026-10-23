import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importAntigravityAccount } from "../src/import/antigravity.ts";
import { FileCredentialStore } from "../src/index.ts";

const roots: string[] = [];
afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

async function temporaryHome(): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), "df-keychain-antigravity-"));
	roots.push(path);
	return path;
}

const KEYRING_PAYLOAD = JSON.stringify({
	token: {
		access_token: "REJECTED-ACCESS-PLACEHOLDER",
		refresh_token: "REJECTED-REFRESH-PLACEHOLDER",
		expiry: "2030-01-01T00:00:00Z",
	},
});

/** The keyring service Antigravity writes under, and Google AI Studio's env var it must never be confused with. */
const ANTIGRAVITY_SERVICE = "gemini";
const ANTIGRAVITY_KEYRING_ACCOUNT = "antigravity";
const GOOGLE_AI_STUDIO_PROVIDER = "google";

function status(code: number): Response {
	return new Response("{}", { status: code });
}

describe("Antigravity credential discovery", () => {
	test("an absent Antigravity login is reported as absent, not as a rejected credential", async () => {
		const store = new FileCredentialStore(await temporaryHome());

		const failure = importAntigravityAccount(
			store,
			"work",
			{ read: async () => undefined },
			"google-antigravity",
			ANTIGRAVITY_SERVICE,
			ANTIGRAVITY_KEYRING_ACCOUNT,
		);

		await expect(failure).rejects.toThrow(/absent, not rejected/u);
		await expect(failure).rejects.toThrow(/google-antigravity/u);
		expect(await store.listAccounts()).toEqual([]);
	});

	test("a rejected Antigravity credential names the provider and the re-authentication command", async () => {
		const store = new FileCredentialStore(await temporaryHome());

		for (const code of [401, 403]) {
			const failure = importAntigravityAccount(
				store,
				"work",
				{ read: async () => KEYRING_PAYLOAD },
				"google-antigravity",
				ANTIGRAVITY_SERVICE,
				ANTIGRAVITY_KEYRING_ACCOUNT,
				async () => status(code),
			);
			await expect(failure).rejects.toThrow(
				`The google-antigravity Antigravity credential was rejected (HTTP ${code}); it is present but needs re-authentication: run \`df login google-antigravity --account work\``,
			);
			const message = await failure.then(
				() => "",
				(error: unknown) => (error as Error).message,
			);
			expect(message).not.toContain("REJECTED-ACCESS-PLACEHOLDER");
			expect(message).not.toContain("REJECTED-REFRESH-PLACEHOLDER");
			expect(await store.listAccounts()).toEqual([]);
		}
	});

	test("an upstream failure that is not a rejection stays a discovery failure", async () => {
		const store = new FileCredentialStore(await temporaryHome());

		await expect(
			importAntigravityAccount(
				store,
				"work",
				{ read: async () => KEYRING_PAYLOAD },
				"google-antigravity",
				ANTIGRAVITY_SERVICE,
				ANTIGRAVITY_KEYRING_ACCOUNT,
				async () => status(503),
			),
		).rejects.toThrow("Antigravity project discovery failed (HTTP 503)");
		expect(await store.listAccounts()).toEqual([]);
	});

	test("the Antigravity login found under the historical `gemini` keyring service is claimed by its own provider only", async () => {
		const store = new FileCredentialStore(await temporaryHome());
		let observedProjectRequest = 0;

		await importAntigravityAccount(
			store,
			"work",
			{
				read: async (service, account) =>
					service === ANTIGRAVITY_SERVICE && account === ANTIGRAVITY_KEYRING_ACCOUNT ? KEYRING_PAYLOAD : undefined,
			},
			"google-antigravity",
			ANTIGRAVITY_SERVICE,
			ANTIGRAVITY_KEYRING_ACCOUNT,
			async () => {
				observedProjectRequest += 1;
				return Response.json({ cloudaicompanionProject: "projects/attributed" });
			},
		);

		expect(observedProjectRequest).toBe(1);
		expect((await store.listAccounts()).map((account) => account.id)).toEqual(["google-antigravity:work"]);
		expect(await store.readCredential(GOOGLE_AI_STUDIO_PROVIDER, "work")).toBeUndefined();
		expect(await store.getSlot("google-antigravity", "work", "x-antigravity-project")).toEqual({
			type: "header",
			value: "attributed",
		});
	});

	test("a login written under a different keyring account is absent, not silently claimed", async () => {
		const store = new FileCredentialStore(await temporaryHome());

		await expect(
			importAntigravityAccount(
				store,
				"work",
				{ read: async () => undefined },
				"google-antigravity",
				ANTIGRAVITY_SERVICE,
				"some-other-account",
			),
		).rejects.toThrow(/absent, not rejected/u);
		expect(await store.listAccounts()).toEqual([]);
	});
});
