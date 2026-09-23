import { describe, expect, test } from "bun:test";
import type { DocsContentGraph, DocsPage } from "../src/content.ts";
import { analyzeRuleNoteRelations, assertRuleNoteRelations } from "../src/relations.ts";

function rule(id: string): DocsPage {
	return {
		id: id.toLowerCase(),
		kind: "rule",
		title: "Rule 1 — Test",
		source: ".agents/rules/001-test.md",
		markdown: `---
id: ${id}
title: Test
---
# Rule 1 — Test

## Requirement

Test.

## Rationale

Test.
`,
	};
}

function adr(id: string, related: string): DocsPage {
	return {
		id: id.toLowerCase(),
		kind: "adr",
		title: `${id} — Test decision`,
		source: `.agents/notes/adr/${id.toLowerCase()}.md`,
		markdown: `# ${id} — Test decision

**Status**: Accepted

**Related rules**: \`${related}\`

## Decision

Test.
`,
	};
}

function graph(pages: readonly DocsPage[]): DocsContentGraph {
	return { version: 1, site: { name: "DarkFactory" }, home: "home", pages, workflows: [] };
}

describe("rule/note relationships", () => {
	test("derives the reverse relation from ADR metadata", () => {
		const analysis = assertRuleNoteRelations(graph([rule("DF-RULE-001"), adr("ADR-0001", "DF-RULE-001")]));
		expect(analysis.notes[0]?.ruleIds).toEqual(["DF-RULE-001"]);
		expect(analysis.ruleNotes.get("DF-RULE-001")).toEqual(["ADR-0001"]);
	});

	test("fails on an accepted ADR without related rules", () => {
		const page = adr("ADR-0001", "DF-RULE-001");
		const content = graph([{ ...page, markdown: page.markdown.replace(/^\*\*Related rules\*\*:.+\n/mu, "") }, rule("DF-RULE-001")]);
		expect(analyzeRuleNoteRelations(content).findings).toContain(
			".agents/notes/adr/adr-0001.md: accepted ADR must declare Related rules",
		);
	});

	test("fails on an unknown related rule", () => {
		const content = graph([rule("DF-RULE-001"), adr("ADR-0001", "DF-RULE-999")]);
		expect(() => assertRuleNoteRelations(content)).toThrow("unknown related rule DF-RULE-999");
	});

	test("fails when a canonical rule has no accepted note", () => {
		const content = graph([rule("DF-RULE-001")]);
		expect(analyzeRuleNoteRelations(content).findings).toContain(
			".agents/rules/001-test.md: canonical rule must be related by at least one accepted ADR",
		);
	});
});
