import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

// Paths come from this file, never from process.cwd(): the suite runs from harness/ and from the repository root.
const harnessDir = join(import.meta.dir, "..");
const repoDir = join(harnessDir, "..");

/**
 * Container names that describe the absence of a decision rather than a
 * capability. `utils` is not a category of code; it is what a piece of code is
 * called before anyone has identified what it is *for*, and a file that cannot
 * be named has not been understood yet. A forbidden name is a static property
 * of a path, which is the only form of convention a linter can check.
 */
const FORBIDDEN_NAMES = ["base", "common", "core", "helpers", "lib", "manager", "misc", "shared", "stuff", "utils"];

/** Not repository source at all: installed packages and build output. */
const NOT_SOURCE_DIRECTORIES = new Set(["dist", "node_modules"]);

/**
 * Test trees are exempt, and the exemption is load-bearing rather than
 * speculative: `harness/test/github/helpers.ts` and
 * `harness/test/workspace/helpers.ts` are shared case helpers, which is exactly
 * what a test helper is allowed to be. Holding tests to a production rule
 * produces exemptions rather than compliance.
 */
const TEST_TREE_DIRECTORIES = new Set(["__tests__", "fixtures", "test", "tests"]);

/** A test file is exempt for the same reason a test tree is. */
const TEST_FILE = /\.(?:spec|test)\.[^.]+$/u;

/** Extensions whose content is worth reading back to explain an offending path. */
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

interface ProductionPath {
	readonly relative: string;
	readonly isDirectory: boolean;
}

/** Repository-root-relative, forward-slashed path, which is how the repository writes paths. */
function relativeOf(path: string): string {
	return path.slice(repoDir.length + 1).replaceAll("\\", "/");
}

/**
 * Directory entries that could be source. Dot-directories are skipped because
 * they are tool and VCS state (`.git`, `.github`, `.agents`, `.darkfactory`),
 * not something a reader of this repository is asked to name.
 */
function sourceEntries(directory: string): { name: string; path: string; isDirectory: boolean }[] {
	return readdirSync(directory, { withFileTypes: true })
		.filter((entry) => !entry.name.startsWith(".") && !NOT_SOURCE_DIRECTORIES.has(entry.name))
		.map((entry) => ({ name: entry.name, path: join(directory, entry.name), isDirectory: entry.isDirectory() }));
}

/**
 * The directories the root manifest claims as workspaces, which the check
 * exempts by name. A workspace root is a package name rather than a container:
 * `packages/core` is the published package `@darkfactory/core`, referenced by
 * 13 files, so renaming it is a breaking change and not a naming fix.
 * Everything *inside* the root is still checked, so the exemption covers one
 * path and not a subtree.
 */
function workspaceRoots(): Set<string> {
	const manifest = JSON.parse(readFileSync(join(repoDir, "package.json"), "utf8")) as { workspaces?: string[] };
	const roots = new Set<string>();
	for (const pattern of manifest.workspaces ?? []) {
		let directories = [repoDir];
		for (const segment of pattern.split("/")) {
			const next: string[] = [];
			for (const directory of directories) {
				if (segment === "*") {
					for (const entry of sourceEntries(directory)) if (entry.isDirectory) next.push(entry.path);
				} else if (existsSync(join(directory, segment))) {
					next.push(join(directory, segment));
				}
			}
			directories = next;
		}
		for (const directory of directories) roots.add(directory);
	}
	return roots;
}

/**
 * Every production file and directory, walked from the repository root. The
 * walk reads directory entries and nothing else, so it never writes to the tree
 * it is checking (ADR-0028 / DF-RULE-020 keep the Paper byte-identical).
 */
function productionPaths(): ProductionPath[] {
	const roots = workspaceRoots();
	const found: ProductionPath[] = [];
	const visit = (directory: string): void => {
		for (const entry of sourceEntries(directory)) {
			if (!entry.isDirectory) {
				if (!TEST_FILE.test(entry.name)) found.push({ relative: relativeOf(entry.path), isDirectory: false });
				continue;
			}
			if (TEST_TREE_DIRECTORIES.has(entry.name)) continue;
			if (!roots.has(entry.path)) found.push({ relative: relativeOf(entry.path), isDirectory: true });
			visit(entry.path);
		}
	};
	visit(repoDir);
	return found;
}

/** `utils.ts` and `utils` are the same name; the extension is not part of the decision. */
function stemOf(relative: string): string {
	return relative.slice(relative.lastIndexOf("/") + 1).replace(/(?:\.[^.]+)+$/u, "");
}

/** The names a module exports, so a failure says what the file was doing. Takes a repo-relative path. */
function exportsOf(relative: string): string[] {
	const source = readFileSync(join(repoDir, relative), "utf8");
	const names = new Set<string>();
	const declarations =
		/^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gmu;
	for (const match of source.matchAll(declarations)) names.add(match[1] as string);
	for (const match of source.matchAll(/^export\s+(?:type\s+)?\{([^}]*)\}/gmu)) {
		for (const entry of (match[1] as string).split(",")) {
			const name = entry
				.split(/\s+as\s+/u)
				.pop()
				?.trim();
			if (name) names.add(name);
		}
	}
	return [...names].sort();
}

function exportsPhrase(relative: string): string {
	const exports = SOURCE_EXTENSIONS.has(extname(relative)) ? exportsOf(relative) : [];
	return exports.length === 0 ? "exports nothing" : `exports ${exports.join(", ")}`;
}

/** A violation reported as the path plus what that path actually contained. */
function violation(entry: ProductionPath): string {
	if (!entry.isDirectory) return `${entry.relative} is forbidden: the file ${exportsPhrase(entry.relative)}`;
	const held = readdirSync(join(repoDir, entry.relative), { withFileTypes: true })
		.map((child) =>
			child.isDirectory() ? `${child.name}/` : `${child.name} (${exportsPhrase(`${entry.relative}/${child.name}`)})`,
		)
		.sort();
	return `${entry.relative} is forbidden: the directory holds ${held.join(", ") || "nothing"}`;
}

describe("production source names", () => {
	test("no production source file or directory carries a forbidden container name", () => {
		const violations = productionPaths()
			.filter((entry) => FORBIDDEN_NAMES.includes(stemOf(entry.relative)))
			.map(violation)
			.sort();
		expect(violations).toEqual([]);
	});

	test("the production walk reaches real source and both exemptions stay scoped", () => {
		const paths = new Set(productionPaths().map((entry) => `${entry.isDirectory ? "dir" : "file"} ${entry.relative}`));
		// The walk is live: a walk that found nothing would pass the rule vacuously.
		// The walk sees 314 production paths today; this floor is far enough below that to
		// catch an empty walk without pinning a count that legitimately changes.
		expect(paths.size).toBeGreaterThan(100);
		expect(paths.has("file packages/keychain/src/index.ts")).toBe(true);
		// Directories are candidates too, not just files.
		expect(paths.has("dir harness/src")).toBe(true);
		// The test-tree exemption is doing work, and is confined to test trees.
		expect(paths.has("file harness/test/github/helpers.ts")).toBe(false);
		expect(paths.has("file harness/src/cli.ts")).toBe(true);
		// The workspace-root exemption covers the root path only, not what is under it.
		expect(paths.has("dir packages/core")).toBe(false);
		expect(paths.has("file packages/core/src/index.ts")).toBe(true);
	});
});
