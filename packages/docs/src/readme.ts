import type { DocsContentGraph } from "./content.ts";
import { assertRuleNoteRelations } from "./relations.ts";

/** Marker prepended to the committed generated repository-notes projection. */
export const README_GENERATED_MARKER =
	"<!-- Generated from .agents/notes/** by @darkfactory/docs. Do not edit README.md directly. -->";

function markdownCell(value: string): string {
	return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

/** Renders current long-term repository notes as the root README index. */
export function renderReadmeMarkdown(graph: DocsContentGraph): string {
	const relations = assertRuleNoteRelations(graph);
	const rows = relations.notes.map((note) => {
		const rules = note.ruleIds.map((id) => `\`${id}\``).join(", ");
		return `| \`${markdownCell(note.id)}\` | ${markdownCell(note.title)} | ${rules} | [\`${note.page.source}\`](${note.page.source}) |`;
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

| Note | Title | Related rules | Canonical source |
|---|---|---|---|
${rows.join("\n")}

History that is no longer current belongs in Git and GitHub, not in the live notes index.
`;
}
