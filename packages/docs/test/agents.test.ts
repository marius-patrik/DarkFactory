import { describe, expect, test } from "bun:test";
import type { DocsContentGraph } from "../src/content.ts";
import { renderAgentsMarkdown } from "../src/agents.ts";

const rule = (source: string, id: string, title: string, number: number, requirement: string) => ({
	id: source.replace(/[^a-z0-9]+/giu, "-").toLowerCase(),
	kind: "rule" as const,
	title,
	source,
	markdown: `---
id: ${id}
title: ${title}
status: normative
---
# Rule ${number} — ${title}

## Requirement

${requirement}

## Rationale

Because.
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
			],
		};
		const markdown = renderAgentsMarkdown(graph);
		expect(markdown.indexOf("DF-RULE-001")).toBeLessThan(markdown.indexOf("DF-RULE-002"));
		expect(markdown).toContain("| `DF-RULE-001` | First | `.agents/rules/001-first.md` |");
		expect(markdown).toContain("### Rule 1 — First\n\nFirst invariant.");
		expect(markdown).not.toContain("Because.");
	});
});
