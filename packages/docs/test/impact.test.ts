import { describe, expect, test } from "bun:test";
import type { RepositoryEvidence } from "@darkfactory/core/repository-evidence";
import {
	classifyDocumentationImpact,
	evaluateDocumentationImpact,
	parseDocsNoneAnnotation,
} from "../src/impact.ts";

const evidence: RepositoryEvidence = {
	root: "/repo",
	repoDf: {},
	packages: [
		{
			id: "node:packages/example",
			path: "packages/example",
			name: "@darkfactory/example",
			ecosystem: "node",
			packageManager: "bun",
			packageManagerRoot: ".",
			manifest: "package.json",
			domains: ["code"],
			scripts: [],
			apiEntryPoints: ["packages/example/src/index.ts"],
		},
	],
	ecosystems: ["node"],
	domains: ["code"],
};

describe("documentation impact policy", () => {
	test("uses detected API entry points for public API classification", () => {
		expect(classifyDocumentationImpact(["packages/example/src/index.ts"], evidence)).toEqual({
			changedFiles: ["packages/example/src/index.ts"],
			documentationFiles: [],
			impactKinds: ["public-api"],
			requiresDocumentation: true,
			permitsDocsNone: false,
		});
	});

	test("classifies product and governance contracts deterministically", () => {
		const result = classifyDocumentationImpact(
			["repo.df", ".github/workflows/ci.yml", ".agents/notes/rules/001-current.md"],
			evidence,
		);
		expect(result.impactKinds).toEqual(["governance", "product"]);
		expect(result.documentationFiles).toEqual([".agents/notes/rules/001-current.md"]);
	});

	test("does not invent docs impact for an internal implementation helper", () => {
		const result = classifyDocumentationImpact(["packages/example/src/internal.ts"], evidence);
		expect(result.impactKinds).toEqual([]);
		expect(result.permitsDocsNone).toBe(true);
	});

	test("parses Docs: none only with a non-empty reason", () => {
		expect(parseDocsNoneAnnotation("Docs: none (internal refactor only)")).toEqual({
			present: true,
			valid: true,
			reason: "internal refactor only",
		});
		expect(parseDocsNoneAnnotation("Docs: none ()")).toEqual({ present: true, valid: false });
		expect(parseDocsNoneAnnotation("No docs marker")).toEqual({ present: false, valid: false });
	});

	test("fails closed when the comparison diff was not computed", () => {
		expect(() => evaluateDocumentationImpact(undefined, evidence)).toThrow(
			"Documentation impact diff was not computed",
		);
	});

	test("accepts a successfully computed empty diff", () => {
		const result = evaluateDocumentationImpact([], evidence);
		expect(result.classification.changedFiles).toEqual([]);
		expect(result.findings).toEqual([]);
	});

	test("requires documentation for detected public API impact", () => {
		const result = evaluateDocumentationImpact(
			["packages/example/src/index.ts"],
			evidence,
			"Docs: none (internal only)",
		);
		expect(result.findings.map((finding) => finding.code)).toEqual(["docs-none-not-permitted", "docs-required"]);
	});

	test("accepts an actual docs update for classified product impact", () => {
		const result = evaluateDocumentationImpact(["repo.df", ".agents/docs.df"], evidence);
		expect(result.findings).toEqual([]);
	});

	test("requires exact Docs: none justification for internal-only changes", () => {
		const missing = evaluateDocumentationImpact(["packages/example/src/internal.ts"], evidence);
		expect(missing.findings.map((finding) => finding.code)).toEqual(["docs-none-missing"]);

		const empty = evaluateDocumentationImpact(["packages/example/src/internal.ts"], evidence, "Docs: none ()");
		expect(empty.findings.map((finding) => finding.code)).toEqual(["docs-none-invalid"]);

		const valid = evaluateDocumentationImpact(
			["packages/example/src/internal.ts"],
			evidence,
			"Docs: none (implementation-only refactor with no public contract change)",
		);
		expect(valid.findings).toEqual([]);
	});
});
