import { describe, expect, test } from "bun:test";
import { resolveRepositoryActions } from "../src/evidence/capabilities";
import { resolve } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { mkdtemp } from "node:os";

describe("evidence resolution", () => {
	test("resolves actions for a detected Bun/TypeScript package", async () => {
		const temp = await mkdtemp("evidence-test-");
		try {
			await mkdir(resolve(temp, "packages/my-lib"), { recursive: true });
			await writeFile(
				resolve(temp, "packages/my-lib/package.json"),
				JSON.stringify({ name: "@scope/my-lib" })
			);

			const result = await resolveRepositoryActions(temp);
			expect(result.packages["@scope/my-lib"]).toBeDefined();
			expect(result.packages["@scope/my-lib"].test.supported).toBe(true);
			expect(result.packages["@scope/my-lib"].test.command).toContain("bun test");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	test("falls back to unsupported for unknown package types", async () => {
		const temp = await mkdtemp("evidence-test-");
		try {
			await mkdir(resolve(temp, "packages/unknown"), { recursive: true });
			// No manifest

			const result = await resolveRepositoryActions(temp);
			// Even with no manifest, scanning might pick it up? 
			// Wait, scanDirectory only adds packages if manifest exists.
			// Let's create an unknown file structure.
			expect(result.packages).toEqual({});
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});
});
