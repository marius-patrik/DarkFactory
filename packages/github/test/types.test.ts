import { describe, expect, test } from "bun:test";
import { GITHUB_AUTHOR_ASSOCIATIONS, associationSchema, issueSchema } from "../src/types.ts";

describe("GitHub author-association payload validation", () => {
	test("accepts every documented GitHub payload association and rejects unknown values", () => {
		for (const value of GITHUB_AUTHOR_ASSOCIATIONS) {
			expect(associationSchema.parse(value)).toBe(value);
		}
		expect(associationSchema.safeParse("AUTHOR").success).toBe(false);
		expect(associationSchema.safeParse("TRUSTED_USER").success).toBe(false);
	});

	test("parses outsider issue associations without granting authorization at the transport boundary", () => {
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
		expect(issueSchema.safeParse({ ...base, author_association: "CONTRIBUTOR" }).success).toBe(true);
		expect(issueSchema.safeParse({ ...base, author_association: "NONE" }).success).toBe(true);
		expect(issueSchema.safeParse({ ...base, author_association: "UNKNOWN" }).success).toBe(false);
	});
});
