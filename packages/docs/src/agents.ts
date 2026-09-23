import type { DocsContentGraph, DocsPage } from "./content.ts";
import { assertRuleNoteRelations } from "./relations.ts";

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
	const relations = assertRuleNoteRelations(graph);
	const rules = relations.rules;
	const rows = rules.map((rule) => {
		const related = relations.ruleNotes.get(rule.id) ?? [];
		const notes = related.length > 0 ? related.map((id) => `\`${id}\``).join(", ") : "—";
		return `| \`${markdownCell(rule.id)}\` | ${markdownCell(rule.title)} | ${notes} | \`${rule.page.source}\` |`;
	});
	const projected = rules.map((rule) => `### ${projectedHeading(rule.page)}\n\n${requirement(rule.page.markdown)}`);

	return `# Repository Development Guidelines & Agent Rules

DarkFactory is developed by an autonomous agent pipeline under human approval gates. The rules
below are canonical in `.agents/rules/` and binding on every contributor — human or agent.
They are binding regardless of enforcement mechanism. CI, branch protection and tests enforce the portions already automated. This file is a
projection of those canonical files: it carries the normative requirement text of every rule and an
index back to each canonical file for rationale and enforcement. Related notes are derived from
accepted ADR metadata; edit canonical rules/notes rather than this projection.

## Index

| ID | Rule | Related notes | Canonical file |
|---|---|---|---|
${rows.join("\n")}


---

${projected.join("\n\n")}
`;
}
