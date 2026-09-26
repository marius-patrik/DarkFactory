import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, posix } from "node:path";
import type { DocsApiSymbol, DocsContentGraph, DocsPage } from "@darkfactory/docs/content";

function escapeHtml(value: string): string {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function pageOutput(page: DocsPage): string {
	return page.id === "home" ? "index.html" : `${page.id}/index.html`;
}

function pageHref(from: DocsPage, to: DocsPage): string {
	const relative = posix.relative(posix.dirname(pageOutput(from)), posix.dirname(pageOutput(to)));
	return relative ? `${relative}/` : "./";
}

function renderInline(raw: string, page: DocsPage, graph: DocsContentGraph): string {
	const sourceMap = new Map(graph.pages.map((candidate) => [posix.normalize(candidate.source), candidate]));
	let output = "";
	let cursor = 0;
	const links = /\[([^\]]+)\]\(([^)]+)\)/gu;
	for (const match of raw.matchAll(links)) {
		const index = match.index ?? 0;
		output += escapeHtml(raw.slice(cursor, index));
		const label = escapeHtml(match[1] ?? "");
		const target = match[2] ?? "";
		if (/^(?:https?:|mailto:|#)/u.test(target)) {
			output += `<a href="${escapeHtml(target)}">${label}</a>`;
		} else {
			const [pathPart, anchor] = target.split("#", 2);
			const normalized = posix.normalize(posix.join(posix.dirname(page.source), pathPart || ""));
			const destination = sourceMap.get(normalized);
			const href = destination ? pageHref(page, destination) + (anchor ? `#${anchor}` : "") : target;
			output += `<a href="${escapeHtml(href)}">${label}</a>`;
		}
		cursor = index + match[0].length;
	}
	output += escapeHtml(raw.slice(cursor));
	return output
		.replace(/`([^`]+)`/gu, "<code>$1</code>")
		.replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>")
		.replace(/\*([^*]+)\*/gu, "<em>$1</em>");
}

function tableCells(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/u, "")
		.replace(/\|$/u, "")
		.split("|")
		.map((cell) => cell.trim());
}

function renderMarkdown(markdown: string, page: DocsPage, graph: DocsContentGraph): string {
	const lines = markdown.replaceAll("\r\n", "\n").split("\n");
	const html: string[] = [];
	let paragraph: string[] = [];
	let code: string[] | null = null;
	let language = "";
	let list: "ul" | "ol" | null = null;
	const flushParagraph = () => {
		if (paragraph.length) html.push(`<p>${renderInline(paragraph.join(" "), page, graph)}</p>`);
		paragraph = [];
	};
	const closeList = () => {
		if (list) html.push(`</${list}>`);
		list = null;
	};
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const fence = line.match(/^```(.*)$/u);
		if (fence) {
			flushParagraph();
			closeList();
			if (code) {
				html.push(
					`<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`,
				);
				code = null;
				language = "";
			} else {
				code = [];
				language = fence[1]?.trim() ?? "";
			}
			continue;
		}
		if (code) {
			code.push(line);
			continue;
		}
		if (!line.trim()) {
			flushParagraph();
			closeList();
			continue;
		}
		const heading = line.match(/^(#{1,6})\s+(.+)$/u);
		if (heading) {
			flushParagraph();
			closeList();
			const level = heading[1]!.length;
			const title = heading[2]!;
			const id = title
				.toLowerCase()
				.replace(/[^a-z0-9]+/gu, "-")
				.replace(/^-|-$/gu, "");
			html.push(`<h${level} id="${id}">${renderInline(title, page, graph)}</h${level}>`);
			continue;
		}
		if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/u.test(lines[i + 1] ?? "")) {
			flushParagraph();
			closeList();
			const headers = tableCells(line);
			i++;
			const rows: string[][] = [];
			while (i + 1 < lines.length && (lines[i + 1] ?? "").includes("|") && (lines[i + 1] ?? "").trim())
				rows.push(tableCells(lines[++i] ?? ""));
			html.push(
				"<table><thead><tr>" +
					headers.map((cell) => `<th>${renderInline(cell, page, graph)}</th>`).join("") +
					"</tr></thead><tbody>",
			);
			for (const row of rows)
				html.push("<tr>" + row.map((cell) => `<td>${renderInline(cell, page, graph)}</td>`).join("") + "</tr>");
			html.push("</tbody></table>");
			continue;
		}
		const unordered = line.match(/^\s*[-*+]\s+(.+)$/u);
		const ordered = line.match(/^\s*\d+\.\s+(.+)$/u);
		if (unordered || ordered) {
			flushParagraph();
			const wanted: "ul" | "ol" = unordered ? "ul" : "ol";
			if (list !== wanted) {
				closeList();
				list = wanted;
				html.push(`<${list}>`);
			}
			html.push(`<li>${renderInline((unordered ?? ordered)![1]!, page, graph)}</li>`);
			continue;
		}
		const quote = line.match(/^>\s?(.*)$/u);
		if (quote) {
			flushParagraph();
			closeList();
			html.push(`<blockquote>${renderInline(quote[1] ?? "", page, graph)}</blockquote>`);
			continue;
		}
		if (/^---+$/u.test(line.trim())) {
			flushParagraph();
			closeList();
			html.push("<hr>");
			continue;
		}
		paragraph.push(line.trim());
	}
	flushParagraph();
	closeList();
	if (code) html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
	return html.join("\n");
}

function navigation(page: DocsPage, graph: DocsContentGraph): string {
	const links = graph.pages.map(
		(target) =>
			`<a${target.id === page.id ? ' aria-current="page"' : ""} href="${pageHref(page, target)}">${escapeHtml(target.title)}</a>`,
	);
	if (graph.api) {
		const relative = posix.relative(posix.dirname(pageOutput(page)), "api") || ".";
		links.push(`<a href="${relative}/">API</a>`);
	}
	return links.join("");
}

function shell(title: string, nav: string, body: string, description?: string): string {
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>${description ? `<meta name="description" content="${escapeHtml(description)}">` : ""}<style>:root{color-scheme:light dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;line-height:1.55}body{margin:0;display:grid;grid-template-columns:minmax(14rem,20rem) minmax(0,1fr);min-height:100vh}nav{padding:1.25rem;border-right:1px solid color-mix(in srgb,currentColor 18%,transparent);overflow:auto}nav a{display:block;padding:.35rem .5rem;border-radius:.4rem;color:inherit;text-decoration:none}nav a[aria-current=page],nav a:hover{background:color-mix(in srgb,currentColor 10%,transparent)}main{max-width:70rem;width:min(100% - 3rem,70rem);margin:0 auto;padding:2rem 0 5rem}pre{overflow:auto;padding:1rem;border-radius:.5rem;background:color-mix(in srgb,currentColor 8%,transparent)}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}table{border-collapse:collapse;width:100%;display:block;overflow:auto}th,td{border:1px solid color-mix(in srgb,currentColor 20%,transparent);padding:.45rem .65rem;text-align:left}blockquote{margin-left:0;padding-left:1rem;border-left:.25rem solid color-mix(in srgb,currentColor 30%,transparent)}a{color:inherit}.api-symbol{padding:.6rem 0;border-bottom:1px solid color-mix(in srgb,currentColor 12%,transparent)}.api-kind{opacity:.65;font-size:.85em}@media(max-width:800px){body{display:block}nav{border-right:0;border-bottom:1px solid color-mix(in srgb,currentColor 18%,transparent)}main{width:min(100% - 2rem,70rem)}}</style></head><body><nav>${nav}</nav><main>${body}</main></body></html>`;
}

function renderApiSymbol(symbol: DocsApiSymbol, depth = 2): string {
	const level = Math.min(depth, 6);
	const children = symbol.children.map((child) => renderApiSymbol(child, level + 1)).join("");
	return `<section class="api-symbol"><h${level}>${escapeHtml(symbol.name)} <span class="api-kind">${escapeHtml(symbol.kind)}</span></h${level}>${symbol.summary ? `<p>${escapeHtml(symbol.summary)}</p>` : ""}${children}</section>`;
}

/** Renders the canonical docs graph into a static GitHub Pages artifact. */
export async function renderDocsSite(graph: DocsContentGraph, outputDir: string): Promise<void> {
	await rm(outputDir, { recursive: true, force: true });
	await mkdir(outputDir, { recursive: true });
	for (const page of graph.pages) {
		const output = join(outputDir, pageOutput(page));
		await mkdir(join(output, ".."), { recursive: true });
		await writeFile(
			output,
			shell(page.title, navigation(page, graph), renderMarkdown(page.markdown, page, graph), graph.site.description),
		);
	}
	if (graph.api) {
		const apiPage: DocsPage = { id: "api", kind: "home", title: graph.api.name, source: "api", markdown: "" };
		const body = `<h1>${escapeHtml(graph.api.name)}</h1>${graph.api.symbols.map((symbol) => renderApiSymbol(symbol)).join("")}`;
		await mkdir(join(outputDir, "api"), { recursive: true });
		await writeFile(
			join(outputDir, "api", "index.html"),
			shell(graph.api.name, navigation(apiPage, graph), body, graph.site.description),
		);
	}
	await writeFile(join(outputDir, "content.json"), JSON.stringify(graph, null, 2) + "\n");
	await writeFile(join(outputDir, ".nojekyll"), "");
}
