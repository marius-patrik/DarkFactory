import { describe, expect, it } from "bun:test";
import { requiredChecksState, shouldAlert } from "../../src/ci/guard.ts";
import type { ResolvedCheck } from "../../src/ci/schema.ts";

describe("CI required checks state guard", () => {
	const checks: ResolvedCheck[] = [
		{ name: "quality", required: true, workflow: "ci.yml", job: "quality" },
		{ name: "verify-bound-issue", required: true, workflow: "verify-bound-issue.yml", job: "verify-bound-issue" },
		{ name: "preview", required: false, workflow: "preview.yml", job: "preview" },
	];

	it("returns green when all required checks completed with success", () => {
		const result = requiredChecksState(checks, [
			{ name: "quality", status: "completed", conclusion: "success" },
			{ name: "verify-bound-issue", status: "completed", conclusion: "success" },
			{ name: "preview", status: "completed", conclusion: "failure" },
		]);
		expect(result.state).toBe("green");
		expect(result.failing).toEqual([]);
		expect(result.missing).toEqual([]);
		expect(result.passed).toEqual(["quality", "verify-bound-issue"]);
	});

	it("accepts neutral or skipped required checks", () => {
		expect(
			requiredChecksState(checks, [
				{ name: "quality", status: "completed", conclusion: "skipped" },
				{ name: "verify-bound-issue", status: "completed", conclusion: "neutral" },
			]).state,
		).toBe("green");
	});

	it("returns pending for missing or running required checks", () => {
		const missing = requiredChecksState(checks, [{ name: "quality", status: "completed", conclusion: "success" }]);
		expect(missing.state).toBe("pending");
		expect(missing.missing).toEqual(["verify-bound-issue"]);

		const running = requiredChecksState(checks, [
			{ name: "quality", status: "in_progress", conclusion: null },
			{ name: "verify-bound-issue", status: "completed", conclusion: "success" },
		]);
		expect(running.pending).toEqual(["quality"]);
	});

	it("returns failed when a required check fails", () => {
		const result = requiredChecksState(checks, [
			{ name: "quality", status: "completed", conclusion: "failure" },
			{ name: "verify-bound-issue", status: "in_progress", conclusion: null },
		]);
		expect(result.state).toBe("failed");
		expect(result.failing).toEqual(["quality"]);
	});

	it("alerts only at or beyond the configured repair threshold", () => {
		expect(shouldAlert(0, 2)).toBe(false);
		expect(shouldAlert(1, 2)).toBe(false);
		expect(shouldAlert(2, 2)).toBe(true);
		expect(shouldAlert(5, undefined)).toBe(false);
	});
});
