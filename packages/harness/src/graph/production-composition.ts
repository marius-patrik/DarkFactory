import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { GitHubRepository } from "../../../github/src/repository.ts";
import { slugify } from "../../../keychain/src/import/slugify.ts";
import { changedFiles } from "../workspace/changedFiles.ts";
import { commitChunk, type CommitIdentity } from "../workspace/commitChunk.ts";
import { createWorktree } from "../workspace/createWorktree.ts";
import { runGit } from "../workspace/git.ts";
import { resolveDefaultBranch } from "../workspace/gitWorkspace.ts";
import { runDetectedVerification } from "../workspace/runVerify.ts";
import { scopeCheck } from "../workspace/scopeCheck.ts";
import { updateBranch } from "../workspace/updateBranch.ts";
import type {
	ProductionGitHubEffects,
	ProductionRepositoryEffects,
} from "./production-handlers.ts";

const BOT_IDENTITY: CommitIdentity = {
	name: "darkfactory-pipeline[bot]",
	email: "darkfactory-pipeline[bot]@users.noreply.github.com",
};
const SHA = /^[a-f0-9]{40}$/iu;
const EFFECT = /^[a-f0-9]{64}$/iu;

function head(directory: string): string {
	const value = runGit(directory, ["rev-parse", "HEAD"]);
	if (!SHA.test(value)) throw new Error("Git HEAD has no immutable SHA");
	return value;
}

function remote(repository: string, branch: string): string | null {
	const result = runGit(repository, ["ls-remote", "--heads", "origin", `refs/heads/${branch}`]).trim();
	if (!result) return null;
	const sha = result.split(/\s+/u)[0];
	if (!sha || !SHA.test(sha)) throw new Error(`Malformed remote branch SHA for ${branch}`);
	return sha;
}

function checkedBranch(repository: string, branch: string): void {
	if (branch === "HEAD" || branch.startsWith("-")) throw new Error(`Unsafe branch identity: ${branch}`);
	runGit(repository, ["check-ref-format", "--branch", branch]);
}

function workspaceFingerprint(repository: string, worktree: string, branch: string): string | undefined {
	try {
		if (runGit(worktree, ["rev-parse", "--is-inside-work-tree"]) !== "true") return undefined;
		if (runGit(worktree, ["branch", "--show-current"]) !== branch) return undefined;
		const expectedGitDir = resolve(repository, runGit(repository, ["rev-parse", "--git-common-dir"]));
		const observedGitDir = resolve(worktree, runGit(worktree, ["rev-parse", "--git-common-dir"]));
		if (observedGitDir !== expectedGitDir) return undefined;
		return `worktree:${resolve(worktree)}:${branch}`;
	} catch {
		return undefined;
	}
}

/**
 * Compose the existing Git substrate into the single harness graph.
 * All mutations require the caller's durable effect boundary; this module
 * does not plan stages or create another pipeline executor.
 */
export function createRepositoryProductionEffects(options: {
	repoDir: string;
	workRoot?: string;
	identity?: CommitIdentity;
}): ProductionRepositoryEffects {
	const repo = resolve(options.repoDir);
	const workRoot = resolve(options.workRoot ?? join(repo, ".darkfactory", "worktrees"));
	const identity = options.identity ?? BOT_IDENTITY;

	return {
		async observeBase() {
			const defaultBranch = await resolveDefaultBranch(repo);
			checkedBranch(repo, defaultBranch);
			runGit(repo, ["fetch", "origin", defaultBranch]);
			return { defaultBranch, sha: headRef(repo, `refs/remotes/origin/${defaultBranch}`) };
		},
		remoteHead: (branch) => {
			checkedBranch(repo, branch);
			return Promise.resolve(remote(repo, branch));
		},
		ensureWorktree({ branch, base }) {
			checkedBranch(repo, branch);
			checkedBranch(repo, base);
			// createWorktree is the sole deterministic owner of its path and
			// validates reused worktree branch identity.
			const dir = resolve(join(workRoot, slugify(branch)));
			const execute = async () => {
				await mkdir(workRoot, { recursive: true });
				const result = createWorktree({ repo, branch, base, workRoot });
				const evidence = workspaceFingerprint(repo, result.worktreePath, branch);
				if (!evidence) throw new Error("Worktree creation did not prove branch ownership");
				return { value: { worktree: result.worktreePath }, evidence };
			};
			return {
				observe: async () => {
					// Worktree basename is owned by createWorktree's slugify.
					// When it differs from the provisional path, never infer
					// ownership: the executor will fail closed after ambiguity.
					const evidence = workspaceFingerprint(repo, dir, branch);
					return evidence ? { value: { worktree: dir }, evidence } : undefined;
				},
				execute,
			};
		},
		commit({ worktree, message }) {
			return {
				observe: async (effectId) => {
					const sha = head(worktree);
					const raw = runGit(worktree, ["log", "-1", "--format=%B"]);
					if (!raw.includes(`DarkFactory-Effect: ${effectId}`)) return undefined;
					if ((await changedFiles(worktree)).length) return undefined;
					return { value: { sha }, evidence: `commit:${sha}` };
				},
				execute: async (effectId) => {
					if (!EFFECT.test(effectId)) throw new Error("Invalid commit effect id");
					const sha = await commitChunk({ worktree, message: `${message}\n\nDarkFactory-Effect: ${effectId}`, identity });
					if (!sha || !SHA.test(sha)) throw new Error("Commit did not yield immutable evidence");
					return { value: { sha }, evidence: `commit:${sha}` };
				},
			};
		},
		push({ branch, worktree, expectedOldSha, newSha }) {
			checkedBranch(repo, branch);
			if (!SHA.test(newSha) || (expectedOldSha !== null && !SHA.test(expectedOldSha)))
				throw new Error("Push requires exact old and new commit SHAs");
			const observe = async () => {
				const observed = remote(repo, branch);
				return observed === newSha
					? { value: { sha: observed }, evidence: `remote-ref:${branch}:${observed}` }
					: undefined;
			};
			return {
				observe,
				execute: async () => {
					if (head(worktree) !== newSha) throw new Error("Local HEAD changed before lease-safe push");
					const prior = remote(repo, branch);
					if (prior !== expectedOldSha)
						throw new Error(`Remote ref moved: expected ${expectedOldSha ?? "absent"}, got ${prior ?? "absent"}`);
					// Git's explicit exact-expected ref lease refuses concurrent
					// remote updates. No unconditional remote overwrite is used.
					runGit(worktree, [
						"push", `--force-with-lease=refs/heads/${branch}:${expectedOldSha ?? ""}`,
						"origin", `HEAD:refs/heads/${branch}`,
					]);
					const confirmed = await observe();
					if (!confirmed) throw new Error("Push returned without matching remote ref");
					return confirmed;
				},
			};
		},
		updateBranch({ branch, base }) {
			checkedBranch(repo, branch);
			checkedBranch(repo, base);
			return {
				observe: async () => {
					// A conflicted merge has ambiguous externally mutable state.
					// Never call git update twice when a process died mid-merge.
					return undefined;
				},
				execute: async () => {
					await mkdir(workRoot, { recursive: true });
					const { worktreePath } = createWorktree({ repo, branch, base, workRoot });
					const result = await updateBranch({ worktree: worktreePath, base, identity });
					const sha = head(worktreePath);
					if (result.status === "conflict") {
						return {
							value: { status: "conflict" as const, worktree: worktreePath, headSha: sha,
								conflictedFiles: result.conflictedFiles },
							evidence: `git-conflict:${branch}:${sha}:${result.conflictedFiles.join(",")}`,
						};
					}
					return { value: { status: "clean" as const, worktree: worktreePath, headSha: sha },
						evidence: `git-update:${branch}:${sha}` };
				},
			};
		},
	};
}

function headRef(repo: string, ref: string): string {
	const value = runGit(repo, ["rev-parse", ref]).trim();
	if (!SHA.test(value)) throw new Error(`Invalid git ref ${ref}`);
	return value;
}

function effectMarker(id: string): string {
	if (!EFFECT.test(id)) throw new Error("Invalid GitHub effect identifier");
	return `<!-- darkfactory-effect:${id} -->`;
}

/** GitHub effects are exclusively executed through @darkfactory/github. */
export function createGitHubProductionEffects(
	repository: GitHubRepository,
	options: { requiredChecks: readonly string[] },
): ProductionGitHubEffects {
	if (options.requiredChecks.length === 0) throw new Error("Production GitHub effects require explicit mandatory check names");
	const restPath = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
	const getPR = (number: number) => repository.client.rest<{
		number: number;
		body?: string | null;
		merged?: boolean;
		merge_commit_sha?: string | null;
		head?: { sha?: string };
	}>( "GET", `${restPath}/pulls/${number}`);
	return {
		ensurePullRequest(input) {
			const find = async (id: string) => {
				const marker = effectMarker(id);
				const matches = (await repository.listPullRequests({
					head: input.head, base: input.base, state: "all",
				})).filter((pr) => pr.body?.includes(marker));
				if (matches.length > 1) throw new Error("Duplicate PRs with the same deterministic effect marker");
				const pr = matches[0];
				return pr ? { value: { number: pr.number }, evidence: `github-pr:${pr.number}:${id}` } : undefined;
			};
			return {
				observe: find,
				execute: async (id) => {
					const created = await repository.createPullRequest({
						...input, body: `${input.body}\n\n${effectMarker(id)}`,
					});
					const observed = await find(id);
					if (!observed || observed.value.number !== created.number)
						throw new Error("Created PR not observable by deterministic marker");
					return observed;
				},
			};
		},
		async currentPullRequestHead(number) {
			const sha = (await getPR(number)).head?.sha;
			if (!sha || !SHA.test(sha)) throw new Error("GitHub PR head is missing immutable SHA");
			return sha;
		},
		async requiredChecksGreen(headSha) {
			if (!SHA.test(headSha)) throw new Error("Checks require immutable commit SHA");
			const checked = await repository.requiredCheckStatus(headSha, [...options.requiredChecks]);
			return checked.state === "success" && checked.missing.length === 0 && checked.failing.length === 0;
		},
		mergePullRequest(input) {
			const observe = async () => {
				const pr = await getPR(input.number);
				if (!pr.merged || !pr.merge_commit_sha) return undefined;
				if (pr.head?.sha !== input.expectedHeadSha) throw new Error("Merged PR head differs from approved commit");
				if (!SHA.test(pr.merge_commit_sha)) throw new Error("Merged PR has invalid merge SHA");
				return { value: { number: input.number, mergeSha: pr.merge_commit_sha },
					evidence: `github-merge:${input.number}:${pr.merge_commit_sha}` };
			};
			return {
				observe: async () => observe(),
				execute: async () => {
					if ((await getPR(input.number)).head?.sha !== input.expectedHeadSha)
						throw new Error("PR head changed before conditional merge");
					const merged = await repository.client.rest<{ merged?: boolean; sha?: string }>(
						"PUT", `${restPath}/pulls/${input.number}/merge`,
						{ sha: input.expectedHeadSha, merge_method: "merge" },
					);
					if (!merged.merged || !merged.sha) throw new Error("Conditional GitHub merge not confirmed");
					const confirmed = await observe();
					if (!confirmed || confirmed.value.mergeSha !== merged.sha)
						throw new Error("Merged PR remote observation did not confirm exact merge SHA");
					return confirmed;
				},
			};
		},
		createComment({ issueNumber, body }) {
			const observe = async (id: string) => {
				const marker = effectMarker(id);
				const matches = (await repository.listComments(issueNumber)).filter((comment) => comment.body?.includes(marker));
				if (matches.length > 1) throw new Error("Duplicate GitHub comments share an effect identity");
				const comment = matches[0];
				return comment ? { value: { commentId: comment.id }, evidence: `github-comment:${comment.id}:${id}` } : undefined;
			};
			return {
				observe,
				execute: async (id) => {
					const created = await repository.createComment(issueNumber, `${body}\n\n${effectMarker(id)}`);
					const recorded = await observe(id);
					if (!recorded || recorded.value.commentId !== created.id)
						throw new Error("Published comment was not observed by deterministic marker");
					return recorded;
				},
			};
		},
		closeIssue({ number }) {
			const observe = async () => {
				const issue = await repository.getIssue(number);
				return issue.state === "closed"
					? { value: { number }, evidence: `github-issue-closed:${number}` }
					: undefined;
			};
			return {
				observe: async () => observe(),
				execute: async () => {
					const closed = await repository.closeIssue(number);
					if (closed.state !== "closed") throw new Error("GitHub issue closure not confirmed");
					const evidence = await observe();
					if (!evidence) throw new Error("Closed issue could not be observed");
					return evidence;
				},
			};
		},
	};
}

export const productionWorkspaceOperations = {
	changedFiles,
	scopeCheck,
	runDetectedVerification,
};
