import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
		pages: [{ id: "home", kind: "home", title: "DarkFactory", source: "docs/home.md", markdown: "# DarkFactory\n" }],
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

describe("current documentation truth", () => {
	test("accepts the canonical README projection", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeFileSync(join(repoRoot, "README.md"), renderReadmeMarkdown(content));
			writeFileSync(join(repoRoot, "AGENTS.md"), renderAgentsMarkdown(content));
			expect(currentDocumentationFindings(repoRoot, content)).toEqual([]);
			expect(() => assertCurrentDocumentation(repoRoot, content)).not.toThrow();
		});
	});

	test("fails on README projection drift", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeFileSync(join(repoRoot, "README.md"), "# stale\n");
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: "README.md",
				message: "committed README differs from the canonical repository-notes projection",
			});
			expect(() => assertCurrentDocumentation(repoRoot, content)).toThrow("Current documentation contract failed");
		});
	});


	test("rejects copied projection aliases while allowing the canonical files to remain generated", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeFileSync(join(repoRoot, "README.md"), renderReadmeMarkdown(content));
			writeFileSync(join(repoRoot, "AGENTS.md"), renderAgentsMarkdown(content));
			mkdirSync(join(repoRoot, ".agents"), { recursive: true });
			writeFileSync(join(repoRoot, ".agents", "README.md"), renderReadmeMarkdown(content));
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: ".agents/README.md",
				message: "projection discovery alias must remain a symlink, not a copied document",
			});
		});
	});

	test("fails when a retired documentation surface returns", () => {
		withRepo((repoRoot) => {
			const content = graph();
			writeFileSync(join(repoRoot, "README.md"), renderReadmeMarkdown(content));
			writeFileSync(join(repoRoot, "AGENTS.md"), renderAgentsMarkdown(content));
			mkdirSync(join(repoRoot, "harness"), { recursive: true });
			writeFileSync(join(repoRoot, "harness", "README.md"), "# retired\n");
			expect(currentDocumentationFindings(repoRoot, content)).toContainEqual({
				path: "harness/README.md",
				message: "retired documentation surface must not exist",
			});
		});
	});
});
