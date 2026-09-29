import { expect, test } from "bun:test";
import { AppInstallationTokenProvider, appIdentityFromManifest, resolveGitHubCredential } from "@darkfactory/keychain";
import { exportPKCS8, generateKeyPair } from "jose";
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
