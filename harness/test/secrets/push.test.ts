import { describe, expect, test } from "bun:test";

const sodium: typeof import("libsodium-wrappers") = require("libsodium-wrappers");

import type { PushMap, Vault } from "@darkfactory/keychain";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository } from "../../src/github/repository.ts";
import { pushSecrets } from "../../src/secrets/push.ts";
import { json, scripted } from "../github/helpers.ts";

describe("push sealed-box payload", () => {
	test("push encrypts value with sealed box and never sends plaintext, respects --only and --dry-run", async () => {
		await sodium.ready;
		const keypair = sodium.crypto_box_keypair();
		const publicKey = sodium.to_base64(keypair.publicKey, sodium.base64_variants.ORIGINAL);

		const vault: Vault = {
			version: 1,
			entries: [
				{
					name: "GEMINI_API_KEY",
					value: "secret-123",
					scope: "actions",
					created: { by: "h", at: new Date().toISOString() },
					updated: { by: "h", at: new Date().toISOString() },
				},
				{
					name: "OTHER_KEY",
					value: "other-456",
					scope: "actions",
					created: { by: "h", at: new Date().toISOString() },
					updated: { by: "h", at: new Date().toISOString() },
				},
			],
		};
		const pushMap: PushMap = {
			GEMINI_API_KEY: { repos: ["owner/repo"], ghName: "GEMINI_API_KEY" },
			OTHER_KEY: { repos: ["owner/repo"], ghName: "OTHER_KEY" },
		};

		// Mock fetch sequence: GET public-key, PUT secret, GET public-key, PUT secret
		const mock = scripted([
			json({ key_id: "kid1", key: publicKey }),
			json(undefined, 204),
			json({ key_id: "kid2", key: publicKey }),
			json(undefined, 204),
		]);
		const client = new GitHubClient({ token: "t", fetch: mock.fetch });
		const repo = new GitHubRepository(client, "owner", "repo");

		const results = await pushSecrets({ vault, pushMap, repoSlug: "owner/repo", repository: repo });
		expect(results).toHaveLength(2);
		expect(results.every((r) => r.status === "pushed")).toBe(true);
		const bodies = mock.calls.filter((c) => c.init?.body).map((c) => String(c.init!.body));
		expect(bodies.join(" ")).not.toContain("secret-123");
		expect(bodies.join(" ")).not.toContain("other-456");
		// Verify we can decrypt one
		const parsed = JSON.parse(bodies[0]!) as { encrypted_value: string };
		const encrypted = sodium.from_base64(parsed.encrypted_value, sodium.base64_variants.ORIGINAL);
		expect(sodium.to_string(sodium.crypto_box_seal_open(encrypted, keypair.publicKey, keypair.privateKey))).toBe(
			"secret-123",
		);

		// --only filter
		const mockOnly = scripted([json({ key_id: "kid", key: publicKey }), json(undefined, 204)]);
		const repoOnly = new GitHubRepository(new GitHubClient({ token: "t", fetch: mockOnly.fetch }), "owner", "repo");
		const onlyResults = await pushSecrets({
			vault,
			pushMap,
			repoSlug: "owner/repo",
			repository: repoOnly,
			only: ["GEMINI_API_KEY"],
		});
		expect(onlyResults).toHaveLength(1);
		expect(onlyResults[0]!.name).toBe("GEMINI_API_KEY");

		// --dry-run: no fetch calls
		let fetchCalled = false;
		const dryClient = new GitHubClient({
			token: "t",
			fetch: async () => {
				fetchCalled = true;
				return json({}, 200);
			},
		});
		const dryRepo = new GitHubRepository(dryClient, "owner", "repo");
		const dryResults = await pushSecrets({ vault, pushMap, repoSlug: "owner/repo", repository: dryRepo, dryRun: true });
		expect(fetchCalled).toBe(false);
		expect(dryResults.every((r) => r.status === "dry-run")).toBe(true);

		// repo filter: pushMap entry not for this repo is skipped
		const pushMapOther: PushMap = { GEMINI_API_KEY: { repos: ["other/repo"], ghName: "GEMINI_API_KEY" } };
		const mockEmpty = scripted([]);
		const repoEmpty = new GitHubRepository(new GitHubClient({ token: "t", fetch: mockEmpty.fetch }), "owner", "repo");
		const emptyResults = await pushSecrets({
			vault,
			pushMap: pushMapOther,
			repoSlug: "owner/repo",
			repository: repoEmpty,
		});
		expect(emptyResults).toHaveLength(0);
	});
});
