import type { DocsContentGraph, DocsPage } from "./content.ts";

/** Parsed metadata for one canonical repository rule. */
export interface DocsRuleRelationEntry {
	id: string;
	title: string;
	page: DocsPage;
}

/** Parsed metadata for one current long-term repository note. */
export interface DocsNoteRelationEntry {
	id: string;
	title: string;
	page: DocsPage;
	ruleIds: readonly string[];
}

/** Bidirectional rule/note relationship analysis plus semantic findings. */
export interface RuleNoteRelationAnalysis {
	rules: readonly DocsRuleRelationEntry[];
	notes: readonly DocsNoteRelationEntry[];
	ruleNotes: ReadonlyMap<string, readonly string[]>;
	findings: readonly string[];
}

/** Reads one required scalar field from rule YAML front matter. */
export function ruleFrontMatterField(markdown: string, name: string): string {
	const match = markdown.match(new RegExp(`^${name}:\\s*(.+)$`, "mu"));
	if (!match?.[1]) throw new Error(`Rule is missing front-matter field ${name}`);
	return match[1].trim();
}

/** Returns the stable id/title encoded in an ADR heading. */
export function noteIdentity(page: DocsPage): { id: string; title: string } {
	const match = page.title.match(/^(ADR-\d{4})\s+—\s+(.+)$/u);
	if (match?.[1] && match[2]) return { id: match[1], title: match[2] };
	return { id: page.id, title: page.title };
}

function relatedRuleIds(page: DocsPage): readonly string[] {
	const match = page.markdown.match(/^\*\*Related rules\*\*:\s*(.+)$/mu);
	if (!match?.[1]) return [];
	const ids = [...match[1].matchAll(/DF-RULE-\d{3}/gu)].map((item) => item[0]);
	return [...new Set(ids)];
}

/** Analyzes canonical ADR -> rule links and derives the reverse rule -> ADR index. */
export function analyzeRuleNoteRelations(graph: DocsContentGraph): RuleNoteRelationAnalysis {
	const findings: string[] = [];
	const rules: DocsRuleRelationEntry[] = [];
	const ruleIds = new Set<string>();

	for (const page of graph.pages.filter((candidate) => candidate.kind === "rule").sort((a, b) => a.source.localeCompare(b.source))) {
		let id = "";
		let title = "";
		try {
			id = ruleFrontMatterField(page.markdown, "id");
			title = ruleFrontMatterField(page.markdown, "title");
		} catch (error) {
			findings.push(`${page.source}: ${error instanceof Error ? error.message : String(error)}`);
			continue;
		}
		if (!/^DF-RULE-\d{3}$/u.test(id)) findings.push(`${page.source}: invalid rule id ${id}`);
		if (ruleIds.has(id)) findings.push(`${page.source}: duplicate rule id ${id}`);
		ruleIds.add(id);
		rules.push({ id, title, page });
	}

	const notes: DocsNoteRelationEntry[] = [];
	const noteIds = new Set<string>();
	for (const page of graph.pages.filter((candidate) => candidate.kind === "adr").sort((a, b) => a.source.localeCompare(b.source))) {
		const note = noteIdentity(page);
		if (!/^ADR-\d{4}$/u.test(note.id)) findings.push(`${page.source}: invalid ADR id ${note.id}`);
		if (noteIds.has(note.id)) findings.push(`${page.source}: duplicate ADR id ${note.id}`);
		noteIds.add(note.id);
		const ruleIdsForNote = relatedRuleIds(page);
		if (ruleIdsForNote.length === 0) findings.push(`${page.source}: accepted ADR must declare Related rules`);
		for (const ruleId of ruleIdsForNote) {
			if (!ruleIds.has(ruleId)) findings.push(`${page.source}: unknown related rule ${ruleId}`);
		}
		notes.push({ ...note, page, ruleIds: ruleIdsForNote });
	}

	const reverse = new Map<string, string[]>();
	for (const rule of rules) reverse.set(rule.id, []);
	for (const note of notes) {
		for (const ruleId of note.ruleIds) reverse.get(ruleId)?.push(note.id);
	}
	const ruleNotes = new Map<string, readonly string[]>(
		[...reverse.entries()].map(([ruleId, ids]) => [ruleId, [...ids].sort((a, b) => a.localeCompare(b))]),
	);
	return { rules, notes, ruleNotes, findings };
}

/** Returns valid rule/note relations or throws with all semantic alignment findings. */
export function assertRuleNoteRelations(graph: DocsContentGraph): RuleNoteRelationAnalysis {
	const analysis = analyzeRuleNoteRelations(graph);
	if (analysis.findings.length > 0) throw new Error(`Rule/note relationship contract failed:\n${analysis.findings.join("\n")}`);
	return analysis;
}
