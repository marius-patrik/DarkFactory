import { describe, expect, it } from "bun:test";
import { BOUND_ISSUE_PATTERN, checkBoundIssue, findBoundIssues, renderBoundIssueReport } from "./bound-issue.ts";

// `verify-bound-issue` is a required status check, so these are the claims that make it one: a
// binding in any accepted spelling passes, and everything else fails. The gate ran as a Python
// heredoc inside the workflow until this module replaced it, and the grammar it accepts may not
// move while the check is required — narrowing it would silently unblock pull requests that were
// previously rejected.
//
// Every expectation below was taken from the Python `re` this module replaces, run over the same
// corpus with the same pattern:
//
//   python3 -c 'import re; print(re.findall(r"(?i)\b(?:advance|advances|advanced|close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+(?:#\d+|https://github\.com/[^/\s]+/[^/\s]+/issues/\d+)\b", body))'
//
// so the two implementations are compared against one recorded answer rather than against each
// other's assumptions.

/** One pull request description, and every binding the gate accepts in it. */
const BINDING_CORPUS: Array<[description: string, bindings: string[]]> = [
	["Closes #123", ["Closes #123"]],
	["Fixes #7", ["Fixes #7"]],
	["Resolves #9", ["Resolves #9"]],
	["Advances #123", ["Advances #123"]],
	["advance #1", ["advance #1"]],
	["ADVANCES #1", ["ADVANCES #1"]],
	["Fixed #4", ["Fixed #4"]],
	["closed #5", ["closed #5"]],
	["advanced #6", ["advanced #6"]],
	[
		"Closes https://github.com/marius-patrik/omnis/issues/88",
		["Closes https://github.com/marius-patrik/omnis/issues/88"],
	],
	["closes https://github.com/a/b/issues/1", ["closes https://github.com/a/b/issues/1"]],
	["Partially delivered. Advances #12, still fixes #13", ["Advances #12", "fixes #13"]],
	["Closes\n#42", ["Closes\n#42"]],
	["Closes\t#42", ["Closes\t#42"]],
	["Closes  #12", ["Closes  #12"]],
	["closes https://github.com/a/b/issues/3 extra", ["closes https://github.com/a/b/issues/3"]],
	[
		"Fixes https://github.com/owner/repo/issues/214 and advances #215",
		["Fixes https://github.com/owner/repo/issues/214", "advances #215"],
	],
	["Closes #12)", ["Closes #12"]],
	["(Closes #12)", ["Closes #12"]],
];

/** One pull request description the gate must reject, and the shape that makes it a rejection. */
const UNBOUND_CORPUS: Array<[description: string, why: string]> = [
	["no binding here", "no keyword at all"],
	["", "an empty description"],
	["This mentions #12 but never closes it", "an issue number with no closing keyword"],
	["unclosed #12", "the keyword is only a suffix of a word"],
	["prefixes #12", "the keyword is only a prefix of a word"],
	["Closes #", "no issue number"],
	["Closes #12ab", "a trailing word character after the number"],
	["Closes https://github.com/a/b/pull/3", "a pull request URL rather than an issue URL"],
];

describe("the bound-issue grammar", () => {
	it("is the documented pattern, not a rewritten one", () => {
		expect(BOUND_ISSUE_PATTERN).toBe(
			String.raw`\b(?:advance|advances|advanced|close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+(?:#\d+|https://github\.com/[^/\s]+/[^/\s]+/issues/\d+)\b`,
		);
	});

	for (const [description, bindings] of BINDING_CORPUS) {
		it(`accepts ${JSON.stringify(description)}`, () => {
			expect(findBoundIssues(description)).toEqual(bindings);
		});
	}

	for (const [description, why] of UNBOUND_CORPUS) {
		it(`rejects ${JSON.stringify(description)}: ${why}`, () => {
			expect(findBoundIssues(description)).toEqual([]);
		});
	}
});

describe("the bound-issue gate", () => {
	it("fails a pull request that binds nothing", () => {
		const result = checkBoundIssue("A refactor with no issue in sight.", "pull_request");
		expect(result.applicable).toBe(true);
		expect(result.exitCode).toBe(1);
	});

	it("passes a pull request that binds an issue", () => {
		const result = checkBoundIssue("Closes #42", "pull_request");
		expect(result.applicable).toBe(true);
		expect(result.exitCode).toBe(0);
		expect(result.bindings).toEqual(["Closes #42"]);
	});

	for (const eventName of ["push", "issues", "workflow_dispatch", ""]) {
		it(`skips ${eventName || "an unnamed event"}, which carries no description to judge`, () => {
			const result = checkBoundIssue("", eventName);
			expect(result.applicable).toBe(false);
			expect(result.exitCode).toBe(0);
		});
	}

	it("explains what a rejected description has to contain", () => {
		const report = renderBoundIssueReport(checkBoundIssue("nothing", "pull_request"), "pull_request");
		expect(report).toContain("must explicitly bind a tracking issue");
		expect(report).toContain("Advances #123");
		expect(report).toContain("Closes #123");
	});

	it("names the event it skipped, so an unexpected skip is visible in the log", () => {
		expect(renderBoundIssueReport(checkBoundIssue("", "push"), "push")).toBe(
			"Skipping check for non-pull_request event: push",
		);
	});
});
