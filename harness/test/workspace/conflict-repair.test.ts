import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repairBranchConflicts } from "../../src/workspace/conflict-repair.ts";
import { runGit } from "../../src/workspace/git.ts";
import { pushWithLease } from "../../src/workspace/gitWorkspace.ts";

describe("conflict-repair: deterministic update and model conflict resolution", () => {
	let baseDir: string;
	let remoteRepo: string;
	let localRepo: string;
	let worktreesDir: string;

	beforeEach(() => {
		baseDir = join(tmpdir(), `df-repair-test-${Math.random().toString(36).slice(2)}`);
		remoteRepo = join(baseDir, "remote.git");
		localRepo = join(baseDir, "local");
		worktreesDir = join(baseDir, "worktrees");

		mkdirSync(worktreesDir, { recursive: true });

		// 1. Bare remote repository
		runGit(baseDir, ["init", "--bare", "-b", "darkfactory", remoteRepo]);

		// 2. Clone to localRepo
		runGit(baseDir, ["clone", remoteRepo, localRepo]);
		runGit(localRepo, ["config", "user.name", "Test"]);
		runGit(localRepo, ["config", "user.email", "test@example.com"]);

		// Initial commit with repo.df defining dynamic default branch
		mkdirSync(join(localRepo, ".darkfactory"), { recursive: true });
		writeFileSync(
			join(localRepo, ".darkfactory", "repo.df"),
			JSON.stringify({
				schema_version: "1.0.0",
				identity: {
					name: "test-repo",
					default_branch: "darkfactory",
				},
			}),
		);
		writeFileSync(join(localRepo, "file.txt"), "line 1\nline 2\nline 3\n");
		runGit(localRepo, ["add", "--all"]);
		runGit(localRepo, ["commit", "-m", "init"]);
		runGit(localRepo, ["push", "origin", "darkfactory"]);
	});

	afterEach(() => {
		rmSync(baseDir, { recursive: true, force: true });
	});

	test("clean update when branch has no conflicts", async () => {
		// Create a feature branch on origin
		runGit(localRepo, ["checkout", "-b", "feat/clean-branch"]);
		writeFileSync(join(localRepo, "clean-file.txt"), "clean\n");
		runGit(localRepo, ["add", "clean-file.txt"]);
		runGit(localRepo, ["commit", "-m", "add clean file"]);
		runGit(localRepo, ["push", "origin", "feat/clean-branch"]);

		// Reset local back to darkfactory
		runGit(localRepo, ["checkout", "darkfactory"]);

		const result = await repairBranchConflicts({
			repoDir: localRepo,
			branch: "feat/clean-branch",
			worktreesDir,
		});

		expect(result.status).toBe("clean");
		if (result.status === "clean") {
			expect(result.defaultBranch).toBe("darkfactory");
			expect(result.updated).toBe(true);
		}
	});

	test("conflict repair re-verifies and returns observed commit/push evidence", async () => {
		// 1. Create conflicting branch
		runGit(localRepo, ["checkout", "-b", "feat/conflicting-branch"]);
		writeFileSync(join(localRepo, "file.txt"), "line 1\nfeature change\nline 3\n");
		runGit(localRepo, ["add", "file.txt"]);
		runGit(localRepo, ["commit", "-m", "feature edit"]);
		runGit(localRepo, ["push", "origin", "feat/conflicting-branch"]);

		// 2. Advance darkfactory on remote
		runGit(localRepo, ["checkout", "darkfactory"]);
		writeFileSync(join(localRepo, "file.txt"), "line 1\nmainline change\nline 3\n");
		runGit(localRepo, ["add", "file.txt"]);
		runGit(localRepo, ["commit", "-m", "mainline edit"]);
		runGit(localRepo, ["push", "origin", "darkfactory"]);

		// 3. Repair with model conflict resolution
		let resolverCalled = false;
		const result = await repairBranchConflicts({
			repoDir: localRepo,
			branch: "feat/conflicting-branch",
			worktreesDir,
			resolveConflict: ({ file, content }) => {
				resolverCalled = true;
				expect(file).toBe("file.txt");
				expect(content).toContain("<<<<<<<");
				// Return clean merged content
				return "line 1\nmainline change + feature change\nline 3\n";
			},
		});

		expect(resolverCalled).toBe(true);
		expect(result.status).toBe("repaired");
		if (result.status === "repaired") {
			expect(result.conflictedFiles).toEqual(["file.txt"]);
			expect(result.pushed).toBe(true);
			expect(result.commitSha).toBeDefined();
		}
	});

	test("fails closed if conflict resolution fails to clear conflict markers", async () => {
		// Create conflicting branch
		runGit(localRepo, ["checkout", "-b", "feat/bad-resolve"]);
		writeFileSync(join(localRepo, "file.txt"), "feature edit\n");
		runGit(localRepo, ["add", "file.txt"]);
		runGit(localRepo, ["commit", "-m", "feature"]);
		runGit(localRepo, ["push", "origin", "feat/bad-resolve"]);

		runGit(localRepo, ["checkout", "darkfactory"]);
		writeFileSync(join(localRepo, "file.txt"), "mainline edit\n");
		runGit(localRepo, ["add", "file.txt"]);
		runGit(localRepo, ["commit", "-m", "mainline"]);
		runGit(localRepo, ["push", "origin", "darkfactory"]);

		// Resolver returns still-conflicted content
		const result = await repairBranchConflicts({
			repoDir: localRepo,
			branch: "feat/bad-resolve",
			worktreesDir,
			resolveConflict: ({ content }) => content, // keeps conflict markers
		});

		expect(result.status).toBe("failed");
		if (result.status === "failed") {
			expect(result.error).toContain("Unresolved conflict markers remain");
		}
	});
	test("lease-safe push refuses stale remote state", () => {
		runGit(localRepo, ["checkout", "-b", "feat/lease"]);
		writeFileSync(join(localRepo, "lease.txt"), "initial\n");
		runGit(localRepo, ["add", "lease.txt"]);
		runGit(localRepo, ["commit", "-m", "lease initial"]);
		runGit(localRepo, ["push", "origin", "feat/lease"]);
		const expected = runGit(localRepo, ["rev-parse", "HEAD"]);

		const other = join(baseDir, "other");
		runGit(baseDir, ["clone", remoteRepo, other]);
		runGit(other, ["config", "user.name", "Other"]);
		runGit(other, ["config", "user.email", "other@example.com"]);
		runGit(other, ["checkout", "feat/lease"]);
		writeFileSync(join(other, "lease.txt"), "remote advanced\n");
		runGit(other, ["add", "lease.txt"]);
		runGit(other, ["commit", "-m", "advance remote"]);
		runGit(other, ["push", "origin", "feat/lease"]);

		writeFileSync(join(localRepo, "lease.txt"), "local rewrite\n");
		runGit(localRepo, ["add", "lease.txt"]);
		runGit(localRepo, ["commit", "-m", "local rewrite"]);

		expect(() => pushWithLease(localRepo, "origin", "feat/lease", expected)).toThrow(/stale lease/iu);
	});
});
