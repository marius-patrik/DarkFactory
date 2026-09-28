import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { DocsConfig } from "./config.ts";
import { loadDocsConfig } from "./config.ts";
import { darkFactoryDirectory } from "@darkfactory/protocol/config-document";

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

/** Source path of the single document holding every accepted architecture decision. */
export function adrDocumentSource(repoRoot = process.cwd()): string {
	return `${darkFactoryDirectory()}/ADRs.md`;
}

interface AdrSection {
	heading: string;
	body: string;
}

/**
 * Splits the ADR document into one section per `## ADR-NNNN — Title` heading.
 *
 * The decisions live in one file, so a section rather than a file is the unit of identity. The
 * document's own h1 and its contents list are not a decision and are skipped.
 */
function adrSections(markdown: string): AdrSection[] {
	const lines = markdown.replaceAll("\r\n", "\n").split("\n");
	const sections: AdrSection[] = [];
	let current: AdrSection | undefined;

	for (const line of lines) {
		const heading = /^##\s+(ADR-\d{4}\s+—\s+.+)$/u.exec(line)?.[1];
		if (heading) {
			current = { heading, body: "" };
			sections.push(current);
			continue;
		}
		if (current === undefined) continue;
		// A heading of the same level ends the section; a deeper one belongs to it.
		if (/^##\s+/u.test(line)) {
			current = undefined;
			continue;
		}
		current.body += `${line}\n`;
	}
	return sections;
}

function idFromSource(source: string): string {
	return (
		source
			.replaceAll("\\", "/")
			// A rule is a skill, so its document is SKILL.md inside a per-rule directory. The directory
			// name is the identity; the constant file name would otherwise end every rule id in "-skill".
			.replace(/\/SKILL\.md$/u, "")
			.replace(/\.md$/u, "")
			.replace(/^\.?\//u, "")
			.replace(/[^A-Za-z0-9]+/gu, "-")
			.replace(/^-+|-+$/gu, "")
			.toLowerCase()
	);
}

function markdownPage(repoRoot: string, source: string, kind: DocsPageKind, id?: string): DocsPage {
	const absolute = join(repoRoot, source);
	if (!existsSync(absolute)) throw new Error(`Documentation source does not exist: ${source}`);
	const markdown = readFileSync(absolute, "utf8").replaceAll("\r\n", "\n");
	if (kind === "adr" && !/^\*\*Status\*\*:\s*Accepted\s*$/mu.test(markdown))
		throw new Error(`ADR must have Status: Accepted: ${source}`);
	return {
		id: id ?? idFromSource(source),
		kind,
		title: titleFromMarkdown(markdown, basename(source, ".md")),
		source: source.replaceAll("\\", "/"),
		markdown,
	};
}

/**
 * Every accepted ADR as its own page, carrying the section text.
 *
 * A page is the unit the graph and the rule/ADR relation contract work in, so splitting one document
 * into sections keeps both working while the decisions themselves are authored in a single file.
 */
function adrPages(repoRoot: string): DocsPage[] {
	const source = adrDocumentSource(repoRoot);
	if (!existsSync(join(repoRoot, source))) return [];
	const markdown = readFileSync(join(repoRoot, source), "utf8").replaceAll("\r\n", "\n");
	return adrSections(markdown).map((section) => {
		const heading = section.heading;
		if (!/^\*\*Status\*\*:\s*Accepted\s*$/mu.test(section.body))
			throw new Error(`ADR must have Status: Accepted: ${heading}`);
		// The heading is the title and the body is what the checks read, so the section is rendered
		// as it would be as a page of its own.
		return {
			id: idFromSource(`${source}#${heading}`),
			kind: "adr" as const,
			title: heading,
			source: source.replaceAll("\\", "/"),
			markdown: `# ${heading}\n${section.body}`,
		};
	});
}

/** The plugin holding the binding repository rules, one skill per rule. */
export const RULES_PLUGIN = ".darkfactory/plugins/df-rules";

/**
 * Every canonical rule, as a relative source path.
 *
 * A rule is a skill, so it lives at `<plugin>/skills/<rule-number-slug>/SKILL.md` rather than in a
 * flat directory of markdown. An agent then loads the one rule its change needs instead of carrying
 * the whole rulebook in every session, which is the point of a skill. The rule's own front matter
 * fields are kept verbatim, so `ruleFrontMatterField` still reads them and a rule is declared once.
 */
export function ruleSources(repoRoot: string): string[] {
	const skills = join(repoRoot, RULES_PLUGIN, "skills");
	if (!existsSync(skills)) return [];
	return readdirSync(skills, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(join(skills, entry.name, "SKILL.md")))
		.map((entry) => `${RULES_PLUGIN}/skills/${entry.name}/SKILL.md`)
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
export function compileDocsContentGraph(
	repoRoot: string,
	config: DocsConfig = loadDocsConfig(repoRoot),
	api?: DocsApiReference,
): DocsContentGraph {
	const pages: DocsPage[] = [markdownPage(repoRoot, config.home, "home", "home")];
	for (const source of ruleSources(repoRoot)) pages.push(markdownPage(repoRoot, source, "rule"));
	pages.push(...adrPages(repoRoot));
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
