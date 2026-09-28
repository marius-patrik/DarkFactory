import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DocsContentGraph } from "../src/content.ts";
import { assertCurrentDocumentation, currentDocumentationFindings } from "../src/current.ts";

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
				title: "Rule 1 — Test",
				source: ".darkfactory/plugins/df-rules/skills/001-test/SKILL.md",
				markdown:
					"---\nid: DF-RULE-001\ntitle: Test\nstatus: normative\napplies_to: [agents]\nactivation: always\nowners: [docs]\n---\n# Rule 1 — Test\n\n## Requirement\n\nTest.\n\n## Rationale\n\nTest.\n\n## Enforcement\n\nTest.\n\n## Exceptions\n\nNone.\n\n## Change control\n\nTest.\n",
			},
			{
				id: "darkfactory-adrs-md-adr-0001-test",
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

function writeCurrentAliases(repoRoot: string, omit?: string): void {
	mkdirSync(join(repoRoot, ".agents"), { recursive: true });
	// The root README is the canonical product document itself, and the notes alias resolves to it,
	// so the fixture has to lay down a real file there rather than a projection.
	writeFileSync(join(repoRoot, "README.md"), "# product\n");
	// The ADRs are authored once and symlinked at the root, so the fixture lays down the document
	// and then the alias, exactly as the repository does.
	mkdirSync(join(repoRoot, ".darkfactory"), { recursive: true });
	writeFileSync(join(repoRoot, ".darkfactory", "ADRs.md"), "# Architecture decision records\n");
	const aliases = [
		[".agents/notes/README.md", "../../README.md"],
		["ADRs.md", ".darkfactory/ADRs.md"],
	] as const;
	for (const [path, target] of aliases) {
		if (path === omit) continue;
		mkdirSync(join(repoRoot, path, ".."), { recursive: true });
		symlinkSync(target, join(repoRoot, path));
	}
}

describe("current documentation truth", () => {
	test("accepts the canonical documentation layout", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot);
			expect(currentDocumentationFindings(repoRoot, content)).toEqual([]);
			expect(() => assertCurrentDocumentation(repoRoot, content)).not.toThrow();
		});
	});

	test("fails when a required current alias is missing", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot, ".agents/notes/README.md");
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: ".agents/notes/README.md",
				message: "required documentation discovery alias is missing",
			});
		});
	});

	test("fails when a current alias points at a missing target", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot);
			unlinkSync(join(repoRoot, "README.md"));
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: ".agents/notes/README.md",
				message: "documentation discovery alias target is missing",
			});
		});
	});

	test("rejects a copied current alias", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot, ".agents/notes/README.md");
			mkdirSync(join(repoRoot, ".agents", "notes"), { recursive: true });
			writeFileSync(join(repoRoot, ".agents", "notes", "README.md"), "# stale\n");
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: ".agents/notes/README.md",
				message: "documentation discovery alias must remain a symlink, not a copied document",
			});
		});
	});

	test("fails when a retired documentation surface returns", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot);
			mkdirSync(join(repoRoot, "harness"), { recursive: true });
			writeFileSync(join(repoRoot, "harness", "README.md"), "# retired\n");
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: "harness/README.md",
				message: "retired documentation surface must not exist",
			});
		});
	});

	test("retires the old root Claude and documentation paths", () => {
		withRepo((repoRoot) => {
			const content = graph();
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
				join(".agents", "notes", "adr"),
				join(".agents", "notes", "rules"),
				join(".darkfactory", "adr"),
			]) {
				const absolute = join(repoRoot, path);
				mkdirSync(join(absolute, ".."), { recursive: true });
				writeFileSync(absolute, "retired\n");
			}
			const findings = currentDocumentationFindings(repoRoot, content);
			for (const path of [
				"AGENTS.md",
				"CLAUDE.md",
				"PLAN.md",
				"PRD.md",
				"docs.df",
				".darkfactory/docs.df",
				".agents/docs.df",
				"docs/home.md",
				"tsconfig.docs.json",
				".claude",
				".agents/README.md",
				".agents/CLAUDE.md",
				".agents/notes/adr",
				".agents/notes/rules",
				".darkfactory/adr",
			]) {
				expect(findings).toContainEqual({ path, message: "retired documentation surface must not exist" });
			}
		});
	});

	test("removes a broken old alias without weakening current validation", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot);
			symlinkSync("../missing.md", join(repoRoot, ".agents", "CLAUDE.md"));
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: ".agents/CLAUDE.md",
				message: "retired documentation surface must not exist",
			});
			unlinkSync(join(repoRoot, ".agents", "CLAUDE.md"));
		});
	});
});
