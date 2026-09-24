import { describe, expect, test } from "bun:test";
import type { DocsContentGraph } from "../src/content.ts";
import { AGENTS_GENERATED_MARKER, renderAgentsMarkdown } from "../src/agents.ts";

const rule = (source: string, id: string, title: string, number: number, requirement: string) => ({
	id: source.replace(/[^a-z0-9]+/giu, "-").toLowerCase(),
	kind: "rule" as const,
	title,
	source,
	markdown: `---
id: ${id}
title: ${title}
status: normative
applies_to: [agents]
activation: always
owners: [docs]
---
# Rule ${number} — ${title}

## Requirement

${requirement}

## Rationale

Because.

## Enforcement

By test.

## Exceptions

None.

## Change control

Change deliberately.
`,
});

describe("AGENTS rules projection", () => {
	test("indexes canonical metadata and projects only normative requirement text", () => {
		const graph: DocsContentGraph = {
			version: 1,
			site: { name: "DarkFactory", description: "test" },
			home: "home",
			workflows: [],
			pages: [
				{ id: "home", kind: "home", title: "Home", source: "docs/home.md", markdown: "# Home\n" },
				rule(".agents/rules/002-second.md", "DF-RULE-002", "Second", 2, "Second invariant."),
				rule(".agents/rules/001-first.md", "DF-RULE-001", "First", 1, "First invariant."),
				{
					id: "adr-0001",
					kind: "adr",
					title: "ADR-0001 — Test decision",
					source: ".agents/notes/adr/0001-test.md",
					markdown: "# ADR-0001 — Test decision\n\n**Status**: Accepted\n\n**Related rules**: `DF-RULE-001`, `DF-RULE-002`\n\n## Decision\n\nTest.\n\n## Consequences\n\nTest consequence.\n",
				},
			],
		};
		const markdown = renderAgentsMarkdown(graph);
		expect(markdown.startsWith(AGENTS_GENERATED_MARKER)).toBe(true);
		expect(markdown.indexOf("DF-RULE-001")).toBeLessThan(markdown.indexOf("DF-RULE-002"));
		expect(markdown).toContain("| `DF-RULE-001` | First | `ADR-0001` | `.agents/rules/001-first.md` |");
		expect(markdown).toContain("### Rule 1 — First\n\nFirst invariant.");
		expect(markdown).not.toContain("Because.");
	});
});
