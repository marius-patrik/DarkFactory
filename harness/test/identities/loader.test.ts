import { describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { IdentitiesValidationError, loadIdentities, validateIdentities } from "../../src/identities/index.ts";

describe("validateIdentities", () => {
	it("validates a complete and valid identities manifest", () => {
		const raw = {
			identities: {
				app: {
					slug: "darkfactory-pipeline",
					login: "darkfactory-pipeline[bot]",
					user_id: 326069535,
					commit_author_email: "326069535+darkfactory-pipeline[bot]@users.noreply.github.com",
				},
				claude: {
					name: "Claude",
					trailer: "Co-authored-by: Claude <noreply@anthropic.com>",
					note: "Generated with {model}",
					account_link: "https://github.com/claude",
					verified: true,
				},
				"grok-sub": {
					name: "Grok",
					trailer: null,
					note: "Generated with {model}",
					account_link: null,
					verified: false,
				},
			},
		};

		const result = validateIdentities(raw);
		expect(result.app.login).toBe("darkfactory-pipeline[bot]");
		expect(result.app.user_id).toBe(326069535);
		expect(result.providers["claude"]?.name).toBe("Claude");
		expect(result.providers["claude"]?.verified).toBe(true);
		expect(result.providers["claude"]?.trailer).toBe("Co-authored-by: Claude <noreply@anthropic.com>");
		expect(result.providers["grok-sub"]?.verified).toBe(false);
		expect(result.providers["grok-sub"]?.trailer).toBeNull();
	});

	it("accepts nested providers dictionary", () => {
		const raw = {
			identities: {
				app: {
					login: "darkfactory-pipeline[bot]",
					user_id: 326069535,
				},
				providers: {
					google: {
						name: "Gemini",
						trailer: "Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
						verified: true,
					},
				},
			},
		};

		const result = validateIdentities(raw);
		expect(result.providers["google"]?.name).toBe("Gemini");
		expect(result.providers["google"]?.verified).toBe(true);
	});

	it("throws IdentitiesValidationError when identities section is missing", () => {
		expect(() => validateIdentities({})).toThrow(IdentitiesValidationError);
		expect(() => validateIdentities({ other: "data" })).toThrow("identities");
	});

	it("throws IdentitiesValidationError when app identity is missing", () => {
		const raw = {
			identities: {
				claude: {
					name: "Claude",
					trailer: "Co-authored-by: Claude <noreply@anthropic.com>",
					verified: true,
				},
			},
		};

		expect(() => validateIdentities(raw)).toThrow("app");
	});

	it("throws IdentitiesValidationError when a verified provider has no trailer", () => {
		const raw = {
			identities: {
				app: { login: "darkfactory-pipeline[bot]", user_id: 326069535 },
				claude: {
					name: "Claude",
					trailer: null,
					verified: true,
				},
			},
		};

		expect(() => validateIdentities(raw)).toThrow("trailer");
	});

	it("throws IdentitiesValidationError when an unverified provider specifies a trailer", () => {
		const raw = {
			identities: {
				app: { login: "darkfactory-pipeline[bot]", user_id: 326069535 },
				grok: {
					name: "Grok",
					trailer: "Co-authored-by: Grok <grok@x.ai>",
					verified: false,
				},
			},
		};

		expect(() => validateIdentities(raw)).toThrow("unverified provider must not emit a trailer");
	});

	it("throws IdentitiesValidationError when provider is missing name/display_name", () => {
		const raw = {
			identities: {
				app: { login: "darkfactory-pipeline[bot]", user_id: 326069535 },
				claude: {
					trailer: "Co-authored-by: Claude <noreply@anthropic.com>",
					verified: true,
				},
			},
		};

		expect(() => validateIdentities(raw)).toThrow("name");
	});
});

describe("loadIdentities", () => {
	it("loads identities from a manifest file", async () => {
		const tempDir = await mkdtemp(join(tmpdir(), "identities-test-"));
		const manifestFile = join(tempDir, "manifest.json");

		try {
			await writeFile(
				manifestFile,
				JSON.stringify({
					repo: {
						identities: {
							app: { login: "darkfactory-pipeline[bot]", user_id: 326069535 },
							google: {
								name: "Gemini",
								trailer: "Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
								verified: true,
							},
						},
					},
				}),
			);

			const loaded = await loadIdentities(manifestFile);
			expect(loaded.app.login).toBe("darkfactory-pipeline[bot]");
			expect(loaded.providers["google"]?.name).toBe("Gemini");
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it("throws IdentitiesValidationError when manifest file does not exist", async () => {
		expect(loadIdentities("/non/existent/path/manifest.json")).rejects.toThrow(IdentitiesValidationError);
	});

	it("throws IdentitiesValidationError when manifest JSON is invalid", async () => {
		const tempDir = await mkdtemp(join(tmpdir(), "identities-test-"));
		const manifestFile = join(tempDir, "manifest.json");

		try {
			await writeFile(manifestFile, "{ invalid json");
			expect(loadIdentities(manifestFile)).rejects.toThrow(IdentitiesValidationError);
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});
});
