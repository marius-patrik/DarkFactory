import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { checkSkillsDrift, discoverBundledSkills } from "../../src/ci/installer.ts";

// Paths come from this file, never from process.cwd(): the suite runs from harness/ and from the repository root.
const harnessDir = join(import.meta.dir, "..", "..");
const repoDir = join(harnessDir, "..");
const skillsDir = join(harnessDir, "assets", "skills");

/** Bundled skills; each chunk that adds one appends its name. */
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
	test("the bundled skill directories are exactly the expected skills", () => {
		const dirs = readdirSync(skillsDir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);
		expect(dirs.sort()).toEqual([...EXPECTED_SKILLS].sort());
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

	// `harness/assets/skills` is the one source of truth: `discoverBundledSkills` reads only this
	// directory, and `package-assets.ts` copies only this directory into a release. `.agents/skills`
	// is where `installSkills` writes, so a copy tracked there is install output, not a second
	// source. These two tests are what keeps that distinction true: the first fails on a divergent
	// second text for a skill name, the second on a skill that exists only at the destination.
	test("every bundled skill is installed here as a byte-identical copy", async () => {
		const drift = await checkSkillsDrift(repoDir);
		expect(drift.filter((item) => item.status !== "in_sync")).toEqual([]);
	});

	test("no skill is installed here that the bundle does not ship", async () => {
		const bundled = new Set(await discoverBundledSkills());
		const installed = readdirSync(join(repoDir, ".agents", "skills"), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);
		expect(installed.filter((name) => !bundled.has(name))).toEqual([]);
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
