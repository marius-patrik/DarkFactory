import type { DocsContentGraph, DocsPage } from "./content.ts";

function frontMatterField(markdown: string, name: string): string {
	const match = markdown.match(new RegExp(`^${name}:\\s*(.+)$`, "mu"));
	if (!match?.[1]) throw new Error(`Rule is missing front-matter field ${name}`);
	return match[1].trim();
}

function requirement(markdown: string): string {
	const match = markdown.match(/(?:^|\n)## Requirement\n([\s\S]*?)(?=\n## Rationale\n)/u);
	if (!match?.[1]) throw new Error("Rule is missing Requirement section");
	return match[1].trim();
}

function projectedHeading(page: DocsPage): string {
	const match = page.markdown.match(/^#\s+(Rule\s+\d+\s+—\s+.+)$/mu);
	if (!match?.[1]) throw new Error(`Rule has invalid heading: ${page.source}`);
	return match[1].trim();
}

function markdownCell(value: string): string {
	return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

/** Renders canonical repository rules as the root AGENTS.md projection. */
export function renderAgentsMarkdown(graph: DocsContentGraph): string {
	const rules = graph.pages.filter((page) => page.kind === "rule").sort((a, b) => a.source.localeCompare(b.source));
	const rows = rules.map((page) => {
		const id = frontMatterField(page.markdown, "id");
		const title = frontMatterField(page.markdown, "title");
		return `| \`${markdownCell(id)}\` | ${markdownCell(title)} | \`${page.source}\` |`;
	});
	const projected = rules.map((page) => `### ${projectedHeading(page)}\n\n${requirement(page.markdown)}`);

	return `# Repository Development Guidelines & Agent Rules

DarkFactory is developed by an autonomous agent pipeline under human approval gates. The rules
below are canonical in \`.agents/rules/\` and binding on every contributor — human or agent.
They are binding regardless of enforcement mechanism. CI, branch protection and tests enforce the portions already automated. This file is a
projection of those canonical files: it carries the normative requirement text of every rule and an
index back to each canonical file for rationale and enforcement. Edit \`.agents/rules/*.md\`; do not
edit this projection.

## Index

| ID | Rule | Canonical file |
|---|---|---|
${rows.join("\n")}


---

${projected.join("\n\n")}
`;
}
