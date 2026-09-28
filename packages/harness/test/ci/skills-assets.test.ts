import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { checkSkillsDrift, discoverBundledSkills } from "../../src/ci/installer.ts";

// Paths come from this file, never from process.cwd(): the suite runs from packages/harness/ and from the repository root.
const harnessDir = join(import.meta.dir, "..", "..");
const repoDir = join(harnessDir, "..", "..");
const pluginsDir = join(repoDir, ".agents", "plugins");
const operatorPlugin = "df-operations";
const skillsDir = join(pluginsDir, operatorPlugin, "skills");

/** Skills the operator plugin declares; each chunk that adds one appends its name. */
const EXPECTED_SKILLS = ["darkfactory-auth", "df-operator", "pipeline-operations", "provider-onboarding"];

/** Top-level df commands named in the CLI's usage() text. */
function usageCommands(): Set<string> {
	const source = readFileSync(join(harnessDir, "src", "cli.ts"), "utf8");
	const start = source.indexOf("function usage(): string {");
	const body = source.slice(start, source.indexOf("\n}\n", start));
	return new Set([...body.matchAll(/\bdf ([a-z][a-z-]*)/g)].map((match) => match[1] as string));
}

/** df commands a skill tells the reader to run: inline code spans and lines of fenced code blocks. */
function skillCommands(markdown: string): string[] {
	const inline = [...markdown.matchAll(/`df ([a-z][a-z-]*)/g)].map((match) => match[1] as string);
	const blocks = [...markdown.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].flatMap((match) =>
		[...(match[1] as string).matchAll(/(?:^|\|\s*)df ([a-z][a-z-]*)/gm)].map((line) => line[1] as string),
	);
	return [...inline, ...blocks];
}

const skillPath = (name: string) => join(skillsDir, name, "SKILL.md");

describe("bundled skills", () => {
	test("the operator plugin declares exactly the expected skills", () => {
		const dirs = readdirSync(skillsDir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);
		expect(dirs.sort()).toEqual([...EXPECTED_SKILLS].sort());
	});

	test("every skill under every plugin is discoverable by the installer", async () => {
		// The installer walks `<root>/<plugin>/skills/<skill>/SKILL.md`; a skill placed anywhere else
		// is invisible to `df ci install` and would be listed by nothing.
		const discovered = new Set(await discoverBundledSkills());
		for (const plugin of readdirSync(pluginsDir, { withFileTypes: true })) {
			if (!plugin.isDirectory() || plugin.name.startsWith(".")) continue;
			const dir = join(pluginsDir, plugin.name, "skills");
			if (!existsSync(dir)) continue;
			for (const skill of readdirSync(dir, { withFileTypes: true })) {
				if (skill.isDirectory()) expect(discovered).toContain(skill.name);
			}
		}
	});

	test.each(EXPECTED_SKILLS)("%s has frontmatter naming it and real content", (name) => {
		const content = readFileSync(skillPath(name), "utf8");
		const frontmatter = content.match(/^---\r?\nname: (.+)\r?\ndescription: (.+)\r?\n---/);
		expect(frontmatter?.[1]).toBe(name);
		expect(frontmatter?.[2]?.trim().length ?? 0).toBeGreaterThan(20);
		expect(statSync(skillPath(name)).size).toBeGreaterThanOrEqual(1500);
	});

	test.each(EXPECTED_SKILLS)("%s only names df commands the CLI has", (name) => {
		const known = usageCommands();
		const unknown = skillCommands(readFileSync(skillPath(name), "utf8")).filter((command) => !known.has(command));
		expect(unknown, `${name} names unknown df commands`).toEqual([]);
	});

	test.each(EXPECTED_SKILLS)("%s never points at the retired credential script", (name) => {
		const content = readFileSync(skillPath(name), "utf8");
		expect(content).not.toContain("credentials.py");
		expect(content).not.toContain("gh secret set");
	});

	// `.agents/plugins/` is the one source of truth: `discoverBundledSkills` reads only plugin
	// skills directories, and `package-assets.ts` copies only the plugins marked `shipped` into a
	// release. `.agents/skills` is where `installSkills` writes, so a copy tracked there is install
	// output, not a second source. These two tests are what keeps that distinction true: the first
	// fails on a divergent second text for a skill name, the second on a skill that exists only at
	// the destination.
	test("every installed skill here is a byte-identical copy of the bundled source", async () => {
		// `.agents/skills` is gitignored install output. It is absent until `df ci install` runs
		// here, so absence is the expected state, not a failure. When it does exist — a developer
		// ran the installer, or a stale copy survived a branch switch — a divergent second text for
		// any skill name is the failure this is here to catch.
		if (!existsSync(join(repoDir, ".agents", "skills"))) return;
		const drift = await checkSkillsDrift(repoDir);
		expect(drift.filter((item) => item.status !== "in_sync")).toEqual([]);
	});

	test("no skill is installed here that the bundle does not ship", async () => {
		if (!existsSync(join(repoDir, ".agents", "skills"))) return;
		const bundled = new Set(await discoverBundledSkills());
		const installed = readdirSync(join(repoDir, ".agents", "skills"), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);
		expect(installed.filter((name) => !bundled.has(name))).toEqual([]);
	});

	test("the installed skills directory is not a tracked second source", () => {
		// The duplication this replaces: two byte-identical copies of darkfactory-auth and
		// provider-onboarding, both tracked, with nothing reporting a divergence between them.
		const tracked = new Set(
			execFileSync("git", ["ls-files", ".agents/skills"], { cwd: repoDir, encoding: "utf8" })
				.split("\n")
				.filter(Boolean),
		);
		expect([...tracked]).toEqual([]);
	});

	test("the command check recognises unknown commands", () => {
		expect(skillCommands("Run `df nosuch` and\n```sh\ndf quota --json\necho x | df account set a b\n```\n")).toEqual([
			"nosuch",
			"quota",
			"account",
		]);
		expect(usageCommands().has("nosuch")).toBe(false);
	});
});
