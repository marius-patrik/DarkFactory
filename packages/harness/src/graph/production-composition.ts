import { lstat, mkdir, readFile, readlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import type { GitHubRepository } from "../../../github/src/repository.ts";
import { slugify } from "../../../keychain/src/import/slugify.ts";
import { changedFiles } from "../workspace/changedFiles.ts";
import { repairObservedMergeConflicts, type ConflictResolver } from "../workspace/conflict-repair.ts";
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

/** Content-address every observed workspace path, including untracked and deletions. */
async function workspaceManifest(worktree: string): Promise<string> {
	const paths = [...new Set(await changedFiles(worktree))].sort();
	const hash = createHash("sha256");
	for (const relativePath of paths) {
		if (relativePath.startsWith("/") || relativePath.includes("\\0") ||
			relativePath.split("/").includes(".."))
			throw new Error("Unsafe path in workspace mutation evidence");
		hash.update(JSON.stringify(["path", relativePath]));
		try {
			const file = resolve(worktree, relativePath);
			const info = await lstat(file);
			if (info.isFile()) {
				hash.update(JSON.stringify(["file", info.mode & 0o111]));
				hash.update(await readFile(file));
			} else if (info.isSymbolicLink()) {
				hash.update(JSON.stringify(["symlink", await readlink(file)]));
			} else {
				throw new Error(`Unsupported changed workspace entry: ${relativePath}`);
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT")
				hash.update(JSON.stringify(["deleted"]));
			else throw error;
		}
	}
	return hash.digest("hex");
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
	/** Optional governed resolver for active Git merge conflicts. */
	resolveConflict?: ConflictResolver;
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
		observeWorkspace: workspaceManifest,
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
		commit({ worktree, message, expectedWorkspace }) {
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
					if (await workspaceManifest(worktree) !== expectedWorkspace)
						throw new Error("Workspace changed after deterministic verification");
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
			const denyDefaultBranch = async () => {
				if (branch === await resolveDefaultBranch(repo))
					throw new Error("Production graph refuses to push directly to the repository default branch");
			};
			const observe = async () => {
				await denyDefaultBranch();
				const observed = remote(repo, branch);
				return observed === newSha
					? { value: { sha: observed }, evidence: `remote-ref:${branch}:${observed}` }
					: undefined;
			};
			return {
				observe,
				execute: async () => {
					await denyDefaultBranch();
					if (head(worktree) !== newSha) throw new Error("Local HEAD changed before lease-safe push");
					const prior = remote(repo, branch);
					if (prior !== expectedOldSha)
						throw new Error(`Remote ref moved: expected ${expectedOldSha ?? "absent"}, got ${prior ?? "absent"}`);
					if (prior) {
						// A lease alone authorizes a destructive non-fast-forward overwrite.
						// Fetch and prove ancestry to forbid unapproved forced history replacement.
						runGit(worktree, ["fetch", "origin", `refs/heads/${branch}`]);
						if (runGit(worktree, ["rev-parse", "FETCH_HEAD"]) !== prior)
							throw new Error("Observed feature branch changed during ancestry validation");
						try {
							runGit(worktree, ["merge-base", "--is-ancestor", prior, newSha]);
						} catch {
							throw new Error("Refusing unapproved non-fast-forward feature-branch push");
						}
					}
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
			const observe = async () => {
				const worktreePath = resolve(join(workRoot, slugify(branch)));
				if (!workspaceFingerprint(repo, worktreePath, branch)) return undefined;
				const sha = head(worktreePath);
				const unresolved = runGit(worktreePath, ["diff", "--name-only", "--diff-filter=U"])
					.split(/\r?\n/u).filter(Boolean).sort();
				if (unresolved.length) {
					return {
						value: { status: "conflict" as const, worktree: worktreePath, headSha: sha,
							conflictedFiles: unresolved },
						evidence: `git-conflict:${branch}:${sha}:${unresolved.join(",")}`,
					};
				}
				if (runGit(worktreePath, ["status", "--porcelain"]).trim()) return undefined;
				runGit(repo, ["fetch", "origin", base]);
				try {
					runGit(worktreePath, ["merge-base", "--is-ancestor", `origin/${base}`, "HEAD"]);
				} catch {
					return undefined;
				}
				return {
					value: { status: "clean" as const, worktree: worktreePath, headSha: sha },
					evidence: `git-update:${branch}:${sha}`,
				};
			};
			return {
				observe,
				execute: async (effectId) => {
					await mkdir(workRoot, { recursive: true });
					const { worktreePath } = createWorktree({ repo, branch, base, workRoot });
					const result = await updateBranch({ worktree: worktreePath, base, identity });
					const sha = head(worktreePath);
					if (result.status === "conflict" && options.resolveConflict) {
						const repaired = await repairObservedMergeConflicts({
							worktree: worktreePath, baseBranch: base,
							conflictedFiles: result.conflictedFiles,
							resolveConflict: options.resolveConflict,
							identity, effectId,
						});
						return {
							value: { status: "clean" as const, worktree: worktreePath,
								headSha: repaired.commitSha },
							evidence: `git-update:${branch}:${repaired.commitSha}`,
						};
					}
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

/**
 * Missing read/conditional-write GitHub primitives must be provided by the
 * GitHub package owner. The graph must never issue raw REST requests itself.
 */
export interface GitHubMergeBoundary {
	read(number: number): Promise<{ number: number; headSha: string; merged: boolean; mergeSha?: string }>;
	mergeIfHead(number: number, expectedHeadSha: string): Promise<{ merged: boolean; mergeSha?: string }>;
}

/** GitHub transaction policy stays in the graph; REST/GraphQL stays in @darkfactory/github. */
export function createGitHubProductionEffects(
	repository: GitHubRepository,
	options: { requiredChecks: readonly string[]; mergeBoundary: GitHubMergeBoundary },
): ProductionGitHubEffects {
	if (options.requiredChecks.length === 0) throw new Error("Production GitHub effects require explicit mandatory check names");
	const getPR = options.mergeBoundary.read;
	return {
		ensurePullRequest(input) {
			const find = async (id: string) => {
				const marker = effectMarker(id);
				const matches = (await repository.listPullRequests({
					head: input.head, base: input.base, state: "all",
				})).filter((pr) => pr.body?.includes(marker));
				if (matches.length > 1) throw new Error("Duplicate PRs with the same deterministic effect marker");
				const pr = matches[0];
				if (pr && pr.state !== "open") throw new Error("Non-open PR cannot be reused for a delivery effect");
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
			const sha = await repository.getPullRequestHeadSha(number);
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
				if (!pr.merged || !pr.mergeSha) return undefined;
				if (pr.headSha !== input.expectedHeadSha) throw new Error("Merged PR head differs from approved commit");
				if (!SHA.test(pr.mergeSha)) throw new Error("Merged PR has invalid merge SHA");
				return { value: { number: input.number, mergeSha: pr.mergeSha },
					evidence: `github-merge:${input.number}:${pr.mergeSha}` };
			};
			return {
				observe: async () => observe(),
				execute: async () => {
					if ((await getPR(input.number)).headSha !== input.expectedHeadSha)
						throw new Error("PR head changed before conditional merge");
					const merged = await options.mergeBoundary.mergeIfHead(input.number, input.expectedHeadSha);
					if (!merged.merged || !merged.mergeSha) throw new Error("Conditional GitHub merge not confirmed");
					const confirmed = await observe();
					if (!confirmed || confirmed.value.mergeSha !== merged.mergeSha)
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
