import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	compileDocsContentGraph,
	extractTypeScriptApi,
	loadDocsConfig,
	parseDocsConfig,
	README_GENERATED_MARKER,
	renderReadmeMarkdown,
	resolveDocsConfigPath,
} from "../../packages/docs/src/index.ts";

const roots: string[] = [];

async function fixture(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "darkfactory-docs-"));
	roots.push(root);
	await mkdir(join(root, "docs"), { recursive: true });
	await mkdir(join(root, ".agents", "rules"), { recursive: true });
	await mkdir(join(root, ".agents", "notes", "adr"), { recursive: true });
	await mkdir(join(root, ".github", "workflows"), { recursive: true });
	await writeFile(
		join(root, "docs.df"),
		JSON.stringify({ version: 1, site: { name: "Fixture", description: "Fixture docs" }, home: "docs/home.md" }),
	);
	await writeFile(join(root, "docs", "home.md"), "# Home\n\nSee [the PRD](../PRD.md).\n");
	await writeFile(join(root, "PRD.md"), "# Product\n");
	await writeFile(join(root, "PLAN.md"), "# Plan\n");
	await writeFile(join(root, "AGENTS.md"), "# Rules projection\n");
	await writeFile(join(root, ".agents", "rules", "001-test.md"), "# Rule\n");
	await writeFile(join(root, ".agents", "notes", "adr", "0001-test.md"), "# ADR-0001 — Test\n\n**Status**: Accepted\n");
	await writeFile(join(root, ".agents", "notes", "adr", "README.md"), "# Decisions\n");
	await writeFile(
		join(root, ".github", "workflows", "ci.yml"),
		"name: CI\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n",
	);
	return root;
}

afterEach(async () => {
	for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("@darkfactory/docs", () => {
	test("parses the native docs.df contract", () => {
		expect(parseDocsConfig('{"version":1,"site":{"name":"Docs"},"home":"docs/home.md"}')).toEqual({
			version: 1,
			site: { name: "Docs" },
			home: "docs/home.md",
		});
		expect(() => parseDocsConfig("{}")).toThrow("version must be 1");
		expect(() => parseDocsConfig('{"version":1,"site":{"name":""},"home":"x"}')).toThrow("site.name");
	});

	test("resolves one docs.df location and rejects an ambiguous definition", async () => {
		const root = await fixture();
		expect(resolveDocsConfigPath(root)).toBe(join(root, "docs.df"));
		await mkdir(join(root, ".darkfactory"), { recursive: true });
		await writeFile(
			join(root, ".darkfactory", "docs.df"),
			'{"version":1,"site":{"name":"Other"},"home":"docs/home.md"}',
		);
		expect(() => resolveDocsConfigPath(root)).toThrow("only one is allowed");
	});

	test("compiles canonical pages and workflow metadata deterministically", async () => {
		const root = await fixture();
		const graph = compileDocsContentGraph(root, loadDocsConfig(root));
		expect(graph.site).toEqual({ name: "Fixture", description: "Fixture docs" });
		expect(graph.home).toBe("home");
		expect(graph.pages.map((page) => page.id)).toEqual([
			"home",
			"prd",
			"plan",
			"agents",
			"agents-rules-001-test",
			"agents-notes-adr-0001-test",
			"agents-notes-adr-readme",
		]);
		expect(graph.workflows).toEqual([{ source: ".github/workflows/ci.yml", name: "CI", jobs: ["test"] }]);
	});

	test("rejects ADRs that are not current accepted decisions", async () => {
		const root = await fixture();
		await writeFile(
			join(root, ".agents", "notes", "adr", "0002-not-current.md"),
			"# ADR-0002 — Not current\n\n**Status**: Proposed\n",
		);
		expect(() => compileDocsContentGraph(root)).toThrow("ADR must have Status: Accepted");
	});

	test("renders README from the canonical home page", async () => {
		const root = await fixture();
		const markdown = renderReadmeMarkdown(compileDocsContentGraph(root));
		expect(markdown).toBe(`${README_GENERATED_MARKER}\n\n# Home\n\nSee [the PRD](PRD.md).\n`);
	});

	test("extracts documented TypeScript APIs as strict JSON", async () => {
		const root = await mkdtemp(join(tmpdir(), "darkfactory-typedoc-test-"));
		roots.push(root);
		const entry = join(root, "index.ts");
		const tsconfig = join(root, "tsconfig.json");
		await writeFile(entry, "/** Public fixture API. */\nexport interface FixtureApi { value: string }\n");
		await writeFile(
			tsconfig,
			JSON.stringify({
				compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "Bundler", strict: true },
				include: ["index.ts"],
			}),
		);
		const model = await extractTypeScriptApi({ entryPoints: [entry], tsconfig, name: "fixture" });
		expect(JSON.stringify(model)).toContain("FixtureApi");
	});

	test("the repository README is the exact generated homepage projection", async () => {
		const root = resolve(import.meta.dir, "..", "..");
		const expected = renderReadmeMarkdown(compileDocsContentGraph(root));
		expect(await readFile(join(root, "README.md"), "utf8")).toBe(expected);
	});
});
