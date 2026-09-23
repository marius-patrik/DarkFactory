import { describe, expect, test } from "bun:test";
import type { DocsContentGraph, DocsPage } from "../src/content.ts";
import { analyzeRuleNoteRelations, assertRuleNoteRelations } from "../src/relations.ts";

function rule(id: string): DocsPage {
	const number = Number(id.slice(-3));
	return {
		id: id.toLowerCase(),
		kind: "rule",
		title: `Rule ${number} — Test`,
		source: `.agents/rules/${String(number).padStart(3, "0")}-test.md`,
		markdown: `---
id: ${id}
title: Test
status: normative
---
# Rule ${number} — Test

## Requirement

Test.

## Rationale

Test.

## Enforcement

Test.

## Exceptions

None.

## Change control

Test.
`,
	};
}

function adr(id: string, related: string): DocsPage {
	const number = id.slice(-4);
	return {
		id: id.toLowerCase(),
		kind: "adr",
		title: `${id} — Test decision`,
		source: `.agents/notes/adr/${number}-test.md`,
		markdown: `# ${id} — Test decision

**Status**: Accepted

**Related rules**: \`${related}\`

## Decision

Test.

## Consequences

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
			".agents/notes/adr/0001-test.md: accepted ADR must declare Related rules",
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

	test("fails on malformed canonical record identity", () => {
		const badRule = { ...rule("DF-RULE-001"), source: ".agents/rules/099-test.md" };
		const findings = analyzeRuleNoteRelations(graph([badRule, adr("ADR-0001", "DF-RULE-001")])).findings;
		expect(findings).toContain(".agents/rules/099-test.md: filename must start with canonical rule number 001-");
	});

	test("fails on incomplete rule or ADR records", () => {
		const badRule = rule("DF-RULE-001");
		const badAdr = adr("ADR-0001", "DF-RULE-001");
		const content = graph([
			{ ...badRule, markdown: badRule.markdown.replace("## Enforcement\n\nTest.\n\n", "") },
			{ ...badAdr, markdown: badAdr.markdown.replace("## Consequences\n\nTest.\n", "") },
		]);
		const findings = analyzeRuleNoteRelations(content).findings;
		expect(findings).toContain(".agents/rules/001-test.md: canonical rule is missing non-empty Enforcement section");
		expect(findings).toContain(".agents/notes/adr/0001-test.md: accepted ADR is missing non-empty Consequences section");
	});

	test("rejects non-ADR long-term notes so README cannot omit them", () => {
		const note: DocsPage = {
			id: "note-test",
			kind: "note",
			title: "Loose note",
			source: ".agents/notes/loose.md",
			markdown: "# Loose note\n",
		};
		expect(analyzeRuleNoteRelations(graph([rule("DF-RULE-001"), adr("ADR-0001", "DF-RULE-001"), note])).findings).toContain(
			".agents/notes/loose.md: current long-term notes must be accepted numbered ADRs under .agents/notes/adr/",
		);
	});
});
