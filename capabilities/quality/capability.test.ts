import { expect, test, describe } from "bun:test";
import { capability } from "./capability";
import { CapabilityRuntimeContext } from "@darkfactory/capability";

describe("quality capability", () => {
    test("run_quality_checks should fail when tool is missing", async () => {
        const tool = capability.tools?.find(t => t.name === "run_quality_checks");
        
        // This tool relies on checkToolExists, we are testing the failure path
        // when a non-existent tool is requested.
        const context = { repositoryRoot: "/tmp" } as CapabilityRuntimeContext;
        await expect(tool?.execute({ action: "test", package: "non-existent-pkg" }, context))
            .rejects.toThrow(/not found/);
    });
});
