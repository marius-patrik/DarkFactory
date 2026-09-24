import { describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCiDoctor } from "../../src/ci/doctor.ts";
import { installWorkflows } from "../../src/ci/installer.ts";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository } from "../../src/github/repository.ts";
import { json, scripted } from "../github/helpers.ts";

describe("df ci doctor", () => {
	it("passes when detected workflows and protection match", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-doctor-"));
		try {
			await installWorkflows(temp);
			const { fetch } = scripted([
				json({ message: "Not Found" }, 404),
				json({ strict: true, contexts: ["quality", "verify-bound-issue"] }, 200),
			]);
			const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
			const result = await runCiDoctor(temp, repo);
			expect(result.ok).toBe(true);
			expect(result.checks.repository.status).toBe("pass");
			expect(result.checks.workflows.status).toBe("pass");
			expect(result.checks.protection.status).toBe("pass");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("requires managed workflows but not ci.json", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-doctor-"));
		try {
			const result = await runCiDoctor(temp);
			expect(result.ok).toBe(false);
			expect(result.checks.repository.status).toBe("pass");
			expect(result.checks.workflows.status).toBe("fail");
			expect(result.checks.protection.status).toBe("skipped");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("detects managed workflow drift", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-doctor-"));
		try {
			await installWorkflows(temp);
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
