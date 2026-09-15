import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

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

	test("this repository's installed darkfactory-auth skill is the bundled one", () => {
		expect(readFileSync(join(repoDir, ".agents", "skills", "darkfactory-auth", "SKILL.md"), "utf8")).toBe(
			readFileSync(skillPath("darkfactory-auth"), "utf8"),
		);
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
