import { lstatSync } from "node:fs";
import { join } from "node:path";
import type { DocsContentGraph } from "./content.ts";
import { analyzeRuleNoteRelations } from "./relations.ts";

/** One deterministic violation of the repository's current-only documentation contract. */
interface DocumentationTruthFinding {
	path: string;
	message: string;
}

/** Canonical documentation must be regular files in a real .agents directory, never aliases. */
const REQUIRED_DOCUMENTATION_SOURCES = [
	{ path: ".agents", kind: "directory" },
	{ path: ".agents/notes", kind: "directory" },
	{ path: ".agents/notes/ADRs.md", kind: "file" },
] as const;

const RETIRED_DOCUMENTATION_PATHS = [
	"AGENTS.md",
	"CLAUDE.md",
	"PLAN.md",
	"PRD.md",
	"docs.df",
	"docs",
	"ADRs.md",
	"CONTRIBUTING.md",
	join(".darkfactory", "ADRs.md"),
	join(".darkfactory", "docs.df"),
	join(".agents", "docs.df"),
	"tsconfig.docs.json",
	".claude",
	join(".agents", "README.md"),
	join(".agents", "CLAUDE.md"),
	"properdocs.yml",
	"mkdocs.yml",
	"harness/README.md",
	join(".darkfactory", "notes"),
	join(".darkfactory", "adr"),
	join(".agents", "adr"),
	"_notes",
	"_rules",
] as const;

function statOrUndefined(path: string): ReturnType<typeof lstatSync> | undefined {
	try {
		return lstatSync(path);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw error;
	}
}

/** Returns deterministic current-only documentation violations without mutating the repository. */
export function currentDocumentationFindings(
	repoRoot: string,
	graph: DocsContentGraph,
): readonly DocumentationTruthFinding[] {
	const findings: DocumentationTruthFinding[] = [];
	for (const path of RETIRED_DOCUMENTATION_PATHS) {
		if (statOrUndefined(join(repoRoot, path))) {
			findings.push({ path: path.replaceAll("\\", "/"), message: "retired documentation surface must not exist" });
		}
	}
	for (const source of REQUIRED_DOCUMENTATION_SOURCES) {
		const stat = statOrUndefined(join(repoRoot, source.path));
		if (!stat) {
			findings.push({ path: source.path, message: "required documentation source is missing" });
		} else if (stat.isSymbolicLink() || (source.kind === "directory" ? !stat.isDirectory() : !stat.isFile())) {
			findings.push({
				path: source.path,
				message: "documentation source must be a real directory or regular file, not a symlink",
			});
		}
	}
	const relations = analyzeRuleNoteRelations(graph);
	for (const message of relations.findings) findings.push({ path: ".agents/notes", message });
	return findings;
}

/** Fails when repository documentation contradicts the current native documentation contract. */
export function assertCurrentDocumentation(repoRoot: string, graph: DocsContentGraph): void {
	const findings = currentDocumentationFindings(repoRoot, graph);
	if (findings.length === 0) return;
	const detail = findings.map((finding) => `${finding.path}: ${finding.message}`).join("\n");
	throw new Error(`Current documentation contract failed:\n${detail}`);
}
