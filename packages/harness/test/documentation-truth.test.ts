import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Paths come from this file, never from process.cwd(): the suite runs from packages/harness/ and from the repository root.
const harnessDir = join(import.meta.dir, "..");
const repoDir = join(harnessDir, "..", "..");

/** Directories whose markdown is a canonical source or ships to consumers. */
// `.agents` is a symlink to `.darkfactory`; a walker does not descend it, so the canonical
// directories are named on the real path.
const CANONICAL_DIRECTORIES = [join(".darkfactory"), join(".darkfactory", "plugins")];
// CONTRIBUTING.md is a symlink to the product document, which is the root README itself.
const CANONICAL_FILES = ["README.md"];

/** Code spans that are a claim about the tree rather than a name, pattern or placeholder. */
const NOT_A_PATH = /[*?<>|{}[\]$"'`~(]|^\.{1,2}$|^\//u;

/** Collects every markdown file under a directory, or nothing when the directory is absent. */
function markdownFiles(directory: string): string[] {
	if (!existsSync(directory)) return [];
	const found: string[] = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) found.push(...markdownFiles(path));
		else if (entry.name.endsWith(".md")) found.push(path);
	}
	return found;
}

/** Canonical documents, as repository-root-relative paths. */
function canonicalDocuments(): string[] {
	const documents = CANONICAL_DIRECTORIES.flatMap((directory) => markdownFiles(join(repoDir, directory)));
	for (const file of CANONICAL_FILES) {
		const path = join(repoDir, file);
		if (existsSync(path)) documents.push(path);
	}
	return documents.map((path) => path.slice(repoDir.length + 1).replaceAll("\\", "/")).sort();
}

/**
 * Directory names the skills name as a convention *inside another skill's own directory*, not as
 * a path in this repository. `author-skill` tells an author to put long material in
 * `references/`, which is relative to whatever skill is being written; it is not a claim about
 * the repository root, so the directory claim below must not report it.
 */
const SKILL_LOCAL_DIRECTORIES = new Set(["references/"]);

/** Repository-root-relative top-level entry names, which is what makes a code span a path claim. */
function topLevelNames(): Set<string> {
	return new Set(
		readdirSync(repoDir, { withFileTypes: true })
			.filter((entry) => !entry.name.startsWith("."))
			.map((entry) => entry.name),
	);
}

/** Backticked code spans, which is how every document in this repository writes a path. */
function codeSpans(markdown: string): string[] {
	return [...markdown.matchAll(/`([^`\n]+)`/gu)].map((match) => (match[1] as string).trim());
}

/** The code spans in a document that read as a repository path. */
function pathClaims(markdown: string): string[] {
	const top = topLevelNames();
	return codeSpans(markdown).filter((span) => {
		if (NOT_A_PATH.test(span) || span.includes(" ")) return false;
		if (span.startsWith(".") || !span.includes("/")) return false;
		if (top.has((span.split("/") as string[])[0] as string)) return true;
		// A directory-shaped span naming a first segment that is not a current top-level entry
		// is still a claim about this repository. Without this, a document could name a
		// top-level directory that no longer exists and the scan would discard it as not-a-path
		// rather than report it -- which is how `capabilities/` survived #1297 in README.md and
		// in accepted ADR-0018.
		if (!span.endsWith("/")) return false;
		return !SKILL_LOCAL_DIRECTORIES.has(span);
	});
}

/** `df` subcommands the CLI's usage() text declares. */
function usageCommands(): Set<string> {
	const source = readFileSync(join(harnessDir, "src", "cli.ts"), "utf8");
	const start = source.indexOf("function usage(): string {");
	const body = source.slice(start, source.indexOf("\n}\n", start));
	return new Set([...body.matchAll(/\bdf ([a-z][a-z-]*)/gu)].map((match) => match[1] as string));
}

/** `df` subcommands the CLI dispatches, for the commands usage() does not advertise. */
function dispatchedCommands(): Set<string> {
	const source = readFileSync(join(harnessDir, "src", "cli.ts"), "utf8");
	return new Set([...source.matchAll(/^\t\tcase "([a-z][a-z-]*)":/gmu)].map((match) => match[1] as string));
}

/** The `df` commands a document tells the reader to run, from inline spans and fenced blocks. */
function dfCommands(markdown: string): string[] {
	const inline = [...markdown.matchAll(/`df ([a-z][a-z-]*)/gu)].map((match) => match[1] as string);
	const blocks = [...markdown.matchAll(/```[a-z]*\n([\s\S]*?)```/gu)].flatMap((match) =>
		[...(match[1] as string).matchAll(/(?:^|\|\s*)df ([a-z][a-z-]*)/gmu)].map((line) => line[1] as string),
	);
	return [...inline, ...blocks];
}

const DOCUMENTS = canonicalDocuments();
const missing = (document: string, claims: string[]): string =>
	`${document} names ${claims.join(", ")}, which does not exist in this repository`;

describe("canonical documentation truth", () => {
	test("the canonical document set is discovered rather than empty", () => {
		expect(DOCUMENTS.length).toBeGreaterThan(20);
		expect(DOCUMENTS).toContain("README.md");
		expect(DOCUMENTS).toContain(".darkfactory/plugins/df-rules/skills/unit-tests/SKILL.md");
		expect(DOCUMENTS).toContain(".darkfactory/plugins/df-operations/skills/darkfactory-auth/SKILL.md");
	});

	test.each(DOCUMENTS)("%s names only repository paths that exist", (document) => {
		const absent = [
			...new Set(
				pathClaims(readFileSync(join(repoDir, document), "utf8")).filter((claim) => !existsSync(join(repoDir, claim))),
			),
		];
		expect(absent, missing(document, absent)).toEqual([]);
	});

	test.each(DOCUMENTS)("%s names only df subcommands the CLI has", (document) => {
		const known = new Set([...usageCommands(), ...dispatchedCommands()]);
		const unknown = [...new Set(dfCommands(readFileSync(join(repoDir, document), "utf8")))].filter(
			(command) => !known.has(command),
		);
		expect(unknown, `${document} names df subcommands the CLI does not dispatch`).toEqual([]);
	});

	test("the path scan recognises a path that does not exist", () => {
		expect(pathClaims("run `bun test` and read `tests/absent_governance.py` now")).toEqual([
			"tests/absent_governance.py",
		]);
		expect(existsSync(join(repoDir, "tests/absent_governance.py"))).toBe(false);
	});

	test("the path scan ignores globs, placeholders and non-path code spans", () => {
		const spans = ["packages/*/biome.json", "df ci logs <run-id>", "`df`", ".agents/rules", "https://x.dev/a"];
		expect(pathClaims(spans.map((span) => `text \`${span}\` text`).join("\n"))).toEqual([]);
	});

	test("the path scan reports a directory claim naming a top-level that no longer exists", () => {
		// `capabilities/` is not a top-level entry, so the known-top-level filter used to discard
		// it instead of reporting it. That is how it survived #1297 in README.md and ADR-0018.
		expect(topLevelNames().has("capabilities")).toBe(false);
		expect(pathClaims("behavior belongs under `capabilities/` today")).toEqual(["capabilities/"]);
	});

	test("the path scan still ignores a skill-local directory convention", () => {
		// `author-skill` names `references/` as a convention inside the skill being authored,
		// which is not a path in this repository.
		expect(pathClaims("Put anything long in `references/` and link it.")).toEqual([]);
	});

	test("the README capability list is the set of plugins that exist", () => {
		// The section once named fourteen capabilities, nine of which have never existed, so this
		// compares the list against the directory rather than trusting the prose. A plugin added
		// without a README entry, or an entry without a plugin, fails here.
		const readme = readFileSync(join(repoDir, "README.md"), "utf8");
		const heading = "The first-party plugins that exist today are:";
		const start = readme.indexOf(heading);
		expect(start, "README no longer declares a first-party plugin list").toBeGreaterThan(-1);
		// Only the list that follows the heading: later sections also use `- name;` bullets, so the
		// slice stops at the first line that is not one.
		const declared: string[] = [];
		let listing = false;
		for (const line of readme.slice(start + heading.length).split("\n")) {
			// `;` between items and `.` on the last one, which is how the list is written.
			const bullet = /^- ([a-z-]+)[;.]$/.exec(line.trim());
			if (bullet) {
				listing = true;
				declared.push(bullet[1] as string);
				continue;
			}
			// Blank lines may separate the heading from the list; a non-blank line that is not a
			// bullet ends it.
			if (listing || line.trim() !== "") break;
		}
		expect(declared.length).toBeGreaterThan(0);
		const onDisk = readdirSync(join(repoDir, ".darkfactory", "plugins"), { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);
		expect([...declared].sort(), "README capability list does not match .darkfactory/plugins").toEqual(
			[...onDisk].sort(),
		);
	});

	test("the subcommand scan recognises a command the CLI does not have", () => {
		expect(dfCommands("Run `df nosuch` and\n```sh\ndf quota --json\n```\n")).toEqual(["nosuch", "quota"]);
		expect(usageCommands().has("nosuch")).toBe(false);
	});
});
