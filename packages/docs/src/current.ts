import { lstatSync, readFileSync, readlinkSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { renderAgentsMarkdown, renderNotesMarkdown, renderPrdMarkdown } from "./agents.ts";
import type { DocsContentGraph } from "./content.ts";
import { analyzeRuleNoteRelations } from "./relations.ts";

/** One deterministic violation of the repository's current-only documentation contract. */
export interface DocumentationTruthFinding {
	path: string;
	message: string;
}

const CURRENT_ALIASES = [
	{ path: "AGENTS.md", target: ".agents/AGENTS.md" },
	{ path: "CONTRIBUTING.md", target: ".agents/AGENTS.md" },
	{ path: "PRD.md", target: ".agents/PRD.md" },
	{ path: "README.md", target: ".agents/README.md" },
] as const;

const RETIRED_DOCUMENTATION_PATHS = [
	"CLAUDE.md",
	"PLAN.md",
	"docs.df",
	join(".darkfactory", "docs.df"),
	join(".agents", "docs.df"),
	join("docs", "home.md"),
	"tsconfig.docs.json",
	".claude",
	join(".agents", "CLAUDE.md"),
	join(".agents", "notes", "rules"),
	join(".agents", "notes", "adr"),
	join(".agents", "notes", "README.md"),
	"properdocs.yml",
	"mkdocs.yml",
	"harness/README.md",
	"_notes",
	"_rules",
] as const;

function pathExists(path: string): boolean {
	try {
		lstatSync(path);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
		throw error;
	}
}

function checkProjection(
	repoRoot: string,
	findings: DocumentationTruthFinding[],
	path: string,
	expected: string,
	label: string,
): void {
	const absolute = join(repoRoot, path);
	let stat: ReturnType<typeof lstatSync>;
	try {
		stat = lstatSync(absolute);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			findings.push({ path, message: `generated ${label} projection is missing` });
			return;
		}
		throw error;
	}
	if (!stat.isFile()) {
		findings.push({ path, message: `generated ${label} projection must be a regular file` });
		return;
	}
	const actual = readFileSync(absolute, "utf8").replaceAll("\r\n", "\n");
	if (actual !== expected) {
		findings.push({ path, message: `committed ${label} differs from its canonical source projection` });
	}
}

/** Returns deterministic current-only documentation violations without mutating the repository. */
export function currentDocumentationFindings(
	repoRoot: string,
	graph: DocsContentGraph,
): readonly DocumentationTruthFinding[] {
	const findings: DocumentationTruthFinding[] = [];

	for (const path of RETIRED_DOCUMENTATION_PATHS) {
		if (pathExists(join(repoRoot, path))) {
			findings.push({ path: path.replaceAll("\\", "/"), message: "retired documentation surface must not exist" });
		}
	}

	for (const alias of CURRENT_ALIASES) {
		const absolute = join(repoRoot, alias.path);
		let stat: ReturnType<typeof lstatSync>;
		try {
			stat = lstatSync(absolute);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				findings.push({ path: alias.path.replaceAll("\\", "/"), message: "required documentation discovery alias is missing" });
				continue;
			}
			throw error;
		}
		if (!stat.isSymbolicLink()) {
			findings.push({ path: alias.path.replaceAll("\\", "/"), message: "documentation discovery alias must remain a symlink, not a copied document" });
			continue;
		}
		if (readlinkSync(absolute) !== alias.target) {
			findings.push({ path: alias.path.replaceAll("\\", "/"), message: `documentation discovery alias must target ${alias.target}` });
			continue;
		}
		try {
			const resolvedAlias = realpathSync(absolute);
			const resolvedTarget = realpathSync(resolve(dirname(absolute), alias.target));
			if (resolvedAlias !== resolvedTarget) {
				findings.push({ path: alias.path.replaceAll("\\", "/"), message: `documentation discovery alias must target ${alias.target}` });
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				findings.push({ path: alias.path.replaceAll("\\", "/"), message: "documentation discovery alias target is missing" });
				continue;
			}
			throw error;
		}
	}

	const relations = analyzeRuleNoteRelations(graph);
	for (const message of relations.findings) findings.push({ path: ".agents", message });
	if (relations.findings.length > 0) return findings;

	checkProjection(repoRoot, findings, ".agents/AGENTS.md", renderAgentsMarkdown(graph), "AGENTS");
	checkProjection(repoRoot, findings, ".agents/PRD.md", renderPrdMarkdown(graph), "PRD");
	checkProjection(repoRoot, findings, ".agents/README.md", renderNotesMarkdown(graph), "README");
	return findings;
}

/** Fails when repository documentation contradicts the current native documentation contract. */
export function assertCurrentDocumentation(repoRoot: string, graph: DocsContentGraph): void {
	const findings = currentDocumentationFindings(repoRoot, graph);
	if (findings.length === 0) return;
	const detail = findings.map((finding) => `${finding.path}: ${finding.message}`).join("\n");
	throw new Error(`Current documentation contract failed:\n${detail}`);
}
