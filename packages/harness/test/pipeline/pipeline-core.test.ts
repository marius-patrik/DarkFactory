/**
 * The deterministic pull request body, the resume clock, and the df event stream.
 *
 * The values asserted here were produced by running the Python implementation this replaces on the
 * same inputs.
 */

import { describe, expect, test } from "bun:test";
import {
	DF_EXIT_AUTH_FAILED,
	DF_EXIT_QUOTA_EXHAUSTED,
	dfFailureDetail,
	dfSetupSecretNames,
	parseDfErrorMessage,
	parseDfJsonOutput,
} from "../../src/pipeline/df-events.ts";
import {
	approvedPlanText,
	buildPrBody,
	extractPlanScope,
	extractTestResultLine,
	formatConventionalCommit,
	fullPlanScope,
	generateBranchName,
} from "../../src/pipeline/pr-body.ts";
import {
	alreadyExists,
	exhaustedProviders,
	isoUtc,
	mergeProviderResets,
	nextPacificMidnight,
	nextQuotaReset,
	pacificOffsetHours,
	quotaBlockRecord,
	quotaRunVariable,
} from "../../src/pipeline/quota.ts";

/** 2026-09-15T12:00:00Z, which is 05:00 in Los Angeles. */
const NOW = 1789473600;

describe("conventional commit subjects", () => {
	test("bug is a label and fix is the commit type", () => {
		// The two vocabularies overlap and must not leak into each other.
		expect(formatConventionalCommit("bug", "area:governance", "Correct the codec")).toBe(
			"fix(governance): correct the codec",
		);
		expect(formatConventionalCommit("feat", "area:agents", "Add cell buffer")).toBe("feat(agents): add cell buffer");
	});

	test("a leading capital is lowercased", () => {
		expect(formatConventionalCommit("chore", "area:ci", "Pin the runner")).toBe("chore(ci): pin the runner");
	});
});

describe("branch names", () => {
	test("exclude the issue number", () => {
		// DF-RULE-007 forbids an issue number in a branch name.
		const name = generateBranchName("Plan: Add cell matrix buffer for #42");
		expect(name).not.toContain("42");
		expect(name).toBe(name.toLowerCase());
		expect(name).not.toContain(" ");
	});

	test("strip the Plan and Request prefixes", () => {
		expect(generateBranchName("Request: Add a thing")).toBe("feature/add-a-thing");
		expect(generateBranchName("Plan: Add a thing")).toBe("feature/add-a-thing");
	});

	test("are bounded and never end in a separator", () => {
		const name = generateBranchName(`Plan: ${"word ".repeat(40)}`);
		expect(name.length).toBeLessThanOrEqual("feature/".length + 50);
		expect(name.endsWith("-")).toBe(false);
	});
});

describe("the plan scope section", () => {
	test("prefers the Scope section", () => {
		expect(
			extractPlanScope("### Scope\n\nUpdate commands to include /df prefixes.\n\n### Verification\nRun pytest.\n"),
		).toBe("Update commands to include /df prefixes.");
	});

	test("falls back through the other section headings", () => {
		expect(extractPlanScope("## Overview\n\nAn overview.\n")).toBe("An overview.");
		expect(extractPlanScope("## Summary\n\nA summary.\n")).toBe("A summary.");
	});

	test("falls back to the title when the plan has no sections at all", () => {
		expect(extractPlanScope("just prose", "Plan: A title")).toBe("just prose");
		expect(extractPlanScope("", "Plan: A title")).toBe("Plan: A title");
		expect(extractPlanScope("", "")).toBe("Implementation changes as approved in the plan.");
	});

	test("drops the markers the pipeline itself added", () => {
		const body = "<!-- darkfactory-plan -->\n### Implementation Plan\n\n- Parent Request: #4\n\nThe real plan text.\n";
		expect(extractPlanScope(body)).toBe("The real plan text.");
	});
});

describe("the test result line", () => {
	test("is the last non-empty line of the combined output", () => {
		expect(extractTestResultLine("767 passed\n", "warning: slow\n")).toBe("warning: slow");
		expect(extractTestResultLine("", "856 passed, 8 skipped in 9.74s")).toBe("856 passed, 8 skipped in 9.74s");
	});

	test("is a positive claim when the suite printed nothing", () => {
		expect(extractTestResultLine("", "")).toBe("Tests passed");
	});
});

describe("the pull request body", () => {
	// Byte-for-byte the body the Python produced for these inputs.
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

	test("carries the plan scope, the diff stat and the verification", () => {
		expect(body).toBe(
			"## Summary\n\nUpdate commands to include /df prefixes.\n\n" +
				"## Changed Files\n\n```\n.github/scripts/commands.py | 10 +++++-----\n 1 file changed\n```\n\n" +
				"## Verification\n\n- **Command**: `python3 -m pytest tests/ -q`\n- **Result**: `856 passed, 8 skipped in 9.74s`\n\n" +
				"Closes #267\n\n<details>\n<summary>Agent notes</summary>\n\nNow I need to add tests... Wait, let's first check...\n</details>\n",
		);
	});

	test("the agent's narration never reaches the summary", () => {
		// An implementation agent narrates its reasoning, and that narration is not the change.
		expect(body.split("## Changed Files")[0]).not.toContain("Now I need to add tests");
	});

	test("a separate plan issue gets its own Closes line", () => {
		expect(buildPrBody({ planTitle: "t", planText: "", requestNumber: 1, planNumber: 2 })).toContain(
			"Closes #1\nCloses #2",
		);
	});

	test("omits the sections it has nothing for", () => {
		const bare = buildPrBody({ planTitle: "Plan: t", planText: "", requestNumber: 5 });
		expect(bare).not.toContain("## Changed Files");
		expect(bare).not.toContain("## Verification");
		expect(bare).not.toContain("<details>");
		expect(bare).toBe("## Summary\n\nPlan: t\n\nCloses #5\n");
	});
});

describe("finding the approved plan", () => {
	test("the newest plan comment wins", () => {
		const comments = ["<!-- darkfactory-plan -->\nfirst plan", "a reply", "<!-- darkfactory-plan -->\nsecond plan"];
		expect(approvedPlanText(comments, "the issue body")).toBe("<!-- darkfactory-plan -->\nsecond plan");
	});

	test("the issue body is the fallback", () => {
		expect(approvedPlanText(["a reply"], "the issue body")).toBe("the issue body");
	});
});

describe("scope amendments", () => {
	test("are folded into the plan scope", () => {
		const merged = fullPlanScope("the plan", ["### Scope Amendment\n\nAlso change auth.ts."]);
		expect(merged).toBe("the plan\n\n## Scope Amendments\n### Scope Amendment\n\nAlso change auth.ts.");
	});

	test("a plan without amendments is unchanged", () => {
		expect(fullPlanScope("the plan", ["a reply"])).toBe("the plan");
	});
});

describe("the Pacific clock", () => {
	test("is -8 in winter and -7 in summer", () => {
		expect(pacificOffsetHours(Date.UTC(2026, 0, 15))).toBe(-8);
		expect(pacificOffsetHours(Date.UTC(2026, 6, 15))).toBe(-7);
	});

	test("switches on the second Sunday of March", () => {
		// 2026-03-08 09:59 UTC is 01:59 PST; 10:00 UTC is 03:00 PDT.
		expect(pacificOffsetHours(Date.UTC(2026, 2, 8, 9, 59))).toBe(-8);
		expect(pacificOffsetHours(Date.UTC(2026, 2, 8, 10, 0))).toBe(-7);
	});

	test("switches back on the first Sunday of November", () => {
		// 2026-11-01 08:59 UTC is 01:59 PDT; 09:00 UTC is 01:00 PST.
		expect(pacificOffsetHours(Date.UTC(2026, 10, 1, 8, 59))).toBe(-7);
		expect(pacificOffsetHours(Date.UTC(2026, 10, 1, 9, 0))).toBe(-8);
	});

	test("the next midnight is the next Pacific midnight", () => {
		expect(nextPacificMidnight(NOW)).toBe(1789542000);
	});
});

describe("when a quota-blocked run may resume", () => {
	test("an ISO timestamp in the detail is believed first", () => {
		// The Python returned exactly this value.
		expect(nextQuotaReset("429 quota exhausted; resets at 2026-09-15T14:30:00Z", NOW)).toBe(NOW + 2.5 * 3600);
	});

	test("a retry delay is added to now", () => {
		expect(nextQuotaReset("Please retry in 33s.", NOW)).toBe(NOW + 33);
		expect(nextQuotaReset('{"retryDelay": 33}', NOW)).toBe(NOW + 33);
	});

	test("a resetAt epoch in milliseconds is converted", () => {
		expect(nextQuotaReset('{"resetAt": 1789482600000}', NOW)).toBe(1789482600);
	});

	test("a quoted resetAt is not read, and the run falls back to the guess", () => {
		// Both patterns match a bare number, not a quoted one, so neither `resetAt` nor `retryDelay`
		// is read out of a real JSON payload - the value is always a quoted string there. The order
		// is preserved from the Python, so a run told exactly when it may resume still guesses. The
		// guess is safe (a day later than the real reset, if anything) so nothing is lost, but the
		// specific signal is being discarded. Reported as a finding, not folded into the port.
		expect(nextQuotaReset('{"resetAt": "1789482600000"}', NOW)).toBe(1789542000);
		expect(nextQuotaReset('{"retryDelay": "33"}', NOW)).toBe(1789542000);
	});

	test("with nothing to go on it falls back to the next Pacific midnight", () => {
		expect(nextQuotaReset("quota exhausted", NOW)).toBe(1789542000);
	});

	test("a specific signal always beats the guess", () => {
		expect(nextQuotaReset("Please retry in 5s. Also 2026-09-15T14:30:00Z", NOW)).toBe(NOW + 2.5 * 3600);
	});
});

describe("recording a quota block", () => {
	test("reads the provider names out of the chain the run reported", () => {
		expect(exhaustedProviders("Quota exhausted across every harness and model (agy, codex): 429")).toEqual([
			"agy",
			"codex",
		]);
		expect(exhaustedProviders("some other failure")).toEqual([]);
	});

	test("formats an instant the repository variables store", () => {
		expect(isoUtc(NOW)).toBe("2026-09-15T12:00:00Z");
	});

	test("records the item, its kind, and both instants", () => {
		expect(quotaBlockRecord({ item: 42, isPr: true, resetAt: NOW, blockedAt: NOW })).toEqual({
			item: 42,
			isPr: true,
			resetAt: "2026-09-15T12:00:00Z",
			blockedAt: "2026-09-15T12:00:00Z",
		});
	});

	test("keeps the provider map monotonic", () => {
		// A run blocked until tomorrow must not be unblocked by a later run that only saw a
		// one-minute retry delay for the same provider.
		expect(mergeProviderResets({ later: 5e9, earlier: 1 }, ["later", "earlier", "fresh"], NOW)).toEqual({
			later: 5e9,
			earlier: NOW,
			fresh: NOW,
		});
	});

	test("the run variable is named for the run", () => {
		expect(quotaRunVariable("987")).toBe("DF_QUOTA_987");
	});

	test("a create over an existing variable is recognised as such", () => {
		expect(alreadyExists("HTTP 409: Already exists")).toBe(true);
		expect(alreadyExists("already exists")).toBe(true);
		expect(alreadyExists("permission denied")).toBe(false);
	});
});

describe("reading the df event stream", () => {
	test("keeps only the text streamed after the last tool call", () => {
		// The Python returned exactly "DRAFT here" for this stream.
		const stream =
			'{"type":"text_delta","delta":"plan "}\n{"type":"tool_start","name":"write"}\n' +
			'{"type":"text_delta","delta":"DRAFT"}\n{"type":"text_delta","delta":" here"}\n' +
			'{"type":"step","stopReason":"end_turn"}\n';
		expect(parseDfJsonOutput(stream)).toBe("DRAFT here");
	});

	test("a run that never touches a tool answers with the whole stream", () => {
		const stream = '{"type":"text_delta","delta":"the "}\n{"type":"text_delta","delta":"plan"}\n';
		expect(parseDfJsonOutput(stream)).toBe("the plan");
	});

	test("a successful closing step does not clear the answer", () => {
		const stream = '{"type":"text_delta","delta":"done"}\n{"type":"step","stopReason":"end_turn"}\n';
		expect(parseDfJsonOutput(stream)).toBe("done");
	});

	test("a failed step does clear it", () => {
		const stream =
			'{"type":"text_delta","delta":"draft"}\n{"type":"step","errorMessage":"boom","stopReason":"error"}\n' +
			'{"type":"text_delta","delta":"final"}\n';
		expect(parseDfJsonOutput(stream)).toBe("final");
	});

	test("non-event lines are ignored", () => {
		const stream = 'not json\n\n[1,2,3]\n{"type":"text_delta","delta":"kept"}\n';
		expect(parseDfJsonOutput(stream)).toBe("kept");
	});

	test("an empty stream has no answer", () => {
		expect(parseDfJsonOutput("")).toBe("");
	});

	test("the last error event is the failure message", () => {
		expect(parseDfErrorMessage('{"type":"error","message":"first"}\n{"type":"error","message":"boom"}\n')).toBe("boom");
		expect(parseDfErrorMessage('{"type":"result"}\n')).toBe("");
	});
});

describe("translating a df exit code", () => {
	test("exit 2 becomes quota wording so one classification keeps deciding", () => {
		expect(DF_EXIT_QUOTA_EXHAUSTED).toBe(2);
		expect(dfFailureDetail({ exitCode: 2, stdout: "", detail: "stderr tail" })).toContain(
			"df exit code 2: quota exhausted on every candidate in the chain",
		);
	});

	test("exit 3 becomes auth wording", () => {
		expect(DF_EXIT_AUTH_FAILED).toBe(3);
		expect(dfFailureDetail({ exitCode: 3, stdout: "", detail: "" })).toContain(
			"df exit code 3: authentication failed on every candidate in the chain",
		);
	});

	test("df's own error message comes first", () => {
		const detail = dfFailureDetail({
			exitCode: 1,
			stdout: '{"type":"error","message":"the candidate failed"}',
			detail: "",
		});
		expect(detail).toBe("the candidate failed");
	});

	test("an exit code with nothing to say still names itself", () => {
		expect(dfFailureDetail({ exitCode: 9, stdout: "", detail: "" })).toBe("df exited 9");
	});
});

describe("the df credential list a workflow must forward", () => {
	test("is the set map then the load map, without repeats", () => {
		// The Python returned exactly this list in this order.
		expect(dfSetupSecretNames()).toEqual([
			"GEMINI_API_KEY",
			"GEMINI_API_KEY_2",
			"GEMINI_API_KEY_3",
			"OPENROUTER_API_KEY",
			"OPENROUTER_API_KEY_2",
			"GROQ_API_KEY",
			"DF_ACCOUNT_OPENAI_CODEX",
			"DF_ACCOUNT_GROK_SUB",
		]);
	});
});
