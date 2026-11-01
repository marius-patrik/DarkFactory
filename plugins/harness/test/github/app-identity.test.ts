import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { exportPKCS8, generateKeyPair } from "jose";
import { AppInstallationTokenProvider, appIdentityFromManifest } from "../../../keychain/src/index.ts";
import { json, scripted } from "./helpers.ts";
import { repoRoot } from "../ci/pipeline-source.ts";

/**
 * `appIdentityFromManifest` is the seam the App-token sweep will resolve its identity through, and
 * until now nothing called it with this repository's own configuration: the only test supplied a
 * hand-built object using the flat permission shape, which is not the shape `repo.dfconfig` declares.
 *
 * Both failures below were confirmed by running this function against the real document before it
 * was fixed, so neither is hypothetical:
 *
 *   whole document → ZodError at ["app"]: expected object, received undefined
 *   repo block     → ZodError at ["app","permissions","repository"]: expected "read"|"write"
 *
 * The first because the function wanted the `repo` block while being handed the whole
 * `repo.dfconfig`. The second because the schema described permissions as a flat record where the
 * declaration nests them under `repository` and `organization`.
 */
test("resolves the App identity from this repository's own repo.dfconfig", async () => {
	const document = JSON.parse(readFileSync(join(repoRoot, "repo.dfconfig"), "utf8")) as {
		repo: unknown;
	};

	const identity = await appIdentityFromManifest(
		document,
		"marius-patrik/DarkFactory",
		() => "-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n-----END PRIVATE KEY-----\n",
	);

	expect(identity.appId).toBe("4861004");
	expect(identity.privateKeySecret).toBe("DARKFACTORY_APP_PRIVATE_KEY");
	expect(identity.privateKey).toContain("PRIVATE KEY");
	expect(identity.owner).toBe("marius-patrik");
	expect(identity.repo).toBe("DarkFactory");
	// The slug is declared, so the bot login is derived rather than guessed at by the caller.
	expect(identity.botLogin).toBe("darkfactory-pipeline[bot]");
	expect(identity.installationId).toBe(159771550);
});

test("accepts the repo block on its own as well as the whole document", async () => {
	// Two call sites want different things: the sweep reads the document off disk, while code
	// holding an already-extracted `repo` block should not have to reassemble a wrapper for it.
	// The two shapes differ only in depth, so accepting both costs one union rather than two
	// functions, and guessing wrong fails at runtime rather than at the type.
	const document = JSON.parse(readFileSync(join(repoRoot, "repo.dfconfig"), "utf8")) as {
		repo: { app: unknown };
	};

	const fromBlock = await appIdentityFromManifest(document.repo, "marius-patrik/DarkFactory", () => "pem");

	expect(fromBlock.appId).toBe("4861004");
	expect(fromBlock.privateKeySecret).toBe("DARKFACTORY_APP_PRIVATE_KEY");
});

test("keeps the nested repository permissions readable rather than flattening them", async () => {
	// `repo.dfconfig` declares permissions as {repository: {...}, organization: {...}}, matching the
	// shape GitHub's manifest expects. Flattening it would change which permission a key refers to -
	// `contents: write` under `repository` is not the same grant as `contents` at the top level - so
	// the nested record is preserved and only the levels GitHub accepts are carried through.
	const document = JSON.parse(readFileSync(join(repoRoot, "repo.dfconfig"), "utf8")) as {
		repo: { app: { permissions: Record<string, Record<string, string>> } };
	};

	const identity = await appIdentityFromManifest({ repo: document.repo }, "marius-patrik/DarkFactory", () => "pem");

	// A nested declaration becomes `permissions_by_level` and nothing else. Flattening it to the
	// repository level would drop `organization.projects` without saying so, and a token minted
	// without it fails later at a board write rather than here, where it is still correctable.
	expect(identity.permissions).toBeUndefined();
	expect(identity.permissionsByLevel).toEqual({
		repository: {
			actions: "write",
			checks: "write",
			contents: "write",
			issues: "write",
			metadata: "read",
			pull_requests: "write",
			workflows: "write",
		},
		organization: { projects: "write" },
	});
});

test("sends both permission forms on the token request", async () => {
	// The mint is where the two forms meet GitHub, and a wrong shape here is a 422 at runtime rather
	// than a failed assertion. The body is asserted because this is the one place the resolved
	// identity becomes a request: `permissions_by_level` is what carries the nested declaration, and
	// dropping it would silently mint a token with less than the App granted.
	const { privateKey } = await generateKeyPair("RS256", { extractable: true });
	const pem = await exportPKCS8(privateKey);
	const document = JSON.parse(readFileSync(join(repoRoot, "repo.dfconfig"), "utf8")) as { repo: unknown };
	const identity = await appIdentityFromManifest(document.repo, "marius-patrik/DarkFactory", () => pem);
	const mock = scripted([json({ token: "ghs_opaque", expires_at: "2030-01-01T00:00:00Z" })]);
	const provider = new AppInstallationTokenProvider(identity, {
		fetch: mock.fetch,
		now: () => new Date("2029-01-01T00:00:00Z"),
	});

	await provider.getToken();

	const body = JSON.parse(String(mock.calls[0]?.init?.body)) as {
		permissions?: unknown;
		permissions_by_level?: Record<string, Record<string, string>>;
	};
	expect(body.permissions_by_level).toMatchObject({
		repository: { contents: "write", workflows: "write" },
		organization: { projects: "write" },
	});
	// Nothing is invented: a nested declaration has no flat equivalent, so no flat form is claimed.
	expect(body.permissions ?? {}).toEqual({});
});

test("a narrow flat declaration still mints without a level", async () => {
	// The other shape stays supported. "issues write" on its own is a legitimate request - the App
	// may hold more than the caller wants this token to do - and refusing it would leave a caller who
	// wants a narrow token with no way to ask for one. A flat declaration passes through as the flat
	// form and no level is named, because there is no level to name.
	const identity = await appIdentityFromManifest(
		{
			app_id: 1,
			private_key_secret: "S",
			permissions: { issues: "write" },
		},
		"o/r",
		() => "pem",
	);
	expect(identity.permissions).toEqual({ issues: "write" });
	expect(identity.permissionsByLevel).toBeUndefined();
});

test("names which block was missing rather than reporting a path the caller never used", async () => {
	// The failure mode a `z.union` of wrapper shapes produces: because the schema is `.passthrough()`,
	// the bare-App branch accepts almost anything, and the error names `repo.app_id` for a caller who
	// never passed a `repo` at all. The walk reports the depth it reached instead.
	await expect(appIdentityFromManifest({ repo: { license: { spdx: "MIT" } } }, "o/r", () => "pem")).rejects.toThrow(
		/repo\.app/,
	);
	await expect(appIdentityFromManifest({}, "o/r", () => "pem")).rejects.toThrow(/no usable repo\.app block/);
});
