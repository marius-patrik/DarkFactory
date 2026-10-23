import { describe, expect, test } from "bun:test";
import { qualityMatrix, resolveRepositoryActions } from "../../../packages/capability/src/actions.ts";
import type { CapabilityPackageContext } from "../../../packages/capability/src/index.ts";
import { resolveCapabilities } from "../../../packages/capability/src/loader.ts";
import capability from "./capability.ts";

/** Detected evidence for one document package in the given engine. */
function document(ecosystem: "typst" | "latex"): CapabilityPackageContext {
	return {
		id: `${ecosystem}:paper`,
		path: "paper",
		name: "paper",
		ecosystem,
		packageManager: ecosystem,
		packageManagerRoot: "paper",
		manifest: ecosystem === "typst" ? "typst.toml" : ".latexmkrc",
		domains: ["paper"],
		scripts: [],
		apiEntryPoints: [],
	};
}

/** Detected evidence for a Node package, which this capability must leave entirely alone. */
function node(): CapabilityPackageContext {
	return {
		id: "node:packages/example",
		path: "packages/example",
		name: "example",
		ecosystem: "node",
		packageManager: "bun",
		packageManagerRoot: ".",
		manifest: "package.json",
		domains: ["code"],
		scripts: ["test"],
		apiEntryPoints: [],
	};
}

/** Resolves this capability alone against detected evidence, with no repository overrides to mask it. */
function resolution(packages: readonly CapabilityPackageContext[]) {
	return resolveRepositoryActions(
		{ root: "/repo", domains: ["code", "paper"], packages, repoDf: { environment: {} } },
		[capability],
	);
}

describe("paper capability declaration", () => {
	test("typesets a detected document with the engine it was detected from", () => {
		const typst = resolution([document("typst")]).packages[0]?.actions.typecheck;
		expect(typst?.supported).toBe(true);
		expect(typst?.source).toBe("capability");
		expect(typst?.capabilityId).toBe("paper");
		// Typst and LaTeX are two ways to reach the same artifact, so the check is the engine's own
		// build: that is the assertion, independent of where the PDF is written.
		expect(typst?.command).toMatch(/\btypst compile\b/u);

		const latex = resolution([document("latex")]).packages[0]?.actions.typecheck;
		expect(latex?.supported).toBe(true);
		expect(latex?.capabilityId).toBe("paper");
		expect(latex?.command).toMatch(/\blatexmk\b/u);
	});

	test("publishes a detected document and declares the artifacts a release attaches", () => {
		for (const ecosystem of ["typst", "latex"] as const) {
			const release = resolution([document(ecosystem)]).packages[0]?.actions.release;
			expect(release?.supported).toBe(true);
			expect(release?.capabilityId).toBe("paper");
			// A release command that publishes nothing is a green row that attaches no artifact, so
			// the command has to name the real publication route for that engine.
			expect(release?.command).toMatch(ecosystem === "typst" ? /publication\.ts\b/u : /\blatexmk\b/u);
			const artifacts = release?.metadata?.artifacts;
			expect(Array.isArray(artifacts)).toBe(true);
			expect(artifacts).not.toHaveLength(0);
			expect((artifacts as string[]).every((glob) => typeof glob === "string" && glob.length > 0)).toBe(true);
		}
	});

	test("typesetting is the typecheck, so a document package has no typecheck gap", () => {
		for (const ecosystem of ["typst", "latex"] as const) {
			const resolved = resolution([document(ecosystem)]);
			expect(resolved.gaps.some((gap) => gap.kind === "typecheck")).toBe(false);
			expect(qualityMatrix(resolved).some((entry) => entry.kind === "typecheck" && entry.ecosystem === ecosystem)).toBe(
				true,
			);
		}
	});

	test("invents no document action for an engine that has no such tool", () => {
		// Typst 0.15.1 has no test runner, linter or formatter, and LaTeX has none either, so a
		// command here could not fail. This capability must therefore contribute nothing for those
		// kinds; the repository contract is what declares them not applicable, and it can only be
		// honest while the capability agrees (the `ci-readiness` skill).
		const actions = resolution([document("typst")]).packages[0]?.actions;
		for (const kind of ["test", "lint", "format_check", "docs_extract", "setup"] as const) {
			expect(actions?.[kind].supported).toBe(false);
			expect(actions?.[kind].source).toBe("unsupported");
			expect(actions?.[kind].capabilityId).toBeUndefined();
		}
	});

	test("does not claim a node action, so it cannot contend with the code capability", () => {
		const actions = resolution([node()]).packages[0]?.actions;
		expect(actions?.typecheck.supported).toBe(false);
		expect(actions?.test.supported).toBe(false);
		expect(actions?.release.supported).toBe(false);
		expect(actions?.typecheck.source).toBe("unsupported");
		expect(actions?.release.source).toBe("unsupported");
	});

	test("activates for the paper domain only", () => {
		expect(resolveCapabilities([capability], ["paper"]).capabilities).toHaveLength(1);
		expect(resolveCapabilities([capability], ["code", "math"]).capabilities).toHaveLength(0);
		expect(capability.detectors?.map((detector) => detector.domains)).toEqual([["paper"]]);
	});
});
