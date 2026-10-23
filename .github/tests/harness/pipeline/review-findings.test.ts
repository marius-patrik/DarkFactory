import { describe, expect, test } from "bun:test";
import { parseReviewFindings } from "../../src/pipeline/review-findings.ts";

describe("parseReviewFindings", () => {
	test("numbered multi-line items become one finding each, with the prefix stripped", () => {
		const text = "10. This is finding one\n  with a second line.\n20. This is finding two.";
		expect(parseReviewFindings(text)).toEqual(["This is finding one with a second line.", "This is finding two."]);
	});

	test("bullets do not lose a character for *text/-text", () => {
		const text = "* Bullet one\n*Bullet two\n- Bullet three\n-Bullet four";
		expect(parseReviewFindings(text)).toEqual(["Bullet one", "Bullet two", "Bullet three", "Bullet four"]);
	});

	test("prose becomes one finding", () => {
		const text = "This is a single prose paragraph review.\nIt has no numbered or bulleted items.";
		expect(parseReviewFindings(text)).toEqual([
			"This is a single prose paragraph review.\nIt has no numbered or bulleted items.",
		]);
	});

	test("NO_FINDINGS is the reviewer's clean verdict and yields nothing", () => {
		expect(parseReviewFindings("NO_FINDINGS\nEverything is clean!")).toEqual([]);
		expect(parseReviewFindings("  NO_FINDINGS")).toEqual([]);
	});

	test("blank lines between items do not end an item", () => {
		expect(parseReviewFindings("1. First\n\n2. Second\n")).toEqual(["First", "Second"]);
	});

	test("a heading before the first item is not a finding", () => {
		expect(parseReviewFindings("## Review\n1. First\n")).toEqual(["First"]);
	});

	test("empty output is no findings rather than one empty finding", () => {
		expect(parseReviewFindings("")).toEqual([]);
		expect(parseReviewFindings("   \n\n  ")).toEqual([]);
	});
});
