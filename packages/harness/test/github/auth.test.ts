import { expect, test } from "bun:test";
import { exportPKCS8, generateKeyPair } from "jose";
import {
	AppInstallationTokenProvider,
	appIdentityFromManifest,
	normalisePrivateKey,
	resolveGitHubCredential,
} from "../../../keychain/src/index.ts";
import { GitHubClient } from "../../src/github/client.ts";
import { json, scripted } from "./helpers.ts";

test("App JWT resolves installation and single-flights a long opaque token", async () => {
	const { privateKey } = await generateKeyPair("RS256", { extractable: true });
	const pem = await exportPKCS8(privateKey);
	const token = `ghs_${"z".repeat(520)}`;
	const mock = scripted([json({ id: 77 }), json({ token, expires_at: "2030-01-01T00:00:00Z" })]);
	const provider = new AppInstallationTokenProvider(
		{ appId: "4861004", privateKey: pem, owner: "o", repo: "r", permissions: { issues: "write" } },
		{ fetch: mock.fetch, now: () => new Date("2029-01-01T00:00:00Z") },
	);
	const [a, b] = await Promise.all([provider.getToken(), provider.getToken()]);
	expect(a).toBe(token);
	expect(b).toBe(token);
	expect(mock.calls).toHaveLength(2);
	expect(new Headers(mock.calls[0]?.init?.headers).get("authorization")).toStartWith("Bearer ey");
});

test("manifest app identity wins, with explicit PAT and GH_TOKEN fallback", async () => {
	const app = await appIdentityFromManifest(
		{
			app: {
				app_id: 4861004,
				slug: "darkfactory-pipeline",
				private_key_secret: "DARKFACTORY_APP_PRIVATE_KEY",
				permissions: { issues: "write" },
			},
		},
		"o/r",
		(name) => (name === "DARKFACTORY_APP_PRIVATE_KEY" ? "pem" : ""),
	);
	expect(app.botLogin).toBe("darkfactory-pipeline[bot]");
	expect((await resolveGitHubCredential({ token: "pat-any-shape" }, {})).token).toBe("pat-any-shape");
	expect((await resolveGitHubCredential({}, { GH_TOKEN: "env-opaque" })).token).toBe("env-opaque");
	expect(() => new GitHubClient({ token: "" })).toThrow();
});

/**
 * The live failure this covers: the sweep failed on its first run with
 *
 *   "pkcs8" must be PKCS#8 formatted string
 *
 * GitHub's own guidance for storing an App key is to keep the `\n` sequences escaped so the secret
 * survives a copy-paste, and every workflow reads the key that way - which is why
 * `actions/create-github-app-token` works and this did not. That action unescapes before signing;
 * `jose` does not. The error names base64 rather than the newline, so the cause is not readable from
 * the message.
 */
test("a private key whose newlines are escaped still mints a token", async () => {
	const { privateKey } = await generateKeyPair("RS256", { extractable: true });
	// The shape the secret actually holds: real newlines stored as the two characters `\` and `n`.
	const escaped = (await exportPKCS8(privateKey)).replace(/\n/gu, "\\n");
	expect(escaped).toContain("\\n");

	const token = `ghs_${"y".repeat(400)}`;
	const mock = scripted([json({ token, expires_at: "2030-01-01T00:00:00Z" })]);
	const provider = new AppInstallationTokenProvider(
		{ appId: "1", privateKey: escaped, owner: "o", repo: "r", installationId: 5 },
		{ fetch: mock.fetch, now: () => new Date("2029-01-01T00:00:00Z") },
	);

	expect(await provider.getToken()).toBe(token);
});

test("a private key with real newlines is left exactly as it is", async () => {
	// The opposite failure, and the one the first attempt at this fix produced: rewriting the envelope
	// by index arithmetic changed a key that was already correct. Nothing local would have caught it -
	// the key is wrong everywhere it is used, and the workflow that reads it only fails on a schedule.
	const { privateKey } = await generateKeyPair("RS256", { extractable: true });
	const pem = await exportPKCS8(privateKey);

	expect(normalisePrivateKey(pem)).toBe(pem);
});

test("something that is not a PEM is returned untouched, for the signer to reject", async () => {
	// Not normalised into looking more valid than it is. Deciding usability is the signer's job, and a
	// function that reshaped arbitrary input would be the wrong place to find out.
	expect(normalisePrivateKey("not a key")).toBe("not a key");
	expect(normalisePrivateKey("")).toBe("");
});
