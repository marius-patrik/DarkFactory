import { describe, expect, test } from "bun:test";
import {
	buildPrBody,
	extractPlanScope,
	extractTestResultLine,
	generateBranchName,
} from "../../src/pipeline/pr-body.ts";
import { boundedTail, rewriteFileLinks } from "../../src/pipeline/signals.ts";

describe("rewriteFileLinks", () => {
	test("a file:// URL becomes a GitHub blob link for the file path", () => {
		// A file:// link points at the reader's own machine, not at the repository.
		const out = rewriteFileLinks("see file:///harnesses.py for details", "marius-patrik/DarkFactory", "darkfactory");
		expect(out).not.toContain("file://");
		expect(out).toContain("https://github.com/marius-patrik/DarkFactory/blob/darkfactory/harnesses.py");
	});

	test("without a repo slug there is no link to build, so a plain code path remains", () => {
		const out = rewriteFileLinks("see file:///.github/scripts/harnesses.py");
		expect(out).not.toContain("file://");
		expect(out).toContain(".github/scripts/harnesses.py");
	});

	test("text without file:// URLs is returned verbatim", () => {
		expect(rewriteFileLinks("no links here")).toBe("no links here");
	});

	test("the agent's own container paths are stripped to the repository path", () => {
		const repo = "o/r";
		const branch = "develop";
		expect(rewriteFileLinks("file:///workspace/packages/harness/src/cli.ts", repo, branch)).toContain(
			"packages/harness/src/cli.ts",
		);
		// A checkout root in front of a tree directory is dropped, because the link must resolve
		// inside the repository.
		expect(rewriteFileLinks("file:///some/checkout/place/src/a.ts", repo, branch)).toContain("blob/develop/src/a.ts");
	});

	test("a system path keeps only its file name, because the path itself is noise", () => {
		expect(rewriteFileLinks("file:///usr/lib/python3/site-packages/requests/api.py", "o/r", "b")).toBe("`api.py`");
	});
});

describe("boundedTail", () => {
	test("keeps the most recent end and marks where it was cut", () => {
		const text = "a".repeat(2100);
		const out = boundedTail(text, 2000);
		expect(out).toContain("[100 characters omitted]");
		expect(out.endsWith("a".repeat(10))).toBe(true);
	});

	test("text inside the bound is returned trimmed", () => {
		expect(boundedTail("  hello  ", 2000)).toBe("hello");
		expect(boundedTail("", 2000)).toBe("");
	});
});

describe("extractPlanScope", () => {
	test("reads the Scope section when the plan has one", () => {
		const plan = "### Implementation Plan\n\n### Scope\nUpdate the commands.\n\n### Verification\nRun pytest.\n";
		expect(extractPlanScope(plan)).toBe("Update the commands.");
	});

	test("falls back through the other summary headings", () => {
		// Each fixture carries a following section, so returning the heading body is distinguishable
		// from returning the plan's remaining prose with the headings filtered out.
		expect(extractPlanScope("## Overview\nThe whole thing.\n\n## Verification\nRun the tests.\n")).toBe(
			"The whole thing.",
		);
		expect(extractPlanScope("## Summary\nShort of it.\n\n## Notes\nNothing.\n")).toBe("Short of it.");
		expect(extractPlanScope("## Objectives\nThe goal.\n\n## Notes\nNothing.\n")).toBe("The goal.");
		expect(extractPlanScope("## Description\nThe description.\n\n## Notes\nNothing.\n")).toBe("The description.");
	});

	test("a plan with no heading still describes itself, without the runner's own decoration", () => {
		const plan = "<!-- darkfactory-agent -->\n# Title\n- Parent Request: #7\nDo the thing carefully.\n";
		expect(extractPlanScope(plan)).toBe("Do the thing carefully.");
	});

	test("with nothing at all it uses the plan's own title", () => {
		expect(extractPlanScope("", "Plan: Update gate commands")).toBe("Plan: Update gate commands");
		expect(extractPlanScope("")).toBe("Implementation changes as approved in the plan.");
	});
});

describe("extractTestResultLine", () => {
	test("takes the last non-empty line of either stream", () => {
		expect(extractTestResultLine("running\n856 passed", "")).toBe("856 passed");
		expect(extractTestResultLine("", "error: 3 failed")).toBe("error: 3 failed");
	});

	test("output with nothing in it reports a pass, because silence is not a failure", () => {
		expect(extractTestResultLine("", "")).toBe("Tests passed");
	});
});

describe("generateBranchName", () => {
	test("DF-RULE-007 forbids issue numbers in branch names", () => {
		const name = generateBranchName("Plan: Add cell matrix buffer for #42");
		expect(name).not.toContain("42");
		expect(name).toBe(name.toLowerCase());
		expect(name).not.toContain(" ");
		expect(name).toBe("feature/add-cell-matrix-buffer-for");
	});

	test("a Request prefix is stripped the same way a Plan prefix is", () => {
		expect(generateBranchName("Request: Harden the docker runner")).toBe("feature/harden-the-docker-runner");
	});

	test("a long title is truncated to fifty characters and never ends in a separator", () => {
		const name = generateBranchName("Plan: " + "word ".repeat(30));
		expect(name.startsWith("feature/")).toBe(true);
		expect(name.slice("feature/".length).length).toBeLessThanOrEqual(50);
		expect(name.endsWith("-")).toBe(false);
	});
});

describe("buildPrBody", () => {
	const body = buildPrBody({
		planTitle: "Plan: Update gate commands",
		planText:
			"### Implementation Plan\n\n### Scope\nUpdate commands to include /df prefixes.\n\n### Verification\nRun pytest.\n",
		requestNumber: 267,
		planNumber: 267,
		diffStat: " .github/scripts/commands.py | 10 +++++-----\n 1 file changed",
		testCommand: "python3 -m pytest tests/ -q",
		testResultLine: "856 passed, 8 skipped in 9.74s",
		agentNotes: "Now I need to add tests... Wait, let's first check...",
	});

	test("carries the plan summary, the diff stat, the verification and the closing reference", () => {
		expect(body).toContain("## Summary");
		expect(body).toContain("Update commands to include /df prefixes");
		expect(body).toContain("## Changed Files");
		expect(body).toContain(".github/scripts/commands.py");
		expect(body).toContain("python3 -m pytest tests/ -q");
		expect(body).toContain("856 passed, 8 skipped in 9.74s");
		expect(body).toContain("Closes #267");
	});

	test("agent notes stay in a collapsed block, out of the summary a reviewer reads first", () => {
		expect(body).toContain("<details>");
		expect(body).toContain("<summary>Agent notes</summary>");
		expect(body).toContain("Now I need to add tests...");
		expect(body.split("## Changed Files")[0]).not.toContain("Now I need to add tests");
	});

	test("a separate Plan issue is closed alongside the Request it belongs to", () => {
		const split = buildPrBody({ planTitle: "t", planText: "", requestNumber: 267, planNumber: 268 });
		expect(split).toContain("Closes #267\nCloses #268");
	});

	test("with no run stats at all the body is still a valid pull request", () => {
		const bare = buildPrBody({ planTitle: "Plan: x", planText: "", requestNumber: 7 });
		expect(bare).toContain("Closes #7");
		expect(bare).not.toContain("## Changed Files");
		expect(bare).not.toContain("## Verification");
		expect(bare).not.toContain("<details>");
	});
});
