import { lstatSync, readlinkSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { DocsContentGraph } from "./content.ts";
import { analyzeRuleNoteRelations } from "./relations.ts";

/** One deterministic violation of the repository's current-only documentation contract. */
interface DocumentationTruthFinding {
	path: string;
	message: string;
}

// README.md is the normative product document and ADRs.md the canonical note set, both authored once
// and symlinked. Nothing here is a projection any more, so there is no alias to re-point and no
// generated file to compare against a re-render.
const RETIRED_DOCUMENTATION_PATHS = [
	join(".agents", "AGENTS.md"),
	join(".agents", "PRD.md"),
	join(".agents", "adr"),
	join(".agents", "notes"),
	"AGENTS.md",
	"CLAUDE.md",
	"PLAN.md",
	"PRD.md",
	"docs.df",
	join(".darkfactory", "docs.df"),
	join(".agents", "docs.df"),
	join("docs", "home.md"),
	"tsconfig.docs.json",
	".claude",
	join(".agents", "README.md"),
	join(".agents", "CLAUDE.md"),
	"properdocs.yml",
	"mkdocs.yml",
	"harness/README.md",
	join(".agents", "notes", "bootstrap.md"),
	join(".agents", "notes", "vision_capture.md"),
	join(".agents", "notes", "rules"),
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

	// `ADRs.md` and `CONTRIBUTING.md` are authored once and symlinked, so the symlink must resolve
	// to its declared target rather than be a copied document that drifts from the original.
	for (const alias of [
		{ path: "ADRs.md", target: ".darkfactory/ADRs.md" },
		{ path: "CONTRIBUTING.md", target: "README.md" },
	]) {
		const absolute = join(repoRoot, alias.path);
		let stat: ReturnType<typeof lstatSync>;
		try {
			stat = lstatSync(absolute);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				findings.push({
					path: alias.path.replaceAll("\\", "/"),
					message: "required documentation discovery alias is missing",
				});
				continue;
			}
			throw error;
		}
		if (!stat.isSymbolicLink()) {
			findings.push({
				path: alias.path.replaceAll("\\", "/"),
				message: "documentation discovery alias must remain a symlink, not a copied document",
			});
			continue;
		}
		if (readlinkSync(absolute) !== alias.target) {
			findings.push({
				path: alias.path.replaceAll("\\", "/"),
				message: `documentation discovery alias must target ${alias.target}`,
			});
			continue;
		}
		try {
			const resolvedAlias = realpathSync(absolute);
			const resolvedTarget = realpathSync(resolve(dirname(absolute), alias.target));
			if (resolvedAlias !== resolvedTarget) {
				findings.push({
					path: alias.path.replaceAll("\\", "/"),
					message: `documentation discovery alias must target ${alias.target}`,
				});
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				findings.push({
					path: alias.path.replaceAll("\\", "/"),
					message: "documentation discovery alias target is missing",
				});
				continue;
			}
			throw error;
		}
	}

	const relations = analyzeRuleNoteRelations(graph);
	for (const message of relations.findings) findings.push({ path: ".agents", message });

	// The generated `AGENTS.md` projection is gone. It was a second rendering of the rule set that
	// nobody read, which is the drift DF-RULE-015 exists to prevent, and comparing a committed
	// projection against a re-render only proves the generator is deterministic.

	return findings;
}

/** Fails when repository documentation contradicts the current native documentation contract. */
export function assertCurrentDocumentation(repoRoot: string, graph: DocsContentGraph): void {
	const findings = currentDocumentationFindings(repoRoot, graph);
	if (findings.length === 0) return;
	const detail = findings.map((finding) => `${finding.path}: ${finding.message}`).join("\n");
	throw new Error(`Current documentation contract failed:\n${detail}`);
}
