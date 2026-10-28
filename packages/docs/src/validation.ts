import { posix } from "node:path";
import { parseDocsConfig } from "./config.ts";
import type { DocsContentGraph, DocsPage } from "./content.ts";
import { GUIDE_SECTIONS } from "./guides.ts";

function anchors(markdown: string): ReadonlySet<string> {
	const result = new Set<string>();
	for (const match of markdown.matchAll(/^#{1,6}\s+(.+)$/gmu)) {
		result.add(
			(match[1] ?? "")
				.toLowerCase()
				.replace(/[^a-z0-9]+/gu, "-")
				.replace(/^-|-$/gu, ""),
		);
	}
	return result;
}

function proseOnly(markdown: string): string {
	return markdown.replace(/^```[\s\S]*?^```\s*$/gmu, "");
}

/** Validate authored guides, source-backed references, navigation, links and anchors. */
export function documentationFindings(graph: DocsContentGraph): readonly string[] {
	const findings: string[] = [];
	const byId = new Map<string, DocsPage>();
	const bySource = new Map<string, DocsPage>();
	for (const page of graph.pages) {
		if (byId.has(page.id)) findings.push(`Duplicate page id: ${page.id}`);
		if (!/^[a-z0-9-]+$/u.test(page.id)) findings.push(`Invalid page id: ${page.id}`);
		byId.set(page.id, page);
		bySource.set(posix.normalize(page.source), page);
	}
	if (!byId.has(graph.home)) findings.push(`Missing home page: ${graph.home}`);
	const groups = new Set<string>();
	const navigated = new Set<string>();
	for (const group of graph.navigation ?? []) {
		if (groups.has(group.id)) findings.push(`Duplicate navigation group: ${group.id}`);
		groups.add(group.id);
		if (!group.pages.length) findings.push(`Empty navigation group: ${group.id}`);
		for (const id of group.pages) {
			if (!byId.has(id)) findings.push(`Navigation target missing: ${id}`);
			if (navigated.has(id)) findings.push(`Duplicate navigation page: ${id}`);
			navigated.add(id);
		}
	}
	for (const page of graph.pages) {
		if (!navigated.has(page.id)) findings.push(`Unlisted navigation page: ${page.id}`);
	}
	const requiredSections = [
		"introduction",
		"getting-started",
		"operator",
		"cli",
		"configuration",
		"architecture",
		"capabilities",
		"administration",
		"development",
		"release",
		"reference",
		"security",
	];
	for (const sectionId of requiredSections) {
		if (!GUIDE_SECTIONS.some((section) => section.id === sectionId))
			findings.push(`Required guide section missing: ${sectionId}`);
	}
	for (const section of GUIDE_SECTIONS)
		for (const guide of section.pages) {
			const id = `guide-${section.id}-${guide.slug}`;
			if (!byId.has(id)) findings.push(`Required guide missing: ${id}`);
		}
	if (!byId.has("reference-cli") || !byId.has("reference-config"))
		findings.push("Missing generated command/config reference");
	for (const page of graph.pages) {
		if (page.kind !== "guide" && page.kind !== "reference") continue;
		const prose = proseOnly(page.markdown);
		for (const block of page.markdown.matchAll(/^```json\s*\n([\s\S]*?)^```\s*$/gmu)) {
			try {
				const value = JSON.parse(block[1] ?? "");
				if (value && typeof value === "object" && "docs" in value) {
					// Use the canonical docs parser to verify the embedded fragment, not a shadow schema.
					parseDocsConfig(JSON.stringify((value as Record<string, unknown>).docs));
				}
			} catch (error) {
				findings.push(`${page.source}: invalid JSON/configuration example: ${String(error)}`);
			}
		}
		if (/<\s*\/?\s*(script|iframe|object|embed|form|svg|style|img)\b/iu.test(prose) || /on\w+\s*=/iu.test(prose)) {
			findings.push(`${page.source}: executable HTML is prohibited`);
		}
		for (const match of prose.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu)) {
			const target = match[1] ?? "";
			if (!target) continue;
			if (/[\u0000-\u001f\u007f]/u.test(target)) {
				findings.push(`${page.source}: control character in link`);
				continue;
			}
			if (/^(https?:\/\/|mailto:)/iu.test(target)) continue;
			if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(target)) {
				findings.push(`${page.source}: unsafe scheme: ${target}`);
				continue;
			}
			const [path, anchor] = target.split("#", 2);
			if (path?.startsWith("/") || path?.startsWith("\\")) {
				findings.push(`${page.source}: root-relative Pages link: ${target}`);
				continue;
			}
			let decoded: string;
			try {
				decoded = decodeURIComponent(path || "");
			} catch {
				findings.push(`${page.source}: invalid URL encoding: ${target}`);
				continue;
			}
			const source = decoded ? posix.normalize(posix.join(posix.dirname(page.source), decoded)) : page.source;
			const linked = bySource.get(source);
			if (!linked) {
				findings.push(`${page.source}: unresolved source: ${target}`);
				continue;
			}
			if (anchor && !anchors(linked.markdown).has(anchor.toLowerCase()))
				findings.push(`${page.source}: missing anchor: ${target}`);
		}
	}
	return findings;
}

/** Fail closed rather than equating HTML generation with documentation correctness. */
export function assertStrictDocumentation(graph: DocsContentGraph): void {
	const findings = documentationFindings(graph);
	if (findings.length) throw new Error(`Strict documentation validation failed:\n${findings.join("\n")}`);
}
