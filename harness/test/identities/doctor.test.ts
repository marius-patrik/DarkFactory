import { describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkDoctorIdentities, runDoctorIdentities } from "../../src/identities/index.ts";

describe("doctor identities", () => {
	it("succeeds when all providers in defaultChain have identity entries", async () => {
		const tempDir = await mkdtemp(join(tmpdir(), "df-doctor-test-"));
		const configPath = join(tempDir, "config.json");
		const manifestPath = join(tempDir, "manifest.json");

		try {
			await writeFile(
				configPath,
				JSON.stringify({
					defaultChain: "google/gemini-3.8-flash@default,claude/claude-3-5-sonnet@default",
				}),
			);

			await writeFile(
				manifestPath,
				JSON.stringify({
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
		const configPath = join(tempDir, "config.json");
		const manifestPath = join(tempDir, "manifest.json");

		try {
			await writeFile(
				configPath,
				JSON.stringify({
					defaultChain: "google/gemini-3.8-flash@default,missing-provider/model-x@default",
				}),
			);

			await writeFile(
				manifestPath,
				JSON.stringify({
					identities: {
						app: { login: "darkfactory-pipeline[bot]", user_id: 326069535 },
						google: {
							name: "Gemini",
							trailer: "Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
							verified: true,
						},
					},
				}),
			);

			const result = await checkDoctorIdentities({ configPath, manifestPath });
			expect(result.ok).toBe(false);
			expect(result.missingProviders).toEqual(["missing-provider"]);

			// runDoctorIdentities should throw error
			expect(
				runDoctorIdentities(["--config", configPath, "--manifest", manifestPath]),
			).rejects.toThrow("missing-provider");
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});
});
