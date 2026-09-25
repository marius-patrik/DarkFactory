import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	compileDocsContentGraph,
	compileDocsContentGraphWithApi,
	loadDocsConfig,
	parseDocsConfig,
	resolveDocsConfigPath,
} from "../../packages/docs/src/index.ts";
import { renderDocsSite } from "../../packages/web/src/docs.ts";

const roots: string[] = [];

async function fixture(withApi = false): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "darkfactory-docs-"));
	roots.push(root);
	await mkdir(join(root, ".agents", "notes", "rules"), { recursive: true });
	await mkdir(join(root, ".agents", "notes", "adr"), { recursive: true });
	await mkdir(join(root, ".github", "workflows"), { recursive: true });
	const config: any = { version: 1, site: { name: "Fixture", description: "Fixture docs" }, home: ".agents/PRD.md" };
	if (withApi) {
		config.api = { typescript: { name: "Fixture API", entryPoints: ["api.ts"], tsconfig: "tsconfig.json" } };
		await writeFile(
			join(root, "api.ts"),
			"/** Public fixture API. */\nexport interface FixtureApi { value: string }\n",
		);
		await writeFile(
			join(root, "tsconfig.json"),
			JSON.stringify({
				compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "Bundler", strict: true },
				include: ["api.ts"],
			}),
		);
	}
	await writeFile(join(root, "repo.df"), JSON.stringify({ repo: {}, docs: config }));
	await writeFile(join(root, ".agents", "PRD.md"), "# Home\n\nSee [the PRD](./PRD.md).\n");
	await writeFile(join(root, ".agents", "AGENTS.md"), "# Rules projection\n");
	await writeFile(join(root, "PRD.md"), "# Product\n");
	await writeFile(join(root, "PLAN.md"), "# Plan\n");
	await writeFile(join(root, "AGENTS.md"), "# Rules projection\n");
	await writeFile(
		join(root, ".agents", "notes", "rules", "001-test.md"),
		"---\nid: DF-RULE-001\ntitle: Fixture rule\nstatus: normative\napplies_to: [agents]\nactivation: always\nowners: [docs]\n---\n# Rule 1 — Fixture rule\n\n## Requirement\n\nFixture requirement.\n\n## Rationale\n\nFixture rationale.\n\n## Enforcement\n\nFixture enforcement.\n\n## Exceptions\n\nNone.\n\n## Change control\n\nDeliberate.\n",
	);
	await writeFile(
		join(root, ".agents", "notes", "adr", "0001-test.md"),
		"# ADR-0001 — Test\n\n**Status**: Accepted\n\n**Related rules**: `DF-RULE-001`\n\n## Decision\n\nFixture decision.\n\n## Consequences\n\nFixture consequence.\n",
	);
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
	test("parses the combined docs block including TypeScript API ownership", () => {
		expect(
			parseDocsConfig(
				'{"version":1,"site":{"name":"Docs"},"home":".agents/PRD.md","api":{"typescript":{"entryPoints":["src/index.ts"],"tsconfig":"tsconfig.json"}}}',
			),
		).toEqual({
			version: 1,
			site: { name: "Docs" },
			home: ".agents/PRD.md",
			api: { typescript: { entryPoints: ["src/index.ts"], tsconfig: "tsconfig.json" } },
		});
	});

	test("resolves the combined configuration containing the docs block", async () => {
		const root = await fixture();
		expect(resolveDocsConfigPath(root)).toBe(join(root, "repo.df"));
		expect(loadDocsConfig(root).site.name).toBe("Fixture");
	});

	test("reports the canonical missing configuration path", async () => {
		const root = await mkdtemp(join(tmpdir(), "darkfactory-docs-missing-"));
		roots.push(root);
		expect(() => resolveDocsConfigPath(root)).toThrow("No combined DarkFactory configuration found");
	});

	test("compiles only current canonical pages and workflow metadata", async () => {
		const root = await fixture();
		const graph = compileDocsContentGraph(root, loadDocsConfig(root));
		expect(graph.pages.map((page) => page.id)).toEqual([
			"home",
			"agents-notes-rules-001-test",
			"agents-notes-adr-0001-test",
		]);
		expect(graph.pages[0]?.source).toBe(".agents/PRD.md");
		expect(graph.pages.some((page) => page.source === "AGENTS.md" || page.source === ".agents/AGENTS.md")).toBe(false);
		expect(graph.workflows).toEqual([{ source: ".github/workflows/ci.yml", name: "CI", jobs: ["test"] }]);
	});

	test("rejects non-current ADRs", async () => {
		const root = await fixture();
		await writeFile(
			join(root, ".agents", "notes", "adr", "0002-not-current.md"),
			"# ADR-0002 — Not current\n\n**Status**: Proposed\n",
		);
		expect(() => compileDocsContentGraph(root)).toThrow("ADR must have Status: Accepted");
	});

	test("integrates strict TypeScript API extraction into the content graph", async () => {
		const root = await fixture(true);
		const graph = await compileDocsContentGraphWithApi(root);
		expect(graph.api?.name).toBe("Fixture API");
		expect(JSON.stringify(graph.api)).toContain("FixtureApi");
	});

	test("renders the content graph through @darkfactory/web", async () => {
		const root = await fixture(true);
		const graph = await compileDocsContentGraphWithApi(root);
		const site = join(root, "site");
		await renderDocsSite(graph, site);
		expect(await readFile(join(site, "index.html"), "utf8")).toContain("See");
		const apiPage = await readFile(join(site, "api", "index.html"), "utf8");
		expect(apiPage).toContain("FixtureApi");
		expect(apiPage).toContain('href="../agents-notes-rules-001-test/"');
		expect(JSON.parse(await readFile(join(site, "content.json"), "utf8")).api.name).toBe("Fixture API");
	});
});
