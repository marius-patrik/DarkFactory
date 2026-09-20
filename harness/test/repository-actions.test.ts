import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRepositoryActions } from "@darkfactory/capability/actions";
import { detectRepositoryEvidence } from "@darkfactory/core/repository-evidence";
import codeCapability from "../../capabilities/code/capability.ts";

const roots: string[] = [];

async function fixture(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "df-evidence-"));
	roots.push(root);
	await mkdir(join(root, "src"), { recursive: true });
	await writeFile(
		join(root, "package.json"),
		JSON.stringify({
			name: "workspace",
			packageManager: "bun@1.3.0",
			exports: { ".": "./src/index.ts", "./extra": "./src/extra.ts" },
			scripts: { lint: "biome lint .", check: "biome check ." },
		}),
	);
	await writeFile(join(root, "bun.lock"), "");
	await writeFile(join(root, "src", "index.ts"), "export const value = 1;\n");
	await writeFile(join(root, "src", "extra.ts"), "export const extra = 2;\n");

	await mkdir(join(root, "python"), { recursive: true });
	await writeFile(join(root, "python", "pyproject.toml"), '[project]\nname = "python-part"\n');
	await writeFile(
		join(root, "repo.df"),
		JSON.stringify({
			environment: {
				linting: { python: { command: "ruff check ." } },
			},
		}),
	);
	return root;
}

afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("repository evidence and capability actions", () => {
	test("detects Bun/TypeScript and Python packages with exported API entrypoints", async () => {
		const root = await fixture();
		const evidence = await detectRepositoryEvidence(root);
		expect(evidence.packages.map((pkg) => pkg.id)).toEqual(["node:.", "python:python"]);
		const node = evidence.packages.find((pkg) => pkg.id === "node:.")!;
		expect(node.packageManager).toBe("bun");
		expect(node.apiEntryPoints).toEqual(["src/extra.ts", "src/index.ts"]);
		expect(evidence.domains).toContain("code");
	});

	test("resolves actions only from repo.df overrides and capability contributions", async () => {
		const root = await fixture();
		const evidence = await detectRepositoryEvidence(root);
		const resolution = resolveRepositoryActions(evidence, [codeCapability]);
		const node = resolution.packages.find((entry) => entry.package.id === "node:.")!;
		expect(node.actions.test.command).toBe("bun test");
		expect(node.actions.lint.command).toBe("bun run lint");
		expect(node.actions.format_check.command).toBe("bun run check");
		expect(node.actions.docs_extract.metadata).toEqual({
			extractor: "typedoc",
			entryPoints: ["src/extra.ts", "src/index.ts"],
			strict: true,
		});

		const python = resolution.packages.find((entry) => entry.package.id === "python:python")!;
		expect(python.actions.lint.source).toBe("repo.df");
		expect(python.actions.lint.command).toBe("ruff check .");
		expect(python.actions.docs_extract.supported).toBe(false);
		expect(resolution.gaps.some((gap) => gap.packageId === "python:python" && gap.kind === "docs_extract")).toBe(true);
	});

	test("does not silently fall back when an action is unsupported", async () => {
		const root = await fixture();
		const evidence = await detectRepositoryEvidence(root);
		const resolution = resolveRepositoryActions(evidence, []);
		const action = resolution.packages.find((entry) => entry.package.id === "node:.")!.actions.test;
		expect(action.supported).toBe(false);
		expect(action.source).toBe("unsupported");
		expect(action.command).toBeUndefined();
	});
});
