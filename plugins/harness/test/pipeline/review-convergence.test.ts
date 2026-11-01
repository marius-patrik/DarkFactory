/**
 * The self-review convergence machine.
 *
 * The three cases are the whole contract, so each is asserted directly, and the digest is asserted
 * against the exact value the Python implementation produced for the same findings - which means a
 * change to the normalisation shows up here as a changed hash rather than as a loop that quietly
 * stops being detected.
 */

import { describe, expect, test } from "bun:test";
import {
	decideSelfReview,
	feedbackFixPayload,
	findIterationComment,
	findPriorDigest,
	fixPayload,
	fixSummaryBody,
	nextReviewPayload,
	parseReviewMarker,
	parseReviewMarkerLenient,
	reviewDigest,
} from "../../src/pipeline/review-convergence.ts";
import { parseReviewFindings, splitScopeFindings } from "../../src/pipeline/review-findings.ts";

describe("parsing a review pass into findings", () => {
	test("numbered items fold their continuation lines", () => {
		// The Python returned exactly this pair for this input.
		expect(parseReviewFindings("10. This is finding one\n  with a second line.\n20. This is finding two.")).toEqual([
			"This is finding one with a second line.",
			"This is finding two.",
		]);
	});

	test("a bullet without a space keeps its first character", () => {
		expect(parseReviewFindings("* Bullet one\n*Bullet two\n- Bullet three\n-Bullet four")).toEqual([
			"Bullet one",
			"Bullet two",
			"Bullet three",
			"Bullet four",
		]);
	});

	test("prose with no list structure is one finding", () => {
		expect(
			parseReviewFindings("This is a single prose paragraph review.\nIt has no numbered or bulleted items."),
		).toEqual(["This is a single prose paragraph review.\nIt has no numbered or bulleted items."]);
	});

	test("the clean sentinel yields no findings", () => {
		expect(parseReviewFindings("NO_FINDINGS\nEverything is clean!")).toEqual([]);
	});
});

describe("the findings digest", () => {
	test("matches the value the Python produced for the same finding", () => {
		// `tests/test_agent_runner.py` asserted this exact digest in its stuck-loop fixture, so a
		// change to normalisation shows up here as a changed hash.
		expect(reviewDigest(["Finding A"])).toBe("ec7c4a513bac4eafac51797cbd5dba57638fce97");
	});

	test("is independent of order", () => {
		expect(reviewDigest(["b", "a"])).toBe(reviewDigest(["a", "b"]));
	});

	test("is independent of surrounding whitespace and case", () => {
		expect(reviewDigest(["  Finding A  "])).toBe(reviewDigest(["finding a"]));
	});

	test("distinguishes a different finding set", () => {
		expect(reviewDigest(["Finding A"])).not.toBe(reviewDigest(["Finding B"]));
		expect(reviewDigest(["a"])).not.toBe(reviewDigest(["a", "b"]));
	});
});

describe("reading a review marker", () => {
	test("parses iteration, count and digest", () => {
		const body =
			"### Self-Review — iteration 1\n1. Finding A\n" +
			"<!-- darkfactory-self-review iteration=1 findings=1 digest=ec7c4a513bac4eafac51797cbd5dba57638fce97 -->";
		expect(parseReviewMarker(body)).toEqual({
			iteration: 1,
			findings: 1,
			digest: "ec7c4a513bac4eafac51797cbd5dba57638fce97",
		});
	});

	test("a comment with no marker parses to nothing", () => {
		expect(parseReviewMarker("just a review")).toBeUndefined();
	});

	test("the lenient read tolerates a non-hexadecimal digest", () => {
		// The fix stage must recognise its own iteration's comment rather than blocking a pull
		// request because a digest had an unexpected character in it.
		const body = "<!-- darkfactory-self-review iteration=2 findings=1 digest=ZZZ -->";
		expect(parseReviewMarker(body)).toBeUndefined();
		expect(parseReviewMarkerLenient(body)?.digest).toBe("ZZZ");
	});
});

describe("reading the prior iteration", () => {
	test("finds the digest for the iteration immediately before", () => {
		const comments = [
			"<!-- darkfactory-self-review iteration=1 findings=1 digest=aaa -->",
			"<!-- darkfactory-self-review iteration=2 findings=2 digest=bbb -->",
		];
		expect(findPriorDigest(comments, 3)).toBe("bbb");
		expect(findPriorDigest(comments, 2)).toBe("aaa");
	});

	test("iteration 1 has no predecessor", () => {
		expect(findPriorDigest([], 1)).toBeUndefined();
		expect(findPriorDigest(["<!-- darkfactory-self-review iteration=2 findings=1 digest=bbb -->"], 1)).toBeUndefined();
	});

	test("finds the newest comment carrying one iteration's marker", () => {
		const comments = [
			"<!-- darkfactory-self-review iteration=1 findings=1 digest=aaa -->",
			"a later unrelated comment",
			"<!-- darkfactory-self-review iteration=1 findings=1 digest=aaa -->",
		];
		expect(findIterationComment(comments, 1)).toBe(comments[2]);
		expect(findIterationComment(comments, 4)).toBeUndefined();
	});
});

describe("the three cases", () => {
	test("case 1: no findings is clean and continues to plan alignment", () => {
		const outcome = decideSelfReview({
			outOfScopeFiles: [],
			reviewText: "NO_FINDINGS",
			iteration: 1,
		});
		expect(outcome.decision).toBe("clean");
		expect(outcome.count).toBe(0);
		expect(outcome.display).toBe("No actionable findings.");
		expect(outcome.marker).toContain("findings=0");
	});

	test("case 2: a digest identical to iteration N-1 blocks", () => {
		// The digest here is the one the Python fixture carried, so the comparison is against the
		// same value the Python compared.
		const outcome = decideSelfReview({
			outOfScopeFiles: [],
			reviewText: "1. Finding A",
			iteration: 2,
			priorDigest: "ec7c4a513bac4eafac51797cbd5dba57638fce97",
		});
		expect(outcome.decision).toBe("blocked");
		expect(outcome.findings).toEqual(["Finding A"]);
	});

	test("case 3: a changed finding set dispatches a fix", () => {
		const outcome = decideSelfReview({
			outOfScopeFiles: [],
			reviewText: "1. Finding A\n2. Finding B",
			iteration: 1,
		});
		expect(outcome.decision).toBe("fix-dispatched");
		expect(outcome.count).toBe(2);
		expect(outcome.display).toBe("1. Finding A\n2. Finding B");
		expect(outcome.marker).toContain("findings=2");
	});

	test("case 3 also applies when a prior digest exists but differs", () => {
		const outcome = decideSelfReview({
			outOfScopeFiles: [],
			reviewText: "1. Finding A",
			iteration: 3,
			priorDigest: reviewDigest(["Something else entirely"]),
		});
		expect(outcome.decision).toBe("fix-dispatched");
	});

	test("an out-of-scope file is a finding even when the review is clean", () => {
		// The scope gate is deterministic and runs before the model, so its finding is not
		// revocable by a review that says everything is fine.
		const outcome = decideSelfReview({
			outOfScopeFiles: ["extra.py"],
			reviewText: "NO_FINDINGS",
			iteration: 1,
		});
		expect(outcome.decision).toBe("fix-dispatched");
		expect(outcome.count).toBe(1);
		expect(outcome.marker).toContain("findings=1");
	});

	test("scope findings are listed before the review's", () => {
		const outcome = decideSelfReview({
			outOfScopeFiles: ["extra.py"],
			reviewText: "1. A real finding",
			iteration: 1,
		});
		expect(outcome.findings).toEqual(["Out of scope: extra.py (not in the approved plan)", "A real finding"]);
		expect(outcome.display).toBe("1. Out of scope: extra.py (not in the approved plan)\n2. A real finding");
	});
});

describe("there is no iteration cap", () => {
	test("a review that keeps changing is dispatched at every iteration", () => {
		// A cap would stop a review that is still making progress, and would say nothing about a
		// review that is not. Convergence is decided by the digest, never by the counter.
		let priorDigest: string | undefined;
		const decisions: string[] = [];
		for (let iteration = 1; iteration <= 25; iteration += 1) {
			const outcome = decideSelfReview({
				outOfScopeFiles: [],
				reviewText: `1. Finding that changed at iteration ${iteration}`,
				iteration,
				priorDigest,
			});
			decisions.push(outcome.decision);
			priorDigest = outcome.digest;
		}
		expect(decisions).toEqual(Array.from({ length: 25 }, () => "fix-dispatched"));
	});

	test("an unchanged review blocks on the second identical iteration, at any depth", () => {
		// Convergence does not depend on how far the loop already ran.
		const fixed = { outOfScopeFiles: [], reviewText: "1. Finding A" };
		for (const iteration of [2, 7, 40]) {
			expect(
				decideSelfReview({
					...fixed,
					iteration,
					priorDigest: reviewDigest(["Finding A"]),
				}).decision,
			).toBe("blocked");
		}
	});
});

describe("stage dispatch payloads", () => {
	test("a fix carries the iteration it is fixing", () => {
		expect(fixPayload({ pr: 10, plan: 20, request: 30 }, 1)).toEqual({
			stage: "self-review-fix",
			pr: 10,
			plan: 20,
			request: 30,
			iteration: 1,
		});
	});

	test("the next review carries the incremented iteration", () => {
		expect(nextReviewPayload({ pr: 10, plan: 20, request: 30 }, 2)).toEqual({
			stage: "self-review",
			pr: 10,
			plan: 20,
			request: 30,
			iteration: 2,
		});
	});

	test("an owner-feedback revision carries the verbatim feedback", () => {
		expect(feedbackFixPayload({ pr: 10, plan: 20, request: 30 }, "use bun, not npm")).toEqual({
			stage: "pr-feedback-fix",
			pr: 10,
			plan: 20,
			request: 30,
			feedback: "use bun, not npm",
		});
	});
});

describe("a fix run's summary", () => {
	test("names the reverted files and the commit", () => {
		const body = fixSummaryBody(2, ["extra.py"], "abcdef1234567890", ["A finding"]);
		expect(body).toBe(
			"### Self-Review fixes — iteration 2\n\n" +
				"Reverted out-of-scope files (extra.py) in commit abcdef1.\n\n" +
				"Applied fixes for findings:\n- A finding",
		);
	});

	test("a fix that reverted nothing says so", () => {
		expect(fixSummaryBody(1, [], undefined, ["A finding"])).toContain("Applied fixes for findings:\n- A finding");
		expect(fixSummaryBody(1, [], undefined, [])).toContain("No fixes required.");
	});
});

describe("splitting scope findings from the rest", () => {
	test("a scope finding yields its path", () => {
		expect(
			splitScopeFindings(["Out of scope: extra.py (not in the approved plan)", "Bug in auth.py: handle None"]),
		).toEqual({ outOfScope: ["extra.py"], other: ["Bug in auth.py: handle None"] });
	});

	test("a finding that merely mentions the words is not a scope finding", () => {
		expect(splitScopeFindings(["Out of scope detection is missing"])).toEqual({
			outOfScope: [],
			other: ["Out of scope detection is missing"],
		});
	});
});
