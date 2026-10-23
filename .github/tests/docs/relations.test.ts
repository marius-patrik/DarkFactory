import { describe, expect, test } from "bun:test";
import type { DocsContentGraph, DocsPage } from "../src/content.ts";
import { analyzeRuleNoteRelations, assertRuleNoteRelations } from "../src/relations.ts";

function rule(id: string): DocsPage {
	const number = Number(id.slice(-3));
	return {
		id: id.toLowerCase(),
		kind: "rule",
		title: `Rule ${number} — Test`,
		source: `.darkfactory/plugins/df-rules/skills/${String(number).padStart(3, "0")}-test/SKILL.md`,
		markdown: `---
id: ${id}
title: Test
status: normative
applies_to: [agents]
activation: always
owners: [ci]
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
		source: `.agents/adr/${number}-test.md`,
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
	test("fails closed when canonical governance disappears entirely", () => {
		const empty = graph([]);
		const findings = analyzeRuleNoteRelations(empty).findings;
		expect(findings).toContain("rules: at least one canonical rule is required");
		expect(findings).toContain(".darkfactory/ADRs.md: at least one accepted ADR is required");
		expect(() => assertRuleNoteRelations(empty)).toThrow("Rule/note relationship contract failed");
	});

	test("fails on incomplete rule or ADR records", () => {
		const badRule = rule("DF-RULE-001");
		const badAdr = adr("ADR-0001", "DF-RULE-001");
		const content = graph([
			{ ...badRule, markdown: badRule.markdown.replace("## Enforcement\n\nTest.\n\n", "") },
			{ ...badAdr, markdown: badAdr.markdown.replace("## Consequences\n\nTest.\n", "") },
		]);
		const findings = analyzeRuleNoteRelations(content).findings;
		expect(findings).toContain(
			".darkfactory/plugins/df-rules/skills/001-test/SKILL.md: canonical rule is missing non-empty Enforcement section",
		);
		expect(findings).toContain(
			".agents/adr/0001-test.md#ADR-0001: accepted ADR is missing non-empty Consequences section",
		);
	});

	test("rejects non-ADR long-term notes so README cannot omit them", () => {
		const note: DocsPage = {
			id: "note-test",
			kind: "note",
			title: "Loose note",
			source: ".agents/notes/loose.md",
			markdown: "# Loose note\n",
		};
		expect(
			analyzeRuleNoteRelations(graph([rule("DF-RULE-001"), adr("ADR-0001", "DF-RULE-001"), note])).findings,
		).toContain(
			".agents/notes/loose.md: current long-term notes must be accepted numbered ADRs in .darkfactory/ADRs.md",
		);
	});
});
