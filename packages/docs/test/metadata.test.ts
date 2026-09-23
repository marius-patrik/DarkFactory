import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CapabilityDefinition } from "@darkfactory/capability";
import type { RepositoryEvidence } from "@darkfactory/core/repository-evidence";
import { documentationMetadata } from "../src/api.ts";
import { type DocsContentGraph, includeCapabilityDocumentation } from "../src/content.ts";

describe("detected documentation metadata", () => {
	test("projects repository and capability evidence without a second detector", () => {
		const evidence: RepositoryEvidence = {
			root: "/repo",
			repoDfPath: "/repo/.darkfactory/repo.df",
			repoDf: { identity: { default_branch: "darkfactory" } },
			packages: [
				{
					id: "node:packages/core",
					path: "packages/core",
					name: "@darkfactory/core",
					ecosystem: "node",
					packageManager: "bun",
					packageManagerRoot: ".",
					manifest: "package.json",
					domains: ["code"],
					scripts: ["test"],
					apiEntryPoints: ["packages/core/src/index.ts"],
				},
			],
			ecosystems: ["node"],
			domains: ["code"],
		};
		const definitions: CapabilityDefinition[] = [
			{
				abiVersion: "1",
				id: "code",
				version: "1.2.3",
				description: "Code capability.",
				domains: ["code"],
				detectors: [{ id: "code-domain", description: "Code domain.", domains: ["code"] }],
				commands: [{ name: "verify", description: "Verify.", execute: () => undefined }],
				graph: [{ id: "code-nodes", nodeKinds: ["agent"] }],
				hooks: [{ id: "pre-commit", events: ["pre-commit"] }],
				verification: [{ id: "quality", description: "Quality." }],
				surfaces: { docs: ["docs/code.md"] },
			},
		];

		expect(documentationMetadata(evidence, definitions)).toEqual({
			repository: {
				repoDfPath: ".darkfactory/repo.df",
				defaultBranch: "darkfactory",
				ecosystems: ["node"],
				domains: ["code"],
				packages: [
					{
						id: "node:packages/core",
						path: "packages/core",
						name: "@darkfactory/core",
						ecosystem: "node",
						packageManager: "bun",
						domains: ["code"],
						apiEntryPoints: ["packages/core/src/index.ts"],
					},
				],
			},
			capabilities: [
				{
					id: "code",
					version: "1.2.3",
					description: "Code capability.",
					domains: ["code"],
					detectors: ["code-domain"],
					commands: ["verify"],
					graph: [{ id: "code-nodes", nodeKinds: ["agent"] }],
					hooks: ["pre-commit:pre-commit"],
					verification: ["quality"],
					docs: ["docs/code.md"],
				},
			],
		});
	});

	test("adds capability-declared docs to the canonical graph deterministically", () => {
		const root = mkdtempSync(join(tmpdir(), "darkfactory-capability-docs-"));
		try {
			mkdirSync(join(root, "capabilities", "code"), { recursive: true });
			writeFileSync(join(root, "capabilities", "code", "README.md"), "# Code capability\n");
			const graph: DocsContentGraph = {
				version: 1,
				site: { name: "Fixture" },
				home: "home",
				pages: [{ id: "home", kind: "home", title: "Home", source: "docs/home.md", markdown: "# Home\n" }],
				workflows: [],
			};
			const capabilities = [
				{
					id: "code",
					version: "1.0.0",
					description: "Code capability.",
					domains: ["code"],
					detectors: [],
					commands: [],
					graph: [],
					hooks: [],
					verification: [],
					docs: ["capabilities/code/README.md"],
				},
			];
			const result = includeCapabilityDocumentation(root, graph, capabilities);
			expect(result.pages.map((page) => page.id)).toEqual(["home", "capability-code-capabilities-code-readme"]);
			expect(result.pages[1]?.kind).toBe("capability");
			expect(result.pages[1]?.title).toBe("Code capability");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
