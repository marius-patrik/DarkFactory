import { expect, test, describe } from "bun:test";
import { capability } from "./capability";

describe("detection capability", () => {
    test("should have detect_packages tool", () => {
        const tool = capability.tools?.find(t => t.name === "detect_packages");
        expect(tool).toBeDefined();
    });
});
