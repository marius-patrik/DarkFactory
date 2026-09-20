import { expect, test, describe } from "bun:test";
import { capability } from "./capability";

describe("quality capability", () => {
    test("run_quality_checks should fail when tool is missing", async () => {
        const tool = capability.tools?.find(t => t.name === "run_quality_checks");
        
        // This tool relies on checkToolExists, we are testing the failure path
        // when a non-existent tool is requested.
        await expect(tool?.execute({ action: "test", package: "non-existent-pkg" }, { repositoryRoot: "/tmp" } as any))
            .rejects.toThrow(/not found/);
    });
});
