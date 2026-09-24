import { basename } from "node:path";
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

function hasSection(markdown: string, heading: string): boolean {
	return new RegExp(`(?:^|\\n)## ${heading}\\n\\s*\\S`, "u").test(markdown);
}

function ruleNumber(id: string): string | undefined {
	return id.match(/^DF-RULE-(\d{3})$/u)?.[1];
}

function adrNumber(id: string): string | undefined {
	return id.match(/^ADR-(\d{4})$/u)?.[1];
}

/** Analyzes canonical ADR -> rule links and derives the reverse rule -> ADR index. */
export function analyzeRuleNoteRelations(graph: DocsContentGraph): RuleNoteRelationAnalysis {
	const findings: string[] = [];
	const rules: DocsRuleRelationEntry[] = [];
	const ruleIds = new Set<string>();

	for (const page of graph.pages.filter((candidate) => candidate.kind === "rule").sort((a, b) => a.source.localeCompare(b.source))) {
		let id = "";
		let title = "";
		let status = "";
		try {
			id = ruleFrontMatterField(page.markdown, "id");
			title = ruleFrontMatterField(page.markdown, "title");
			status = ruleFrontMatterField(page.markdown, "status");
			for (const field of ["applies_to", "activation", "owners"]) ruleFrontMatterField(page.markdown, field);
		} catch (error) {
			findings.push(`${page.source}: ${error instanceof Error ? error.message : String(error)}`);
			continue;
		}
		const number = ruleNumber(id);
		if (!number) findings.push(`${page.source}: invalid rule id ${id}`);
		if (status !== "normative") findings.push(`${page.source}: canonical rule status must be normative`);
		if (number && !basename(page.source).startsWith(`${number}-`)) {
			findings.push(`${page.source}: filename must start with canonical rule number ${number}-`);
		}
		const heading = page.markdown.match(/^# Rule\s+(\d+)\s+—\s+(.+)$/mu);
		if (!heading?.[1] || Number(heading[1]) !== Number(number)) {
			findings.push(`${page.source}: rule heading number must match ${id}`);
		}
		if (heading?.[2]?.trim() !== title) {
			findings.push(`${page.source}: rule heading title must match front-matter title`);
		}
		for (const section of ["Requirement", "Rationale", "Enforcement", "Exceptions", "Change control"]) {
			if (!hasSection(page.markdown, section)) findings.push(`${page.source}: canonical rule is missing non-empty ${section} section`);
		}
		if (ruleIds.has(id)) findings.push(`${page.source}: duplicate rule id ${id}`);
		ruleIds.add(id);
		rules.push({ id, title, page });
	}

	if (rules.length === 0) findings.push(".agents/rules: at least one canonical rule is required");

	const ruleNumbers = rules
		.map((rule) => Number(ruleNumber(rule.id)))
		.filter((number) => Number.isFinite(number));
	const expectedRuleNumbers = Array.from({ length: ruleNumbers.length }, (_, index) => index + 1);
	if (ruleNumbers.some((number, index) => number !== expectedRuleNumbers[index])) {
		findings.push(`.agents/rules: rule numbers must be contiguous from 001; found ${ruleNumbers.join(", ")}`);
	}

	const notes: DocsNoteRelationEntry[] = [];
	const noteIds = new Set<string>();
	for (const page of graph.pages.filter((candidate) => candidate.kind === "adr").sort((a, b) => a.source.localeCompare(b.source))) {
		const note = noteIdentity(page);
		const number = adrNumber(note.id);
		if (!number) findings.push(`${page.source}: invalid ADR id ${note.id}`);
		if (number && !basename(page.source).startsWith(`${number}-`)) {
			findings.push(`${page.source}: filename must start with canonical ADR number ${number}-`);
		}
		if (!/^\*\*Status\*\*:\s*Accepted\s*$/mu.test(page.markdown)) {
			findings.push(`${page.source}: current ADR status must be Accepted`);
		}
		for (const section of ["Decision", "Consequences"]) {
			if (!hasSection(page.markdown, section)) findings.push(`${page.source}: accepted ADR is missing non-empty ${section} section`);
		}
		if (noteIds.has(note.id)) findings.push(`${page.source}: duplicate ADR id ${note.id}`);
		noteIds.add(note.id);
		const ruleIdsForNote = relatedRuleIds(page);
		if (ruleIdsForNote.length === 0) findings.push(`${page.source}: accepted ADR must declare Related rules`);
		for (const relatedRuleId of ruleIdsForNote) {
			if (!ruleIds.has(relatedRuleId)) findings.push(`${page.source}: unknown related rule ${relatedRuleId}`);
		}
		notes.push({ ...note, page, ruleIds: ruleIdsForNote });
	}

	for (const page of graph.pages.filter((candidate) => candidate.kind === "note")) {
		findings.push(`${page.source}: current long-term notes must be accepted numbered ADRs under .agents/notes/adr/`);
	}

	if (notes.length === 0) findings.push(".agents/notes/adr: at least one accepted ADR is required");

	const reverse = new Map<string, string[]>();
	for (const rule of rules) reverse.set(rule.id, []);
	for (const note of notes) {
		for (const relatedRuleId of note.ruleIds) reverse.get(relatedRuleId)?.push(note.id);
	}
	const ruleNotes = new Map<string, readonly string[]>(
		[...reverse.entries()].map(([ruleId, ids]) => [ruleId, [...ids].sort((a, b) => a.localeCompare(b))]),
	);
	for (const rule of rules) {
		if ((ruleNotes.get(rule.id) ?? []).length === 0) {
			findings.push(`${rule.page.source}: canonical rule must be related by at least one accepted ADR`);
		}
	}
	return { rules, notes, ruleNotes, findings };
}

/** Returns valid rule/note relations or throws with all semantic alignment findings. */
export function assertRuleNoteRelations(graph: DocsContentGraph): RuleNoteRelationAnalysis {
	const analysis = analyzeRuleNoteRelations(graph);
	if (analysis.findings.length > 0) throw new Error(`Rule/note relationship contract failed:\n${analysis.findings.join("\n")}`);
	return analysis;
}
