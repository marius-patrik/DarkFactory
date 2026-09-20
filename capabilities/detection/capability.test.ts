import { expect, test, describe } from "bun:test";
import { capability } from "./capability";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("detection capability", () => {
    test("detect_packages should detect package.json at root", async () => {
        const root = await mkdtemp(join(tmpdir(), "df-test-"));
        await writeFile(join(root, "package.json"), JSON.stringify({ name: "my-package" }));
        
        const tool = capability.tools?.find(t => t.name === "detect_packages");
        const result = await tool?.execute({}, { repositoryRoot: root } as any);
        
        expect(result).toHaveProperty("detected");
        expect((result as any).detected[0].name).toBe("my-package");
    });

    test("detect_packages should handle malformed package.json", async () => {
        const root = await mkdtemp(join(tmpdir(), "df-test-"));
        await writeFile(join(root, "package.json"), "invalid json");
        
        const tool = capability.tools?.find(t => t.name === "detect_packages");
        const result = await tool?.execute({}, { repositoryRoot: root } as any);
        
        expect(result).toHaveProperty("detected");
        expect((result as any).detected[0].name).toBe("root");
    });
});
