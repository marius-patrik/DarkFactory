import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DocsContentGraph } from "../src/content.ts";
import { assertCurrentDocumentation, currentDocumentationFindings } from "../src/current.ts";
import { renderAgentsMarkdown } from "../src/agents.ts";

function graph(): DocsContentGraph {
	return {
		version: 1,
		site: { name: "DarkFactory" },
		home: "home",
		pages: [
			{ id: "home", kind: "home", title: "DarkFactory", source: ".agents/PRD.md", markdown: "# DarkFactory\n" },
			{
				id: "rule-001",
				kind: "rule",
				title: "Rule 1 — Test",
				source: ".agents/notes/rules/001-test.md",
				markdown:
					"---\nid: DF-RULE-001\ntitle: Test\nstatus: normative\napplies_to: [agents]\nactivation: always\nowners: [docs]\n---\n# Rule 1 — Test\n\n## Requirement\n\nTest.\n\n## Rationale\n\nTest.\n\n## Enforcement\n\nTest.\n\n## Exceptions\n\nNone.\n\n## Change control\n\nTest.\n",
			},
			{
				id: "adr-0001",
				kind: "adr",
				title: "ADR-0001 — Test",
				source: ".agents/notes/adr/0001-test.md",
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
	const aliases = [
		["README.md", ".agents/PRD.md"],
		["CONTRIBUTING.md", ".agents/AGENTS.md"],
		[".agents/notes/README.md", "../../README.md"],
	] as const;
	for (const [path, target] of aliases) {
		if (path === omit) continue;
		mkdirSync(join(repoRoot, path, ".."), { recursive: true });
		symlinkSync(target, join(repoRoot, path));
	}
}

function writeGeneratedAgents(repoRoot: string, content: DocsContentGraph): void {
	mkdirSync(join(repoRoot, ".agents"), { recursive: true });
	writeFileSync(join(repoRoot, ".agents", "AGENTS.md"), renderAgentsMarkdown(content));
}

describe("current documentation truth", () => {
	test("accepts the canonical documentation layout", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot);
			writeGeneratedAgents(repoRoot, content);
			expect(currentDocumentationFindings(repoRoot, content)).toEqual([]);
			expect(() => assertCurrentDocumentation(repoRoot, content)).not.toThrow();
		});
	});

	test("does not compare root README contents", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot);
			writeFileSync(join(repoRoot, ".agents", "PRD.md"), "# changed product\n");
			writeGeneratedAgents(repoRoot, content);
			expect(currentDocumentationFindings(repoRoot, content)).toEqual([]);
		});
	});

	test("fails on generated AGENTS projection drift", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot);
			writeGeneratedAgents(repoRoot, content);
			writeFileSync(join(repoRoot, ".agents", "AGENTS.md"), "# stale\n");
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: ".agents/AGENTS.md",
				message: "committed AGENTS differs from the canonical repository-rules projection",
			});
			expect(() => assertCurrentDocumentation(repoRoot, content)).toThrow("Current documentation contract failed");
		});
	});

	test("fails when a required current alias is missing", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot, "CONTRIBUTING.md");
			writeGeneratedAgents(repoRoot, content);
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: "CONTRIBUTING.md",
				message: "required documentation discovery alias is missing",
			});
		});
	});

	test("rejects a copied current alias", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot, ".agents/notes/README.md");
			mkdirSync(join(repoRoot, ".agents", "notes"), { recursive: true });
			writeFileSync(join(repoRoot, ".agents", "notes", "README.md"), "# stale\n");
			writeGeneratedAgents(repoRoot, content);
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: ".agents/notes/README.md",
				message: "documentation discovery alias must remain a symlink, not a copied document",
			});
		});
	});

	test("rejects a symlink as the generated rules projection", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot);
			writeFileSync(join(repoRoot, "projection.md"), renderAgentsMarkdown(content));
			symlinkSync("../projection.md", join(repoRoot, ".agents", "AGENTS.md"));
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: ".agents/AGENTS.md",
				message: "generated AGENTS projection must be a regular file",
			});
		});
	});

	test("fails when a retired documentation surface returns", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot);
			writeGeneratedAgents(repoRoot, content);
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
			writeGeneratedAgents(repoRoot, content);
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
				join(".agents", "rules"),
				join(".agents", "notes", "adr", "README.md"),
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
				".agents/rules",
				".agents/notes/adr/README.md",
			]) {
				expect(findings).toContainEqual({ path, message: "retired documentation surface must not exist" });
			}
		});
	});

	test("removes a broken old alias without weakening current validation", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeCurrentAliases(repoRoot);
			writeGeneratedAgents(repoRoot, content);
			symlinkSync("../missing.md", join(repoRoot, ".agents", "CLAUDE.md"));
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: ".agents/CLAUDE.md",
				message: "retired documentation surface must not exist",
			});
			unlinkSync(join(repoRoot, ".agents", "CLAUDE.md"));
		});
	});
});
