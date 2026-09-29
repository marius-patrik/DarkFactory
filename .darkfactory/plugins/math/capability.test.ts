import { describe, expect, test } from "bun:test";
import type { CapabilityPackageContext } from "@darkfactory/capability";
import { qualityMatrix, resolveRepositoryActions } from "@darkfactory/capability/actions";
import { resolveCapabilities } from "@darkfactory/capability/loader";
import capability from "./capability.ts";

/** Detected evidence for one Lean project, the ecosystem this capability exists to serve. */
function lean(): CapabilityPackageContext {
	return {
		id: "lean:proofs",
		path: "proofs",
		name: "proofs",
		ecosystem: "lean",
		packageManager: "lake",
		packageManagerRoot: "proofs",
		manifest: "lakefile.lean",
		domains: ["math"],
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
	return resolveRepositoryActions({ root: "/repo", domains: ["code", "math"], packages, repoDf: { environment: {} } }, [
		capability,
	]);
}

describe("math capability declaration", () => {
	test("checks a detected Lean project's proofs as its test action", () => {
		const resolved = resolution([lean()]);
		const test = resolved.packages[0]?.actions.test;
		expect(test?.supported).toBe(true);
		expect(test?.source).toBe("capability");
		expect(test?.capabilityId).toBe("math");
		// The capability exists to run the Lean toolchain: the compiler is the proof checker, so
		// this invocation is the contract rather than an incidental detail of the declaration.
		expect(test?.command).toBe("lake build");
	});

	test("leaves no test gap for a Lean package, and contributes exactly one executable row", () => {
		const resolved = resolution([lean()]);
		expect(resolved.gaps.some((gap) => gap.kind === "test")).toBe(false);
		expect(qualityMatrix(resolved)).toEqual([
			{
				id: "lean:proofs:test",
				packageId: "lean:proofs",
				kind: "test",
				command: "lake build",
				cwd: "proofs",
				ecosystem: "lean",
				packageManager: "lake",
			},
		]);
	});

	test("invents no action for a Lean toolchain it does not own", () => {
		const actions = resolution([lean()]).packages[0]?.actions;
		// Lean ships no linter and no formatter, so a lint or format command here could not fail
		// and would be invented enforcement (DF-RULE-006).
		for (const kind of ["lint", "format_check", "typecheck", "setup", "docs_extract", "release"] as const) {
			expect(actions?.[kind].supported).toBe(false);
			expect(actions?.[kind].source).toBe("unsupported");
			expect(actions?.[kind].capabilityId).toBeUndefined();
		}
	});

	test("does not claim a node action, so it cannot contend with the code capability", () => {
		const actions = resolution([node()]).packages[0]?.actions;
		expect(actions?.test.supported).toBe(false);
		expect(actions?.test.source).toBe("unsupported");
		expect(actions?.test.capabilityId).toBeUndefined();
	});

	test("activates for the math domain only", () => {
		expect(resolveCapabilities([capability], ["math"]).capabilities).toHaveLength(1);
		// This repository detects no math ecosystem, so the capability contributes nothing to its
		// matrix. That is domain scoping working, not a missing action.
		expect(resolveCapabilities([capability], ["code", "paper"]).capabilities).toHaveLength(0);
		expect(capability.detectors?.map((detector) => detector.domains)).toEqual([["math"]]);
	});
});
