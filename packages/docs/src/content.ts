import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { DocsConfig } from "./config.ts";
import { loadDocsConfig } from "./config.ts";

/** Semantic kind assigned to a documentation page. */
export type DocsPageKind = "home" | "product" | "plan" | "rules" | "rule" | "decisions" | "adr";

/** One canonical Markdown page in the DarkFactory content graph. */
export interface DocsPage {
	id: string;
	kind: DocsPageKind;
	title: string;
	source: string;
	markdown: string;
}

/** Deterministic summary of one GitHub Actions workflow. */
export interface DocsWorkflowSummary {
	source: string;
	name: string;
	jobs: readonly string[];
}

/** Typed headless documentation content graph consumed by renderers. */
export interface DocsContentGraph {
	version: 1;
	site: DocsConfig["site"];
	home: string;
	pages: readonly DocsPage[];
	workflows: readonly DocsWorkflowSummary[];
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
	if (kind === "adr" && !/^\*\*Status\*\*:\s*Accepted\s*$/mu.test(markdown)) {
		throw new Error(`ADR must have Status: Accepted: ${source}`);
	}
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

/** Compiles canonical repository documentation into a deterministic typed content graph. */
export function compileDocsContentGraph(repoRoot: string, config: DocsConfig = loadDocsConfig(repoRoot)): DocsContentGraph {
	const pages: DocsPage[] = [markdownPage(repoRoot, config.home, "home", "home")];
	for (const [source, kind, id] of [
		["PRD.md", "product", "prd"],
		["PLAN.md", "plan", "plan"],
		["AGENTS.md", "rules", "agents"],
	] as const) {
		if (source !== config.home && existsSync(join(repoRoot, source))) pages.push(markdownPage(repoRoot, source, kind, id));
	}

	const rulesRoot = join(repoRoot, ".agents", "rules");
	for (const name of markdownFiles(rulesRoot)) {
		pages.push(markdownPage(repoRoot, join(".agents", "rules", name), "rule"));
	}

	const adrRoot = join(repoRoot, ".agents", "notes", "adr");
	for (const name of markdownFiles(adrRoot)) {
		const kind: DocsPageKind = name === "README.md" ? "decisions" : "adr";
		pages.push(markdownPage(repoRoot, join(".agents", "notes", "adr", name), kind));
	}

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

	return {
		version: 1,
		site: config.site,
		home: "home",
		pages,
		workflows,
	};
}
