import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DocsContentGraph } from "../../../packages/docs/src/content.ts";
import { assertCurrentDocumentation, currentDocumentationFindings } from "../../../packages/docs/src/current.ts";

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
				id: "notes-adr-0001",
				kind: "adr",
				title: "ADR-0001 — Test",
				source: ".agents/notes/ADRs.md",
				markdown: "# ADR-0001 — Test\n\n**Status**: Accepted\n\n## Decision\n\nTest.\n\n## Consequences\n\nTest.\n",
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

function writeCanonical(repoRoot: string): void {
	mkdirSync(join(repoRoot, ".agents", "notes"), { recursive: true });
	writeFileSync(join(repoRoot, "README.md"), "# product\n");
	writeFileSync(join(repoRoot, ".agents", "notes", "ADRs.md"), "# Architecture decision records\n");
}

describe("current documentation truth", () => {
	test("accepts real notes directory and a single canonical ADR source", () => {
		withRepo((root) => {
			writeCanonical(root);
			expect(currentDocumentationFindings(root, graph())).toEqual([]);
			expect(() => assertCurrentDocumentation(root, graph())).not.toThrow();
		});
	});

	test("fails when the canonical ADR source is missing", () => {
		withRepo((root) => {
			writeCanonical(root);
			unlinkSync(join(root, ".agents", "notes", "ADRs.md"));
			expect(currentDocumentationFindings(root, graph())).toContainEqual({
				path: ".agents/notes/ADRs.md",
				message: "required documentation source is missing",
			});
		});
	});

	test("rejects the retired .agents symlink", () => {
		withRepo((root) => {
			writeCanonical(root);
			mkdirSync(join(root, ".darkfactory"), { recursive: true });
			rmSync(join(root, ".agents"), { recursive: true });
			symlinkSync(".darkfactory", join(root, ".agents"), "dir");
			expect(currentDocumentationFindings(root, graph())).toContainEqual({
				path: ".agents",
				message: "documentation source must be a real directory or regular file, not a symlink",
			});
		});
	});

	test("rejects a symlink where canonical ADR content must be a regular file", () => {
		withRepo((root) => {
			writeCanonical(root);
			unlinkSync(join(root, ".agents", "notes", "ADRs.md"));
			writeFileSync(join(root, "shadow.md"), "# stale\n");
			symlinkSync("../../shadow.md", join(root, ".agents", "notes", "ADRs.md"));
			expect(currentDocumentationFindings(root, graph())).toContainEqual({
				path: ".agents/notes/ADRs.md",
				message: "documentation source must be a real directory or regular file, not a symlink",
			});
		});
	});

	test("rejects the retired root aliases and old documentation locations", () => {
		withRepo((root) => {
			writeCanonical(root);
			mkdirSync(join(root, ".darkfactory"), { recursive: true });
			mkdirSync(join(root, "docs"), { recursive: true });
			for (const path of ["ADRs.md", "CONTRIBUTING.md", ".darkfactory/ADRs.md"]) {
				writeFileSync(join(root, path), "# stale\n");
			}
			const findings = currentDocumentationFindings(root, graph());
			for (const path of ["ADRs.md", "CONTRIBUTING.md", ".darkfactory/ADRs.md", "docs"]) {
				expect(findings).toContainEqual({ path, message: "retired documentation surface must not exist" });
			}
		});
	});

	test("continues to reject retired agent and documentation paths", () => {
		withRepo((root) => {
			writeCanonical(root);
			const paths = [
				"AGENTS.md", "CLAUDE.md", "PLAN.md", "PRD.md", "docs.df",
				".darkfactory/docs.df", ".agents/docs.df", "tsconfig.docs.json",
				".agents/README.md", ".agents/CLAUDE.md", ".darkfactory/notes",
				".darkfactory/adr", ".agents/adr", "harness/README.md",
			];
			for (const path of paths) {
				const absolute = join(root, path);
				mkdirSync(join(absolute, ".."), { recursive: true });
				writeFileSync(absolute, "retired\n");
			}
			const findings = currentDocumentationFindings(root, graph());
			for (const path of paths) {
				expect(findings).toContainEqual({ path, message: "retired documentation surface must not exist" });
			}
		});
	});
});
