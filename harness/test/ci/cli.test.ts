import { describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCiCli } from "../../src/ci/cli.ts";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository } from "../../src/github/repository.ts";
import { json, scripted } from "../github/helpers.ts";

describe("df ci CLI commands", () => {
	it("executes install and offline doctor without ci.json", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-cli-"));
		try {
			const installOutput: string[] = [];
			await runCiCli(["install", "--repo", temp], { log: (line) => installOutput.push(line) });
			expect(installOutput.join("\n")).toContain("Installed");

			const doctorOutput: string[] = [];
			const code = await runCiCli(["doctor", "--repo", temp, "--offline"], {
				log: (line) => doctorOutput.push(line),
			});
			expect(code).toBe(0);
			expect(doctorOutput.join("\n")).toContain("Repository:");
			expect(doctorOutput.join("\n")).not.toContain("Config:");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("executes status with detector-derived required checks", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-cli-"));
		try {
			const { fetch } = scripted([
				json({
					check_runs: [
						{ name: "quality", status: "completed", conclusion: "success" },
						{ name: "verify-bound-issue", status: "completed", conclusion: "success" },
					],
				}),
				json({ statuses: [] }),
			]);
			const repo = new GitHubRepository(new GitHubClient({ token: "test", fetch }), "owner", "repo");
			const output: string[] = [];
			await runCiCli(["status", "--repo", temp, "--ref", "darkfactory", "--json"], {
				repo,
				log: (line) => output.push(line),
			});
			expect(JSON.parse(output.join("")).state).toBe("green");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});
});
