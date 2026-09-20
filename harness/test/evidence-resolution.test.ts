import { describe, expect, test } from "bun:test";
import { resolveRepositoryActions } from "../src/evidence/capabilities";
import { resolve, join } from "node:path";
import { mkdir, writeFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

describe("evidence resolution", () => {
	test("resolves actions for a detected Bun/TypeScript package", async () => {
		const temp = await mkdtemp(join(tmpdir(), "evidence-test-"));
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
		const temp = await mkdtemp(join(tmpdir(), "evidence-test-"));
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
		const temp = await mkdtemp(join(tmpdir(), "evidence-test-"));
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

	test("resolves capability-contributed actions", async () => {
		const temp = await mkdtemp(join(tmpdir(), "evidence-test-"));
		try {
			// Mock capability directory
			const capsDir = resolve(temp, "capabilities");
			await mkdir(capsDir, { recursive: true });
			await writeFile(
				resolve(capsDir, "my-cap.json"),
				JSON.stringify({
					id: "my-cap",
					abiVersion: "1",
					actions: {
						test: { command: "custom-cap-test", description: "Cap test" }
					}
				})
			);

			// Mock package
			await mkdir(resolve(temp, "packages/pkg-a"), { recursive: true });
			await writeFile(
				resolve(temp, "packages/pkg-a/package.json"),
				JSON.stringify({ name: "pkg-a" })
			);

			const result = await resolveRepositoryActions(temp, capsDir);
			const actions = result.packages["pkg-a"];
			expect(actions).toBeDefined();
			expect(actions.test.supported).toBe(true);
			expect(actions.test.command).toBe("custom-cap-test");
			expect(actions.test.description).toBe("Cap test");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	test("resolves multi-ecosystem path collision without silent data loss", async () => {
		const temp = await mkdtemp(join(tmpdir(), "evidence-test-"));
		try {
			await mkdir(resolve(temp, "packages/hybrid"), { recursive: true });
			await writeFile(
				resolve(temp, "packages/hybrid/package.json"),
				JSON.stringify({ name: "hybrid-bun" })
			);
			await writeFile(
				resolve(temp, "packages/hybrid/pyproject.toml"),
				'name = "hybrid-python"'
			);

			const result = await resolveRepositoryActions(temp);
			expect(result.packages["hybrid-bun"]).toBeDefined();
			expect(result.packages["hybrid-python"]).toBeDefined();
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	test("resolves Go setup command incorporating package path", async () => {
		const temp = await mkdtemp(join(tmpdir(), "evidence-test-"));
		try {
			await mkdir(resolve(temp, "packages/my-go"), { recursive: true });
			await writeFile(
				resolve(temp, "packages/my-go/go.mod"),
				"module my-go-module"
			);

			const result = await resolveRepositoryActions(temp);
			expect(result.packages["my-go-module"]).toBeDefined();
			expect(result.packages["my-go-module"].setup.command).toBe("go mod download -C packages/my-go");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	test("applies repo.df environment overrides with path placeholder interpolation", async () => {
		const temp = await mkdtemp(join(tmpdir(), "evidence-test-"));
		try {
			await mkdir(resolve(temp, ".darkfactory"), { recursive: true });
			await writeFile(
				resolve(temp, ".darkfactory/repo.df"),
				JSON.stringify({
					identity: { owner: "o", repo: "r" },
					environment: {
						testing: { bun: { command: "custom-test --cwd {path}" } }
					}
				})
			);
			await mkdir(resolve(temp, "packages/my-bun"), { recursive: true });
			await writeFile(
				resolve(temp, "packages/my-bun/package.json"),
				JSON.stringify({ name: "@scope/my-lib" })
			);

			const result = await resolveRepositoryActions(temp);
			expect(result.packages["@scope/my-lib"].test.command).toBe("custom-test --cwd packages/my-bun");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	test("resolves capability actions using priority parameter", async () => {
		const temp = await mkdtemp(join(tmpdir(), "evidence-test-"));
		try {
			const capsDir = resolve(temp, "capabilities");
			await mkdir(capsDir, { recursive: true });
			await writeFile(
				resolve(capsDir, "b-cap.json"),
				JSON.stringify({
					id: "b-cap",
					abiVersion: "1",
					priority: 10,
					actions: {
						test: { command: "priority-cap-test", description: "Priority high" }
					}
				})
			);
			await writeFile(
				resolve(capsDir, "a-cap.json"),
				JSON.stringify({
					id: "a-cap",
					abiVersion: "1",
					priority: 5,
					actions: {
						test: { command: "normal-cap-test", description: "Priority low" }
					}
				})
			);

			await mkdir(resolve(temp, "packages/pkg-a"), { recursive: true });
			await writeFile(
				resolve(temp, "packages/pkg-a/package.json"),
				JSON.stringify({ name: "pkg-a" })
			);

			const result = await resolveRepositoryActions(temp, capsDir);
			const actions = result.packages["pkg-a"];
			expect(actions.test.command).toBe("priority-cap-test");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});
});
