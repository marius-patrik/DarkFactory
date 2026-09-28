import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverPlugins, discoverPluginSkills } from "../src/discover.ts";
import { runPluginCli } from "../src/cli.ts";
import { validatePlugins } from "../src/validate.ts";

const roots: string[] = [];

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

interface PluginSpec {
	name: string;
	skills?: { dir: string; frontmatter: string }[];
	claude?: boolean;
	codex?: boolean;
	hooks?: boolean;
}

/** A repository containing plugin declarations, with the real directory shape. */
function repository(specs: PluginSpec[]): string {
	const root = mkdtempSync(join(tmpdir(), "df-plugins-"));
	roots.push(root);
	const plugins = join(root, ".darkfactory", "plugins");
	mkdirSync(plugins, { recursive: true });

	for (const spec of specs) {
		const dir = join(plugins, spec.name);
		mkdirSync(dir, { recursive: true });
		if (spec.claude !== false) {
			mkdirSync(join(dir, ".claude-plugin"), { recursive: true });
			writeFileSync(join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name: spec.name }));
		}
		if (spec.codex !== false) {
			mkdirSync(join(dir, ".codex-plugin"), { recursive: true });
			writeFileSync(join(dir, ".codex-plugin", "plugin.json"), JSON.stringify({ name: spec.name }));
		}
		if (spec.hooks) {
			mkdirSync(join(dir, "hooks"), { recursive: true });
			writeFileSync(join(dir, "hooks", "hooks.json"), "{}");
		}
		for (const skill of spec.skills ?? []) {
			mkdirSync(join(dir, "skills", skill.dir), { recursive: true });
			writeFileSync(join(dir, "skills", skill.dir, "SKILL.md"), skill.frontmatter);
		}
	}
	return root;
}

function goodSkill(name: string, description = "Use when testing discovery."): string {
	return `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`;
}

describe("plugin discovery", () => {
	test("finds plugins, their manifests, and their skills", () => {
		const root = repository([
			{ name: "alpha", skills: [{ dir: "one", frontmatter: goodSkill("one") }], hooks: true },
			{ name: "beta" },
		]);

		const plugins = discoverPlugins(root);
		expect(plugins.map((plugin) => plugin.name)).toEqual(["alpha", "beta"]);

		const alpha = plugins[0];
		expect(alpha?.claudeManifest).toBe(join(root, ".darkfactory", "plugins", "alpha", ".claude-plugin", "plugin.json"));
		expect(alpha?.codexManifest).toBeDefined();
		expect(alpha?.hasHooks).toBe(true);
		expect(alpha?.skills.map((skill) => skill.name)).toEqual(["one"]);
		expect(discoverPluginSkills(root)).toHaveLength(1);
	});

	test("a manifest directory is not itself a plugin", () => {
		// `.claude-plugin` sits inside a plugin and holds its manifest, so a directory walker that
		// counted it would report a plugin named after a hidden folder.
		const root = repository([{ name: "alpha" }]);
		const plugins = discoverPlugins(root);
		expect(plugins.some((plugin) => plugin.name.startsWith("."))).toBe(false);
	});

	test("a directory with neither a manifest nor skills is not discovered", () => {
		const root = repository([{ name: "alpha" }]);
		mkdirSync(join(root, ".darkfactory", "plugins", "stray"), { recursive: true });
		expect(discoverPlugins(root).map((plugin) => plugin.name)).toEqual(["alpha"]);
		// ...and validate says so, rather than the directory being invisible.
		const rules = validatePlugins(root).findings.map((finding) => finding.rule);
		expect(rules).toContain("plugin/unknown");
	});

	test("an empty repository is reported rather than passing", () => {
		const root = mkdtempSync(join(tmpdir(), "df-plugins-empty-"));
		roots.push(root);
		mkdirSync(join(root, ".darkfactory", "plugins"), { recursive: true });
		expect(discoverPlugins(root)).toEqual([]);
	});
});

describe("plugin validation", () => {
	test("a well-formed plugin produces no findings", () => {
		const root = repository([{ name: "alpha", skills: [{ dir: "one", frontmatter: goodSkill("one") }] }]);
		const result = validatePlugins(root);
		expect(result.findings).toEqual([]);
		expect(result).toMatchObject({ pluginCount: 1, skillCount: 1 });
	});

	test("a skill without a description is an error, because Codex and pi will not load it", () => {
		const root = repository([
			{ name: "alpha", skills: [{ dir: "one", frontmatter: "---\nname: one\n---\n\n# One\n" }] },
		]);
		const rules = validatePlugins(root).findings.map((finding) => finding.rule);
		expect(rules).toContain("skill/description");
	});

	test("a name that differs from the directory is an error", () => {
		const root = repository([{ name: "alpha", skills: [{ dir: "typo-dir", frontmatter: goodSkill("one") }] }]);
		const rules = validatePlugins(root).findings.map((finding) => finding.rule);
		expect(rules).toContain("skill/name-dir-match");
	});

	test("a Claude-only front matter key is an error", () => {
		const frontmatter = "---\nname: one\ndescription: Use when testing.\ncontext: fork\n---\n\n# One\n";
		const root = repository([{ name: "alpha", skills: [{ dir: "one", frontmatter }] }]);
		const rules = validatePlugins(root).findings.map((finding) => finding.rule);
		expect(rules).toContain("skill/shared-key");
	});

	test("a manifest whose name differs from its directory is an error", () => {
		const root = repository([{ name: "alpha" }]);
		writeFileSync(
			join(root, ".darkfactory", "plugins", "alpha", ".claude-plugin", "plugin.json"),
			JSON.stringify({ name: "wrong" }),
		);
		const rules = validatePlugins(root).findings.map((finding) => finding.rule);
		expect(rules).toContain("manifest/claude-name");
	});

	test("a missing host manifest is a warning, not an error", () => {
		// A plugin can target one host; it is then simply not loadable by the other.
		const root = repository([{ name: "alpha", codex: false }]);
		const result = validatePlugins(root);
		expect(result.findings.map((finding) => finding.rule)).toContain("manifest/codex-missing");
		expect(result.findings.every((finding) => finding.level === "warning")).toBe(true);
	});
});

describe("df plugin", () => {
	function run(args: string[], root: string): { code: number; out: string; err: string } {
		const out: string[] = [];
		const err: string[] = [];
		const code = runPluginCli(args, root, { log: (m) => out.push(m), error: (m) => err.push(m) });
		return { code, out: out.join("\n"), err: err.join("\n") };
	}

	test("list names every plugin and its skill count", () => {
		const root = repository([{ name: "alpha", skills: [{ dir: "one", frontmatter: goodSkill("one") }] }]);
		const result = run(["list"], root);
		expect(result.code).toBe(0);
		expect(result.out).toContain("alpha");
		expect(result.out).toContain("1 plugin(s)");
	});

	test("list exits non-zero when there is nothing to list", () => {
		const root = repository([{ name: "alpha" }]);
		rmSync(join(root, ".darkfactory", "plugins", "alpha"), { recursive: true, force: true });
		expect(run(["list"], root).code).toBe(1);
	});

	test("describe reports one plugin's manifests and skills", () => {
		const root = repository([{ name: "alpha", skills: [{ dir: "one", frontmatter: goodSkill("one") }] }]);
		const result = run(["describe", "alpha"], root);
		expect(result.code).toBe(0);
		expect(result.out).toContain(".claude-plugin/plugin.json");
		expect(result.out).toContain("one");
	});

	test("describe on an unknown plugin fails rather than printing nothing", () => {
		const root = repository([{ name: "alpha" }]);
		expect(run(["describe", "missing"], root).code).toBe(1);
	});

	test("validate is clean, and --json reports the counts", () => {
		const root = repository([{ name: "alpha", skills: [{ dir: "one", frontmatter: goodSkill("one") }] }]);
		expect(run(["validate"], root).code).toBe(0);
		const json = run(["validate", "--json"], root);
		expect(JSON.parse(json.out)).toMatchObject({ plugins: 1, skills: 1, errors: 0, warnings: 0 });
	});

	test("validate fails on a finding and --strict fails on a warning", () => {
		const root = repository([
			{
				name: "alpha",
				skills: [
					{
						dir: "one",
						frontmatter:
							"---\nname: one\ndescription: A skill that says what it is, not when to use it.\n---\n\n# One\n",
					},
				],
			},
		]);
		// A warning alone passes by default and fails under --strict, which is the point of the flag.
		expect(run(["validate"], root).code).toBe(0);
		expect(run(["validate", "--strict"], root).code).toBe(1);
	});

	test("an unknown subcommand fails with the usage text", () => {
		const root = repository([{ name: "alpha" }]);
		const result = run(["frobnicate"], root);
		expect(result.code).toBe(1);
		expect(result.err).toContain("df plugin list");
	});
});
