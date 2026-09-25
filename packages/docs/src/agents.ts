import type { DocsContentGraph, DocsPage } from "./content.ts";
import { assertRuleNoteRelations } from "./relations.ts";

/** Marker prepended to the committed generated repository-rules projection. */
export const AGENTS_GENERATED_MARKER =
	"<!-- Generated from .agents/rules/** and .agents/adr/** by @darkfactory/docs. Do not edit .agents/AGENTS.md directly. -->";

/** Marker prepended to the committed generated product-requirements projection. */
export const PRD_GENERATED_MARKER =
	"<!-- Generated from .agents/adr/** by @darkfactory/docs. Do not edit .agents/PRD.md directly. -->";

/** Marker prepended to the committed generated repository-notes projection. */
export const README_GENERATED_MARKER =
	"<!-- Generated from .agents/notes/** by @darkfactory/docs. Do not edit .agents/README.md directly. -->";

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

function notePages(graph: DocsContentGraph, kind: DocsPage["kind"]): DocsPage[] {
	return graph.pages.filter((page) => page.kind === kind).sort((a, b) => a.source.localeCompare(b.source));
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

	return `${AGENTS_GENERATED_MARKER}\n\n# Repository Development Guidelines & Agent Rules\n\nDarkFactory is developed by an autonomous agent pipeline under human approval gates. The rules\nbelow are canonical in \`.agents/rules/\` and binding on every contributor — human or agent.\nThey are binding regardless of enforcement mechanism. CI, branch protection and tests enforce the portions already automated. This file is a\nprojection of those canonical files: it carries the normative requirement text of every rule and an\nindex back to each canonical file for rationale and enforcement. Related notes are derived from\naccepted ADR metadata; edit canonical rules/ADRs rather than this projection.\n\n## Index\n\n| ID | Rule | Related notes | Canonical file |\n|---|---|---|---|\n${rows.join("\n")}\n\n\n---\n\n${projected.join("\n\n")}\n`;
}

/** Renders accepted ADRs as the generated product-requirements projection. */
export function renderPrdMarkdown(graph: DocsContentGraph): string {
	assertRuleNoteRelations(graph);
	const adrs = notePages(graph, "adr");
	if (adrs.length === 0) throw new Error("At least one accepted ADR is required");
	return `${PRD_GENERATED_MARKER}\n\n# Product Requirements\n\n${adrs.map((page) => page.markdown.trim()).join("\n\n---\n\n")}\n`;
}

/** Renders non-normative repository and domain notes as the generated README projection. */
export function renderNotesMarkdown(graph: DocsContentGraph): string {
	const notes = notePages(graph, "note");
	if (notes.length === 0) throw new Error("At least one repository note is required");
	return `${README_GENERATED_MARKER}\n\n${notes.map((page) => page.markdown.trim()).join("\n\n")}\n`;
}
