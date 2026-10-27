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
