import { describe, expect, it } from "bun:test";
import { laneIsGreen } from "../../src/ci/protect-when-green.ts";
import type { CheckRunItem } from "../../src/ci/schema.ts";

/**
 * The rule that makes this safe: a branch is protected only once the checks it requires have actually
 * reported green. The configuration issue gives the reason — *"protection requiring a check nothing
 * reports blocks every merge forever"* — and this is the pipeline honouring its own advice.
 */
describe("protecting a lane once its checks are green", () => {
	const checks = ["quality", "verify-bound-issue"];
	const green = (names: readonly string[]): CheckRunItem[] =>
		names.map((name) => ({ name, status: "completed", conclusion: "success" }));

	it("allows the lane when every required check reported green", () => {
		expect(laneIsGreen(checks, green(checks))).toEqual({ green: true, unmet: [] });
	});

	it("refuses while a check is still running", () => {
		// The state this exists for. Protecting now would name a check that has not concluded, and the
		// first person to open a pull request would find it unmergeable with no failing check to point at.
		const running: CheckRunItem[] = [
			{ name: "quality", status: "in_progress", conclusion: null },
			{ name: "verify-bound-issue", status: "completed", conclusion: "success" },
		];

		expect(laneIsGreen(checks, running)).toEqual({ green: false, unmet: ["quality"] });
	});

	it("refuses when a check has not reported at all", () => {
		// Nothing reported has not reported green. A fresh install is exactly this case, which is why the
		// answer cannot be derived from the declaration alone.
		expect(laneIsGreen(checks, green(["quality"]))).toEqual({ green: false, unmet: ["verify-bound-issue"] });
		expect(laneIsGreen(checks, []).green).toBe(false);
	});

	it("refuses when a check failed", () => {
		const failing: CheckRunItem[] = [
			{ name: "quality", status: "completed", conclusion: "failure" },
			{ name: "verify-bound-issue", status: "completed", conclusion: "success" },
		];

		expect(laneIsGreen(checks, failing)).toEqual({ green: false, unmet: ["quality"] });
	});

	it("accepts neutral and skipped as green, matching the guard's definition", () => {
		// Delegated to `requiredChecksState` precisely so this cannot drift from what the pull-request
		// guard considers satisfied. A second implementation of "green" that drifted the other way would
		// protect a repository whose required check was skipped.
		const acceptable: CheckRunItem[] = [
			{ name: "quality", status: "completed", conclusion: "neutral" },
			{ name: "verify-bound-issue", status: "completed", conclusion: "skipped" },
		];

		expect(laneIsGreen(checks, acceptable).green).toBe(true);
	});

	it("ignores checks that are not required by the lane", () => {
		// A repository's own CI reports more than its lane requires. Protecting against a check that
		// happens to be failing elsewhere would hold the branch for something the lane never named.
		const noisy: CheckRunItem[] = [...green(checks), { name: "unrelated", status: "completed", conclusion: "failure" }];

		expect(laneIsGreen(checks, noisy).green).toBe(true);
	});

	it("names every unmet check, not just the first", () => {
		// The reason is what a person reads in the configuration issue. "quality" alone would send them
		// to fix a passing check.
		expect(laneIsGreen(["a", "b", "c"], green(["a"])).unmet.sort()).toEqual(["b", "c"]);
	});
});
