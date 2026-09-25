import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { DocsConfig } from "./config.ts";
import { loadDocsConfig } from "./config.ts";

/** Semantic kind assigned to a documentation page. */
export type DocsPageKind = "home" | "product" | "plan" | "rules" | "rule" | "note" | "adr" | "capability";

/** One canonical Markdown page in the DarkFactory content graph. */
export interface DocsPage {
	id: string;
	kind: DocsPageKind;
	title: string;
	source: string;
	markdown: string;
}

/** One documented public API symbol. */
export interface DocsApiSymbol {
	name: string;
	kind: string;
	summary?: string;
	children: readonly DocsApiSymbol[];
}

/** Generated public API reference carried by the canonical content graph. */
export interface DocsApiReference {
	name: string;
	symbols: readonly DocsApiSymbol[];
}

/** Deterministic summary of one GitHub Actions workflow. */
export interface DocsWorkflowSummary {
	source: string;
	name: string;
	jobs: readonly string[];
}

/** Browser-safe summary of one detected repository package. */
export interface DocsRepositoryPackageSummary {
	id: string;
	path: string;
	name: string;
	ecosystem: string;
	packageManager: string;
	domains: readonly string[];
	apiEntryPoints: readonly string[];
}

/** Browser-safe repository evidence carried by the documentation graph. */
export interface DocsRepositorySummary {
	repoDfPath?: string;
	defaultBranch?: string;
	ecosystems: readonly string[];
	domains: readonly string[];
	packages: readonly DocsRepositoryPackageSummary[];
}

/** Graph-node contribution declared by one capability. */
export interface DocsCapabilityGraphSummary {
	id: string;
	nodeKinds: readonly string[];
}

/** Browser-safe metadata for one applicable DarkFactory capability. */
export interface DocsCapabilitySummary {
	id: string;
	version: string;
	description: string;
	domains: readonly string[];
	detectors: readonly string[];
	commands: readonly string[];
	graph: readonly DocsCapabilityGraphSummary[];
	hooks: readonly string[];
	verification: readonly string[];
	docs: readonly string[];
}

/** Typed headless documentation content graph consumed by @darkfactory/web. */
export interface DocsContentGraph {
	version: 1;
	site: DocsConfig["site"];
	home: string;
	pages: readonly DocsPage[];
	workflows: readonly DocsWorkflowSummary[];
	repository?: DocsRepositorySummary;
	capabilities?: readonly DocsCapabilitySummary[];
	api?: DocsApiReference;
}

function titleFromMarkdown(markdown: string, fallback: string): string {
	const match = markdown.match(/^#\s+(.+)$/m);
	return match?.[1]?.trim() || fallback;
}

function idFromSource(source: string): string {
	return source
		.replaceAll("\\", "/")
		.replace(/\.md$/u, "")
		.replace(/^\.?\//u, "")
		.replace(/[^A-Za-z0-9]+/gu, "-")
		.replace(/^-+|-+$/gu, "")
		.toLowerCase();
}

function markdownPage(repoRoot: string, source: string, kind: DocsPageKind, id?: string): DocsPage {
	const absolute = join(repoRoot, source);
	if (!existsSync(absolute)) throw new Error(`Documentation source does not exist: ${source}`);
	const markdown = readFileSync(absolute, "utf8").replaceAll("\r\n", "\n");
	if (kind === "adr" && !/^\*\*Status\*\*:\s*Accepted\s*$/mu.test(markdown)) throw new Error(`ADR must have Status: Accepted: ${source}`);
	return {
		id: id ?? idFromSource(source),
		kind,
		title: titleFromMarkdown(markdown, basename(source, ".md")),
		source: source.replaceAll("\\", "/"),
		markdown,
	};
}

function markdownFiles(directory: string): string[] {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
		.map((entry) => entry.name)
		.sort((a, b) => a.localeCompare(b));
}

function workflowSummary(repoRoot: string, source: string): DocsWorkflowSummary {
	const text = readFileSync(join(repoRoot, source), "utf8").replaceAll("\r\n", "\n");
	const name = text.match(/^name:\s*["']?(.+?)["']?\s*$/mu)?.[1]?.trim() || basename(source);
	const jobs: string[] = [];
	let inJobs = false;
	for (const line of text.split("\n")) {
		if (/^jobs:\s*$/u.test(line)) {
			inJobs = true;
			continue;
		}
		if (inJobs && /^\S/u.test(line) && line.trim()) break;
		if (inJobs) {
			const match = line.match(/^\s{2}([A-Za-z0-9_-]+):\s*$/u);
			if (match?.[1]) jobs.push(match[1]);
		}
	}
	return { source: source.replaceAll("\\", "/"), name, jobs };
}

/** Adds capability-declared Markdown documentation to an existing content graph. */
export function includeCapabilityDocumentation(
	repoRoot: string,
	graph: DocsContentGraph,
	capabilities: readonly DocsCapabilitySummary[],
): DocsContentGraph {
	const pages = [...graph.pages];
	const sources = new Set(pages.map((page) => page.source));
	const ids = new Set(pages.map((page) => page.id));
	for (const capability of [...capabilities].sort((a, b) => a.id.localeCompare(b.id))) {
		for (const source of [...capability.docs].sort((a, b) => a.localeCompare(b))) {
			const normalized = source.replaceAll("\\", "/");
			if (sources.has(normalized)) continue;
			const id = `capability-${capability.id}-${idFromSource(normalized)}`;
			if (ids.has(id)) throw new Error(`Duplicate capability documentation page id: ${id}`);
			pages.push(markdownPage(repoRoot, normalized, "capability", id));
			sources.add(normalized);
			ids.add(id);
		}
	}
	return { ...graph, pages };
}

/** Compiles canonical repository documentation into a deterministic typed content graph. */
export function compileDocsContentGraph(repoRoot: string, config: DocsConfig = loadDocsConfig(repoRoot), api?: DocsApiReference): DocsContentGraph {
	const pages: DocsPage[] = [markdownPage(repoRoot, config.home, "home", "home")];
	const rulesRoot = join(repoRoot, ".agents", "notes", "rules");
	for (const name of markdownFiles(rulesRoot)) pages.push(markdownPage(repoRoot, join(".agents", "notes", "rules", name), "rule"));
	const adrRoot = join(repoRoot, ".agents", "notes", "adr");
	for (const name of markdownFiles(adrRoot)) pages.push(markdownPage(repoRoot, join(".agents", "notes", "adr", name), "adr"));
	const workflowRoot = join(repoRoot, ".github", "workflows");
	const workflows = existsSync(workflowRoot)
		? readdirSync(workflowRoot, { withFileTypes: true })
				.filter((entry) => entry.isFile() && /\.ya?ml$/u.test(entry.name))
				.map((entry) => relative(repoRoot, join(workflowRoot, entry.name)).replaceAll("\\", "/"))
				.sort((a, b) => a.localeCompare(b))
				.map((source) => workflowSummary(repoRoot, source))
		: [];
	const ids = new Set<string>();
	for (const page of pages) {
		if (ids.has(page.id)) throw new Error(`Duplicate documentation page id: ${page.id}`);
		ids.add(page.id);
	}
	return { version: 1, site: config.site, home: "home", pages, workflows, ...(api ? { api } : {}) };
}
