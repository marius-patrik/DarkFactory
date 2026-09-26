import { afterEach, expect, test } from "bun:test";
import { GitError, runGit } from "../../src/workspace/git.ts";
import { createTempRepo, type TempRepo } from "./helpers.ts";

let temp: TempRepo | undefined;
afterEach(() => {
	temp?.cleanup();
	temp = undefined;
});

test("runGit runs inside the given repository, not the process directory", () => {
	temp = createTempRepo();
	expect(runGit(temp.repo, ["rev-parse", "--show-toplevel"]).replace(/\\/g, "/").toLowerCase()).toContain("/repo");
	expect(runGit(temp.repo, ["branch", "--show-current"])).toBe("main");
});

test("runGit passes arguments without a shell", () => {
	temp = createTempRepo();
	const hostile = "feature/$(echo pwned);x";
	expect(() => runGit(temp?.repo, ["check-ref-format", "--branch", hostile])).toThrow(GitError);
	expect(runGit(temp.repo, ["log", "--format=%s", "-1"])).toBe("init");
});

test("runGit reports git's error output and refuses an empty repository directory", () => {
	temp = createTempRepo();
	try {
		runGit(temp.repo, ["checkout", "does-not-exist"]);
		throw new Error("expected a GitError");
	} catch (error) {
		expect(error).toBeInstanceOf(GitError);
		expect((error as GitError).exitCode).not.toBe(0);
		expect((error as GitError).message).toContain("does-not-exist");
	}
	expect(() => runGit("", ["status"])).toThrow("explicit repository directory");
});
