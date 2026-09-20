import { describe, expect, it } from "bun:test";
import { requiredChecksState, shouldAlert } from "../../src/ci/guard.ts";
import type { CiConfig } from "../../src/ci/schema.ts";

describe("CI required checks state guard & alert_after", () => {
	const config: CiConfig = {
		alert_after: 2,
		checks: [
			{ name: "ci-pipeline", required: true, workflow: "ci.yml", job: "pipeline" },
			{ name: "verify-bound-issue", required: true, workflow: "verify-bound-issue.yml", job: "verify-bound-issue" },
			{ name: "optional-lint", required: false, workflow: "lint.yml", job: "lint" },
		],
	};

	it("returns green when all required checks completed with success", () => {
		const checkRuns = [
			{ name: "ci-pipeline", status: "completed", conclusion: "success" },
			{ name: "verify-bound-issue", status: "completed", conclusion: "success" },
			{ name: "optional-lint", status: "completed", conclusion: "failure" }, // optional failure ignored
		];

		const result = requiredChecksState(config, checkRuns);
		expect(result.state).toBe("green");
		expect(result.failing).toEqual([]);
		expect(result.pending).toEqual([]);
		expect(result.missing).toEqual([]);
		expect(result.passed).toContain("ci-pipeline");
		expect(result.passed).toContain("verify-bound-issue");
	});

	it("returns green when required checks completed with neutral or skipped", () => {
		const checkRuns = [
			{ name: "ci-pipeline", status: "completed", conclusion: "skipped" },
			{ name: "verify-bound-issue", status: "completed", conclusion: "neutral" },
		];

		const result = requiredChecksState(config, checkRuns);
		expect(result.state).toBe("green");
		expect(result.passed).toContain("ci-pipeline");
		expect(result.passed).toContain("verify-bound-issue");
	});

	it("returns pending when a required check is missing", () => {
		const checkRuns = [{ name: "ci-pipeline", status: "completed", conclusion: "success" }];

		const result = requiredChecksState(config, checkRuns);
		expect(result.state).toBe("pending");
		expect(result.missing).toEqual(["verify-bound-issue"]);
		expect(result.pending).toEqual(["verify-bound-issue"]);
	});

	it("returns pending when a required check is queued or in_progress", () => {
		const checkRuns = [
			{ name: "ci-pipeline", status: "in_progress", conclusion: null },
			{ name: "verify-bound-issue", status: "completed", conclusion: "success" },
		];

		const result = requiredChecksState(config, checkRuns);
		expect(result.state).toBe("pending");
		expect(result.pending).toEqual(["ci-pipeline"]);
	});

	it("returns failed when any required check fails, listing failing checks", () => {
		const checkRuns = [
			{ name: "ci-pipeline", status: "completed", conclusion: "failure" },
			{ name: "verify-bound-issue", status: "in_progress", conclusion: null },
		];

		const result = requiredChecksState(config, checkRuns);
		expect(result.state).toBe("failed");
		expect(result.failing).toEqual(["ci-pipeline"]);
	});

	it("handles per-repo overrides in requiredChecksState", () => {
		const configWithOverride: CiConfig = {
			checks: [
				{
					name: "ci-pipeline",
					required: true,
					workflow: "ci.yml",
					job: "pipeline",
					per_repo: { "special/repo": { required: false } },
				},
				{ name: "verify-bound-issue", required: true, workflow: "verify-pr.yml" },
			],
		};

		const checkRuns = [{ name: "verify-bound-issue", status: "completed", conclusion: "success" }];

		const regular = requiredChecksState(configWithOverride, checkRuns);
		expect(regular.state).toBe("pending"); // missing ci-pipeline

		const special = requiredChecksState(configWithOverride, checkRuns, "special/repo");
		expect(special.state).toBe("green"); // ci-pipeline is not required for special/repo
	});

	it("shouldAlert emits alert only when repairCount >= alertAfter", () => {
		expect(shouldAlert(0, 2)).toBe(false);
		expect(shouldAlert(1, 2)).toBe(false);
		expect(shouldAlert(2, 2)).toBe(true);
		expect(shouldAlert(5, 2)).toBe(true);
		expect(shouldAlert(5, undefined)).toBe(false);
	});
});
