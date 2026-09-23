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
				id: "agents-notes-adr-0008",
				kind: "adr",
				title: "ADR-0008 — Providers are configuration-driven",
				source: ".agents/notes/adr/0008-providers-are-config-driven.md",
				markdown: "# ADR-0008 — Providers are configuration-driven\n\n**Status**: Accepted\n",
			},
			{
				id: "agents-notes-adr-0006",
				kind: "adr",
				title: "ADR-0006 — The pipeline runs only df",
				source: ".agents/notes/adr/0006-the-pipeline-runs-only-df.md",
				markdown: "# ADR-0006 — The pipeline runs only df\n\n**Status**: Accepted\n",
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
