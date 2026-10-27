import { createHash } from "node:crypto";
import { captureCodeResult } from "../../../core/src/result-capture.ts";
import { assertMergeAuthorization } from "./approval-evidence.ts";
import type { NodeContext, NodeHandlers, NodeResult } from "./executor.ts";
import type { AgentNode } from "./types.ts";
import type { ObservedEffect } from "./durable-effects.ts";

/** The same exact-ID observer must be used on a fresh attempt and on recovery. */
export interface ExternalMutation<T> {
	observe(effectId: string): Promise<ObservedEffect<T> | undefined>;
	execute(effectId: string): Promise<ObservedEffect<T>>;
}

export interface ProductionRepositoryEffects {
	/** Observe a trusted configured base, including its immutable SHA. */
	observeBase(): Promise<{ defaultBranch: string; sha: string }>;
	ensureWorktree(input: { branch: string; base: string; runId: string }): ExternalMutation<{ worktree: string }>;
	commit(input: { worktree: string; message: string }): ExternalMutation<{ sha: string }>;
	/** Implementations must use an expected-old-SHA lease and verify the new remote ref. */
	push(input: {
		worktree: string;
		branch: string;
		expectedOldSha: string | null;
		newSha: string;
	}): ExternalMutation<{ sha: string }>;
	/** Read an actual remote ref; null is an observed absent branch. */
	remoteHead(branch: string): Promise<string | null>;
	updateBranch?(input: {
		branch: string;
		base: string;
		runId: string;
	}): ExternalMutation<
		| { status: "clean"; worktree: string; headSha: string }
		| { status: "conflict"; worktree: string; headSha: string; conflictedFiles: string[] }
	>;
}

export interface ProductionGitHubEffects {
	/** Must observe the deterministic effect marker in the PR, not just its head name. */
	ensurePullRequest(input: {
		head: string;
		base: string;
		title: string;
		body: string;
		draft: boolean;
	}): ExternalMutation<{ number: number }>;
	/** Readback must bind both PR identity and immutable expected head. */
	currentPullRequestHead(number: number): Promise<string>;
	/** Required external checks must be green for this exact SHA at mutation time. */
	requiredChecksGreen(headSha: string): Promise<boolean>;
	/** Merge must be conditional on expectedHeadSha, observing merged status on recovery. */
	mergePullRequest(input: {
		number: number;
		expectedHeadSha: string;
	}): ExternalMutation<{ number: number; mergeSha: string }>;
	closeIssue(input: { number: number }): ExternalMutation<{ number: number }>;
	/** Persisted marker prevents repeat gate, reminder, or comment publication. */
	createComment(input: { issueNumber: number; body: string }): ExternalMutation<{ commentId: number }>;
}

export interface ProductionGraphHandlerOptions {
	model: {
		/** Routed model adapter owns its own bounded quota/timeout accounting. */
		agent(node: AgentNode, context: NodeContext, worktree?: string): Promise<NodeResult>;
	};
	repository: ProductionRepositoryEffects;
	github?: ProductionGitHubEffects;
	workspace: NonNullable<Parameters<typeof captureCodeResult>[0]["workspace"]>;
	loadPlanningContext(context: NodeContext): Promise<Record<string, unknown>>;
	/** Automation adapters must perform observed/readback reconciliation themselves. */
	automation?: Partial<Record<"board-sync" | "quota-resume", (runId: string) => ExternalMutation<Record<string, unknown>>>>;
}

function requireJournal(ctx: NodeContext): NonNullable<NodeContext["effect"]> {
	if (!ctx.effect) throw new Error("Production graph mutations require an injected durable effect journal");
	return ctx.effect;
}

function asStrings(value: unknown): string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function asNumbers(value: unknown): number[] {
	return Array.isArray(value)
		? value.filter((item): item is number => typeof item === "number" && Number.isSafeInteger(item) && item > 0)
		: [];
}

function allowedScope(outputs: Record<string, unknown>): string[] {
	const plan = outputs.plan_artifact;
	if (!plan || typeof plan !== "object") return [];
	return asStrings((plan as { scope?: unknown }).scope);
}

function observed<T>(ctx: NodeContext, kind: string, mutation: ExternalMutation<T>, suffix = ""): Promise<ObservedEffect<T>> {
	return requireJournal(ctx)(kind, mutation, suffix);
}

/**
 * Compose executable graph node handlers, not a second pipeline. Every
 * mutation flows through NodeContext.effect and the canonical graph executor.
 *
 * GitHub and repository transport remain injected concerns of their owners.
 */
export function createProductionGraphHandlers(options: ProductionGraphHandlerOptions): NodeHandlers {
	const { model, repository, github, workspace } = options;
	return {
		async agent(node, ctx): Promise<NodeResult> {
			const writing = node.mode === "write" || node.id === "implement" || node.id === "review-fix";
			if (!writing) return model.agent(node, ctx);

			// A code-writing stage must never execute without a durable journal.
			requireJournal(ctx);
			const base = await repository.observeBase();
			const branch = typeof ctx.outputs.branch === "string"
				? ctx.outputs.branch
				: `feat/${node.id}-${createHash("sha256").update(ctx.runId).digest("hex").slice(0, 12)}`;
			const worktree = await observed(ctx, "workspace.ensure", repository.ensureWorktree({
				branch, base: base.defaultBranch, runId: ctx.runId,
			}));
			const modelResult = await model.agent(node, ctx, worktree.value.worktree);
			if (modelResult.outcome !== "success") return modelResult;

			const code = await captureCodeResult({
				worktree: worktree.value.worktree,
				allowedPatterns: allowedScope(ctx.outputs),
				requiredTests: asStrings(ctx.outputs.required_tests),
				workspace,
			});
			if (code.outcome !== "success") return {
				outcome: "failure",
				outputs: { error: code.error, branch, changed_files: code.changedFiles, verification: code.verification },
			};
			// Unsupported/unexecuted checks cannot be counted as verification.
			if (code.verification.length === 0 ||
				code.verification.some((check) => !check.action.supported || !check.action.command ||
					!check.result || check.result.exitCode !== 0 || check.result.timedOut)) {
				return { outcome: "failure", outputs: { error: "Deterministic verification was not fully executed", branch, verification: code.verification } };
			}
			if (code.changedFiles.length === 0 && !ctx.outputs.commit_sha) {
				return { outcome: "failure", outputs: { error: "No observed implementation mutation or prior commit", branch } };
			}

			let commitSha = typeof ctx.outputs.commit_sha === "string" ? ctx.outputs.commit_sha : undefined;
			let prNumber = typeof ctx.outputs.pr_number === "number" ? ctx.outputs.pr_number : undefined;
			if (code.changedFiles.length > 0) {
				const commit = await observed(ctx, "git.commit", repository.commit({
					worktree: worktree.value.worktree,
					message: `${node.id}: apply iteration ${ctx.iteration}`,
				}));
				commitSha = commit.value.sha;
				if (!/^[0-9a-f]{40}$/iu.test(commitSha))
					throw new Error("Commit operation returned no verified immutable commit SHA");
				const expectedOldSha = await repository.remoteHead(branch);
				const push = await observed(ctx, "git.push", repository.push({
					worktree: worktree.value.worktree, branch, expectedOldSha, newSha: commitSha,
				}));
				if (push.value.sha !== commitSha)
					throw new Error("Observed remote branch does not point to committed HEAD");
				if (!github) throw new Error("Implementation requires GitHub PR effects");
				if (!prNumber) {
					const pr = await observed(ctx, "github.pr.ensure", github.ensurePullRequest({
						head: branch, base: base.defaultBranch,
						title: `feat: delivery ${node.id}`,
						body: `Observed files: ${code.changedFiles.join(", ")}`,
						draft: true,
					}));
					prNumber = pr.value.number;
				}
			}
			if (!prNumber || !commitSha) throw new Error("No observed commit and PR identity for implementation");
			const implementation = {
				branch, commitSha, prNumber, changedFiles: code.changedFiles,
				verification: code.verification, baseSha: base.sha,
			};
			return {
				outcome: "success",
				outputs: {
					branch, pr_number: prNumber, commit_sha: commitSha,
					changed_files: code.changedFiles, verification: code.verification,
					implementation_context: implementation, implementation_artifact: implementation,
				},
			};
		},

		async automation(node, ctx): Promise<NodeResult> {
			switch (node.script) {
				case "request-intake": {
					const [context, base] = await Promise.all([
						options.loadPlanningContext(ctx), repository.observeBase(),
					]);
					return { outcome: "success", outputs: {
						request_issue: context.request,
						planning_context: { ...context, base },
					} };
				}
				case "pr-merge": {
					const approval = assertMergeAuthorization(ctx.outputs);
					if (!github) throw new Error("Merge requires GitHub effects");
					// Re-read the mutable external head and checks AFTER final human authorization.
					if ((await github.currentPullRequestHead(approval.prNumber)) !== approval.headSha)
						throw new Error("PR head changed since final merge authorization");
					if (!(await github.requiredChecksGreen(approval.headSha)))
						throw new Error("Required external checks are no longer green for approved SHA");
					const merge = await observed(ctx, "github.pr.merge", github.mergePullRequest({
						number: approval.prNumber, expectedHeadSha: approval.headSha,
					}));
					if (!/^[a-f0-9]{40}$/iu.test(merge.value.mergeSha) || merge.value.number !== approval.prNumber)
						throw new Error("Merge lacks observed PR number and commit evidence");
					for (const number of asNumbers(ctx.outputs.closing_issues)) {
						await observed(ctx, "github.issue.close", github.closeIssue({ number }), String(number));
					}
					return { outcome: "success", outputs: {
						merged: true, merged_pr: approval.prNumber, merge_sha: merge.value.mergeSha,
					} };
				}
				case "branch-update": {
					const branch = ctx.outputs.branch;
					if (typeof branch !== "string") throw new Error("Branch update requires observed branch");
					if (!repository.updateBranch) throw new Error("No deterministic branch update adapter");
					const base = await repository.observeBase();
					const update = await observed(ctx, "git.branch.update", repository.updateBranch({
						branch, base: base.defaultBranch, runId: ctx.runId,
					}));
					if (update.value.status === "conflict") {
						return { outcome: "failure", outputs: {
							conflict: true, conflicted_files: update.value.conflictedFiles, branch,
						} };
					}
					const pushed = await observed(ctx, "git.push", repository.push({
						branch, worktree: update.value.worktree, newSha: update.value.headSha,
						expectedOldSha: await repository.remoteHead(branch),
					}));
					if (pushed.value.sha !== update.value.headSha) throw new Error("Updated HEAD differs from remote");
					return { outcome: "success", outputs: { branch, commit_sha: pushed.value.sha } };
				}
				case "board-sync":
				case "quota-resume": {
					const operation = options.automation?.[node.script];
					if (!operation) throw new Error(`Missing production adapter for ${node.script}`);
					const result = await observed(ctx, node.script, operation(ctx.runId));
					return { outcome: "success", outputs: result.value };
				}
				default:
					throw new Error(`Unsupported production automation script: ${node.script}`);
			}
		},
	};
}
