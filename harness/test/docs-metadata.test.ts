import { describe, expect, test } from "bun:test";
import type { CapabilityDefinition } from "@darkfactory/capability";
import type { RepositoryEvidence } from "@darkfactory/core/repository-evidence";
import { documentationMetadata } from "../../packages/docs/src/api.ts";

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
				hooks: [{ id: "pre-commit", event: "pre-commit" }],
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
});
