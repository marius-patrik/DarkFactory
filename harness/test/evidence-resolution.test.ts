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

	test("resolves Python ecosystem defaults", async () => {
		const temp = await mkdtemp("evidence-test-");
		try {
			await mkdir(resolve(temp, "packages/my-py"), { recursive: true });
			await writeFile(
				resolve(temp, "packages/my-py/pyproject.toml"),
				'name = "my-py-pkg"'
			);

			const result = await resolveRepositoryActions(temp);
			expect(result.packages["my-py-pkg"]).toBeDefined();
			expect(result.packages["my-py-pkg"].test.command).toBe("pytest packages/my-py");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	test("applies repo.df environment overrides", async () => {
		const temp = await mkdtemp("evidence-test-");
		try {
			await mkdir(resolve(temp, ".darkfactory"), { recursive: true });
			await writeFile(
				resolve(temp, ".darkfactory/repo.df"),
				JSON.stringify({
					identity: { owner: "o", repo: "r" },
					environment: {
						testing: { bun: { command: "custom-test" } }
					}
				})
			);
			await mkdir(resolve(temp, "packages/my-bun"), { recursive: true });
			await writeFile(
				resolve(temp, "packages/my-bun/package.json"),
				JSON.stringify({ name: "@scope/my-lib" })
			);

			const result = await resolveRepositoryActions(temp);
			expect(result.packages["@scope/my-lib"].test.command).toBe("custom-test");
			expect(result.packages["@scope/my-lib"].test.description).toBe("Declared in repo.df environment.testing");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});
});
