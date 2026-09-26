import { describe, it, expect } from "bun:test";
import { resolveRepositoryActions } from "../packages/capability/src/actions.ts";

describe("action resolution", () => {
    it("should resolve required actions for packages", async () => {
        const evidence = {
            root: "/workspace",
            domains: ["code"],
            packages: [
                {
                    id: "test-pkg",
                    path: "packages/test",
                    name: "test-pkg",
                    ecosystem: "node",
                    packageManager: "bun",
                    packageManagerRoot: "packages/test",
                    manifest: "package.json",
                    domains: ["code"],
                    scripts: ["test", "lint", "format:check"],
                    apiEntryPoints: [],
                },
            ],
            repoDf: { environment: {} },
        };
        const definitions = []; // Empty definitions to force fallback to gaps
        const result = resolveRepositoryActions(evidence, definitions);
        
        // Should have gaps for test, lint, format_check, typecheck
        expect(result.gaps.length).toBeGreaterThan(0);
        expect(result.gaps.some(g => g.kind === "test")).toBe(true);
        expect(result.gaps.some(g => g.kind === "lint")).toBe(true);
        expect(result.gaps.some(g => g.kind === "format_check")).toBe(true);
        expect(result.gaps.some(g => g.kind === "typecheck")).toBe(true);
    });
});
