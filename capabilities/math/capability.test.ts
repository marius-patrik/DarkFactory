import { describe, expect, test } from "bun:test";
import { capability } from "./capability.ts";

describe("math capability", () => {
	test("activates only the math domain", () => {
		expect(capability.id).toBe("math");
		expect(capability.domains).toEqual(["math"]);
		expect(capability.detectors).toEqual([
			{ id: "math-domain", description: "Activates when repository domain detection includes math.", domains: ["math"] },
		]);
	});

	test("uses Lean build as deterministic proof verification", () => {
		expect(capability.actions).toEqual([
			{
				kind: "test",
				description: "Build Lean targets to check formal proofs.",
				ecosystems: ["lean"],
				command: "lake build",
			},
		]);
	});
});
