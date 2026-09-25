import { describe, expect, it } from "bun:test";

const FIXED_CHAIN = "google/gemini-3.8-flash@default,claude/claude-3-5-sonnet@default";

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkDoctorIdentities, runDoctorIdentities } from "../../src/identities/index.ts";

describe("doctor identities", () => {
	it("succeeds when all providers in defaultChain have identity entries", async () => {
		const tempDir = await mkdtemp(join(tmpdir(), "df-doctor-test-"));
		const configPath = join(tempDir, "config.df");
		const manifestPath = configPath;

		try {
			await writeFile(
				configPath,
				JSON.stringify({
					providers: { defaultChain: FIXED_CHAIN },
					repo: {
						identities: {
							app: { login: "darkfactory-pipeline[bot]", user_id: 326069535 },
							google: {
								name: "Gemini",
								trailer: "Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
								verified: true,
							},
							claude: {
								name: "Claude",
								trailer: "Co-authored-by: Claude <noreply@anthropic.com>",
								verified: true,
							},
						},
					},
				}),
			);

			const result = await checkDoctorIdentities({ configPath, manifestPath });
			expect(result.ok).toBe(true);
			expect(result.missingProviders).toEqual([]);
			expect(result.chainProviders).toEqual(["google", "claude"]);

			// runDoctorIdentities should not throw
			await runDoctorIdentities(["--config", configPath, "--manifest", manifestPath]);
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it("fails when a provider in defaultChain has no identity entry", async () => {
		const tempDir = await mkdtemp(join(tmpdir(), "df-doctor-test-"));
		const configPath = join(tempDir, "config.df");
		const manifestPath = configPath;

		try {
			await writeFile(
				configPath,
				JSON.stringify({
					providers: { defaultChain: `${FIXED_CHAIN},missing-provider/model-x@default` },
					repo: {
						identities: {
							app: { login: "darkfactory-pipeline[bot]", user_id: 326069535 },
							google: {
								name: "Gemini",
								trailer: "Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
								verified: true,
							},
							claude: {
								name: "Claude",
								trailer: "Co-authored-by: Claude <noreply@anthropic.com>",
								verified: true,
							},
						},
					},
				}),
			);

			const result = await checkDoctorIdentities({ configPath, manifestPath });
			expect(result.ok).toBe(false);
			expect(result.missingProviders).toEqual(["missing-provider"]);

			// runDoctorIdentities should throw error
			expect(runDoctorIdentities(["--config", configPath, "--manifest", manifestPath])).rejects.toThrow(
				"missing-provider",
			);
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it("passes when no chains are configured", async () => {
		const tempDir = await mkdtemp(join(tmpdir(), "df-doctor-test-"));
		const configPath = join(tempDir, "config.df");
		const manifestPath = configPath;

		try {
			await writeFile(
				configPath,
				JSON.stringify({
					providers: {},
					repo: { identities: { app: { login: "darkfactory-pipeline[bot]", user_id: 326069535 } } },
				}),
			);

			const result = await checkDoctorIdentities({ configPath, manifestPath });
			expect(result.ok).toBe(true);
			expect(result.chainProviders).toEqual([]);
			expect(result.missingProviders).toEqual([]);

			await runDoctorIdentities(["--config", configPath, "--manifest", manifestPath]);
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it("checks providers from only sensitiveChain", async () => {
		const tempDir = await mkdtemp(join(tmpdir(), "df-doctor-test-"));
		const configPath = join(tempDir, "config.df");
		const manifestPath = configPath;

		try {
			await writeFile(
				configPath,
				JSON.stringify({
					providers: { sensitiveChain: FIXED_CHAIN },
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

			const result = await checkDoctorIdentities({ configPath, manifestPath });
			expect(result.ok).toBe(false);
			expect(result.missingProviders).toEqual(["claude"]);

			await expect(runDoctorIdentities(["--config", configPath, "--manifest", manifestPath])).rejects.toThrow("claude");
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});
});
