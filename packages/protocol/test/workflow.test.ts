import { describe, expect, test } from "bun:test";
import { AUTHOR_ASSOCIATIONS, type AuthorAssociation } from "../src/workflow.ts";

describe("workflow authorization contract", () => {
	test("exposes one closed set of author associations", () => {
		expect(AUTHOR_ASSOCIATIONS).toEqual(["OWNER", "MEMBER", "COLLABORATOR", "AUTHOR"]);
		const accepted = new Set<AuthorAssociation>(AUTHOR_ASSOCIATIONS);
		expect(accepted.has("OWNER")).toBe(true);
		expect(accepted.has("AUTHOR")).toBe(true);
	});
});
