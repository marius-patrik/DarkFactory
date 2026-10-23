import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCiCli } from "../../../../packages/cli/src/ci.ts";
import { reconcileNativeConfigs, renderMkdocs, renderProperdocs, renderPyproject } from "../../../../packages/harness/src/ci/native-config.ts";

const roots: string[] = [];
async function fixture() {
	const root = await mkdtemp(join(tmpdir(), "df-native-config-"));
	roots.push(root);
	const config = {
		repo: {
			environment: {
				native_pyproject: {
					"build-system": {
						requires: ["setuptools>=69", "setuptools-scm>=8"],
						"build-backend": "setuptools.build_meta",
					},
					project: {
						name: "chesswithquests",
						dynamic: ["version"],
						"requires-python": ">=3.10",
						dependencies: [],
						authors: [{ name: "marius-patrik" }],
						urls: { Homepage: "https://example.com" },
						"gui-scripts": { chesswithquests: "engine.app:main" },
						"entry-points": { "boardgameswithquests.games": { chess: "chess", checkers: "checkers" } },
					},
					tool: {
						setuptools_scm: {},
						setuptools: {
							"package-dir": { "": "packages" },
							packages: { find: { where: ["packages"], include: ["engine*", "chess*", "checkers*"] } },
							"package-data": { chess: ["config.json"], checkers: ["config.json"] },
						},
						pytest: { ini_options: { testpaths: ["tests"], pythonpath: ["packages", "."] } },
						black: {
							"line-length": 100,
							"target-version": ["py310", "py311"],
							"extend-exclude": "/(\\.git|dist)/",
						},
					},
				},
			},
		},
		docs: {
			site: { name: "BoardGamesWithQuests", description: "A generated documentation site" },
			native_properdocs: {
				theme: { name: null, custom_dir: ".github/docs-ui" },
				hooks: [".github/scripts/docs_hooks.py"],
				markdown_extensions: ["admonition", { toc: { permalink: true, toc_depth: "2-4" } }],
				plugins: [
					"search",
					{ mkdocstrings: { handlers: { python: { paths: [], options: { docstring_style: "google" } } } } },
				],
			},
		},
		providers: {},
	};
	await writeFile(join(root, "repo.dfconfig"), JSON.stringify(config, null, 2));
	return { root, config };
}
afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("native tool configuration from the canonical repository document", () => {
	test("renders installable Python package metadata with nested entry points and package data", async () => {
		const { config } = await fixture();
		const toml = renderPyproject(config.repo.environment.native_pyproject);
		const parsed = Bun.TOML.parse(toml) as Record<string, any>;
		expect(parsed["build-system"].requires).toEqual(["setuptools>=69", "setuptools-scm>=8"]);
		expect(parsed.project.dynamic).toEqual(["version"]);
		expect(parsed.project.authors).toEqual([{ name: "marius-patrik" }]);
		expect(parsed.project["gui-scripts"].chesswithquests).toBe("engine.app:main");
		expect(parsed.project["entry-points"]["boardgameswithquests.games"].chess).toBe("chess");
		expect(parsed.tool.setuptools_scm).toEqual({});
		expect(parsed.tool.setuptools["package-dir"][""]).toBe("packages");
		expect(parsed.tool.setuptools.packages.find.where).toEqual(["packages"]);
		expect(parsed.tool.setuptools["package-data"].chess).toEqual(["config.json"]);
		expect(parsed.tool.pytest.ini_options.pythonpath).toEqual(["packages", "."]);
		expect(parsed.tool.black["extend-exclude"]).toBe("/(\\.git|dist)/");
	});

	test("preserves ProperDocs hook, theme, Markdown extension, mkdocstrings and site metadata", async () => {
		const { config } = await fixture();
		const source = renderProperdocs(config.docs.native_properdocs, config.docs.site);
		const parsed = Bun.YAML.parse(source) as Record<string, any>;
		expect(parsed.site_name).toBe("BoardGamesWithQuests");
		expect(parsed.site_description).toBe("A generated documentation site");
		expect(parsed.theme.custom_dir).toBe(".github/docs-ui");
		expect(parsed.hooks).toEqual([".github/scripts/docs_hooks.py"]);
		expect(parsed.markdown_extensions[1].toc.toc_depth).toBe("2-4");
		expect(parsed.plugins[1].mkdocstrings.handlers.python.options.docstring_style).toBe("google");
		expect(() => renderProperdocs({ site_name: "duplicate" }, config.docs.site)).toThrow();
	});

	test("projects MkDocs themes, asset paths, hooks and extensions without duplicate site metadata", async () => {
		const { root, config } = await fixture();
		const mkdocs = {
			docs_dir: ".github/docs-ui",
			theme: { name: "material", custom_dir: ".github/docs-ui" },
			extra_css: ["assets/theme.css"],
			extra_javascript: ["assets/theme.js"],
			hooks: [".github/scripts/docs_hooks.py"],
			markdown_extensions: ["admonition", { toc: { permalink: true, toc_depth: "2-4" } }],
			plugins: ["search", { mkdocstrings: { handlers: { python: { paths: [] } } } }],
		};
		const parsed = Bun.YAML.parse(renderMkdocs(mkdocs, config.docs.site)) as Record<string, any>;
		expect(parsed.site_name).toBe("BoardGamesWithQuests");
		expect(parsed.theme).toEqual({ name: "material", custom_dir: ".github/docs-ui" });
		expect(parsed.extra_css).toEqual(["assets/theme.css"]);
		expect(parsed.markdown_extensions[1].toc.toc_depth).toBe("2-4");
		expect(() => renderMkdocs({ ...mkdocs, site_description: "conflicting" }, config.docs.site)).toThrow(
			"Site metadata",
		);
		const docs = config.docs as Record<string, unknown>;
		delete docs.native_properdocs;
		docs.native_mkdocs = mkdocs;
		await writeFile(join(root, "repo.dfconfig"), JSON.stringify(config));
		const initial = await reconcileNativeConfigs(root);
		expect(initial.map((item) => item.file)).toEqual(["pyproject.toml", "mkdocs.yml"]);
		expect((await reconcileNativeConfigs(root, true)).every((item) => item.state === "in_sync")).toBe(true);
		expect(Bun.YAML.parse(await readFile(join(root, "mkdocs.yml"), "utf8"))).toEqual(parsed);
		await writeFile(join(root, "mkdocs.yml"), (await readFile(join(root, "mkdocs.yml"), "utf8")) + "# manual\\n");
		expect((await reconcileNativeConfigs(root, true)).find((item) => item.file === "mkdocs.yml")?.state).toBe(
			"modified",
		);
		docs.native_properdocs = { hooks: [] };
		await writeFile(join(root, "repo.dfconfig"), JSON.stringify(config));
		await expect(reconcileNativeConfigs(root)).rejects.toThrow("only one documentation tool projection");
	});

	test("requires explicit installation; does not overwrite unmanaged files", async () => {
		const { root } = await fixture();
		const before = await reconcileNativeConfigs(root);
		expect(before.map((item) => item.state)).toEqual(["missing", "missing"]);
		await writeFile(join(root, "pyproject.toml"), "[project]\nname = 'user-owned'\n");
		const attempted = await reconcileNativeConfigs(root, true);
		expect(attempted.find((item) => item.file === "pyproject.toml")?.state).toBe("unmanaged");
		expect(await readFile(join(root, "pyproject.toml"), "utf8")).toContain("user-owned");
		expect(attempted.find((item) => item.file === "properdocs.yml")?.state).toBe("missing");
		expect(await reconcileNativeConfigs(root)).toEqual(attempted);
	});

	test("generated files are idempotent, drift-checkable and reject edits to signed content", async () => {
		const { root, config } = await fixture();
		expect((await reconcileNativeConfigs(root, true)).every((item) => item.state === "in_sync")).toBe(true);
		const first = await readFile(join(root, "pyproject.toml"), "utf8");
		expect((await reconcileNativeConfigs(root)).every((item) => item.state === "in_sync")).toBe(true);

		config.repo.environment.native_pyproject.project.name = "renamed";
		await writeFile(join(root, "repo.dfconfig"), JSON.stringify(config));
		expect((await reconcileNativeConfigs(root)).find((item) => item.file === "pyproject.toml")?.state).toBe("outdated");
		await reconcileNativeConfigs(root, true);
		expect(await readFile(join(root, "pyproject.toml"), "utf8")).not.toBe(first);

		await writeFile(
			join(root, "pyproject.toml"),
			(await readFile(join(root, "pyproject.toml"), "utf8")) + "# manual\n",
		);
		const changes = await reconcileNativeConfigs(root, true);
		expect(changes.find((item) => item.file === "pyproject.toml")?.state).toBe("modified");
		expect(await readFile(join(root, "pyproject.toml"), "utf8")).toContain("# manual");
	});

	test("refuses symlinks and does not touch tool config in an unconfigured repository", async () => {
		const { root, config } = await fixture();
		await symlink("repo.dfconfig", join(root, "pyproject.toml"));
		expect((await reconcileNativeConfigs(root, true)).find((item) => item.file === "pyproject.toml")?.state).toBe(
			"unmanaged",
		);
		delete (config.repo.environment as Record<string, unknown>).native_pyproject;
		delete (config.docs as Record<string, unknown>).native_properdocs;
		await writeFile(join(root, "repo.dfconfig"), JSON.stringify(config));
		expect(await reconcileNativeConfigs(root, true)).toEqual([]);
	});

	test("CI reports native drift rather than silently accepting duplicated authority", async () => {
		const { root } = await fixture();
		const errors: string[] = [];
		const result = await runCiCli(["native-config", "--repo", root], { log: () => {}, error: (s) => errors.push(s) });
		expect(result).toBe(1);
		expect(errors.join("")).toContain("pyproject.toml");
		expect(await runCiCli(["native-config", "--repo", root, "--write"], { log: () => {} })).toBe(0);
		expect(await runCiCli(["native-config", "--repo", root], { log: () => {} })).toBe(0);
	});
});
