import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import type {
	NodeContext,
	ObservedProductionEffect,
	ProductionGitHubEffects,
	ProductionGraphEffects,
	ProductionRepositoryEffects,
} from "@darkfactory/core/graph";
import type { PlanningContextPacket } from "@darkfactory/protocol/planning";
import type { GitHubRepository } from "../github/repository.ts";
import { changedFiles } from "../workspace/changedFiles.ts";
import { type CommitIdentity, commitChunk } from "../workspace/commitChunk.ts";
import { createWorktree } from "../workspace/createWorktree.ts";
import { runGit } from "../workspace/git.ts";
import { resolveDefaultBranch } from "../workspace/gitWorkspace.ts";
import { pushBranch } from "../workspace/pushBranch.ts";
import { runDetectedVerification } from "../workspace/runVerify.ts";
import { scopeCheck } from "../workspace/scopeCheck.ts";
import { updateBranch } from "../workspace/updateBranch.ts";

const DEFAULT_IDENTITY: CommitIdentity = {
	name: "darkfactory-pipeline[bot]",
	email: "darkfactory-pipeline[bot]@users.noreply.github.com",
};

function remoteBranchSha(repo: string, branch: string): string | undefined {
	const output = runGit(repo, ["ls-remote", "--heads", "origin", `refs/heads/${branch}`]).trim();
	const sha = output.split(/\s+/u)[0];
	return sha && /^[0-9a-f]{40}$/u.test(sha) ? sha : undefined;
}

function headSha(worktree: string): string {
	return runGit(worktree, ["rev-parse", "HEAD"]).trim();
}

/** Temporary composition adapter from existing deterministic workspace primitives into core graph effects. */
export function createRepositoryProductionEffects(options: {
	repoDir: string;
	workRoot?: string;
	identity?: CommitIdentity;
}): ProductionRepositoryEffects {
	const repoDir = resolve(options.repoDir);
	const workRoot = resolve(options.workRoot ?? join(repoDir, ".darkfactory", "worktrees"));
	const identity = options.identity ?? DEFAULT_IDENTITY;
	return {
		async observeBase() {
			const defaultBranch = await resolveDefaultBranch(repoDir);
			runGit(repoDir, ["fetch", "origin", defaultBranch]);
			return { defaultBranch, sha: runGit(repoDir, ["rev-parse", `origin/${defaultBranch}`]).trim() };
		},
		async ensureWorktree({ branch, base }) {
			await mkdir(workRoot, { recursive: true });
			const result = createWorktree({ repo: repoDir, branch, base, workRoot });
			const sha = headSha(result.worktreePath);
			return { value: { worktree: result.worktreePath }, evidence: `worktree:${branch}:${sha}` };
		},
		async commitWorktree({ worktree, message }) {
			const sha = await commitChunk({ worktree, message, identity });
			if (!sha) throw new Error("commitWorktree produced no commit evidence");
			return { value: { sha }, evidence: `commit:${sha}` };
		},
		async pushBranch({ worktree, branch, expectedSha }) {
			const existing = remoteBranchSha(repoDir, branch);
			if (existing === expectedSha) return { value: { sha: existing }, evidence: `remote-ref:${branch}:${existing}` };
			const local = headSha(worktree);
			if (local !== expectedSha) throw new Error(`Local HEAD ${local} does not match expected push SHA ${expectedSha}`);
			pushBranch({ worktree, remote: "origin", branch });
			const observed = remoteBranchSha(repoDir, branch);
			if (observed !== expectedSha) {
				throw new Error(
					`Remote branch ${branch} resolved to ${observed ?? "missing"} after push, expected ${expectedSha}`,
				);
			}
			return { value: { sha: observed }, evidence: `remote-ref:${branch}:${observed}` };
		},
		async updateBranch({ branch, base }) {
			await mkdir(workRoot, { recursive: true });
			const { worktreePath } = createWorktree({ repo: repoDir, branch, base, workRoot });
			const result = await updateBranch({ worktree: worktreePath, base, identity });
			const sha = headSha(worktreePath);
			if (result.status === "conflict") {
				return {
					value: {
						status: "conflict" as const,
						worktree: worktreePath,
						headSha: sha,
						conflictedFiles: result.conflictedFiles,
					},
					evidence: `conflict:${branch}:${sha}:${result.conflictedFiles.join(",")}`,
				};
			}
			return {
				value: { status: "clean" as const, worktree: worktreePath, headSha: sha },
				evidence: `updated:${branch}:${sha}`,
			};
		},
	};
}

function effectMarker(effectId: string): string {
	return `<!-- darkfactory-effect:${effectId} -->`;
}

/** Temporary composition adapter from the current GitHub transport into core graph effects. */
export function createGitHubProductionEffects(repository: GitHubRepository): ProductionGitHubEffects {
	return {
		async ensurePullRequest(input) {
			const marker = effectMarker(input.effectId);
			const existing = (await repository.listPullRequests({ head: input.head, base: input.base, state: "all" })).find(
				(pr) => pr.body?.includes(marker),
			);
			if (existing) return { value: { number: existing.number }, evidence: `pr:${existing.number}` };
			const pr = await repository.createPullRequest({
				head: input.head,
				base: input.base,
				title: input.title,
				body: `${input.body}\n\n${marker}`,
				draft: input.draft,
			});
			return { value: { number: pr.number }, evidence: `pr:${pr.number}` };
		},
		async mergePullRequest({ number }) {
			const path = `/repos/${repository.owner}/${repository.repo}/pulls/${number}`;
			const current = await repository.client.rest<{ merged?: boolean; merge_commit_sha?: string | null }>("GET", path);
			if (current.merged && current.merge_commit_sha) {
				return {
					value: { number, mergeSha: current.merge_commit_sha },
					evidence: `merge:${number}:${current.merge_commit_sha}`,
				};
			}
			const result = await repository.mergePullRequest(number, { method: "merge" });
			if (!result.merged || !result.sha)
				throw new Error(`GitHub did not confirm merge of PR #${number}: ${result.message}`);
			return { value: { number, mergeSha: result.sha }, evidence: `merge:${number}:${result.sha}` };
		},
		async closeIssue({ number }) {
			const issue = await repository.getIssue(number);
			if (issue.state === "closed") return { value: { number }, evidence: `issue-closed:${number}` };
			const closed = await repository.closeIssue(number);
			if (closed.state !== "closed") throw new Error(`GitHub did not confirm closure of issue #${number}`);
			return { value: { number }, evidence: `issue-closed:${number}` };
		},
		async createComment({ effectId, number, body }) {
			const marker = effectMarker(effectId);
			const existing = (await repository.listComments(number)).find((comment) => comment.body?.includes(marker));
			if (existing) return { value: { commentId: existing.id }, evidence: `comment:${existing.id}` };
			const comment = await repository.createComment(number, `${body}\n\n${marker}`);
			return { value: { commentId: comment.id }, evidence: `comment:${comment.id}` };
		},
	};
}

/**
 * Build the final core graph effect boundary from current runtime composition.
 *
 * Board sync and quota resume are injected because they own higher-level reconciliation/re-entry.
 */
export function createProductionGraphEffects(options: {
	repoDir: string;
	repository?: GitHubRepository;
	journal: ProductionGraphEffects["journal"];
	loadPlanningContext(ctx: NodeContext): Promise<Omit<PlanningContextPacket, "base">>;
	boardSync(effectId: string, runId: string): Promise<ObservedProductionEffect<{ workflowRunId: number }>>;
	quotaResume(
		effectId: string,
		runId: string,
	): Promise<ObservedProductionEffect<{ eligibleRunIds: string[]; resumedRunIds: string[] }>>;
}): ProductionGraphEffects {
	return {
		journal: options.journal,
		repository: createRepositoryProductionEffects({ repoDir: options.repoDir }),
		...(options.repository ? { github: createGitHubProductionEffects(options.repository) } : {}),
		workspace: {
			changedFiles,
			scopeCheck,
			runDetectedVerification,
		},
		loadPlanningContext: options.loadPlanningContext,
		automation: {
			boardSync: ({ effectId, runId }) => options.boardSync(effectId, runId),
			quotaResume: ({ effectId, runId }) => options.quotaResume(effectId, runId),
		},
	};
}
