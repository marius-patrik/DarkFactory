import { describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCiCli } from "../src/ci.ts";
import { GitHubClient } from "../../harness/src/github/client.ts";
import { GitHubRepository } from "../../harness/src/github/repository.ts";
import { json, scripted } from "../../harness/test/github/helpers.ts";

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
			expect(code).toBe(1);
			expect(doctorOutput.join("\n")).toContain("Repository:");
			expect(doctorOutput.join("\n")).not.toContain("Config:");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("rejects a green matrix when no executable actions are detected", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-empty-"));
		try {
			const output: string[] = [];
			const errors: string[] = [];
			const code = await runCiCli(["matrix", "--repo", temp], {
				log: (line) => output.push(line),
				error: (line) => errors.push(line),
			});
			expect(code).toBe(1);
			expect(JSON.parse(output.join("\\n")).matrix).toEqual([]);
			expect(errors.join("\\n")).toContain("No executable quality actions");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("rejects incomplete required action coverage even with executable rows", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-gaps-"));
		try {
			await writeFile(join(temp, "package.json"), JSON.stringify({ name: "consumer" }));
			const output: string[] = [];
			const errors: string[] = [];
			const code = await runCiCli(["matrix", "--repo", temp], {
				log: (line) => output.push(line),
				error: (line) => errors.push(line),
			});
			const matrix = JSON.parse(output.join("\\n"));
			expect(matrix.matrix.length).toBeGreaterThan(0);
			expect(matrix.gaps.some((gap: { kind: string }) => gap.kind === "test")).toBe(true);
			expect(code).toBe(1);
			expect(errors.join("\\n")).toContain("Uncovered required quality actions");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("accepts executable quality coverage when mandatory package actions are present", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-covered-"));
		try {
			await writeFile(join(temp, "package.json"), JSON.stringify({ name: "consumer", scripts: { test: "bun test" } }));
			const errors: string[] = [];
			const code = await runCiCli(["matrix", "--repo", temp], {
				log: () => {},
				error: (line) => errors.push(line),
			});
			expect(code).toBe(0);
			expect(errors).toEqual([]);
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("refuses to execute green direct quality when coverage is empty or incomplete", async () => {
		for (const incomplete of [false, true]) {
			const temp = await mkdtemp(join(tmpdir(), incomplete ? "df-quality-gaps-" : "df-quality-empty-"));
			try {
				if (incomplete) await writeFile(join(temp, "package.json"), JSON.stringify({ name: "consumer" }));
				const errors: string[] = [];
				const output: string[] = [];
				const code = await runCiCli(["quality", "--repo", temp, "--json"], {
					log: (line) => output.push(line),
					error: (line) => errors.push(line),
				});
				expect(code).toBe(1);
				expect(output).toHaveLength(1);
				const details = JSON.parse(output[0]!);
				expect(details.executions).toEqual([]);
				expect(details.error).toContain(
					incomplete ? "Uncovered required quality actions" : "No executable quality actions",
				);
				expect(errors.join("\n")).toContain(
					incomplete ? "Uncovered required quality actions" : "No executable quality actions",
				);
			} finally {
				await rm(temp, { recursive: true, force: true });
			}
		}
	});

	it("refuses green status and branch protection when required quality coverage is absent", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-uncovered-status-"));
		try {
			const { fetch } = scripted([]);
			const repo = new GitHubRepository(new GitHubClient({ token: "test", fetch }), "owner", "repo");
			for (const command of ["status", "protect"]) {
				const errors: string[] = [];
				const exitCode = await runCiCli([command, "--repo", temp, "--verify"], {
					repo,
					log: () => undefined,
					error: (message) => errors.push(message),
				});
				expect(exitCode).toBe(1);
				expect(errors.join("\n")).toContain("No executable quality actions");
			}
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("executes status with detector-derived required checks", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-cli-"));
		try {
			await writeFile(join(temp, "package.json"), JSON.stringify({ name: "consumer", scripts: { test: "bun test" } }));
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
