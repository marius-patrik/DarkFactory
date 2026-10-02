import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DocsContentGraph } from "../src/content.ts";
import { assertCurrentDocumentation, currentDocumentationFindings } from "../src/current.ts";

/**
 * README.md is a regular product document and ADRs.md is authored once and symlinked, so the contract
 * here is that the two symlinks resolve to their declared targets and that no projection is
 * regenerated. The generated AGENTS.md is gone; a projection of a rulebook nobody read was a second
 * declaration of the same content, which is what DF-RULE-015 exists to prevent.
 */
const ALIASES = [
	["ADRs.md", ".darkfactory/ADRs.md"],
	["CONTRIBUTING.md", "README.md"],
] as const;

function graph(): DocsContentGraph {
	return {
		version: 1,
		site: { name: "DarkFactory" },
		home: "home",
		pages: [
			{ id: "home", kind: "home", title: "DarkFactory", source: "README.md", markdown: "# DarkFactory\n" },
			{
				id: "rule-001",
				kind: "rule",
				title: "Tests prove invariants",
				source: ".agents/rules/001-unit-tests.md",
				markdown:
					"---\nid: DF-RULE-001\ntitle: Tests prove invariants\nstatus: normative\napplies_to: [agents]\nactivation: always\nowners: [docs]\n---\n# Rule 1 — Tests prove invariants\n\n## Requirement\n\nTest.\n\n## Rationale\n\nTest.\n\n## Enforcement\n\nTest.\n\n## Exceptions\n\nNone.\n\n## Change control\n\nTest.\n",
			},
			{
				id: "adr-0001",
				kind: "adr",
				title: "ADR-0001 — Test",
				source: ".darkfactory/ADRs.md",
				markdown:
					"# ADR-0001 — Test\n\n**Status**: Accepted\n\n**Related rules**: `DF-RULE-001`\n\n## Decision\n\nTest.\n\n## Consequences\n\nTest.\n",
			},
		],
		workflows: [],
	};
}

function withRepo(run: (repoRoot: string) => void): void {
	const repoRoot = mkdtempSync(join(tmpdir(), "darkfactory-docs-current-"));
	try {
		run(repoRoot);
	} finally {
		rmSync(repoRoot, { recursive: true, force: true });
	}
}

/** Writes the two symlinks and the regular files they resolve to. `omit` leaves one uncreated. */
function writeCurrentAliases(repoRoot: string, omit?: string): void {
	mkdirSync(join(repoRoot, ".darkfactory"), { recursive: true });
	writeFileSync(join(repoRoot, ".darkfactory", "ADRs.md"), "# Architecture decision records\n");
	writeFileSync(join(repoRoot, "README.md"), "# product\n");
	for (const [path, target] of ALIASES) {
		if (path === omit) continue;
		mkdirSync(join(repoRoot, path, ".."), { recursive: true });
		symlinkSync(target, join(repoRoot, path));
	}
}

describe("current documentation truth", () => {
	test("accepts the canonical documentation layout", () => {
		withRepo((repoRoot) => {
			writeCurrentAliases(repoRoot);
			expect(currentDocumentationFindings(repoRoot, graph())).toEqual([]);
			expect(() => assertCurrentDocumentation(repoRoot, graph())).not.toThrow();
		});
	});

	test("fails when a required current alias is missing", () => {
		withRepo((repoRoot) => {
			writeCurrentAliases(repoRoot, "CONTRIBUTING.md");
			expect(currentDocumentationFindings(repoRoot, graph())).toContainEqual({
				path: "CONTRIBUTING.md",
				message: "required documentation discovery alias is missing",
			});
		});
	});

	test("fails when a current alias points at a missing target", () => {
		withRepo((repoRoot) => {
			writeCurrentAliases(repoRoot);
			unlinkSync(join(repoRoot, ".darkfactory", "ADRs.md"));
			expect(currentDocumentationFindings(repoRoot, graph())).toContainEqual({
				path: "ADRs.md",
				message: "documentation discovery alias target is missing",
			});
		});
	});

	test("rejects a copied current alias", () => {
		withRepo((repoRoot) => {
			writeCurrentAliases(repoRoot);
			unlinkSync(join(repoRoot, "CONTRIBUTING.md"));
			writeFileSync(join(repoRoot, "CONTRIBUTING.md"), "# a copy that will drift\n");
			expect(currentDocumentationFindings(repoRoot, graph())).toContainEqual({
				path: "CONTRIBUTING.md",
				message: "documentation discovery alias must remain a symlink, not a copied document",
			});
		});
	});

	test("rejects an alias aimed at the wrong target", () => {
		withRepo((repoRoot) => {
			writeCurrentAliases(repoRoot);
			unlinkSync(join(repoRoot, "ADRs.md"));
			symlinkSync("README.md", join(repoRoot, "ADRs.md"));
			expect(currentDocumentationFindings(repoRoot, graph())).toContainEqual({
				path: "ADRs.md",
				message: "documentation discovery alias must target .darkfactory/ADRs.md",
			});
		});
	});

	test("fails when a retired documentation surface returns", () => {
		withRepo((repoRoot) => {
			writeCurrentAliases(repoRoot);
			mkdirSync(join(repoRoot, "harness"), { recursive: true });
			writeFileSync(join(repoRoot, "harness", "README.md"), "# retired\n");
			expect(currentDocumentationFindings(repoRoot, graph())).toContainEqual({
				path: "harness/README.md",
				message: "retired documentation surface must not exist",
			});
		});
	});

	test("fails when the retired rules projection or the split ADR tree comes back", () => {
		withRepo((repoRoot) => {
			writeCurrentAliases(repoRoot);
			mkdirSync(join(repoRoot, ".agents", "adr"), { recursive: true });
			writeFileSync(join(repoRoot, ".agents", "AGENTS.md"), "# generated again\n");
			const findings = currentDocumentationFindings(repoRoot, graph());
			expect(findings).toContainEqual({
				path: ".agents/AGENTS.md",
				message: "retired documentation surface must not exist",
			});
			expect(findings).toContainEqual({
				path: ".agents/adr",
				message: "retired documentation surface must not exist",
			});
		});
	});

	test("retires the old root Claude and documentation paths", () => {
		withRepo((repoRoot) => {
			writeCurrentAliases(repoRoot);
			for (const path of [
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
				join(".agents", "notes", "adr"),
				join(".agents", "notes", "rules"),
				"_notes",
				"_rules",
			]) {
				const absolute = join(repoRoot, path);
				mkdirSync(join(absolute, ".."), { recursive: true });
				writeFileSync(absolute, "retired\n");
			}
			const findings = currentDocumentationFindings(repoRoot, graph());
			const retired = new Set(
				findings
					.filter((finding) => finding.message === "retired documentation surface must not exist")
					.map((f) => f.path),
			);
			for (const path of ["AGENTS.md", "CLAUDE.md", "PLAN.md", "PRD.md", "docs.df"]) {
				expect(retired.has(path), `${path} must be retired`).toBe(true);
			}
		});
	});
});
