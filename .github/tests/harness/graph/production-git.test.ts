import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	createRepositoryProductionEffects,
} from "../../../../packages/harness/src/graph/production-composition.ts";
import {
	FileProductionEffectJournal, productionEffectId, runObservedProductionEffect,
} from "../../../../packages/harness/src/graph/durable-effects.ts";
import type { ExternalMutation } from "../../../../packages/harness/src/graph/production-handlers.ts";
import { repairObservedMergeConflicts } from "../../../../packages/harness/src/workspace/conflict-repair.ts";

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function git(directory: string, ...args: string[]): string {
	return execFileSync("git", args, {
		cwd: directory,
		encoding: "utf8",
		env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
	}).trim();
}

async function localRepository() {
	const root = await mkdtemp(join(tmpdir(), "df-production-git-"));
	roots.push(root);
	const remote = join(root, "remote.git");
	const repo = join(root, "repo");
	await mkdir(remote);
	git(root, "init", "--bare", "--initial-branch=main", remote);
	git(root, "clone", remote, repo);
	git(repo, "config", "user.name", "Test Engineer");
	git(repo, "config", "user.email", "engineer@example.test");
	await writeFile(join(repo, "file.txt"), "original\n");
	await writeFile(join(repo, "repo.dfconfig"), JSON.stringify({ repo: { identity: { default_branch: "main" } } }));
	git(repo, "add", "file.txt", "repo.dfconfig");
	git(repo, "commit", "-m", "seed");
	git(repo, "push", "-u", "origin", "main");
	return { root, repo, remote };
}

async function recorded<T>(
	journal: FileProductionEffectJournal, id: string, kind: string, mutation: ExternalMutation<T>,
) {
	return runObservedProductionEffect(journal, id, kind, {
		observe: () => mutation.observe(id),
		execute: () => mutation.execute(id),
	});
}

describe("canonical graph real git composition", () => {
	test("creates worktree, commits exact changed files and lease-pushes with durable observed SHA", async () => {
		const f = await localRepository();
		const effects = createRepositoryProductionEffects({
			repoDir: f.repo,
			workRoot: join(f.root, "worktrees"),
			identity: { name: "DarkFactory Test", email: "test@example.test" },
		});
		const journal = new FileProductionEffectJournal(join(f.root, "effects"));
		const branch = "agent/durable-effects";
		const worktreeId = productionEffectId("run", "implement", 1, "worktree");
		const tree = await recorded(journal, worktreeId, "worktree",
			effects.ensureWorktree({ branch, base: "main", runId: "run" }));
		const worktree = tree.value.worktree;
		expect(git(worktree, "branch", "--show-current")).toBe(branch);
		await writeFile(join(worktree, "file.txt"), "verified production change\n");
		const commitId = productionEffectId("run", "implement", 1, "commit");
		const committed = await recorded(journal, commitId, "commit",
			effects.commit({ worktree, message: "feat: actual integration" }));
		expect(committed.value.sha).toMatch(/^[a-f0-9]{40}$/);
		expect(git(worktree, "log", "-1", "--format=%B")).toContain(`DarkFactory-Effect: ${commitId}`);
		expect(await effects.remoteHead(branch)).toBeNull();
		const pushId = productionEffectId("run", "implement", 1, "push");
		const args = { branch, worktree, expectedOldSha: null, newSha: committed.value.sha };
		const pushed = await recorded(journal, pushId, "push", effects.push(args));
		expect(pushed.value.sha).toBe(committed.value.sha);
		expect(await effects.remoteHead(branch)).toBe(committed.value.sha);
		const restart = new FileProductionEffectJournal(journal.directory);
		const replayed = await recorded(restart, pushId, "push", effects.push(args));
		expect(replayed.evidence).toBe(pushed.evidence);
		expect(git(worktree, "status", "--porcelain")).toBe("");
	});

	test("never publishes a runtime commit directly to the configured default branch", async () => {
		const f = await localRepository();
		const effects = createRepositoryProductionEffects({ repoDir: f.repo });
		const original = git(f.repo, "rev-parse", "HEAD");
		await expect(effects.push({
			branch: "main", worktree: f.repo, expectedOldSha: original, newSha: original,
		}).observe("a".repeat(64))).rejects.toThrow("default branch");
		await expect(effects.push({
			branch: "main", worktree: f.repo, expectedOldSha: original, newSha: original,
		}).execute("a".repeat(64))).rejects.toThrow("default branch");
		expect(git(f.repo, "rev-parse", "HEAD")).toBe(original);
	});

	test("an actual conflicting merge cannot publish unverified model resolution", async () => {
		const f = await localRepository();
		const branch = "agent/conflicting-update";
		const effects = createRepositoryProductionEffects({
			repoDir: f.repo, workRoot: join(f.root, "worktrees"),
		});
		const tree = await effects.ensureWorktree({ branch, base: "main", runId: "conflict-test" })
			.execute("1".repeat(64));
		const worktree = tree.value.worktree;
		await writeFile(join(worktree, "file.txt"), "feature side\n");
		git(worktree, "add", "file.txt");
		git(worktree, "-c", "user.name=Feature", "-c", "user.email=feature@example.test",
			"commit", "-m", "feature");
		git(worktree, "push", "origin", `HEAD:refs/heads/${branch}`);
		const originalRemote = git(f.repo, "ls-remote", "--heads", "origin", `refs/heads/${branch}`).split(/\s+/u)[0];
		await writeFile(join(f.repo, "file.txt"), "base side\n");
		git(f.repo, "add", "file.txt");
		git(f.repo, "commit", "-m", "incompatible base");
		git(f.repo, "push", "origin", "main");
		const conflicted = await effects.updateBranch!({ branch, base: "main", runId: "conflict-test" })
			.execute("2".repeat(64));
		expect(conflicted.value.status).toBe("conflict");
		if (conflicted.value.status !== "conflict") throw new Error("Expected real Git conflict");
		expect(conflicted.value.conflictedFiles).toContain("file.txt");
		await expect(repairObservedMergeConflicts({
			worktree, baseBranch: "main", conflictedFiles: ["file.txt"],
			resolveConflict: async () => "resolved without proof\n",
			identity: { name: "Reviewer", email: "reviewer@example.test" },
			effectId: "3".repeat(64),
		})).rejects.toThrow("deterministic verification");
		expect(git(f.repo, "ls-remote", "--heads", "origin",
			`refs/heads/${branch}`).split(/\s+/u)[0]).toBe(originalRemote);
		expect(git(worktree, "rev-parse", "-q", "--verify", "MERGE_HEAD")).toMatch(/^[a-f0-9]{40}$/);
	});

	test("lease validation rejects competing remote branch update without overwriting its commit", async () => {
		const f = await localRepository();
		const effects = createRepositoryProductionEffects({ repoDir: f.repo, workRoot: join(f.root, "worktrees") });
		const branch = "agent/stale-lease";
		const worktree = (await effects.ensureWorktree({ branch, base: "main", runId: "one" }).execute("a".repeat(64))).value.worktree;
		await writeFile(join(worktree, "file.txt"), "our change\n");
		git(worktree, "add", "file.txt");
		git(worktree, "-c", "user.name=Us", "-c", "user.email=us@example.test", "commit", "-m", "ours");
		const ours = git(worktree, "rev-parse", "HEAD");
		// Competing writer creates the remote ref at a different commit.
		const competitor = join(f.root, "competitor");
		git(f.root, "clone", f.remote, competitor);
		git(competitor, "config", "user.name", "Other");
		git(competitor, "config", "user.email", "other@example.test");
		git(competitor, "checkout", "-b", branch);
		await writeFile(join(competitor, "file.txt"), "other change\n");
		git(competitor, "add", "file.txt");
		git(competitor, "commit", "-m", "theirs");
		git(competitor, "push", "origin", `HEAD:refs/heads/${branch}`);
		const other = await effects.remoteHead(branch);
		expect(other).not.toBe(ours);
		await expect(effects.push({
			worktree, branch, expectedOldSha: null, newSha: ours,
		}).execute("b".repeat(64))).rejects.toThrow("Remote ref moved");
		expect(await effects.remoteHead(branch)).toBe(other);
	});
});
