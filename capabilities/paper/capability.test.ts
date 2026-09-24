import { describe, expect, test } from "bun:test";
import type { CapabilityActionDefinition } from "@darkfactory/capability";
import { capability } from "./capability.ts";

describe("paper capability", () => {
	test("activates the paper domain", () => {
		expect(capability.id).toBe("paper");
		expect(capability.domains).toEqual(["paper"]);
		expect(capability.detectors?.map((entry) => entry.id)).toEqual(["paper-domain"]);
	});

	test("uses the same deterministic build semantics for verification and release per paper ecosystem", () => {
		for (const ecosystem of ["typst", "latex"]) {
			const actions = capability.actions as readonly CapabilityActionDefinition[] | undefined;
			const verification = actions?.find(
				(entry) => entry.kind === "test" && entry.ecosystems?.includes(ecosystem),
			);
			const release = actions?.find(
				(entry) => entry.kind === "release" && entry.ecosystems?.includes(ecosystem),
			);
			expect(verification?.command).toBeDefined();
			expect(release?.command).toBe(verification?.command);
			expect(release?.metadata).toEqual({ artifacts: ["out/*.pdf", "*.pdf"] });
		}
	});
});
