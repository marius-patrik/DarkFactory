import { expect, test } from "bun:test";
const sodium: typeof import("libsodium-wrappers") = require("libsodium-wrappers");
import { GitHubRepository } from "../../src/github/repository.ts";
import { GitHubClient } from "../../src/github/client.ts";
import { json, scripted } from "./helpers.ts";

test("repository and environment secrets use sealed boxes and never send plaintext", async () => {
	await sodium.ready;
	const key = sodium.crypto_box_keypair();
	const mock = scripted([
		json({ key_id: "kid", key: sodium.to_base64(key.publicKey, sodium.base64_variants.ORIGINAL) }),
		json(undefined, 204),
		json({ key_id: "ekid", key: sodium.to_base64(key.publicKey, sodium.base64_variants.ORIGINAL) }),
		json(undefined, 204),
	]);
	const repo = new GitHubRepository(new GitHubClient({ token: "t", fetch: mock.fetch }), "o", "r");
	await repo.setRepositorySecret("API_KEY", "plain-secret");
	await repo.setEnvironmentSecret("prod/name", "API_KEY", "plain-secret");
	const bodies = mock.calls.filter((c) => c.init?.body).map((c) => String(c.init!.body));
	expect(bodies.join(" ")).not.toContain("plain-secret");
	const encrypted = sodium.from_base64(JSON.parse(bodies[0]!).encrypted_value, sodium.base64_variants.ORIGINAL);
	expect(sodium.to_string(sodium.crypto_box_seal_open(encrypted, key.publicKey, key.privateKey))).toBe("plain-secret");
	expect(mock.calls[2]!.url).toContain("environments/prod%2Fname/secrets/public-key");
});
