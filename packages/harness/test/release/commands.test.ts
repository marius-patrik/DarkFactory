/**
 * Unit tests for the shared approval command grammar.
 *
 * One module owns every approval-shaped comment so the issue gates and the merge gate cannot drift
 * apart.
 */
import { describe, expect, test } from "bun:test";
import {
	commandFeedback,
	isAllowedApprover,
	isCommandHint,
	type PipelineCommand,
	parseIssueCommand,
	parsePrCommand,
} from "../../src/approvals/commands.ts";

describe("the strict command grammar", () => {
	test.each(["/df approve", "/DF APPROVE", "  /df approve  ", "/approve", "/APPROVE"])(
		"%p approves on both surfaces",
		(body) => {
			expect(parseIssueCommand(body)).toBe("approve");
			expect(parsePrCommand(body)).toBe("approve");
		},
	);

	test.each(["/df reject", "/df revise", "/reject", "/revise", "/DF REVISE"])(
		"%p reports reject on both surfaces, because revise is an alias",
		(body) => {
			expect(parseIssueCommand(body)).toBe("reject");
			expect(parsePrCommand(body)).toBe("reject");
		},
	);

	test.each(["/df resume", "/resume", "/DF RESUME"])("%p resumes on both surfaces", (body) => {
		expect(parseIssueCommand(body)).toBe("resume");
		expect(parsePrCommand(body)).toBe("resume");
	});

	test.each(["approve when ready", "/approve please", "rejected", "/revision"])(
		"%p is approval-like prose, not a command",
		(body) => {
			expect(parseIssueCommand(body)).toBeNull();
			expect(parsePrCommand(body)).toBeNull();
			expect(commandFeedback(body)).toBe("");
		},
	);
});

describe("a rejection carries its reason as feedback", () => {
	test.each<[string, string]>([
		["/df reject use bun, not npm", "use bun, not npm"],
		["/reject please fix the scope", "please fix the scope"],
		["/df revise: use bun", "use bun"],
		["/revise the plan to use bun", "the plan to use bun"],
		["/df reject", ""],
	])("%p yields %p", (body, expected) => {
		expect(parseIssueCommand(body)).toBe("reject");
		expect(parsePrCommand(body)).toBe("reject");
		expect(commandFeedback(body)).toBe(expected);
	});
});

describe("the legacy bare words still work", () => {
	test.each<[string, PipelineCommand]>([
		["approve", "approve"],
		["Approve", "approve"],
		["  approve  ", "approve"],
		["lgtm", "approve"],
		["LGTM", "approve"],
		["good", "approve"],
		["resume", "resume"],
	])("on issues, %p means %p", (body, expected) => {
		expect(parseIssueCommand(body)).toBe(expected);
	});

	test.each<[string, PipelineCommand]>([
		["approve", "approve"],
		["/approve", "approve"],
		["merge", "approve"],
		["/merge", "approve"],
		["lgtm", "approve"],
	])("on pull requests, %p means %p", (body, expected) => {
		expect(parsePrCommand(body)).toBe(expected);
	});

	test("merge only ever meant something on a pull request", () => {
		expect(parseIssueCommand("merge")).toBeNull();
		expect(parseIssueCommand("/merge")).toBeNull();
	});

	test("good only ever meant something on an issue", () => {
		expect(parsePrCommand("good")).toBeNull();
	});
});

describe("free text is discussion, not a decision", () => {
	test.each([
		"I do not approve yet",
		"looks good to me, approve when ready",
		"three concerns, and approve",
		"Checked it against the tree; the claim holds.\n\nOne correction below.\n\napprove",
		"I would approve this once the test exists",
		"approval pending",
		"this needs work before I approve it",
		"",
		"df approve",
		"/df",
		"/df please approve this",
	])("%p is not a command on either surface", (body) => {
		expect(parseIssueCommand(body)).toBeNull();
		expect(parsePrCommand(body)).toBeNull();
	});

	test.each([
		"I do not approve yet",
		"looks good to me, merge when ready",
		"please revise the plan",
		"can we resume this?",
	])("%p earns at most a one-time hint", (body) => {
		expect(isCommandHint(body)).toBe(true);
	});

	test.each(["approve", "/df approve", "/df reject", "lgtm", "merge", "fix the typo in the docs", ""])(
		"%p needs no hint: it either acts or is plainly unrelated",
		(body) => {
			expect(isCommandHint(body)).toBe(false);
		},
	);
});

describe("owner decision 9c: who may approve", () => {
	test.each(["OWNER", "MEMBER", "COLLABORATOR", "owner"])("the %s association may approve", (association) => {
		expect(isAllowedApprover("someone", { authorAssociation: association, issueAuthor: "anyone-else" })).toBe(true);
	});

	test("the Request author may approve their own request", () => {
		expect(
			isAllowedApprover("marius-patrik", {
				authorAssociation: "CONTRIBUTOR",
				issueAuthor: "Marius-Patrik",
			}),
		).toBe(true);
	});

	test.each(["CONTRIBUTOR", "FIRST_TIMER", "NONE", ""])("a %s stranger may not approve", (association) => {
		expect(isAllowedApprover("stranger", { authorAssociation: association, issueAuthor: "marius-patrik" })).toBe(false);
	});

	// #1233 asks for the schemas to be narrowed so an unrecognised value cannot reach the gate.
	// It cannot reach it as an approval either way: the gate is a membership test against a
	// closed allow-list, so an unknown value is denied rather than trusted. Pinned here so that
	// property is a tested guarantee rather than an accident of the current value set.
	test.each([
		"not-a-real-association",
		"superuser",
		"ADMIN",
		"OWNER; DROP TABLE reviews",
		"OWNER ",
		" OWNER",
		"OWNER\n",
	])("an unrecognised association %p may not approve", (association) => {
		expect(isAllowedApprover("mallory", { authorAssociation: association, issueAuthor: "marius-patrik" })).toBe(false);
	});

	test("a bot never approves, however privileged its association", () => {
		expect(isAllowedApprover("github-actions[bot]", { authorAssociation: "OWNER", issueAuthor: "x" })).toBe(false);
		expect(isAllowedApprover("someone", { authorAssociation: "OWNER", userType: "Bot" })).toBe(false);
		expect(isAllowedApprover("", { authorAssociation: "OWNER" })).toBe(false);
	});
});
