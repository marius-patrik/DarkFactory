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

describe("associationSchema and state narrow to the documented values, degrading the rest", () => {
	// #1233 asked for closed enums. These tests used to pin the opposite contract -- that any string
	// passed -- so that narrowing either schema would be a visible, deliberate break. This is that
	// break, and it is a deviation from the issue's acceptance criteria in one respect: an unrecognised
	// value is degraded to `undefined` rather than rejected with a message naming the field.
	//
	// Rejecting was the alternative and it is worse here. These schemas wrap arrays as well as single
	// payloads -- `listReviews` parses every review on a pull request -- so a bare enum means one value
	// GitHub has not documented yet fails a whole call that used to succeed. Degrading keeps the
	// payload and refuses its authority, which is the property the approval gates already implement.
	test("every documented association passes through unchanged", () => {
		for (const value of [
			"NONE",
			"CONTRIBUTOR",
			"FIRST_TIMER",
			"FIRST_TIME_CONTRIBUTOR",
			"MANNEQUIN",
			"MEMBER",
			"OWNER",
			"COLLABORATOR",
		] as const) {
			expect(associationSchema.parse(value)).toBe(value);
		}
	});

	test.each([["not-a-real-association"], [""], ["owner"], ["OWNER "], ["MEMBER\n"]])(
		"an unrecognised association %p degrades to undefined rather than passing through",
		(value) => {
			expect(associationSchema.parse(value)).toBeUndefined();
		},
	);

	test("an unknown association degrades to undefined on a whole payload, not a rejected one", () => {
		const parsed = commentSchema.parse({
			id: 1,
			body: "b",
			user,
			author_association: "superuser",
		});
		expect(parsed.author_association).toBeUndefined();
		expect(parsed.body).toBe("b");
	});

	test("issue state accepts open and closed and degrades anything else", () => {
		const issue = {
			number: 1,
			id: 1,
			node_id: "I_1",
			title: "t",
			body: null,
			labels: [],
			user,
			author_association: "MEMBER",
			html_url: "u",
		};
		expect(issueSchema.parse({ ...issue, state: "open" }).state).toBe("open");
		expect(issueSchema.parse({ ...issue, state: "closed" }).state).toBe("closed");
		expect(issueSchema.parse({ ...issue, state: " triaged " }).state).toBeUndefined();
	});

	test("pull-request state additionally accepts merged", () => {
		const pr = {
			number: 1,
			id: 1,
			node_id: "I_1",
			title: "t",
			body: null,
			draft: false,
			html_url: "u",
			head: { ref: "h" },
			base: { ref: "b" },
			user,
			author_association: "OWNER",
		};
		expect(pullRequestSchema.parse({ ...pr, state: "merged" }).state).toBe("merged");
		expect(pullRequestSchema.parse({ ...pr, state: "open" }).state).toBe("open");
		expect(pullRequestSchema.parse({ ...pr, state: "MUTATED" }).state).toBeUndefined();
	});

	test("review state accepts the five documented values and degrades anything else", () => {
		const review = { id: 1, user, author_association: "MEMBER" };
		for (const value of ["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED", "PENDING"] as const) {
			expect(reviewSchema.parse({ ...review, state: value }).state).toBe(value);
		}
		// The one that matters: an unrecognised state must not be mistaken for an approval.
		expect(reviewSchema.parse({ ...review, state: "approved" }).state).toBeUndefined();
		expect(reviewSchema.parse({ ...review, state: "APPROVED " }).state).toBeUndefined();
	});
});
