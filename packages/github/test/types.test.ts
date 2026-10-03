import { describe, expect, test } from "bun:test";
import {
	associationSchema,
	commentSchema,
	issueSchema,
	pullRequestSchema,
	reviewSchema,
	variableSchema,
} from "../src/types.ts";

const user = { login: "marius-patrik" };

describe("issueSchema", () => {
	const issue = {
		number: 1231,
		id: 2_000_000,
		node_id: "I_kwDOABCDEF",
		title: "v1: first production release",
		body: "The exit condition is not a green board.",
		state: "open",
		labels: ["ToDo", { name: "epic", color: "b60205" }],
		user,
		author_association: "OWNER",
		html_url: "https://github.com/marius-patrik/DarkFactory/issues/1231",
	};

	test("accepts a well-formed payload", () => {
		const parsed = issueSchema.parse(issue);
		expect(parsed.number).toBe(1231);
		expect(parsed.labels).toEqual(["ToDo", { name: "epic", color: "b60205" }]);
	});

	test("preserves unknown fields", () => {
		// Passthrough is load-bearing: the pipeline reads fields the schema does not declare
		// (assignees, milestone, reactions), and a stripping schema would silently drop them.
		const parsed = issueSchema.parse({ ...issue, assignees: [user], milestone: null });
		expect(parsed.assignees).toEqual([user]);
		expect(parsed.milestone).toBeNull();
	});

	test("accepts a null body, which is what GitHub sends for an issue with no description", () => {
		expect(issueSchema.parse({ ...issue, body: null }).body).toBeNull();
	});

	test("requires a body key even though null is allowed", () => {
		// Asymmetry with commentSchema, which defaults a missing body to null. Pinned so that
		// changing it is a deliberate contract change rather than an accident.
		expect(issueSchema.safeParse({ ...issue, body: undefined }).success).toBe(false);
	});

	test("rejects a missing number", () => {
		const { number: _number, ...withoutNumber } = issue;
		expect(issueSchema.safeParse(withoutNumber).success).toBe(false);
	});

	test("accepts a label as either a string or an object", () => {
		expect(issueSchema.parse({ ...issue, labels: ["a"] }).labels).toEqual(["a"]);
		expect(issueSchema.parse({ ...issue, labels: [{ name: "a" }] }).labels).toEqual([{ name: "a" }]);
		expect(issueSchema.safeParse({ ...issue, labels: [{ label: "a" }] }).success).toBe(false);
	});
});

describe("commentSchema", () => {
	const comment = { id: 5, body: "looks right", user, author_association: "MEMBER" };

	test("accepts a well-formed comment", () => {
		expect(commentSchema.parse(comment).body).toBe("looks right");
	});

	test("defaults an absent body to null rather than rejecting the comment", () => {
		// A review comment with no prose is routine, and dropping it would lose the review event.
		const { body: _body, ...withoutBody } = comment;
		expect(commentSchema.parse(withoutBody).body).toBeNull();
	});
});

describe("pullRequestSchema", () => {
	const pullRequest = {
		number: 1210,
		id: 3_000_000,
		node_id: "PR_kwDOABCDEF",
		title: "clear typecheck debt",
		body: null,
		state: "open",
		draft: false,
		html_url: "https://github.com/marius-patrik/DarkFactory/pull/1210",
		head: { ref: "fix/typecheck-debt", sha: "abc123" },
		base: { ref: "develop", sha: "def456" },
		user,
		author_association: "COLLABORATOR",
	};

	test("accepts a well-formed payload and keeps both refs", () => {
		const parsed = pullRequestSchema.parse(pullRequest);
		expect(parsed.head.ref).toBe("fix/typecheck-debt");
		expect(parsed.base.ref).toBe("develop");
	});

	test("keeps the head sha the schema does not declare", () => {
		expect(pullRequestSchema.parse(pullRequest).head.sha).toBe("abc123");
	});

	test("requires draft to be a boolean", () => {
		expect(pullRequestSchema.safeParse({ ...pullRequest, draft: "false" }).success).toBe(false);
	});
});

describe("reviewSchema", () => {
	test("treats an absent body as absent, not as an error", () => {
		const parsed = reviewSchema.parse({ id: 9, state: "APPROVED", user, author_association: "OWNER" });
		expect(parsed.body).toBeUndefined();
	});

	test("keeps a null body as null", () => {
		const parsed = reviewSchema.parse({
			id: 9,
			state: "APPROVED",
			body: null,
			user,
			author_association: "OWNER",
		});
		expect(parsed.body).toBeNull();
	});
});

describe("variableSchema", () => {
	test("requires name and value and treats timestamps as optional", () => {
		expect(variableSchema.parse({ name: "AGENT_ENABLED", value: "true" })).toMatchObject({
			name: "AGENT_ENABLED",
			value: "true",
		});
		expect(variableSchema.parse({ name: "A", value: "1", created_at: "2026-01-01T00:00:00Z" }).created_at).toBe(
			"2026-01-01T00:00:00Z",
		);
		expect(variableSchema.safeParse({ name: "A" }).success).toBe(false);
	});
});

describe("associationSchema and state are unvalidated strings", () => {
	// Pinned deliberately. `isAllowedApprover` branches on author_association to decide who may
	// approve a plan, and the merge gate branches on a review state, yet both schemas accept any
	// string. That is a real gap, tracked separately. These tests exist so that tightening either
	// schema is a visible contract change that breaks a test on purpose, rather than a silent edit.
	test("associationSchema accepts any string, including values GitHub never sends", () => {
		expect(associationSchema.parse("OWNER")).toBe("OWNER");
		expect(associationSchema.parse("not-a-real-association")).toBe("not-a-real-association");
		expect(associationSchema.parse("")).toBe("");
	});

	test("issue state is not constrained to open or closed", () => {
		const parsed = issueSchema.parse({
			number: 1,
			id: 1,
			node_id: "I_1",
			title: "t",
			body: null,
			state: " triaged ",
			labels: [],
			user,
			author_association: "NONE",
			html_url: "u",
		});
		expect(parsed.state).toBe(" triaged ");
	});
});
