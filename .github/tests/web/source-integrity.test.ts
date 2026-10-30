import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeSiteBasePath, validateWebConfig } from "../../../packages/web/src/site-contract.ts";

const root = resolve(import.meta.dir, "../../..");
test("all DF-03 transferred sources are complete, not 1506-byte marker blobs", () => {
	for (const path of [
		"packages/web/DF-04-HANDOFF.md", "packages/web/src/browser.tsx",
		"packages/web/src/operator-auth.ts", "packages/web/src/operator-data.ts",
		"packages/web/src/operator-views.tsx", "packages/web/src/site-contract.ts",
		"packages/web/src/web-shell.tsx", ".github/tests/web/operator-auth.test.ts",
		".github/tests/web/operator-data.test.ts", ".github/tests/web/web-shell.test.tsx",
	]) {
		const data = readFileSync(resolve(root, path));
		const text = data.toString("utf8");
		expect(data.byteLength).not.toBe(1506);
		expect(text).not.toContain("¶»§q«^");
		expect(text).toMatch(/\n$/u);
	}
});
test("web base-path is strict and config points to packaged docs graph", () => {
	expect(normalizeSiteBasePath("/DarkFactory")).toBe("/DarkFactory/");
	expect(normalizeSiteBasePath("/")).toBe("/");
	expect(() => normalizeSiteBasePath("/../evil")).toThrow();
	const config = validateWebConfig({ version: 1, repository: "marius-patrik/DarkFactory",
		docsContentUrl: "./docs/content.json" });
	expect(config.docsContentUrl).toBe("./docs/content.json");
	expect(() => validateWebConfig({ version: 1, repository: "o/r",
		docsContentUrl: "https://attacker.invalid/content.json" })).toThrow();
});
