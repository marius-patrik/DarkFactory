import { describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadCiConfig, resolveChecksForRepo, getRequiredCheckNames } from "../../src/ci/config.ts";

describe("CI config loader & validator", () => {
	it("loads valid .darkfactory/ci.df with checks and alert_after", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-test-"));
		try {
			await mkdir(join(temp, ".darkfactory"), { recursive: true });
			const configContent = {
				alert_after: 3,
				checks: [
					{
						name: "ci-pipeline",
						required: true,
						workflow: "ci.yml",
						job: "pipeline",
						per_repo: {
							"owner/paper-repo": { required: false },
						},
					},
					{
						name: "verify-bound-issue",
						required: true,
						workflow: "verify-bound-issue.yml",
						job: "verify-bound-issue",
					},
				],
			};
			await writeFile(join(temp, ".darkfactory", "ci.df"), JSON.stringify(configContent, null, 2));

			const config = await loadCiConfig(temp);
			expect(config.alert_after).toBe(3);
			expect(config.checks.length).toBe(2);
			expect(config.checks[0]!.name).toBe("ci-pipeline");
			expect(config.checks[0]!.required).toBe(true);
			expect(config.checks[0]!.workflow).toBe("ci.yml");
			expect(config.checks[0]!.job).toBe("pipeline");
			expect(config.checks[0]!.per_repo?.["owner/paper-repo"]?.required).toBe(false);

			const resolvedDefault = resolveChecksForRepo(config);
			expect(resolvedDefault.find((c) => c.name === "ci-pipeline")?.required).toBe(true);

			const resolvedOverride = resolveChecksForRepo(config, "owner/paper-repo");
			expect(resolvedOverride.find((c) => c.name === "ci-pipeline")?.required).toBe(false);

			expect(getRequiredCheckNames(config)).toEqual(["ci-pipeline", "verify-bound-issue"]);
			expect(getRequiredCheckNames(config, "owner/paper-repo")).toEqual(["verify-bound-issue"]);
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("loads nested ci object inside .darkfactory/ci.df", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-test-"));
		try {
			await mkdir(join(temp, ".darkfactory"), { recursive: true });
			const configContent = {
				ci: {
					alert_after: 5,
					checks: [{ name: "test-job", required: true, workflow: "ci.yml", job: "test" }],
				},
			};
			await writeFile(join(temp, ".darkfactory", "ci.df"), JSON.stringify(configContent));

			const config = await loadCiConfig(temp);
			expect(config.alert_after).toBe(5);
			expect(config.checks.length).toBe(1);
			expect(config.checks[0]!.name).toBe("test-job");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("throws helpful error when .darkfactory/ci.df has invalid schema", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-test-"));
		try {
			await mkdir(join(temp, ".darkfactory"), { recursive: true });
			// invalid: checks missing name
			await writeFile(join(temp, ".darkfactory", "ci.df"), JSON.stringify({ checks: [{ required: true }] }));
			await expect(loadCiConfig(temp)).rejects.toThrow();
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("throws helpful error when .darkfactory/ci.df does not exist", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-ci-test-"));
		try {
			await expect(loadCiConfig(temp)).rejects.toThrow(/not found/i);
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});
});
