import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runWorkspaceCli } from "../../src/workspace/cli.ts";
import { runGit } from "../../src/workspace/git.ts";
import {
	abortOperation,
	createBranch,
	fetchOrigin,
	merge,
	pushWithLease,
	rebase,
	switchBranch,
} from "../../src/workspace/gitCommands.ts";
import { createTempRepo, TEST_IDENTITY, type TempRepo } from "./helpers.ts";

let temp: TempRepo | undefined;

function current(): TempRepo {
	if (!temp) throw new Error("temporary repository was not created");
	return temp;
}

beforeEach(() => {
	temp = createTempRepo();
});

afterEach(() => {
	temp?.cleanup();
	temp = undefined;
});

test("runWorkspaceCli fails if path is not a git repo", async () => {
	const nonRepo = join(current().root, "not-a-repo");
	mkdirSync(nonRepo);
	await expect(runWorkspaceCli(["--repo", nonRepo, "status"])).rejects.toThrow("not a valid Git repository");
});

test("runWorkspaceCli accepts valid repo path", async () => {
	const logs: string[] = [];
	const originalLog = console.log;
	console.log = (message: string) => logs.push(message);
	try {
		await runWorkspaceCli(["--repo", current().repo, "status"]);
		expect(logs.some((line) => line.startsWith("Branch: main"))).toBe(true);
	} finally {
		console.log = originalLog;
	}
});

test("gitCommands primitives work successfully", () => {
	const repoPath = current().repo;
	fetchOrigin(repoPath);
	createBranch(repoPath, "feat-commands", "main");
	writeFileSync(join(repoPath, "c1.txt"), "content");
	runGit(repoPath, ["add", "c1.txt"]);
	runGit(repoPath, ["commit", "-m", "commit 1"], { env: TEST_IDENTITY });

	switchBranch(repoPath, "main");
	writeFileSync(join(repoPath, "c2.txt"), "content");
	runGit(repoPath, ["add", "c2.txt"]);
	runGit(repoPath, ["commit", "-m", "commit 2"], { env: TEST_IDENTITY });

	switchBranch(repoPath, "feat-commands");
	expect(rebase(repoPath, "main")).toBe("clean");

	const headSha = runGit(repoPath, ["rev-parse", "HEAD"]);
	runGit(repoPath, ["push", "-u", "origin", "feat-commands"]);
	expect(() => pushWithLease(repoPath, "origin", "feat-commands", headSha)).not.toThrow();
});

test("gitCommands handle conflict and abort", () => {
	const repoPath = current().repo;
	createBranch(repoPath, "feat-conflict", "main");
	writeFileSync(join(repoPath, "conflict.txt"), "branch content");
	runGit(repoPath, ["add", "conflict.txt"]);
	runGit(repoPath, ["commit", "-m", "branch commit"], { env: TEST_IDENTITY });

	switchBranch(repoPath, "main");
	writeFileSync(join(repoPath, "conflict.txt"), "main content");
	runGit(repoPath, ["add", "conflict.txt"]);
	runGit(repoPath, ["commit", "-m", "main commit"], { env: TEST_IDENTITY });

	switchBranch(repoPath, "feat-conflict");
	expect(merge(repoPath, "main")).toBe("conflict");
	expect(() => abortOperation(repoPath)).not.toThrow();
});
