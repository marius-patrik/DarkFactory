import type { DocsContentGraph } from "./content.ts";

/** Deterministic, searchable read-only projection of canonical documentation. */
export interface DocsSearchEntry {
	id: string;
	title: string;
	kind: string;
	path: string;
	snippet: string;
}

export function docsSearchIndex(graph: DocsContentGraph): readonly DocsSearchEntry[] {
	return graph.pages.map((page) => {
		const plain = page.markdown
			.replace(/^```[\s\S]*?^```\s*$/gmu, " ")
			.replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
			.replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
			.replace(/[#*|_`>]/gu, " ")
			.replace(/\s+/gu, " ")
			.trim();
		return {
			id: page.id,
			title: page.title,
			kind: page.kind,
			path: page.id === graph.home ? "./" : `${page.id}/`,
			snippet: plain.slice(0, 480),
		};
	});
}
