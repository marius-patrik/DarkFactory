import { adrDocumentSource, type DocsContentGraph, type DocsPage } from "./content.ts";

/** Parsed metadata for one canonical repository rule. */
interface DocsRuleRelationEntry {
	id: string;
	title: string;
	page: DocsPage;
}

/** Parsed metadata for one current long-term repository note. */
interface DocsNoteRelationEntry {
	id: string;
	title: string;
	page: DocsPage;
	ruleIds: readonly string[];
}

/** Bidirectional rule/note relationship analysis plus semantic findings. */
interface RuleNoteRelationAnalysis {
	rules: readonly DocsRuleRelationEntry[];
	notes: readonly DocsNoteRelationEntry[];
	ruleNotes: ReadonlyMap<string, readonly string[]>;
	findings: readonly string[];
}

/** Reads one required scalar field from rule YAML front matter. */
function ruleFrontMatterField(markdown: string, name: string): string {
	const match = markdown.match(new RegExp(`^${name}:\\s*(.+)$`, "mu"));
	if (!match?.[1]) throw new Error(`Rule is missing front-matter field ${name}`);
	return match[1].trim();
}

/** Returns the stable id/title encoded in an ADR heading. */
function noteIdentity(page: DocsPage): { id: string; title: string } {
	const match = page.title.match(/^(ADR-\d{4})\s+—\s+(.+)$/u);
	if (match?.[1] && match[2]) return { id: match[1], title: match[2] };
	return { id: page.id, title: page.title };
}

/**
 * Whether a section is present and non-empty.
 *
 * An ADR section is nested under its `## ADR-NNNN` heading, so its own sections are level three
 * rather than level two. Any level is accepted so the check does not encode where the record sits
 * in the document.
 */
function hasSection(markdown: string, heading: string): boolean {
	return new RegExp(`^(#{2,6}) ${heading}\\s*$\\n\\s*\\S`, "mu").test(markdown);
}

function adrNumber(id: string): string | undefined {
	return id.match(/^ADR-(\d{4})$/u)?.[1];
}

/** Analyzes canonical ADR -> rule links and derives the reverse rule -> ADR index. */
export function analyzeRuleNoteRelations(graph: DocsContentGraph): RuleNoteRelationAnalysis {
	const findings: string[] = [];
	const rules: DocsRuleRelationEntry[] = [];
	const ruleIds = new Set<string>();

	for (const page of graph.pages
		.filter((candidate) => candidate.kind === "rule")
		.sort((a, b) => a.source.localeCompare(b.source))) {
		let title = "";
		let status = "";
		try {
			title = ruleFrontMatterField(page.markdown, "title");
			status = ruleFrontMatterField(page.markdown, "status");
			for (const field of ["applies_to", "activation", "owners"]) ruleFrontMatterField(page.markdown, field);
		} catch (error) {
			findings.push(`${page.source}: ${error instanceof Error ? error.message : String(error)}`);
			continue;
		}
		if (status !== "normative") findings.push(`${page.source}: canonical rule status must be normative`);
		for (const section of ["Requirement", "Rationale", "Enforcement", "Exceptions", "Change control"]) {
			if (!hasSection(page.markdown, section))
				findings.push(`${page.source}: canonical rule is missing non-empty ${section} section`);
		}
		// The skill's directory name is its identity, which the four hosts already require to equal
		// the front-matter `name`. There is no separate rule number to keep in step with it.
		const id = page.id;
		if (ruleIds.has(id)) findings.push(`${page.source}: duplicate rule id ${id}`);
		ruleIds.add(id);
		rules.push({ id, title, page });
	}

	if (rules.length === 0) findings.push("rules: at least one canonical rule is required");

	const notes: DocsNoteRelationEntry[] = [];
	const noteIds = new Set<string>();
	// Every record shares one source, so they are ordered by ADR number rather than by path.
	for (const page of graph.pages
		.filter((candidate) => candidate.kind === "adr")
		.sort((a, b) => (adrNumber(noteIdentity(a).id) ?? "").localeCompare(adrNumber(noteIdentity(b).id) ?? ""))) {
		const note = noteIdentity(page);
		// A finding names the record, not the file, so one file holding many records is still
		// actionable: the anchor is the ADR number a reader searches for.
		const where = `${page.source}#${note.id}`;
		if (!adrNumber(note.id)) findings.push(`${where}: invalid ADR id ${note.id}`);
		if (!/^\*\*Status\*\*:\s*Accepted\s*$/mu.test(page.markdown)) {
			findings.push(`${where}: current ADR status must be Accepted`);
		}
		for (const section of ["Decision", "Consequences"]) {
			if (!hasSection(page.markdown, section))
				findings.push(`${where}: accepted ADR is missing non-empty ${section} section`);
		}
		if (noteIds.has(note.id)) findings.push(`${where}: duplicate ADR id ${note.id}`);
		noteIds.add(note.id);
		// An ADR no longer declares related rules: the rules are situation-scoped skills now, and a
		// numbered cross-reference is exactly the second declaration this repository removed.
		notes.push({ ...note, page, ruleIds: [] });
	}

	for (const page of graph.pages.filter((candidate) => candidate.kind === "note")) {
		findings.push(`${page.source}: current long-term notes must be accepted numbered ADRs in ${adrDocumentSource()}`);
	}

	if (notes.length === 0) findings.push(`${adrDocumentSource()}: at least one accepted ADR is required`);

	const reverse = new Map<string, string[]>();
	for (const rule of rules) reverse.set(rule.id, []);
	for (const note of notes) {
		for (const relatedRuleId of note.ruleIds) reverse.get(relatedRuleId)?.push(note.id);
	}
	const ruleNotes = new Map<string, readonly string[]>(
		[...reverse.entries()].map(([ruleId, ids]) => [ruleId, [...ids].sort((a, b) => a.localeCompare(b))]),
	);
	return { rules, notes, ruleNotes, findings };
}

/** Returns valid rule/note relations or throws with all semantic alignment findings. */
export function assertRuleNoteRelations(graph: DocsContentGraph): RuleNoteRelationAnalysis {
	const analysis = analyzeRuleNoteRelations(graph);
	if (analysis.findings.length > 0)
		throw new Error(`Rule/note relationship contract failed:\n${analysis.findings.join("\n")}`);
	return analysis;
}
