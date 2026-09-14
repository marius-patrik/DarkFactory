import { describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository } from "../../src/github/repository.ts";
import { json, scripted } from "../github/helpers.ts";
import { installWorkflows } from "../../src/ci/installer.ts";
import { runCiDoctor } from "../../src/ci/doctor.ts";

describe("df ci doctor", () => {
	it("passes when config is valid, managed files in sync, and protection matches", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-doctor-"));
		try {
			await mkdir(join(temp, ".darkfactory"), { recursive: true });
			await writeFile(
				join(temp, ".darkfactory", "ci.json"),
				JSON.stringify({
					alert_after: 2,
					checks: [
						{ name: "ci-pipeline", required: true, workflow: "ci.yml" },
						{ name: "verify-bound-issue", required: true, workflow: "verify-bound-issue.yml" },
					],
				})
			);
			await installWorkflows(temp);

			const { fetch } = scripted([
				// Rulesets lookup 404
				json({ message: "Not Found" }, 404),
				// Classic branch protection returns matching checks
				json({ strict: true, contexts: ["ci-pipeline", "verify-bound-issue"] }, 200),
			]);
			const client = new GitHubClient({ token: "fake-token", fetch });
			const repo = new GitHubRepository(client, "owner", "repo");

			const result = await runCiDoctor(temp, repo);
			expect(result.ok).toBe(true);
			expect(result.checks.config.status).toBe("pass");
			expect(result.checks.workflows.status).toBe("pass");
			expect(result.checks.protection.status).toBe("pass");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("detects errors when config is missing or invalid", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-doctor-"));
		try {
			const result = await runCiDoctor(temp);
			expect(result.ok).toBe(false);
			expect(result.checks.config.status).toBe("fail");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("detects errors when managed files have drift", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-doctor-"));
		try {
			await mkdir(join(temp, ".darkfactory"), { recursive: true });
			await writeFile(
				join(temp, ".darkfactory", "ci.json"),
				JSON.stringify({
					checks: [{ name: "ci-pipeline", required: true, workflow: "ci.yml" }],
				})
			);
			await installWorkflows(temp);

			// Tamper with one workflow
			const ciPath = join(temp, ".github", "workflows", "ci.yml");
			const content = await Bun.file(ciPath).text();
			await writeFile(ciPath, content + "\n# drift\n");

			const result = await runCiDoctor(temp);
			expect(result.ok).toBe(false);
			expect(result.checks.workflows.status).toBe("fail");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});
});
