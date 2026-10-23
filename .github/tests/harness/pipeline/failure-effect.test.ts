/**
 * The failure identity that replaced the `pipeline-failure` label test, and the election that
 * bounds repair to one run per failing run.
 *
 * The Python values this asserts were produced by running the implementation this replaces.
 */

import { describe, expect, test } from "bun:test";
import {
	CLAIM_PREFIX,
	CLAIM_SUFFIX,
	claimBody,
	claimRows,
	decideClaimElection,
	failureEffectId,
	refailureEffectId,
} from "../../src/pipeline/failure-effect.ts";

/** A failure report body, as `report-failure.yml`'s runtime writes it. */
function failureBody(workflow: string, runId: string): string {
	return `<!-- pipeline-failure: ${workflow} -->\n\nCI is red.\n\n- Run id: \`${runId}\`\n`;
}

describe("the effect identity of a failure report", () => {
	test("is the workflow and the failing run", () => {
		expect(failureEffectId(failureBody("CI", "3600000001"))).toBe("CI@3600000001");
	});

	test("a retitled issue keeps its identity", () => {
		// The marker lives in the body precisely so a human renaming the issue cannot fork it.
		const body = failureBody("CI", "3600000001");
		expect(failureEffectId(body.replace("CI is red.", "ci is red again"))).toBe("CI@3600000001");
	});

	test("an ordinary issue has no failure identity", () => {
		expect(failureEffectId("the label alone must never authorise a dispatch")).toBeUndefined();
	});

	test("a marker without a run is not an identity", () => {
		// A partial report must not be dispatched as if it named a failure.
		expect(failureEffectId("<!-- pipeline-failure: CI -->\n\nno run recorded")).toBeUndefined();
	});

	test("an empty body is not an identity", () => {
		expect(failureEffectId("")).toBeUndefined();
	});
});

describe("the effect identity of a recurrence", () => {
	test("takes its run from the comment", () => {
		expect(
			refailureEffectId(
				failureBody("CI", "3600000001"),
				"Failed again: https://github.com/o/r/actions/runs/3600000009",
			),
		).toBe("CI@https://github.com/o/r/actions/runs/3600000009");
	});

	test("the same run twice is the same identity, a different run is not", () => {
		const effect = (url: string): string | undefined =>
			refailureEffectId(failureBody("CI", "3600000001"), `Failed again: ${url}`);
		expect(effect("https://x/1")).toBe(effect("https://x/1"));
		expect(effect("https://x/1")).not.toBe(effect("https://x/2"));
	});

	test("an ordinary comment is not a recurrence", () => {
		expect(refailureEffectId(failureBody("CI", "3600000001"), "looks bad")).toBeUndefined();
	});
});

describe("reading the claims", () => {
	test("every page is read, and an unparseable page is skipped rather than fatal", () => {
		// A malformed read must not turn into a mute, which is the failure mode this exists to remove.
		const listed = [
			JSON.stringify([{ id: 99, b: "c" }]),
			"not json",
			JSON.stringify([{ id: 7, b: "c" }]),
			"",
			JSON.stringify({ not: "an array" }),
		].join("\n");
		expect(claimRows(listed)).toEqual([
			{ id: 99, body: "c" },
			{ id: 7, body: "c" },
		]);
	});

	test("the claim body is the marker both contenders post", () => {
		expect(claimBody("CI@1")).toBe(`${CLAIM_PREFIX}CI@1${CLAIM_SUFFIX}`);
		expect(claimBody("CI@1")).toBe("<!-- df-dispatch: CI@1 -->");
	});
});

describe("the election", () => {
	test("a lone run wins and dispatches", () => {
		expect(decideClaimElection("CI@1", [{ id: 99, body: claimBody("CI@1") }], true)).toBe(true);
	});

	test("a later run loses to the claim already on the issue", () => {
		// The re-file-while-the-repair-is-in-flight case: an earlier claim for the same failing run
		// is still there, so the second run must not start a second repair.
		expect(
			decideClaimElection(
				"CI@1",
				[
					{ id: 5, body: claimBody("CI@1") },
					{ id: 99, body: claimBody("CI@1") },
				],
				true,
			),
		).toBe(false);
	});

	test("two racing runs produce exactly one winner whichever observes the pair first", () => {
		const pair = [
			{ id: 5, body: claimBody("CI@1") },
			{ id: 9, body: claimBody("CI@1") },
		];
		expect(decideClaimElection("CI@1", pair, true)).toBe(false);
		expect(decideClaimElection("CI@1", [...pair].reverse(), true)).toBe(false);
	});

	test("claims of a different failure do not silence this one", () => {
		// Identity is per failing run, so a repaired-and-refailed run is not muted by the old claim.
		expect(decideClaimElection("CI@2", [{ id: 5, body: claimBody("CI@1") }], true)).toBe(true);
	});

	test("an unreadable claim set dispatches rather than muting", () => {
		expect(decideClaimElection("CI@1", [], true)).toBe(true);
	});

	test("a run that could not write its own claim does not dispatch", () => {
		expect(decideClaimElection("CI@1", [{ id: 99, body: claimBody("CI@1") }], false)).toBe(false);
	});
});
