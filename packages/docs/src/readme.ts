import type { DocsContentGraph, DocsPage } from "./content.ts";

/** Marker prepended to the committed generated repository-notes projection. */
export const README_GENERATED_MARKER =
	"<!-- Generated from .agents/notes/** by @darkfactory/docs. Do not edit README.md directly. -->";

function noteIdentity(page: DocsPage): { id: string; title: string } {
	const match = page.title.match(/^(ADR-\d{4})\s+—\s+(.+)$/u);
	if (match?.[1] && match[2]) return { id: match[1], title: match[2] };
	return { id: page.id, title: page.title };
}

function markdownCell(value: string): string {
	return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

/** Renders current long-term repository notes as the root README index. */
export function renderReadmeMarkdown(graph: DocsContentGraph): string {
	const notes = graph.pages
		.filter(
			(page) =>
				page.source.startsWith(".agents/notes/") &&
				!page.source.endsWith("/README.md") &&
				page.source !== ".agents/notes/README.md",
		)
		.sort((a, b) => a.source.localeCompare(b.source));

	const rows = notes.map((page) => {
		const note = noteIdentity(page);
		return `| \`${markdownCell(note.id)}\` | ${markdownCell(note.title)} | [\`${page.source}\`](${page.source}) |`;
	});

	return `${README_GENERATED_MARKER}

# DarkFactory Repository Notes

This README is the generated index of current long-term repository notes under \`.agents/notes/**\`.
It is not the product specification or active implementation plan.

- Product documentation: [\`docs/home.md\`](docs/home.md)
- Product requirements and architecture: [\`PRD.md\`](PRD.md)
- Repository rules: [\`AGENTS.md\`](AGENTS.md)
- Current repository strategy: [\`PLAN.md\`](PLAN.md)

## Notes index

| Note | Title | Canonical source |
|---|---|---|
${rows.join("\n")}

History that is no longer current belongs in Git and GitHub, not in the live notes index.
`;
}
