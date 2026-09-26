import { describe, expect, test } from "bun:test";
import { buildNotes } from "../src/release/notes.ts";

describe("release notes", () => {
	// Grouped by Conventional Commit type; empty sections are omitted.
	test("commits are grouped under headings", () => {
		const notes = buildNotes(["feat(ci): add a job", "fix(docs): correct a link"], "1.1.0", "1.0.0");
		expect(notes).toContain("### Features");
		expect(notes).toContain("**ci**: add a job");
		expect(notes).toContain("### Fixes");
		expect(notes).toContain("**docs**: correct a link");
	});

	test("sections with no commits are omitted", () => {
		const notes = buildNotes(["feat(ci): add a job"], "1.1.0", "1.0.0");
		expect(notes).not.toContain("### Fixes");
		expect(notes).not.toContain("### Maintenance");
	});

	test("breaking changes lead", () => {
		const notes = buildNotes(["fix(ci): small thing", "feat(agents)!: change the contract"], "2.0.0", "1.0.0");
		expect(notes.indexOf("### Breaking changes")).toBeLessThan(notes.indexOf("### Fixes"));
	});

	test("a BREAKING CHANGE trailer is recognised", () => {
		const notes = buildNotes(["refactor(ci): rework\n\nBREAKING CHANGE: ids are namespaced"], "2.0.0", "1.0.0");
		expect(notes).toContain("### Breaking changes");
	});

	test("a scopeless commit still appears", () => {
		expect(buildNotes(["feat: add a thing"], "1.1.0", "1.0.0")).toContain("add a thing");
	});

	test("non-conventional commits are skipped", () => {
		expect(buildNotes(["wip", "asdf"], "1.0.1", "1.0.0")).toContain("No user-facing changes recorded.");
	});

	test("a first release says so", () => {
		expect(buildNotes(["feat: x"], "0.1.0", null)).toContain("First release.");
	});

	test("a later release names its predecessor", () => {
		expect(buildNotes(["feat: x"], "1.1.0", "1.0.0")).toContain("since `1.0.0`");
	});

	test("a breaking change is listed in both places, as the type section and as breaking", () => {
		// The Python did the same: the entry is what landed, and that it broke something is
		// additionally what a reader needs to know before reading the rest.
		const notes = buildNotes(["feat(agents)!: change the contract"], "2.0.0", "1.0.0");
		expect(notes).toContain("### Breaking changes");
		expect(notes).toContain("### Features");
		expect(notes.match(/\*\*agents\*\*: change the contract/g)).toHaveLength(2);
	});

	test("notes always end with a single trailing newline", () => {
		const notes = buildNotes(["feat: x"], "1.1.0", "1.0.0");
		expect(notes.endsWith("Changes since `1.0.0`.\n")).toBe(true);
	});
});
