import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describeSubmoduleMovement, readSubmodules } from "../src/workspace/submodules.ts";

const roots: string[] = [];
afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

/** Writes a `.gitmodules` with the given body and returns the root holding it. */
async function withGitmodules(body: string): Promise<string> {
	const root = await mkdtemp(join(process.cwd(), ".submodule-test-"));
	roots.push(root);
	await writeFile(join(root, ".gitmodules"), body);
	return root;
}

describe("reading .gitmodules", () => {
	test("returns nothing when the repository has no submodules", async () => {
		const root = await mkdtemp(join(process.cwd(), ".submodule-test-"));
		roots.push(root);
		expect(readSubmodules(root)).toEqual([]);
	});

	test("reads path, url and a pinned branch", async () => {
		const root = await withGitmodules(
			'[submodule "libs/core"]\n\tpath = libs/core\n\turl = https://example.com/core.git\n\tbranch = main\n',
		);
		expect(readSubmodules(root)).toEqual([
			{ name: "libs/core", path: "libs/core", url: "https://example.com/core.git", branch: "main" },
		]);
	});

	test("reports a submodule with no branch pin as undefined rather than empty", async () => {
		const root = await withGitmodules(
			'[submodule "libs/core"]\n\tpath = libs/core\n\turl = https://example.com/core.git\n',
		);
		expect(readSubmodules(root)[0]?.branch).toBeUndefined();
	});

	test("reads several submodules in file order", async () => {
		const root = await withGitmodules(
			'[submodule "a"]\n\tpath = a\n\turl = https://example.com/a.git\n\n[submodule "b"]\n\tpath = b\n\turl = https://example.com/b.git\n',
		);
		expect(readSubmodules(root).map((module) => module.path)).toEqual(["a", "b"]);
	});

	test("skips a section missing path or url", async () => {
		const root = await withGitmodules('[submodule "broken"]\n\turl = https://example.com/broken.git\n');
		expect(readSubmodules(root)).toEqual([]);
	});

	test("keeps a renamed section name distinct from its path", async () => {
		const root = await withGitmodules('[submodule "renamed"]\n\tpath = real/path\n\turl = https://example.com/x.git\n');
		expect(readSubmodules(root)[0]?.name).toBe("renamed");
		expect(readSubmodules(root)[0]?.path).toBe("real/path");
	});

	test("ignores keys that are not part of a submodule declaration", async () => {
		const root = await withGitmodules(
			'[submodule "a"]\n\tpath = a\n\turl = https://example.com/a.git\n\tignore = dirty\n',
		);
		expect(readSubmodules(root)).toHaveLength(1);
	});
});

describe("describing movement", () => {
	test("says so plainly when nothing moved", () => {
		expect(describeSubmoduleMovement([])).toBe("No submodule moved; every pointer already matched its branch.");
	});

	test("renders a markdown table with both commits", () => {
		const markdown = describeSubmoduleMovement([
			{ path: "libs/core", branch: "main", before: "aaaaaaa", after: "bbbbbbb" },
		]);
		expect(markdown.split("\n")).toHaveLength(3);
		expect(markdown).toContain("| `libs/core` | `main` | `aaaaaaa` | `bbbbbbb` |");
	});

	test("names the default branch when none was pinned", () => {
		const markdown = describeSubmoduleMovement([
			{ path: "libs/core", branch: "(default)", before: "aaaaaaa", after: "bbbbbbb" },
		]);
		expect(markdown).toContain("`(default)`");
	});
});
