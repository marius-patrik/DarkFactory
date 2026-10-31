import { describe, expect, test } from "bun:test";
import { mergeProposalFingerprint } from "../../../../packages/harness/src/graph/approval-evidence.ts";
import type { NodeContext } from "../../../../packages/harness/src/graph/executor.ts";
import {
	createProductionGraphHandlers,
	type ProductionGitHubEffects,
	type ProductionGraphHandlerOptions,
	type ProductionRepositoryEffects,
} from "../../../../packages/harness/src/graph/production-handlers.ts";

const sha = "a".repeat(40);
const mergeSha = "b".repeat(40);

function fixture(enableReconciliation: boolean) {
	let mergeWrites = 0;
	let boardWrites = 0;
	let closeWrites = 0;
	let merged = false;
	let closed = false;
	let synced = false;
	const repository: ProductionRepositoryEffects = {
		observeBase: async () => ({ defaultBranch: "main", sha }),
		ensureWorktree: () => {
			throw new Error("unexpected workspace");
		},
		observeWorkspace: async () => "unchanged",
		commit: () => {
			throw new Error("unexpected git commit");
		},
		push: () => {
			throw new Error("unexpected git push");
		},
		remoteHead: async () => null,
	};
	const github: ProductionGitHubEffects = {
		ensurePullRequest: () => {
			throw new Error("unexpected PR creation");
		},
		currentPullRequestHead: async () => sha,
		requiredChecksGreen: async () => true,
		mergePullRequest: () => ({
			observe: async () =>
				merged ? { value: { number: 901, mergeSha }, evidence: `github-merge:901:${mergeSha}` } : undefined,
			execute: async () => {
				mergeWrites++;
				merged = true;
				return { value: { number: 901, mergeSha }, evidence: `github-merge:901:${mergeSha}` };
			},
		}),
		closeIssue: () => ({
			observe: async () => (closed ? { value: { number: 2698 }, evidence: "issue:2698:closed" } : undefined),
			execute: async () => {
				closeWrites++;
				closed = true;
				return { value: { number: 2698 }, evidence: "issue:2698:closed" };
			},
		}),
		createComment: () => {
			throw new Error("unexpected comment");
		},
	};
	const options: ProductionGraphHandlerOptions = {
		model: { agent: async () => ({ outcome: "failure", outputs: {} }) },
		repository,
		github,
		workspace: {} as ProductionGraphHandlerOptions["workspace"],
		loadPlanningContext: async () => ({}),
		...(enableReconciliation
			? {
					automation: {
						"board-sync": () => ({
							observe: async () => (synced ? { value: { board: "Done" }, evidence: "board:2698:Done" } : undefined),
							execute: async () => {
								boardWrites++;
								synced = true;
								return { value: { board: "Done" }, evidence: "board:2698:Done" };
							},
						}),
					},
				}
			: {}),
	};
	const outputs: Record<string, unknown> = {
		planning_context: { request: 2698 },
		plan_artifact: { scope: ["src/**"] },
		implementation_artifact: { sha },
		aligned: true,
		pr_number: 901,
		commit_sha: sha,
		external_checks_head_sha: sha,
		closing_issues: [2698],
	};
	outputs.merge_authorization = {
		fingerprint: mergeProposalFingerprint(outputs),
		prNumber: 901,
		headSha: sha,
		actor: "owner",
		approvedAt: "2026-10-31T10:00:00.000Z",
	};
	const ctx: NodeContext = {
		runDir: "/test",
		runId: "request-2698",
		iteration: 1,
		outputs,
		effect: async (_kind, operations) => {
			const id = "c".repeat(64);
			return (await operations.observe(id)) ?? operations.execute(id);
		},
	};
	return {
		handlers: createProductionGraphHandlers(options),
		ctx,
		counts: () => ({ mergeWrites, closeWrites, boardWrites }),
	};
}

describe("merge completion includes observed Request reconciliation", () => {
	test("missing board adapter refuses to merge rather than reporting success prematurely", async () => {
		const f = fixture(false);
		await expect(f.handlers.automation({ id: "merge", kind: "automation", script: "pr-merge" }, f.ctx)).rejects.toThrow(
			"Merge requires a durable board reconciliation adapter",
		);
		expect(f.counts()).toEqual({ mergeWrites: 0, closeWrites: 0, boardWrites: 0 });
	});

	test("conditional merge, bound issue closure and board synchronization are all observed", async () => {
		const f = fixture(true);
		const result = await f.handlers.automation({ id: "merge", kind: "automation", script: "pr-merge" }, f.ctx);
		expect(result).toMatchObject({
			outcome: "success",
			outputs: {
				merged: true,
				merged_pr: 901,
				merge_sha: mergeSha,
				reconciled: true,
				reconciliation: { board: "Done" },
			},
		});
		expect(f.counts()).toEqual({ mergeWrites: 1, closeWrites: 1, boardWrites: 1 });
	});
});
