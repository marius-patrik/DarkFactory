import { describe, expect, test } from "bun:test";
import type { DocsContentGraph } from "../src/content.ts";
import { README_GENERATED_MARKER, renderReadmeMarkdown } from "../src/readme.ts";

function graph(): DocsContentGraph {
	return {
		version: 1,
		site: { name: "DarkFactory", description: "test" },
		home: "home",
		workflows: [],
		pages: [
			{ id: "home", kind: "home", title: "Product home", source: "docs/home.md", markdown: "# Product home\n" },
			{
				id: "agents-rules-001",
				kind: "rule",
				title: "Rule 1 — Runtime",
				source: ".agents/rules/001-runtime.md",
				markdown: "---\nid: DF-RULE-001\ntitle: Runtime\n---\n# Rule 1 — Runtime\n\n## Requirement\n\nRuntime.\n\n## Rationale\n\nRuntime.\n\n## Enforcement\n\nTest.\n\n## Exceptions\n\nNone.\n\n## Change control\n\nDeliberate.\n",
			},
			{
				id: "agents-notes-adr-0008",
				kind: "adr",
				title: "ADR-0008 — Providers are configuration-driven",
				source: ".agents/notes/adr/0008-providers-are-config-driven.md",
				markdown: "# ADR-0008 — Providers are configuration-driven\n\n**Status**: Accepted\n\n**Related rules**: `DF-RULE-001`\n\n## Decision\n\nDecision.\n\n## Consequences\n\nConsequence.\n",
			},
			{
				id: "agents-notes-adr-0006",
				kind: "adr",
				title: "ADR-0006 — The pipeline runs only df",
				source: ".agents/notes/adr/0006-the-pipeline-runs-only-df.md",
				markdown: "# ADR-0006 — The pipeline runs only df\n\n**Status**: Accepted\n\n**Related rules**: `DF-RULE-001`\n\n## Decision\n\nDecision.\n\n## Consequences\n\nConsequence.\n",
			},
		],
	};
}

describe("README notes projection", () => {
	test("indexes canonical notes in source order without copying the product homepage", () => {
		const markdown = renderReadmeMarkdown(graph());
		expect(markdown.startsWith(README_GENERATED_MARKER)).toBe(true);
		expect(markdown).toContain("# DarkFactory Repository Notes");
		expect(markdown).toContain("ADR-0006");
		expect(markdown).toContain("ADR-0008");
		expect(markdown.indexOf("ADR-0006")).toBeLessThan(markdown.indexOf("ADR-0008"));
		expect(markdown).toContain(".agents/notes/adr/0006-the-pipeline-runs-only-df.md");
		expect(markdown).not.toContain("# Product home");
	});
});
