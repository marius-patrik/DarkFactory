import { describe, expect, test } from "bun:test";
import { associationSchema, issueSchema } from "../src/types.ts";

describe("GitHub authorization payload validation", () => {
	test("accepts only associations supported by the protocol authorization contract", () => {
		for (const value of ["OWNER", "MEMBER", "COLLABORATOR", "AUTHOR"]) {
			expect(associationSchema.parse(value)).toBe(value);
		}
		expect(associationSchema.safeParse("NONE").success).toBe(false);
		expect(associationSchema.safeParse("FIRST_TIME_CONTRIBUTOR").success).toBe(false);
	});

	test("rejects an issue carrying an unsupported author association", () => {
		const base = {
			number: 1,
			id: 1,
			node_id: "I_1",
			title: "Request",
			body: null,
			state: "open",
			labels: [],
			user: { login: "user" },
			html_url: "https://example.test/issues/1",
		};
		expect(issueSchema.safeParse({ ...base, author_association: "OWNER" }).success).toBe(true);
		expect(issueSchema.safeParse({ ...base, author_association: "FIRST_TIME_CONTRIBUTOR" }).success).toBe(false);
	});
});
