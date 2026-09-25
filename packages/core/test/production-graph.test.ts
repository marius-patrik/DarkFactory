import { describe, expect, test } from "bun:test";
import { CAPABILITY_ABI_VERSION, createCapabilityGraphRegistry, defineCapability } from "@darkfactory/capability";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PlanningContextPacket } from "@darkfactory/protocol/planning";
import type { AgentNode, AutomationNode, GraphEvent, RunState, WorkflowGraph } from "@darkfactory/protocol/workflow";
import {
	createProductionActionHandler,
	createProductionHandlers,
	ProductionQuotaExhaustedError,
	runObservedProductionEffect,
	type ProductionEffectJournal,
	type ProductionEffectRecord,
	type ProductionGraphEffects,
} from "../src/graph/production-handlers.ts";
import { runGraph, type NodeContext, type NodeHandlers } from "../src/graph/executor.ts";

class MemoryJournal implements ProductionEffectJournal {
	readonly records = new Map<string, ProductionEffectRecord<unknown>>();
	async read<T>(id: string): Promise<ProductionEffectRecord<T> | undefined> {
		return this.records.get(id) as ProductionEffectRecord<T> | undefined;
	}
	async write<T>(record: ProductionEffectRecord<T>): Promise<void> {
		this.records.set(record.id, record as ProductionEffectRecord<unknown>);
	}
}

describe("production graph effects", () => {
	test("reuses durable effect evidence instead of invoking a mutation twice", async () => {
		const journal = new MemoryJournal();
		let calls = 0;
		const first = await runObservedProductionEffect(journal, "effect-1", "github.comment", async () => {
			calls++;
			return { value: { commentId: 42 }, evidence: "comment:42" };
		});
		const second = await runObservedProductionEffect(journal, "effect-1", "github.comment", async () => {
			calls++;
			return { value: { commentId: 99 }, evidence: "comment:99" };
		});
		expect(calls).toBe(1);
		expect(first.value).toEqual({ commentId: 42 });
		expect(second.value).toEqual({ commentId: 42 });
		expect(second.evidence).toBe("comment:42");
	});

	test("resumes a pending external action without rerunning the completed node", async () => {
		const runDir = await mkdtemp(join(tmpdir(), "df-graph-resume-"));
		try {
			const graph: WorkflowGraph = {
				version: 1,
				checks: [],
				nodes: [
					{ id: "intake", kind: "automation", script: "request-intake", trigger: { event: "issues.opened" } },
					{
						id: "approval",
						kind: "gate",
						author_associations: ["OWNER"],
						command: "/df approve",
					},
				],
				edges: [{ from: "intake", to: "approval", on: { node_outcome: "success" } }],
			};
			let nodeRuns = 0;
			let actionRuns = 0;
			const handlers: NodeHandlers = {
				agent: async () => ({ outcome: "failure", outputs: { error: "unexpected agent" } }),
				automation: async () => {
					nodeRuns++;
					return { outcome: "success", outputs: { request_issue: { number: 1 } } };
				},
			};
			const event = {
				type: "issues.opened" as const,
				event_id: "delivery:1",
				actor: { login: "owner", association: "OWNER" as const, is_bot: false },
			};
			await expect(
				runGraph(graph, runDir, handlers, event, {
					onAction: async () => {
						actionRuns++;
						throw new Error("simulated comment transport failure");
					},
				}),
			).rejects.toThrow("simulated comment transport failure");
			expect(nodeRuns).toBe(1);
			expect(actionRuns).toBe(1);

			const resumed = await runGraph(graph, runDir, handlers, event, {
				onAction: async () => {
					actionRuns++;
				},
			});
			expect(nodeRuns).toBe(1);
			expect(actionRuns).toBe(2);
			expect(resumed.processed_events).toContain("delivery:1");
			expect(resumed.pending_action).toBeUndefined();

			await runGraph(graph, runDir, handlers, event, {
				onAction: async () => {
					actionRuns++;
				},
			});
			expect(nodeRuns).toBe(1);
			expect(actionRuns).toBe(2);
		} finally {
			await rm(runDir, { recursive: true, force: true });
		}
	});

	test("branch-update succeeds only when pushed evidence matches the updated HEAD", async () => {
		const journal = new MemoryJournal();
		const context: NodeContext = {
			runDir: "/tmp/run",
			runId: "run-1",
			eventId: "event-1",
			iteration: 1,
			outputs: { branch: "feat/example" },
		};
		const node: AutomationNode = { id: "branch-update", kind: "automation", script: "branch-update" };
		const baseContext: Omit<PlanningContextPacket, "base"> = {
			request: { issue: 1, body: "Request", version: "1", acceptanceCriteria: [] },
			relationships: {},
			dependencies: [],
			approvedDecisions: [],
			shippedInterfaces: [],
			recovery: [],
		};
		const effects: ProductionGraphEffects = {
			journal,
			workspace: {
				changedFiles: async () => [],
				runDetectedVerification: async () => [],
			},
			loadPlanningContext: async () => baseContext,
			repository: {
				observeBase: async () => ({ defaultBranch: "darkfactory", sha: "a".repeat(40) }),
				ensureWorktree: async () => ({ value: { worktree: "/tmp/worktree" }, evidence: "worktree:/tmp/worktree" }),
				commitWorktree: async () => ({ value: { sha: "b".repeat(40) }, evidence: "commit:b" }),
				updateBranch: async () => ({
					value: { status: "clean", worktree: "/tmp/worktree", headSha: "b".repeat(40) },
					evidence: "update:b",
				}),
				pushBranch: async () => ({ value: { sha: "c".repeat(40) }, evidence: "push:c" }),
			},
			automation: {
				boardSync: async () => ({ value: { updated: 0 }, evidence: "board:0" }),
				quotaResume: async () => ({ value: { eligibleRunIds: [], resumedRunIds: [] }, evidence: "quota:none" }),
			},
		};
		const handlers = createProductionHandlers({
			effects,
			model: {
				runPrompt: async () => {
					throw new Error("not used");
				},
				extractJudgement: async () => {
					throw new Error("not used");
				},
			},
		});
		const result = await handlers.automation(node, context);
		expect(result.outcome).toBe("failure");
		expect(String(result.outputs.error)).toContain("does not match updated HEAD");
	});

	test("worktree, commit, push, and PR are not repeated when evidence already exists in journal", async () => {
		const journal = new MemoryJournal();
		let ensureWorktreeCalls = 0;
		let commitWorktreeCalls = 0;
		let pushBranchCalls = 0;
		let ensurePullRequestCalls = 0;

		const effects: ProductionGraphEffects = {
			journal,
			workspace: {
				changedFiles: async () => ["src/foo.ts"],
				scopeCheck: async () => ({ ok: true }),
				runDetectedVerification: async () => [
					{ action: { kind: "test", command: "bun test" }, result: { exitCode: 0, timedOut: false } },
				],
			},
			loadPlanningContext: async () => ({
				request: { issue: 1, body: "test", version: "1", acceptanceCriteria: [] },
				relationships: {},
				dependencies: [],
				approvedDecisions: [],
				shippedInterfaces: [],
				recovery: [],
			}),
			repository: {
				observeBase: async () => ({ defaultBranch: "darkfactory", sha: "1".repeat(40) }),
				ensureWorktree: async () => {
					ensureWorktreeCalls++;
					return { value: { worktree: "/tmp/wt" }, evidence: "worktree:/tmp/wt" };
				},
				commitWorktree: async () => {
					commitWorktreeCalls++;
					return { value: { sha: "2".repeat(40) }, evidence: "commit:222" };
				},
				pushBranch: async () => {
					pushBranchCalls++;
					return { value: { sha: "2".repeat(40) }, evidence: "push:222" };
				},
				updateBranch: async () => ({
					value: { status: "clean", worktree: "/tmp/wt", headSha: "2".repeat(40) },
					evidence: "update:222",
				}),
			},
			github: {
				ensurePullRequest: async () => {
					ensurePullRequestCalls++;
					return { value: { number: 42 }, evidence: "pr:42" };
				},
				mergePullRequest: async () => ({ value: { number: 42, mergeSha: "333" }, evidence: "merge:42:333" }),
				closeIssue: async () => ({ value: { number: 1 }, evidence: "issue-closed:1" }),
				createComment: async () => ({ value: { commentId: "c1" }, evidence: "comment:c1" }),
			},
			automation: {
				boardSync: async () => ({ value: { workflowRunId: 100 }, evidence: "board:100" }),
				quotaResume: async () => ({ value: { eligibleRunIds: [], resumedRunIds: [] }, evidence: "quota:none" }),
			},
		};

		const handlers = createProductionHandlers({
			effects,
			model: {
				runPrompt: async () => ({ role: "assistant", content: [{ type: "text", text: "done" }] }),
				extractJudgement: async () => {
					throw new Error("not used");
				},
			},
		});

		const node: AgentNode = { id: "implement", kind: "agent", mode: "write" };
		const ctx: NodeContext = {
			runDir: "/tmp/run",
			runId: "run-wt-test",
			eventId: "event-1",
			iteration: 1,
			outputs: {},
		};

		const first = await handlers.agent(node, ctx);
		expect(first.outcome).toBe("success");
		expect(ensureWorktreeCalls).toBe(1);
		expect(commitWorktreeCalls).toBe(1);
		expect(pushBranchCalls).toBe(1);
		expect(ensurePullRequestCalls).toBe(1);

		// Run again with identical context and journal
		const second = await handlers.agent(node, ctx);
		expect(second.outcome).toBe("success");
		expect(ensureWorktreeCalls).toBe(1);
		expect(commitWorktreeCalls).toBe(1);
		expect(pushBranchCalls).toBe(1);
		expect(ensurePullRequestCalls).toBe(1);
	});

	test("crash after node completion but before next transition resumes from persisted resume_event", async () => {
		const runDir = await mkdtemp(join(tmpdir(), "df-graph-crash-node-"));
		try {
			const graph: WorkflowGraph = {
				version: 1,
				checks: [],
				nodes: [
					{ id: "step1", kind: "automation", script: "s1", trigger: { event: "issues.opened" } },
					{ id: "step2", kind: "automation", script: "s2" },
				],
				edges: [{ from: "step1", to: "step2", on: { node_outcome: "success" } }],
			};

			let step1Runs = 0;
			let step2Runs = 0;

			const handlers: NodeHandlers = {
				agent: async () => ({ outcome: "failure", outputs: {} }),
				automation: async (node) => {
					if (node.id === "step1") {
						step1Runs++;
						return { outcome: "success", outputs: { step1_done: true } };
					}
					if (node.id === "step2") {
						step2Runs++;
						return { outcome: "success", outputs: { step2_done: true } };
					}
					return { outcome: "failure", outputs: {} };
				},
			};

			const event: GraphEvent = {
				type: "issues.opened",
				event_id: "delivery:crash-test",
				actor: { login: "owner", association: "OWNER", is_bot: false },
			};

			// Simulate state persisted right after step 1 completed, then crashed before transition
			const statePath = join(runDir, "state.df");
			await mkdir(runDir, { recursive: true });
			const simulatedCrashedState = {
				run_id: "run-crash-1",
				current_node: "step1",
				outputs: { step1_done: true },
				iterations: { step1: 1 },
				active_event_id: "delivery:crash-test",
				processed_events: [],
				resume_event: {
					type: "node.completed",
					node: "step1",
					outcome: "success",
					outputs: { step1_done: true },
					event_id: "delivery:crash-test",
				},
			};
			await writeFile(statePath, JSON.stringify(simulatedCrashedState), "utf8");

			const resumed = await runGraph(graph, runDir, handlers, event);
			expect(step1Runs).toBe(0);
			expect(step2Runs).toBe(1);
			expect(resumed.outputs.step2_done).toBe(true);
			expect(resumed.processed_events).toContain("delivery:crash-test");
		} finally {
			await rm(runDir, { recursive: true, force: true });
		}
	});

	test("external action reconciliation does not duplicate mutation when crashing before journal persistence", async () => {
		const journal = new MemoryJournal();
		const effectId = "eff-recon-test";
		const existingComments = [{ id: 101, body: `existing\n\n<!-- darkfactory-effect:${effectId} -->` }];
		let mutationCount = 0;

		const reconcileAndMutate = async () => {
			const marker = `<!-- darkfactory-effect:${effectId} -->`;
			const found = existingComments.find((c) => c.body.includes(marker));
			if (found) return { value: { commentId: found.id }, evidence: `comment:${found.id}` };
			mutationCount++;
			return { value: { commentId: 999 }, evidence: "comment:999" };
		};

		// First call: journal has no record, but external system has the marker from an earlier crashed attempt
		const result1 = await runObservedProductionEffect(journal, effectId, "github.comment", reconcileAndMutate);
		expect(result1.value).toEqual({ commentId: 101 });
		expect(mutationCount).toBe(0);

		// Second call: journal hit returns the same without invoking external system
		const result2 = await runObservedProductionEffect(journal, effectId, "github.comment", reconcileAndMutate);
		expect(result2.value).toEqual({ commentId: 101 });
		expect(mutationCount).toBe(0);
	});

	test("quota exhaustion persists exact candidate and checkpoint, and clears quota_blocked on resume", async () => {
		const runDir = await mkdtemp(join(tmpdir(), "df-quota-exhaust-"));
		try {
			const graph: WorkflowGraph = {
				version: 1,
				checks: [],
				nodes: [
					{
						id: "model-step",
						kind: "agent",
						trigger: { event: "issues.opened" },
						quota_policy: { on_exhaustion: "checkpoint_and_block", resume: "sweep_or_command" },
					},
					{
						id: "quota-notice",
						kind: "gate",
						command: "/df resume",
					},
				],
				edges: [
					{ from: "model-step", to: "quota-notice", on: { node_outcome: "quota_exhausted" } },
					{ from: "quota-notice", to: "model-step", on: { event: "comment" } },
				],
			};

			let attempt = 0;
			const candidate = { provider: "google", account: "acct-team", model: "gemini-2.5-pro" };

			const handlers = createProductionHandlers({
				effects: {
					journal: new MemoryJournal(),
					workspace: {
						changedFiles: async () => [],
						scopeCheck: async () => ({ ok: true }),
						runDetectedVerification: async () => [],
					},
					loadPlanningContext: async () => ({
						request: { issue: 1, body: "test", version: "1", acceptanceCriteria: [] },
						relationships: {},
						dependencies: [],
						approvedDecisions: [],
						shippedInterfaces: [],
						recovery: [],
					}),
					repository: {
						observeBase: async () => ({ defaultBranch: "darkfactory", sha: "1".repeat(40) }),
						ensureWorktree: async () => ({ value: { worktree: "/tmp/wt" }, evidence: "worktree:/tmp/wt" }),
						commitWorktree: async () => ({ value: { sha: "2".repeat(40) }, evidence: "commit:222" }),
						pushBranch: async () => ({ value: { sha: "2".repeat(40) }, evidence: "push:222" }),
						updateBranch: async () => ({
							value: { status: "clean", worktree: "/tmp/wt", headSha: "2".repeat(40) },
							evidence: "update:222",
						}),
					},
					automation: {
						boardSync: async () => ({ value: { workflowRunId: 100 }, evidence: "board:100" }),
						quotaResume: async () => ({ value: { eligibleRunIds: [], resumedRunIds: [] }, evidence: "quota:none" }),
					},
				},
				model: {
					runPrompt: async () => {
						attempt++;
						if (attempt === 1) {
							throw new ProductionQuotaExhaustedError("Daily token limit exceeded", candidate);
						}
						return { role: "assistant", content: [{ type: "text", text: "done" }] };
					},
					extractJudgement: async () => {
						throw new Error("not used");
					},
				},
			});

			const initialEvent: GraphEvent = {
				type: "issues.opened",
				event_id: "evt:quota-1",
				actor: { login: "user", association: "OWNER", is_bot: false },
			};

			// Run 1: fails with quota exhaustion
			const state1 = await runGraph(graph, runDir, handlers, initialEvent, {
				onAction: async (action, s) => {
					if (action.type === "gate") s.quota_blocked = true;
				},
			});

			expect(state1.current_node).toBe("model-step");
			expect(state1.quota_blocked).toBe(true);
			expect(state1.outputs.quota_candidate).toEqual(candidate);
			expect(state1.checkpoints).toEqual([{ run_id: state1.run_id, node: "model-step", eligible: false }]);

			// Verify state.df persisted on disk
			const diskState = JSON.parse(await readFile(join(runDir, "state.df"), "utf8")) as RunState;
			expect(diskState.outputs.quota_candidate).toEqual(candidate);
			expect(diskState.checkpoints?.[0]?.eligible).toBe(false);
			expect(diskState.quota_blocked).toBe(true);

			// Run 2: Resume event arrives after eligibility is observed
			const resumeEvent: GraphEvent = {
				type: "comment",
				body: "/df resume",
				event_id: "evt:resume-1",
				actor: { login: "owner", association: "OWNER", is_bot: false },
			};

			const state2 = await runGraph(graph, runDir, handlers, resumeEvent);
			expect(state2.current_node).toBe("model-step");
			expect(state2.quota_blocked).toBeUndefined();
			expect(state2.outputs.result).toBe("done");
		} finally {
			await rm(runDir, { recursive: true, force: true });
		}
	});

	test("quota sweep does not resume still-blocked candidate and resumes once eligible", async () => {
		const runsRoot = await mkdtemp(join(tmpdir(), "df-quota-sweep-"));
		const targetRunDir = join(runsRoot, "issue-99");
		await mkdir(targetRunDir, { recursive: true });

		try {
			const candidate = { provider: "anthropic", account: "acct-test", model: "claude-3-opus" };
			const persistedState: RunState = {
				run_id: "run-blocked-99",
				current_node: "agent-work",
				quota_blocked: true,
				outputs: { quota_candidate: candidate },
				iterations: { "agent-work": 1 },
			};
			await writeFile(join(targetRunDir, "state.df"), JSON.stringify(persistedState), "utf8");

			const graph: WorkflowGraph = {
				version: 1,
				checks: [],
				nodes: [{ id: "agent-work", kind: "agent", trigger: { event: "comment" } }],
				edges: [],
			};

			let candidateStatus = "exhausted";
			let resumeCalled = false;

			const sweepSimulation = async (effectId: string) => {
				const eligibleRunIds: string[] = [];
				const resumedRunIds: string[] = [];
				const entries = await readdir(runsRoot, { withFileTypes: true });

				for (const entry of entries) {
					if (!entry.isDirectory()) continue;
					const runDir = join(runsRoot, entry.name);
					const state = JSON.parse(await readFile(join(runDir, "state.df"), "utf8")) as RunState;
					if (!state.quota_blocked) continue;
					const rawCandidate = state.outputs?.quota_candidate as typeof candidate | undefined;
					if (!rawCandidate) continue;

					// Quota check
					if (["waiting", "exhausted", "unavailable"].includes(candidateStatus)) continue;

					eligibleRunIds.push(state.run_id);
					resumeCalled = true;

					const resumed = await runGraph(
						graph,
						runDir,
						{
							agent: async () => ({ outcome: "success", outputs: { fixed: true } }),
							automation: async () => ({ outcome: "success", outputs: {} }),
						},
						{
							type: "comment",
							body: "/df resume",
							event_id: `quota-resume:${effectId}:${state.run_id}`,
							actor: { login: "sweep", association: "OWNER", is_bot: false },
						},
					);

					if (!resumed.quota_blocked) resumedRunIds.push(state.run_id);
				}

				return { eligibleRunIds, resumedRunIds };
			};

			// Sweep 1: candidate is exhausted -> no resume
			const sweep1 = await sweepSimulation("eff-1");
			expect(sweep1.eligibleRunIds).toEqual([]);
			expect(sweep1.resumedRunIds).toEqual([]);
			expect(resumeCalled).toBe(false);

			const stateStillBlocked = JSON.parse(await readFile(join(targetRunDir, "state.df"), "utf8")) as RunState;
			expect(stateStillBlocked.quota_blocked).toBe(true);

			// Status becomes ready
			candidateStatus = "ready";

			// Sweep 2: candidate is ready -> resumes run
			const sweep2 = await sweepSimulation("eff-2");
			expect(sweep2.eligibleRunIds).toEqual(["run-blocked-99"]);
			expect(sweep2.resumedRunIds).toEqual(["run-blocked-99"]);
			expect(resumeCalled).toBe(true);

			const stateResumed = JSON.parse(await readFile(join(targetRunDir, "state.df"), "utf8")) as RunState;
			expect(stateResumed.quota_blocked).toBeUndefined();
			expect(stateResumed.outputs.fixed).toBe(true);
		} finally {
			await rm(runsRoot, { recursive: true, force: true });
		}
	});

	test("routes capability graph handlers before core handlers", async () => {
		const runRoot = await mkdtemp(join(tmpdir(), "df-capability-graph-"));
		try {
			const capability = defineCapability({
				abiVersion: CAPABILITY_ABI_VERSION,
				id: "test-graph",
				version: "1.0.0",
				description: "Graph dispatch test capability.",
				graph: [
					{
						id: "agent-handler",
						nodeKinds: ["agent"],
						handler: (node, context) => ({
							outcome: "success",
							outputs: { handled: node.id, root: context.repositoryRoot, iteration: context.iteration },
						}),
					},
				],
			});
			const registry = createCapabilityGraphRegistry([capability]);
			const runtime = {
				repositoryRoot: "/repo",
				domains: ["code"],
				credentials: { get: async () => undefined },
			};
			let coreCalls = 0;
			const handlers: NodeHandlers = {
				agent: async () => {
					coreCalls++;
					return { outcome: "success", outputs: { core: true } };
				},
				automation: async () => {
					coreCalls++;
					return { outcome: "success", outputs: { core: true } };
				},
			};
			const graph: WorkflowGraph = {
				version: 1,
				checks: [],
				nodes: [{ id: "capability-node", kind: "agent", trigger: { event: "issues.opened" } }],
				edges: [],
			};
			const state = await runGraph(graph, join(runRoot, "capability"), handlers, {
				type: "issues.opened",
				actor: { login: "owner", association: "OWNER", is_bot: false },
			}, {
				capabilityGraph: registry,
				capabilityRuntime: runtime,
			});
			expect(coreCalls).toBe(0);
			expect(state.outputs).toMatchObject({ handled: "capability-node", root: "/repo", iteration: 1 });

			const automationGraph: WorkflowGraph = {
				version: 1,
				checks: [],
				nodes: [{ id: "core-node", kind: "automation", script: "core", trigger: { event: "issues.opened" } }],
				edges: [],
			};
			const fallback = await runGraph(automationGraph, join(runRoot, "fallback"), handlers, {
				type: "issues.opened",
				actor: { login: "owner", association: "OWNER", is_bot: false },
			}, {
				capabilityGraph: registry,
				capabilityRuntime: runtime,
			});
			expect(coreCalls).toBe(1);
			expect(fallback.outputs).toEqual({ core: true });

			await expect(
				runGraph(graph, join(runRoot, "missing-runtime"), handlers, {
					type: "issues.opened",
					actor: { login: "owner", association: "OWNER", is_bot: false },
				}, { capabilityGraph: registry }),
			).rejects.toThrow("requires a scoped capability runtime context");
		} finally {
			await rm(runRoot, { recursive: true, force: true });
		}
	});
});
