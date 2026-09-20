import { expect, test, describe } from "bun:test";
import { capability } from "./capability";

describe("quality capability", () => {
    test("should have correct abi version", () => {
        expect(capability.abiVersion).toBeDefined();
    });

    test("should have run_quality_checks tool", () => {
        const tool = capability.tools?.find(t => t.name === "run_quality_checks");
        expect(tool).toBeDefined();
    });
});
