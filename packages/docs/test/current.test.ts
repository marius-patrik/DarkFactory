import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DocsContentGraph } from "../src/content.ts";
import { assertCurrentDocumentation, currentDocumentationFindings } from "../src/current.ts";
import { renderReadmeMarkdown } from "../src/readme.ts";
import { renderAgentsMarkdown } from "../src/agents.ts";

function graph(): DocsContentGraph {
	return {
		version: 1,
		site: { name: "DarkFactory" },
		home: "home",
		pages: [
			{ id: "home", kind: "home", title: "DarkFactory", source: "docs/home.md", markdown: "# DarkFactory\n" },
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


function writeProjectionAliases(repoRoot: string, omit?: string): void {
	const aliases = [
		[".claude", ".agents"],
		["CONTRIBUTING.md", "AGENTS.md"],
		[".agents/README.md", "../README.md"],
		[".agents/AGENTS.md", "../AGENTS.md"],
		[".agents/CLAUDE.md", "../AGENTS.md"],
		[".agents/notes/README.md", "../../README.md"],
	] as const;
	for (const [path, target] of aliases) {
		if (path === omit) continue;
		mkdirSync(join(repoRoot, path, ".."), { recursive: true });
		symlinkSync(target, join(repoRoot, path));
	}
	writeFileSync(join(repoRoot, "CLAUDE.md"), "@AGENTS.md\n");
}

describe("current documentation truth", () => {
	test("accepts the canonical README projection", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeFileSync(join(repoRoot, "README.md"), renderReadmeMarkdown(content));
			writeFileSync(join(repoRoot, "AGENTS.md"), renderAgentsMarkdown(content));
			writeProjectionAliases(repoRoot);
			expect(currentDocumentationFindings(repoRoot, content)).toEqual([]);
			expect(() => assertCurrentDocumentation(repoRoot, content)).not.toThrow();
		});
	});

	test("fails on README projection drift", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeFileSync(join(repoRoot, "README.md"), "# stale\n");
			writeFileSync(join(repoRoot, "AGENTS.md"), renderAgentsMarkdown(content));
			writeProjectionAliases(repoRoot);
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: "README.md",
				message: "committed README differs from the canonical repository-notes projection",
			});
			expect(() => assertCurrentDocumentation(repoRoot, content)).toThrow("Current documentation contract failed");
		});
	});

	test("fails when a required projection alias is missing", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeFileSync(join(repoRoot, "README.md"), renderReadmeMarkdown(content));
			writeFileSync(join(repoRoot, "AGENTS.md"), renderAgentsMarkdown(content));
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: "CONTRIBUTING.md",
				message: "required projection discovery alias is missing",
			});
		});
	});

	test("rejects copied projection aliases while allowing the canonical files to remain generated", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeFileSync(join(repoRoot, "README.md"), renderReadmeMarkdown(content));
			writeFileSync(join(repoRoot, "AGENTS.md"), renderAgentsMarkdown(content));
			writeProjectionAliases(repoRoot, ".agents/README.md");
			mkdirSync(join(repoRoot, ".agents"), { recursive: true });
			writeFileSync(join(repoRoot, ".agents", "README.md"), renderReadmeMarkdown(content));
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: ".agents/README.md",
				message: "projection discovery alias must remain a symlink, not a copied document",
			});
		});
	});

	test("rejects a stale Claude discovery import", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeFileSync(join(repoRoot, "README.md"), renderReadmeMarkdown(content));
			writeFileSync(join(repoRoot, "AGENTS.md"), renderAgentsMarkdown(content));
			writeProjectionAliases(repoRoot);
			writeFileSync(join(repoRoot, "CLAUDE.md"), "@some-other-file.md\n");
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: "CLAUDE.md",
				message: "Claude discovery import must be exactly @AGENTS.md",
			});
		});
	});

	test("fails when a retired documentation surface returns", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeFileSync(join(repoRoot, "README.md"), renderReadmeMarkdown(content));
			writeFileSync(join(repoRoot, "AGENTS.md"), renderAgentsMarkdown(content));
			writeProjectionAliases(repoRoot);
			mkdirSync(join(repoRoot, "harness"), { recursive: true });
			writeFileSync(join(repoRoot, "harness", "README.md"), "# retired\n");
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: "harness/README.md",
				message: "retired documentation surface must not exist",
			});
		});
	});
});
