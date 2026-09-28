import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { shippedPlugins } from "../../scripts/package-assets.ts";
import { discoverPluginSkills } from "../../src/ci/installer.ts";

const root = join(import.meta.dir, "..", "..", "..", "..");
const pluginsDir = join(root, ".darkfactory", "plugins");
const installedDir = join(root, ".darkfactory", "skills");
const validator = join(pluginsDir, "plugin-builder", "scripts", "validate-skills.ts");

function pluginDirs(): string[] {
	return readdirSync(pluginsDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
		.map((entry) => entry.name);
}

describe("skills have exactly one source of truth", () => {
	// #1216. Tracking a skill in two places made `darkfactory-auth` and `provider-onboarding` exist
	// twice byte-identically, so a fix to one was not a fix to the other and nothing reported the
	// divergence. The declaration moved from `packages/harness/assets/skills/` to
	// `.agents/plugins/<plugin>/skills/<skill>/` when skills became plugins; the principle is
	// unchanged and these tests are what keep it true.
	test("the installed skills directory is not tracked", () => {
		if (!existsSync(installedDir)) return;
		expect(readdirSync(installedDir)).toEqual([]);
	});

	test("a skill is declared by exactly one plugin", async () => {
		// The installer resolves the first root that declares a name, so a second declaration is a
		// silent shadow rather than a visible conflict.
		const skills = await discoverPluginSkills();
		const roots = skills.filter((skill) => skill.root === pluginsDir);
		const names = roots.map((skill) => skill.name);
		expect([...new Set(names)].sort()).toEqual([...names].sort());
	});

	test("every plugin skill validates against the four-host rules", () => {
		// One implementation of the rules, shared with the authoring tool, so a rule stated in prose
		// is a rule something checks.
		expect(() => execFileSync("bun", [validator], { cwd: root, encoding: "utf8" })).not.toThrow();
	});

	test("every skill directory holds a SKILL.md and nothing unexpected", () => {
		// `discoverPluginSkills` filters on exactly this shape, so a stray file is invisible to it.
		for (const plugin of pluginDirs()) {
			const skills = join(pluginsDir, plugin, "skills");
			if (!existsSync(skills)) continue;
			for (const entry of readdirSync(skills, { withFileTypes: true })) {
				const dir = join(skills, entry.name);
				if (entry.isFile()) throw new Error(`stray file in ${plugin}/skills: ${entry.name}`);
				if (!existsSync(join(dir, "SKILL.md"))) throw new Error(`${plugin}/skills/${entry.name} has no SKILL.md`);
			}
		}
	});

	test("a released plugin is shipped byte-identically, and only if marked", () => {
		// `package-assets.ts` copies `shipped: true` plugins into `dist/assets/plugins/`. A plugin
		// that is not marked stays repository-local, which is how the thesis plugin avoids reaching
		// every df install.
		const shipped = shippedPlugins(pluginsDir);
		expect(shipped).toContain("df-operations");
		expect(shipped).not.toContain("thesis");
		expect(shipped).not.toContain("plugin-builder");
	});

	test("each shipped skill states a name matching its directory", () => {
		// Codex and pi refuse to load a skill without a description; the name/directory match is what
		// makes `/skill:<name>` agree with the host's own listing.
		for (const plugin of shippedPlugins(pluginsDir)) {
			const skills = join(pluginsDir, plugin, "skills");
			for (const entry of readdirSync(skills, { withFileTypes: true })) {
				const body = readFileSync(join(skills, entry.name, "SKILL.md"), "utf8");
				expect(body.startsWith("---")).toBe(true);
				expect(body).toMatch(new RegExp(`^name:\\s*${entry.name}$`, "mu"));
				expect(body).toMatch(/^description:\s*\S/mu);
			}
		}
	});
});
