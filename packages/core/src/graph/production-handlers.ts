import { createHash } from "node:crypto";
import type { PlanningArtifact, PlanningContextPacket } from "@darkfactory/protocol/planning";
import { alignmentResultSchema, reviewResultSchema } from "@darkfactory/protocol/result-capture";
import type { AgentNode, AutomationNode, PlanAction, RunState } from "@darkfactory/protocol/workflow";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import { z } from "zod";
import {
	captureCodeResult,
	type CodeWorkspaceOperations,
} from "../result-capture.ts";
import type { NodeContext, NodeHandlers, NodeResult } from "./executor.ts";
import { contextFingerprint } from "./review-loop.ts";

const planningDraftSchema = z.object({
	behavioralContract: z.array(z.string()).min(1),
	scope: z.array(z.string()).min(1),
	exclusions: z.array(z.string()),
	dependencies: z.array(z.string()),
	sequencing: z.array(z.string()).min(1),
	verification: z.array(z.string()).min(1),
	implementation: z.object({
		knownOwners: z.array(z.string()),
		discoveryRequired: z.array(z.string()),
	}),
	hold: z
		.object({
			kind: z.enum(["dependency", "recovery"]),
			refs: z.array(z.string()).min(1),
			reason: z.string().min(1),
		})
		.optional(),
});

/** Persisted evidence for one deterministic external effect. */
export interface ProductionEffectRecord<T = unknown> {
	id: string;
	kind: string;
	evidence: string;
	value: T;
	observedAt: string;
}

/**
 * Durable effect journal.
 *
 * Implementations must persist records outside process memory. An effect implementation must also reconcile
 * the external system by effect id before mutating, so a crash after the external mutation but before journal
 * persistence cannot duplicate the effect on retry.
 */
export interface ProductionEffectJournal {
	read<T>(id: string): Promise<ProductionEffectRecord<T> | undefined>;
	write<T>(record: ProductionEffectRecord<T>): Promise<void>;
}

/** Result returned by an effect adapter after applying or observing the requested mutation. */
export interface ObservedProductionEffect<T> {
	value: T;
	/** Stable external evidence such as a SHA, PR id, comment id, check id, or persisted run id. */
	evidence: string;
}

/** Repository and workspace mutations used by production graph handlers. */
export interface ProductionRepositoryEffects {
	observeBase(): Promise<{ defaultBranch: string; sha: string }>;
	ensureWorktree(input: {
		effectId: string;
		branch: string;
		base: string;
		runId: string;
	}): Promise<ObservedProductionEffect<{ worktree: string }>>;
	commitWorktree(input: {
		effectId: string;
		worktree: string;
		message: string;
	}): Promise<ObservedProductionEffect<{ sha: string }>>;
	pushBranch(input: {
		effectId: string;
		worktree: string;
		branch: string;
		expectedSha: string;
	}): Promise<ObservedProductionEffect<{ sha: string }>>;
	updateBranch(input: {
		effectId: string;
		branch: string;
		base: string;
		runId: string;
	}): Promise<
		ObservedProductionEffect<
			| { status: "clean"; worktree: string; headSha: string }
			| { status: "conflict"; worktree: string; headSha: string; conflictedFiles: string[] }
		>
	>;
}

/** GitHub mutations used by production graph handlers. */
export interface ProductionGitHubEffects {
	ensurePullRequest(input: {
		effectId: string;
		head: string;
		base: string;
		title: string;
		body: string;
		draft: boolean;
	}): Promise<ObservedProductionEffect<{ number: number }>>;
	mergePullRequest(input: {
		effectId: string;
		number: number;
	}): Promise<ObservedProductionEffect<{ number: number; mergeSha: string }>>;
	closeIssue(input: { effectId: string; number: number }): Promise<ObservedProductionEffect<{ number: number }>>;
	createComment(input: {
		effectId: string;
		number: number;
		body: string;
	}): Promise<ObservedProductionEffect<{ commentId: string | number }>>;
}

/** Non-GitHub deterministic automation effects in the shipped graph. */
export interface ProductionAutomationEffects {
	boardSync(input: {
		effectId: string;
		runId: string;
	}): Promise<ObservedProductionEffect<{ workflowRunId: number }>>;
	quotaResume(input: {
		effectId: string;
		runId: string;
	}): Promise<ObservedProductionEffect<{ eligibleRunIds: string[]; resumedRunIds: string[] }>>;
}

/** Final effect boundary consumed by the core production graph handlers. */
export interface ProductionGraphEffects {
	journal: ProductionEffectJournal;
	repository: ProductionRepositoryEffects;
	github?: ProductionGitHubEffects;
	automation: ProductionAutomationEffects;
	/** Read-only workspace observations/verification used by #329 code-node truth capture. */
	workspace: CodeWorkspaceOperations;
	/** Loads the authoritative non-base Planning context; repository base is observed separately. */
	loadPlanningContext(ctx: NodeContext): Promise<Omit<PlanningContextPacket, "base">>;
}

/** Model-backed operations injected by the CLI/runtime composition layer. */
export interface ProductionModelEffects {
	runPrompt(
		prompt: string,
		options: {
			workdir?: string;
			reasoning?: "standard" | "hard";
			chain?: string[];
			timeout?: string;
			feedback?: string;
			nodeId: string;
		},
	): Promise<AssistantMessage>;
	extractJudgement<T>(input: {
		answer: string;
		schema: z.ZodType<T>;
		nodeId: string;
		ctx: NodeContext;
	}): Promise<T>;
}

/** Routed model failure that records the exact candidate blocked by quota/capacity state. */
export class ProductionQuotaExhaustedError extends Error {
	constructor(
		message: string,
		readonly candidate: { provider: string; account: string; model: string },
	) {
		super(message);
		this.name = "ProductionQuotaExhaustedError";
	}
}

/** Configuration for final core-owned production graph handlers. */
export interface ProductionHandlerOptions {
	effects: ProductionGraphEffects;
	model: ProductionModelEffects;
}

/** Stable deterministic effect id for one run/node/iteration/effect tuple. */
export function productionEffectId(
	ctx: Pick<NodeContext, "runId" | "eventId" | "iteration">,
	nodeId: string,
	kind: string,
	suffix = "",
): string {
	return createHash("sha256")
		.update(JSON.stringify([ctx.runId, ctx.eventId ?? "internal", nodeId, ctx.iteration, kind, suffix]))
		.digest("hex");
}

/**
 * Runs one external effect exactly once from the graph's point of view.
 *
 * A durable journal hit is returned directly. On a miss the adapter is invoked with the same deterministic effect id;
 * the adapter must first reconcile the external system by that id before creating anything new.
 */
export async function runObservedProductionEffect<T>(
	journal: ProductionEffectJournal,
	id: string,
	kind: string,
	invoke: () => Promise<ObservedProductionEffect<T>>,
): Promise<ProductionEffectRecord<T>> {
	const previous = await journal.read<T>(id);
	if (previous) {
		if (previous.kind !== kind) throw new Error(`Effect ${id} was recorded as ${previous.kind}, not ${kind}`);
		if (!previous.evidence.trim()) throw new Error(`Effect ${id} has no durable evidence`);
		return previous;
	}
	const observed = await invoke();
	if (!observed.evidence.trim()) throw new Error(`Effect ${id} (${kind}) returned no durable evidence`);
	const record: ProductionEffectRecord<T> = {
		id,
		kind,
		evidence: observed.evidence,
		value: observed.value,
		observedAt: new Date().toISOString(),
	};
	await journal.write(record);
	return record;
}

function answerText(message: AssistantMessage): string {
	return message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n");
}

function stringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function numberArray(value: unknown): number[] {
	return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number" && Number.isInteger(item)) : [];
}

function planningScope(outputs: Record<string, unknown>): string[] | undefined {
	const artifact = outputs.plan_artifact;
	if (!artifact || typeof artifact !== "object") return undefined;
	const scope = (artifact as Partial<PlanningArtifact>).scope;
	return Array.isArray(scope) && scope.every((item) => typeof item === "string") ? [...scope] : undefined;
}

/** Creates final core-owned agent/automation handlers for the shipped workflow graph. */
export function createProductionHandlers(options: ProductionHandlerOptions): NodeHandlers {
	const { effects, model } = options;
	const effect = <T>(
		ctx: NodeContext,
		nodeId: string,
		kind: string,
		invoke: (effectId: string) => Promise<ObservedProductionEffect<T>>,
		suffix = "",
	) => {
		const id = productionEffectId(ctx, nodeId, kind, suffix);
		return runObservedProductionEffect(effects.journal, id, kind, () => invoke(id));
	};

	return {
		async agent(node: AgentNode, ctx: NodeContext): Promise<NodeResult> {
			try {
				const isCodeNode = node.mode === "write" || node.id === "implement" || node.id === "review-fix";
				if (isCodeNode) {
					const base = await effects.repository.observeBase();
					const branch =
						typeof ctx.outputs.branch === "string"
							? ctx.outputs.branch
							: `feat/${node.id}-${createHash("sha256").update(ctx.runId).digest("hex").slice(0, 12)}`;
					const worktree = await effect(ctx, node.id, "worktree.ensure", (effectId) =>
						effects.repository.ensureWorktree({ effectId, branch, base: base.defaultBranch, runId: ctx.runId }),
					);
					let prompt = node.prompt ?? `Execute code changes for ${node.id}`;
					if (ctx.feedback) prompt += `\n\nFeedback from previous review/gate:\n${ctx.feedback}`;
					await model.runPrompt(prompt, {
						workdir: worktree.value.worktree,
						reasoning: node.reasoning,
						chain: node.chain,
						timeout: node.timeout,
						feedback: ctx.feedback,
						nodeId: node.id,
					});

					const codeResult = await captureCodeResult({
						worktree: worktree.value.worktree,
						allowedPatterns: planningScope(ctx.outputs),
						requiredTests: stringArray(ctx.outputs.required_tests),
						workspace: effects.workspace,
					});
					if (codeResult.outcome === "failure") {
						return {
							outcome: "failure",
							outputs: {
								error: codeResult.error,
								changed_files: codeResult.changedFiles,
								verification: codeResult.verification,
								branch,
							},
						};
					}

					let commitSha: string | undefined;
					let pushedSha: string | undefined;
					let prNumber = typeof ctx.outputs.pr_number === "number" ? ctx.outputs.pr_number : undefined;
					if (codeResult.changedFiles.length > 0) {
						const committed = await effect(ctx, node.id, "git.commit", (effectId) =>
							effects.repository.commitWorktree({
								effectId,
								worktree: worktree.value.worktree,
								message: `${node.id}: apply iteration ${ctx.iteration}`,
							}),
						);
						commitSha = committed.value.sha;
						const pushed = await effect(ctx, node.id, "git.push", (effectId) =>
							effects.repository.pushBranch({
								effectId,
								worktree: worktree.value.worktree,
								branch,
								expectedSha: commitSha!,
							}),
						);
						if (pushed.value.sha !== commitSha) {
							throw new Error(`Push evidence SHA ${pushed.value.sha} does not match committed SHA ${commitSha}`);
						}
						pushedSha = pushed.value.sha;

						if (effects.github && !prNumber) {
							const pr = await effect(ctx, node.id, "github.pr.ensure", (effectId) =>
								effects.github!.ensurePullRequest({
									effectId,
									head: branch,
									base: base.defaultBranch,
									title: `feat: implementation for ${node.id}`,
									body: `Automated delivery for node ${node.id}.\n\nObserved changes: ${codeResult.changedFiles.join(", ")}`,
									draft: true,
								}),
							);
							prNumber = pr.value.number;
						}
					}

					const implementation = {
						branch,
						commitSha: pushedSha ?? commitSha ?? null,
						prNumber: prNumber ?? null,
						changedFiles: codeResult.changedFiles,
						verification: codeResult.verification,
					};
					return {
						outcome: "success",
						outputs: {
							branch,
							...(prNumber ? { pr_number: prNumber } : {}),
							changed_files: codeResult.changedFiles,
							verification: codeResult.verification,
							commit_sha: pushedSha ?? commitSha ?? null,
							implementation_context: implementation,
							implementation_artifact: implementation,
						},
					};
				}

				let prompt = node.prompt ?? `Analyze and report findings for ${node.id}`;
				if (ctx.feedback) prompt += `\n\nReview feedback to consider:\n${ctx.feedback}`;
				const message = await model.runPrompt(prompt, {
					reasoning: node.reasoning,
					chain: node.chain,
					timeout: node.timeout,
					feedback: ctx.feedback,
					nodeId: node.id,
				});
				const answer = answerText(message);

				if (node.id === "planning" || node.id === "planning-fix") {
					const planningContext = ctx.outputs.planning_context as PlanningContextPacket | undefined;
					if (!planningContext) throw new Error("Planning node requires authoritative planning_context");
					const extracted = await model.extractJudgement({
						answer,
						schema: planningDraftSchema,
						nodeId: node.id,
						ctx,
					});
					const artifact: PlanningArtifact = {
						contextFingerprint: contextFingerprint(planningContext),
						verbatimRequest: planningContext.request.body,
						acceptanceCriteria: planningContext.request.acceptanceCriteria,
						...extracted,
					};
					return { outcome: "success", outputs: { plan_artifact: artifact } };
				}

				if (node.id === "planning-review" || node.id === "self-review") {
					const extracted = await model.extractJudgement({
						answer,
						schema: reviewResultSchema,
						nodeId: node.id,
						ctx,
					});
					return {
						outcome: "success",
						outputs:
							node.id === "planning-review"
								? { planning_findings: extracted.findings, planning_review_clean: extracted.clean }
								: {
									review_findings: extracted.findings,
									review_clean: extracted.clean,
									deviation_detected: extracted.deviation_detected ?? false,
								},
					};
				}

				if (node.id === "plan-alignment") {
					const extracted = await model.extractJudgement({
						answer,
						schema: alignmentResultSchema,
						nodeId: node.id,
						ctx,
					});
					return {
						outcome: "success",
						outputs: {
							aligned: extracted.aligned,
							rationale: extracted.rationale,
							deviations: extracted.deviations ?? [],
						},
					};
				}

				return { outcome: "success", outputs: { [node.outputs?.[0] ?? "result"]: answer } };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (error instanceof ProductionQuotaExhaustedError) {
					return { outcome: "quota_exhausted", outputs: { error: message, quota_candidate: error.candidate } };
				}
				if (/quota|rate_limited|429/iu.test(message)) return { outcome: "quota_exhausted", outputs: { error: message } };
				return { outcome: "failure", outputs: { error: message } };
			}
		},

		async automation(node: AutomationNode, ctx: NodeContext): Promise<NodeResult> {
			try {
				switch (node.script) {
					case "request-intake": {
						const [authoritative, base] = await Promise.all([
							effects.loadPlanningContext(ctx),
							effects.repository.observeBase(),
						]);
						const planningContext: PlanningContextPacket = { ...authoritative, base };
						return {
							outcome: "success",
							outputs: {
								request_issue: authoritative.request,
								planning_context: planningContext,
							},
						};
					}

					case "pr-merge": {
						if (!effects.github) throw new Error("pr-merge requires GitHub effects");
						const prNumber = typeof ctx.outputs.pr_number === "number" ? ctx.outputs.pr_number : undefined;
						if (!prNumber) throw new Error("pr-merge requires observed pr_number");
						const merged = await effect(ctx, node.id, "github.pr.merge", (effectId) =>
							effects.github!.mergePullRequest({ effectId, number: prNumber }),
						);
						for (const issue of numberArray(ctx.outputs.closing_issues)) {
							await effect(
								ctx,
								node.id,
								"github.issue.close",
								(effectId) => effects.github!.closeIssue({ effectId, number: issue }),
								String(issue),
							);
						}
						return {
							outcome: "success",
							outputs: { merged: true, merged_pr: prNumber, merge_sha: merged.value.mergeSha },
						};
					}

					case "branch-update": {
						const branch = typeof ctx.outputs.branch === "string" ? ctx.outputs.branch : undefined;
						if (!branch) throw new Error("branch-update requires an observed delivery branch");
						const base = await effects.repository.observeBase();
						const updated = await effect(ctx, node.id, "git.branch.update", (effectId) =>
							effects.repository.updateBranch({ effectId, branch, base: base.defaultBranch, runId: ctx.runId }),
						);
						if (updated.value.status === "conflict") {
							return {
								outcome: "failure",
								outputs: {
									conflict: true,
									conflicted_files: updated.value.conflictedFiles,
									branch,
								},
							};
						}
						const pushed = await effect(ctx, node.id, "git.push", (effectId) =>
							effects.repository.pushBranch({
								effectId,
								worktree: updated.value.worktree,
								branch,
								expectedSha: updated.value.headSha,
							}),
						);
						if (pushed.value.sha !== updated.value.headSha) throw new Error("branch-update push evidence does not match updated HEAD");
						return { outcome: "success", outputs: { updated: true, branch, commit_sha: pushed.value.sha } };
					}

					case "quota-resume": {
						const resumed = await effect(ctx, node.id, "quota.resume", (effectId) =>
							effects.automation.quotaResume({ effectId, runId: ctx.runId }),
						);
						return {
							outcome: "success",
							outputs: {
								quota_eligible_runs: resumed.value.eligibleRunIds,
								quota_resumed_runs: resumed.value.resumedRunIds,
							},
						};
					}

					case "board-sync": {
						const synced = await effect(ctx, node.id, "board.sync", (effectId) =>
							effects.automation.boardSync({ effectId, runId: ctx.runId }),
						);
						return { outcome: "success", outputs: { board_sync_run_id: synced.value.workflowRunId } };
					}

					default:
						throw new Error(`Unsupported production automation script: ${node.script}`);
				}
			} catch (error) {
				return { outcome: "failure", outputs: { error: error instanceof Error ? error.message : String(error) } };
			}
		},
	};
}

/** Final core-owned side-effect handler for graph gate/comment/hint actions. */
export function createProductionActionHandler(options: {
	journal: ProductionEffectJournal;
	github?: ProductionGitHubEffects;
	targetNumber?: number;
	onGate?(nodeId: string, state: RunState): void | Promise<void>;
	onComment?(message: string, state: RunState): void | Promise<void>;
}): (action: Exclude<PlanAction, { type: "run" } | { type: "none" }>, state: RunState) => Promise<void> {
	return async (action, state) => {
		const eventId = state.active_event_id ?? "internal";
		const effectId = (kind: string, suffix = "") =>
			createHash("sha256").update(JSON.stringify([state.run_id, eventId, action.node, kind, suffix])).digest("hex");

		if (action.type === "gate") {
			await options.onGate?.(action.node, state);
			if (options.github && options.targetNumber) {
				const id = effectId("github.comment", "gate");
				await runObservedProductionEffect(options.journal, id, "github.comment", () =>
					options.github!.createComment({
						effectId: id,
						number: options.targetNumber!,
						body: `<!-- darkfactory-gate node=${action.node} effect=${id} -->\nWaiting for gate approval on node \`${action.node}\`. Reply \`/df approve\` to proceed.`,
					}),
				);
			}
			return;
		}

		if (action.type === "comment" || action.type === "hint") {
			const message = action.type === "comment" ? action.message : `Hint: ${action.message}`;
			await options.onComment?.(message, state);
			if (options.github && options.targetNumber) {
				const id = effectId("github.comment", action.type);
				await runObservedProductionEffect(options.journal, id, "github.comment", () =>
					options.github!.createComment({ effectId: id, number: options.targetNumber!, body: message }),
				);
			}
		}
	};
}
