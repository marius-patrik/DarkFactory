import { describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runCiCli } from "../../src/ci/cli.ts";
import { json, scripted } from "../github/helpers.ts";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository } from "../../src/github/repository.ts";

describe("df ci CLI commands", () => {
	it("executes install and doctor CLI commands", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-cli-"));
		try {
			await mkdir(join(temp, ".darkfactory"), { recursive: true });
			await writeFile(
				join(temp, ".darkfactory", "ci.json"),
				JSON.stringify({
					checks: [{ name: "ci-pipeline", required: true, workflow: "ci.yml" }],
				}),
			);

			// df ci install --repo <temp>
			const installOutput: string[] = [];
			await runCiCli(["install", "--repo", temp], { log: (s) => installOutput.push(s) });
			expect(installOutput.join("\n")).toContain("Installed");

			// df ci doctor --repo <temp> --offline
			const doctorOutput: string[] = [];
			const code = await runCiCli(["doctor", "--repo", temp, "--offline"], {
				log: (s) => doctorOutput.push(s),
			});
			expect(code).toBe(0);
			expect(doctorOutput.join("\n")).toContain("Config");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("executes status CLI command with mock repo", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-cli-"));
		try {
			await mkdir(join(temp, ".darkfactory"), { recursive: true });
			await writeFile(
				join(temp, ".darkfactory", "ci.json"),
				JSON.stringify({
					checks: [{ name: "ci-pipeline", required: true, workflow: "ci.yml" }],
				}),
			);

			const { fetch } = scripted([
				// check runs
				json({
					check_runs: [{ name: "ci-pipeline", status: "completed", conclusion: "success" }],
				}),
				// statuses
				json({ statuses: [] }),
			]);
			const client = new GitHubClient({ token: "test", fetch });
			const repo = new GitHubRepository(client, "owner", "repo");

			const output: string[] = [];
			await runCiCli(["status", "--repo", temp, "--ref", "main", "--json"], {
				repo,
				log: (s) => output.push(s),
			});

			const parsed = JSON.parse(output.join(""));
			expect(parsed.state).toBe("green");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});
});
