import { existsSync, lstatSync, readFileSync, readlinkSync } from "node:fs";
import { join } from "node:path";
import type { DocsContentGraph } from "./content.ts";
import { renderReadmeMarkdown } from "./readme.ts";
import { renderAgentsMarkdown } from "./agents.ts";
import { analyzeRuleNoteRelations } from "./relations.ts";

/** One deterministic violation of the repository's current-only documentation contract. */
export interface DocumentationTruthFinding {
	path: string;
	message: string;
}


const PROJECTION_ALIASES = [
	{ path: "CONTRIBUTING.md", target: "AGENTS.md" },
	{ path: join(".agents", "README.md"), target: "../README.md" },
	{ path: join(".agents", "AGENTS.md"), target: "../AGENTS.md" },
	{ path: join(".agents", "CLAUDE.md"), target: "../AGENTS.md" },
	{ path: join(".agents", "notes", "README.md"), target: "../../README.md" },
] as const;

const RETIRED_DOCUMENTATION_PATHS = [
	"properdocs.yml",
	"mkdocs.yml",
	"harness/README.md",
	join(".agents", "notes", "bootstrap.md"),
	join(".agents", "notes", "vision_capture.md"),
	join(".agents", "notes", "adr", "README.md"),
	"_notes",
	"_rules",
] as const;

/** Returns deterministic current-only documentation violations without mutating the repository. */
export function currentDocumentationFindings(repoRoot: string, graph: DocsContentGraph): readonly DocumentationTruthFinding[] {
	const findings: DocumentationTruthFinding[] = [];

	for (const path of RETIRED_DOCUMENTATION_PATHS) {
		if (existsSync(join(repoRoot, path))) {
			findings.push({ path: path.replaceAll("\\", "/"), message: "retired documentation surface must not exist" });
		}
	}


	for (const alias of PROJECTION_ALIASES) {
		const absolute = join(repoRoot, alias.path);
		if (!existsSync(absolute)) continue;
		if (!lstatSync(absolute).isSymbolicLink()) {
			findings.push({ path: alias.path.replaceAll("\\", "/"), message: "projection discovery alias must remain a symlink, not a copied document" });
			continue;
		}
		if (readlinkSync(absolute) !== alias.target) {
			findings.push({ path: alias.path.replaceAll("\\", "/"), message: `projection discovery alias must target ${alias.target}` });
		}
	}

	const relations = analyzeRuleNoteRelations(graph);
	for (const message of relations.findings) findings.push({ path: ".agents", message });
	if (relations.findings.length > 0) return findings;

	const readmePath = join(repoRoot, "README.md");
	if (!existsSync(readmePath)) {
		findings.push({ path: "README.md", message: "generated README projection is missing" });
	} else {
		const actual = readFileSync(readmePath, "utf8").replaceAll("\r\n", "\n");
		const expected = renderReadmeMarkdown(graph);
		if (actual !== expected) {
			findings.push({ path: "README.md", message: "committed README differs from the canonical repository-notes projection" });
		}
	}

	const agentsPath = join(repoRoot, "AGENTS.md");
	if (!existsSync(agentsPath)) {
		findings.push({ path: "AGENTS.md", message: "generated AGENTS projection is missing" });
	} else {
		const actual = readFileSync(agentsPath, "utf8").replaceAll("\r\n", "\n");
		const expected = renderAgentsMarkdown(graph);
		if (actual !== expected) {
			findings.push({ path: "AGENTS.md", message: "committed AGENTS differs from the canonical repository-rules projection" });
		}
	}

	return findings;
}

/** Fails when repository documentation contradicts the current native documentation contract. */
export function assertCurrentDocumentation(repoRoot: string, graph: DocsContentGraph): void {
	const findings = currentDocumentationFindings(repoRoot, graph);
	if (findings.length === 0) return;
	const detail = findings.map((finding) => `${finding.path}: ${finding.message}`).join("\n");
	throw new Error(`Current documentation contract failed:\n${detail}`);
}
