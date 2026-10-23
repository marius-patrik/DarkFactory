import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runGit } from "../../src/workspace/git.ts";
import { scopeCheck } from "../../src/workspace/scopeCheck.ts";
import { createTempRepo, TEST_IDENTITY } from "./helpers.ts";

describe("scopeCheck utility", () => {
	let temp: ReturnType<typeof createTempRepo>;

	beforeEach(() => {
		temp = createTempRepo();
	});

	afterEach(() => {
		temp.cleanup();
	});

	it("detects changed, outside, and untouched test files", async () => {
		const repo = temp.repo;
		for (const d of ["src", "docs", "test"]) {
			mkdirSync(join(repo, d), { recursive: true });
		}
		const files = ["src/a.ts", "src/b.ts", "docs/x.md", "test/a.test.ts", "test/b.test.ts"];
		for (const f of files) {
			writeFileSync(join(repo, f), "initial\n");
		}
		runGit(repo, ["add", "."]);
		runGit(repo, ["commit", "-m", "initial"], { env: TEST_IDENTITY });

		writeFileSync(join(repo, "src/a.ts"), "changed a\n");
		writeFileSync(join(repo, "docs/x.md"), "changed doc\n");
		writeFileSync(join(repo, "test/a.test.ts"), "changed test a\n");
		writeFileSync(join(repo, "src/new.ts"), "new file\n");

		const result = await scopeCheck(repo, ["src/**/*.ts", "test/a.test.ts"], ["test/a.test.ts", "test/b.test.ts"]);
		expect(result.changed).toEqual(["docs/x.md", "src/a.ts", "src/new.ts", "test/a.test.ts"]);
		expect(result.outside).toEqual(["docs/x.md"]);
		expect(result.untouchedTests).toEqual(["test/b.test.ts"]);
	});

	it("returns empty arrays on a clean worktree", async () => {
		const result = await scopeCheck(temp.repo, ["src/**/*.ts"], []);
		expect(result.changed).toEqual([]);
		expect(result.outside).toEqual([]);
		expect(result.untouchedTests).toEqual([]);
	});

	it("is order-independent for allowed patterns", async () => {
		const repo = temp.repo;
		for (const d of ["src", "docs", "test"]) {
			mkdirSync(join(repo, d), { recursive: true });
		}
		const files = ["src/a.ts", "src/b.ts", "docs/x.md", "test/a.test.ts", "test/b.test.ts"];
		for (const f of files) {
			writeFileSync(join(repo, f), "initial\n");
		}
		runGit(repo, ["add", "."]);
		runGit(repo, ["commit", "-m", "initial"], { env: TEST_IDENTITY });

		writeFileSync(join(repo, "src/a.ts"), "changed a again\n");
		writeFileSync(join(repo, "docs/x.md"), "changed doc again\n");
		writeFileSync(join(repo, "test/a.test.ts"), "changed test a again\n");
		writeFileSync(join(repo, "src/new.ts"), "new file again\n");

		const result = await scopeCheck(repo, ["test/a.test.ts", "src/**/*.ts"], ["test/a.test.ts", "test/b.test.ts"]);
		expect(result.changed).toEqual(["docs/x.md", "src/a.ts", "src/new.ts", "test/a.test.ts"]);
		expect(result.outside).toEqual(["docs/x.md"]);
		expect(result.untouchedTests).toEqual(["test/b.test.ts"]);
	});
});
