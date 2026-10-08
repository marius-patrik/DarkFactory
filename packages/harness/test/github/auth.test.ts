import { expect, test } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
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

/**
 * A PKCS#1 PEM, generated fresh.
 *
 * `node:crypto` rather than `jose`, because `jose` cannot emit the format - and a fixture produced by
 * the library under test would prove nothing about what it accepts. `openssl` was tried first and
 * produced an empty string on CI while working locally, which is the worst kind of fixture: green on a
 * laptop and red in the run that matters.
 */
function generatePkcs1Key(): string {
	return generateKeyPairSync("rsa", {
		modulusLength: 2048,
		privateKeyEncoding: { type: "pkcs1", format: "pem" },
		publicKeyEncoding: { type: "spki", format: "pem" },
	}).privateKey;
}

/**
 * The second live failure, same message as the first:
 *
 *   "pkcs8" must be PKCS#8 formatted string
 *
 * GitHub's App UI downloads a key in PKCS#1 (`BEGIN RSA PRIVATE KEY`) and `jose`'s `importPKCS8` accepts
 * only PKCS#8. `actions/create-github-app-token` does not mind, which is why every other workflow works.
 *
 */
test("a PKCS#1 private key, as GitHub's UI issues it, mints a token", async () => {
	// A real key, never a committed fixture: a private key in a repository is a credential in a
	// repository, and a throwaway generated per run is worth the seconds it costs. 2048 bits, because
	// that is what GitHub issues and what RS256 requires - a 1024-bit key is refused by the signer
	// before the format ever matters, which is a different failure from the one being covered.
	const pkcs1 = generatePkcs1Key();
	expect(pkcs1).toContain("BEGIN RSA PRIVATE KEY");

	const token = `ghs_${"p".repeat(300)}`;
	const mock = scripted([json({ token, expires_at: "2030-01-01T00:00:00Z" })]);
	const provider = new AppInstallationTokenProvider(
		{ appId: "1", privateKey: pkcs1, owner: "o", repo: "r", installationId: 5 },
		{ fetch: mock.fetch, now: () => new Date("2029-01-01T00:00:00Z") },
	);

	expect(await provider.getToken()).toBe(token);
});

test("a PKCS#1 key with escaped newlines is converted too", async () => {
	// Both differences at once, which is what the secret actually holds: the format GitHub issued and
	// the escaping the storage guidance asks for.
	const escaped = generatePkcs1Key().replace(/\n/gu, "\\n");

	const normalised = normalisePrivateKey(escaped);
	expect(normalised).toContain("BEGIN PRIVATE KEY");
	expect(normalised).not.toContain("BEGIN RSA PRIVATE KEY");
	expect(normalised).not.toContain("\\n");
});

test("a PKCS#8 key never passes through the converter", async () => {
	// The converter rewrites the key, so a PKCS#8 key taking that path would be a needless
	// re-encoding on every mint. Asserted on the round-trip rather than on the implementation.
	const { privateKey } = await generateKeyPair("RS256", { extractable: true });
	const pem = await exportPKCS8(privateKey);

	expect(normalisePrivateKey(pem)).toBe(pem);
});

test("a key node:crypto cannot parse is refused rather than reshaped", async () => {
	// The failure mode worth ruling out: a function that turns unparseable input into something
	// that merely looks like a key. The throw is the answer, and it names the shape it choked on.
	expect(() =>
		normalisePrivateKey("-----BEGIN RSA PRIVATE KEY-----\nnot base64\n-----END RSA PRIVATE KEY-----\n"),
	).toThrow();
});

/**
 * The third live failure, from the sweep's first run against real GitHub:
 *
 *   A JSON web token could not be decoded
 *
 * `GET /app/installations` is JWT-only. The sweep was authenticating with
 * `AppInstallationTokenProvider.getToken()`, which returns an *installation access token* - a `ghs_`
 * opaque string. It is not a JWT, so GitHub could not decode it, and the message names the token
 * rather than the credential choice that caused it.
 *
 * These assert the two are different things rather than interchangeable ones, because the temptation
 * with an endpoint that returns 401 is to make the existing method do both.
 */
test("getAppJwt returns a decodable JWT and getToken returns an opaque token", async () => {
	const { privateKey } = await generateKeyPair("RS256", { extractable: true });
	const pem = await exportPKCS8(privateKey);
	const mock = scripted([json({ token: "ghs_opaque_value", expires_at: "2030-01-01T00:00:00Z" })]);
	const provider = new AppInstallationTokenProvider(
		{ appId: "4861004", privateKey: pem, owner: "o", repo: "r", installationId: 5 },
		{ fetch: mock.fetch, now: () => new Date("2029-01-01T00:00:00Z") },
	);

	const jwt = await provider.getAppJwt();

	// A JWT is three base64url segments; the second decodes to the claims GitHub reads.
	const segments = jwt.split(".");
	expect(segments).toHaveLength(3);
	const claims = JSON.parse(Buffer.from(segments[1] ?? "", "base64url").toString()) as { iss?: string };
	expect(claims.iss).toBe("4861004");

	// And the two are not the same credential: an installation token is opaque and does not decode.
	const token = await provider.getToken();
	expect(token).toBe("ghs_opaque_value");
	expect(token.split(".")).toHaveLength(1);
});

test("getAppJwt spends no API call, where getToken must", async () => {
	// The JWT is signed locally; only the exchange for an installation token is a request. A caller
	// enumerating installations on a schedule should not spend a rate-limited call to prove its key
	// still works.
	const { privateKey } = await generateKeyPair("RS256", { extractable: true });
	const pem = await exportPKCS8(privateKey);
	const mock = scripted([json({ token: "ghs_t", expires_at: "2030-01-01T00:00:00Z" })]);
	const provider = new AppInstallationTokenProvider(
		{ appId: "1", privateKey: pem, owner: "o", repo: "r", installationId: 5 },
		{ fetch: mock.fetch, now: () => new Date("2029-01-01T00:00:00Z") },
	);

	await provider.getAppJwt();
	expect(mock.calls).toHaveLength(0);
	await provider.getToken();
	expect(mock.calls).toHaveLength(1);
});

test("getAppJwt signs a fresh token rather than caching one past its window", async () => {
	// GitHub caps a JWT at ten minutes. A cached one used after that fails as an opaque authentication
	// error, which is indistinguishable from a revoked key - so it is signed per call, and the two
	// `iat` values differ.
	const { privateKey } = await generateKeyPair("RS256", { extractable: true });
	const pem = await exportPKCS8(privateKey);
	let clock = Date.parse("2029-01-01T00:00:00Z");
	const provider = new AppInstallationTokenProvider(
		{ appId: "1", privateKey: pem, owner: "o", repo: "r", installationId: 5 },
		{ now: () => new Date(clock) },
	);

	const first = await provider.getAppJwt();
	clock += 60_000;
	const second = await provider.getAppJwt();

	expect(first).not.toBe(second);
});
