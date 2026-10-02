import type { DocsContentGraph } from "./content.ts";

/** Marker prepended to the committed generated README projection. */
export const README_GENERATED_MARKER =
	"<!-- Generated from docs/home.md by @darkfactory/docs. Do not edit README.md directly. -->";

/** Renders the canonical home page as repository-root README Markdown. */
export function renderReadmeMarkdown(graph: DocsContentGraph): string {
	const home = graph.pages.find((page) => page.id === graph.home);
	if (!home) throw new Error(`Documentation graph home page not found: ${graph.home}`);
	const markdown = home.markdown.replace(/\]\(\.\.\/([^)]*)\)/gu, "]($1)").trimEnd();
	return `${README_GENERATED_MARKER}\n\n${markdown}\n`;
}
