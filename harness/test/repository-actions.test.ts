import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { qualityMatrix, resolveRepositoryActions } from "@darkfactory/capability/actions";
import { detectRepositoryEvidence } from "@darkfactory/core/repository-evidence";
import codeCapability from "../../capabilities/code/capability.ts";
import mathCapability from "../../capabilities/math/capability.ts";
import paperCapability from "../../capabilities/paper/capability.ts";

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
			scripts: { test: "bun test", lint: "biome lint .", "format:check": "biome check ." },
		}),
	);
	await writeFile(join(root, "bun.lock"), "");
	await writeFile(join(root, "src", "index.ts"), "export const value = 1;\n");
	await writeFile(join(root, "src", "extra.ts"), "export const extra = 2;\n");

	await mkdir(join(root, "python"), { recursive: true });
	await writeFile(join(root, "python", "pyproject.toml"), '[project]\nname = "python-part"\n');
	await mkdir(join(root, "paper"), { recursive: true });
	await writeFile(join(root, "paper", "typst.toml"), '[package]\nname = "paper"\n');
	await mkdir(join(root, "proofs"), { recursive: true });
	await writeFile(join(root, "proofs", "lakefile.lean"), "package Proofs\n");
	await writeFile(
		join(root, "repo.df"),
		JSON.stringify({
			environment: {
				linting: { python: { command: "ruff check ." } },
				testing: { python: { versions: ["3.12"] } },
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
		expect(evidence.packages.map((pkg) => pkg.id)).toEqual(["lean:proofs", "node:.", "python:python", "typst:paper"]);
		const node = evidence.packages.find((pkg) => pkg.id === "node:.")!;
		expect(node.packageManager).toBe("bun");
		expect(node.packageManagerRoot).toBe(".");
		expect(node.apiEntryPoints).toEqual(["src/extra.ts", "src/index.ts"]);
		expect(evidence.domains).toContain("code");
	});

	test("resolves actions only from repo.df overrides and capability contributions", async () => {
		const root = await fixture();
		const evidence = await detectRepositoryEvidence(root);
		const resolution = resolveRepositoryActions(evidence, [codeCapability, paperCapability, mathCapability]);
		const node = resolution.packages.find((entry) => entry.package.id === "node:.")!;
		expect(node.actions.test.command).toBe("bun run test");
		expect(node.actions.lint.command).toBe("bun run lint");
		expect(node.actions.format_check.command).toBe("bun run format:check");
		expect(node.actions.docs_extract.metadata).toEqual({
			extractor: "typedoc",
			entryPoints: ["src/extra.ts", "src/index.ts"],
			strict: true,
		});

		const python = resolution.packages.find((entry) => entry.package.id === "python:python")!;
		expect(python.actions.lint.source).toBe("repo.df");
		expect(python.actions.lint.command).toBe("ruff check .");
		expect(python.actions.test.command).toBe("pytest");
		expect(python.actions.test.metadata).toEqual({ versions: ["3.12"] });
		expect(python.actions.docs_extract.supported).toBe(false);
		expect(resolution.gaps.some((gap) => gap.packageId === "python:python" && gap.kind === "docs_extract")).toBe(true);

		const paper = resolution.packages.find((entry) => entry.package.id === "typst:paper")!;
		expect(paper.actions.test.command).toContain("typst compile");
		const math = resolution.packages.find((entry) => entry.package.id === "lean:proofs")!;
		expect(math.actions.test.command).toBe("lake build");

		const matrix = qualityMatrix(resolution);
		expect(matrix.filter((entry) => entry.packageId === "python:python" && entry.kind === "test")).toHaveLength(1);
		expect(matrix.find((entry) => entry.packageId === "python:python" && entry.kind === "test")?.version).toBe("3.12");
		expect(matrix.some((entry) => entry.packageId === "typst:paper" && entry.kind === "test")).toBe(true);
		expect(matrix.some((entry) => entry.packageId === "lean:proofs" && entry.kind === "test")).toBe(true);
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
