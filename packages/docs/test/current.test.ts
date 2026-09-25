import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderAgentsMarkdown, renderNotesMarkdown, renderPrdMarkdown } from "../src/agents.ts";
import type { DocsContentGraph } from "../src/content.ts";
import { assertCurrentDocumentation, currentDocumentationFindings } from "../src/current.ts";

function graph(): DocsContentGraph {
	return {
		version: 1,
		site: { name: "DarkFactory" },
		home: "home",
		pages: [
			{ id: "home", kind: "home", title: "DarkFactory", source: ".agents/README.md", markdown: "# DarkFactory\n" },
			{
				id: "rule-001",
				kind: "rule",
				title: "Rule 1 — Test",
				source: ".agents/rules/001-test.md",
				markdown:
					"---\nid: DF-RULE-001\ntitle: Test\nstatus: normative\napplies_to: [agents]\nactivation: always\nowners: [docs]\n---\n# Rule 1 — Test\n\n## Requirement\n\nTest.\n\n## Rationale\n\nTest.\n\n## Enforcement\n\nTest.\n\n## Exceptions\n\nNone.\n\n## Change control\n\nTest.\n",
			},
			{
				id: "adr-0001",
				kind: "adr",
				title: "ADR-0001 — Test",
				source: ".agents/adr/0001-test.md",
				markdown:
					"# ADR-0001 — Test\n\n**Status**: Accepted\n\n**Related rules**: `DF-RULE-001`\n\n## Decision\n\nTest.\n\n## Consequences\n\nTest.\n",
			},
			{
				id: "notes-overview",
				kind: "note",
				title: "Overview",
				source: ".agents/notes/overview.md",
				markdown: "# Overview\n\nTest note.\n",
			},
		],
		workflows: [],
	};
}

function withRepo(run: (repoRoot: string, content: DocsContentGraph) => void): void {
	const repoRoot = mkdtempSync(join(tmpdir(), "darkfactory-docs-current-"));
	try {
		run(repoRoot, graph());
	} finally {
		rmSync(repoRoot, { recursive: true, force: true });
	}
}

function writeCanonicalRepo(repoRoot: string, content: DocsContentGraph): void {
	mkdirSync(join(repoRoot, ".agents"), { recursive: true });
	writeFileSync(join(repoRoot, ".agents", "AGENTS.md"), renderAgentsMarkdown(content));
	writeFileSync(join(repoRoot, ".agents", "PRD.md"), renderPrdMarkdown(content));
	writeFileSync(join(repoRoot, ".agents", "README.md"), renderNotesMarkdown(content));
	for (const [path, target] of [
		["AGENTS.md", ".agents/AGENTS.md"],
		["CONTRIBUTING.md", ".agents/AGENTS.md"],
		["PRD.md", ".agents/PRD.md"],
		["README.md", ".agents/README.md"],
	] as const) {
		symlinkSync(target, join(repoRoot, path));
	}
}

describe("current documentation truth", () => {
	test("accepts the three generated projections and root aliases", () => {
		withRepo((repoRoot, content) => {
			writeCanonicalRepo(repoRoot, content);
			expect(currentDocumentationFindings(repoRoot, content)).toEqual([]);
			expect(() => assertCurrentDocumentation(repoRoot, content)).not.toThrow();
		});
	});

	test("fails when a generated projection drifts", () => {
		for (const path of [".agents/AGENTS.md", ".agents/PRD.md", ".agents/README.md"]) {
			withRepo((repoRoot, content) => {
				writeCanonicalRepo(repoRoot, content);
				writeFileSync(join(repoRoot, path), "# stale\n");
				expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
					path,
					message: `committed ${path === ".agents/AGENTS.md" ? "AGENTS" : path === ".agents/PRD.md" ? "PRD" : "README"} differs from its canonical source projection`,
				});
			});
		}
	});

	test("fails when a required root alias is missing or copied", () => {
		withRepo((repoRoot, content) => {
			writeCanonicalRepo(repoRoot, content);
			unlinkSync(join(repoRoot, "CONTRIBUTING.md"));
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: "CONTRIBUTING.md",
				message: "required documentation discovery alias is missing",
			});
		});
		withRepo((repoRoot, content) => {
			writeCanonicalRepo(repoRoot, content);
			unlinkSync(join(repoRoot, "README.md"));
			writeFileSync(join(repoRoot, "README.md"), "# copied\n");
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: "README.md",
				message: "documentation discovery alias must remain a symlink, not a copied document",
			});
		});
	});

	test("fails when an old split path returns", () => {
		withRepo((repoRoot, content) => {
			writeCanonicalRepo(repoRoot, content);
			mkdirSync(join(repoRoot, ".agents", "notes", "rules"), { recursive: true });
			writeFileSync(join(repoRoot, ".agents", "notes", "rules", "old.md"), "retired\n");
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: ".agents/notes/rules",
				message: "retired documentation surface must not exist",
			});
		});
	});

	test("keeps notes as a valid non-normative source", () => {
		withRepo((repoRoot, content) => {
			writeCanonicalRepo(repoRoot, content);
			mkdirSync(join(repoRoot, ".agents", "notes"), { recursive: true });
			expect(currentDocumentationFindings(repoRoot, content)).toEqual([]);
		});
	});
});
