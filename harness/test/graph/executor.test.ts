import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type NodeContext, type NodeHandlers, type NodeResult, runGraph } from "../../src/graph/executor.ts";
import type {
	Actor,
	AgentNode,
	AutomationNode,
	GraphEdge,
	GraphEvent,
	GraphNode,
	WorkflowGraph,
} from "../../src/graph/types.ts";

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function runDir(): string {
	const root = mkdtempSync(join(tmpdir(), "df-graph-run-"));
	roots.push(root);
	return join(root, "run");
}

const owner: Actor = { login: "owner", association: "OWNER", is_bot: false };
const opened: GraphEvent = { type: "issues.opened", actor: owner };
const agent = (id: string, extra: Partial<AgentNode> = {}): AgentNode => ({ id, kind: "agent", ...extra });
const automation = (id: string, extra: Partial<AutomationNode> = {}): AutomationNode => ({
	id,
	kind: "automation",
	script: id,
	...extra,
});
const graphOf = (nodes: GraphNode[], edges: GraphEdge[]): WorkflowGraph => ({ version: 1, checks: [], nodes, edges });

/** Handlers answering from a per-node script; records every call with its iteration and item. */
function scripted(script: Record<string, (ctx: NodeContext, call: number) => NodeResult | Promise<NodeResult>>) {
	const calls: { node: string; iteration: number; item?: unknown }[] = [];
	const counts = new Map<string, number>();
	const run = async (node: GraphNode, ctx: NodeContext): Promise<NodeResult> => {
		const call = (counts.get(node.id) ?? 0) + 1;
		counts.set(node.id, call);
		calls.push({ node: node.id, iteration: ctx.iteration, ...(ctx.item === undefined ? {} : { item: ctx.item }) });
		const step = script[node.id];
		if (!step) return { outcome: "success", outputs: {} };
		return step(ctx, call);
	};
	const handlers: NodeHandlers = { agent: run, automation: run };
	return { handlers, calls };
}

describe("runGraph", () => {
	test("runs nodes in edge order, merges outputs and persists state and events", async () => {
		const graph = graphOf(
			[agent("plan", { trigger: { event: "issues.opened" }, outputs: ["plan_text"] }), automation("apply")],
			[{ from: "plan", to: "apply", on: { node_outcome: "success" } }],
		);
		const { handlers, calls } = scripted({ plan: () => ({ outcome: "success", outputs: { plan_text: "do it" } }) });
		const dir = runDir();
		const state = await runGraph(graph, dir, handlers, opened);
		expect(calls.map((call) => call.node)).toEqual(["plan", "apply"]);
		expect(state).toMatchObject({
			current_node: "apply",
			outputs: { plan_text: "do it" },
			iterations: { plan: 1, apply: 1 },
		});
		expect(JSON.parse(readFileSync(join(dir, "state.df"), "utf8"))).toEqual(state);
		const events = readFileSync(join(dir, "events.df"), "utf8")
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));
		expect(
			events
				.filter((entry) => entry.type === "event" && entry.event.type === "node.completed")
				.map((entry) => entry.event.node),
		).toEqual(["plan", "apply"]);
	});

	test("a gate stops the run until an authorized approval arrives", async () => {
		const graph = graphOf(
			[
				agent("plan", { trigger: { event: "issues.opened" } }),
				{
					id: "approval",
					kind: "gate",
					author_associations: ["OWNER"],
					command: "^\\s*(?:/df\\s+|/)(?:approve|reject|revise)\\s*$",
				},
				automation("implement"),
			],
			[
				{ from: "plan", to: "approval", on: { node_outcome: "success" } },
				{ from: "approval", to: "implement", on: { gate_outcome: "approved" } },
			],
		);
		const { handlers, calls } = scripted({});
		const actions: string[] = [];
		const dir = runDir();
		const now = () => new Date("2026-09-15T12:00:00Z");
		const waiting = await runGraph(graph, dir, handlers, opened, {
			onAction: (action) => void actions.push(`${action.type}:${action.node}`),
			now,
		});
		expect(calls.map((call) => call.node)).toEqual(["plan"]);
		expect(actions).toEqual(["gate:approval"]);
		expect(waiting).toMatchObject({ current_node: "approval", blocked_since: "2026-09-15T12:00:00.000Z" });

		const stranger = await runGraph(
			graph,
			dir,
			handlers,
			{ type: "comment", body: "/df approve", actor: { login: "x", association: "NONE", is_bot: false } },
			{ now },
		);
		expect(stranger.current_node).toBe("approval");
		expect(calls.map((call) => call.node)).toEqual(["plan"]);

		const approved = await runGraph(
			graph,
			dir,
			handlers,
			{ type: "comment", body: "/df approve", actor: owner },
			{ now },
		);
		expect(calls.map((call) => call.node)).toEqual(["plan", "implement"]);
		expect(approved.current_node).toBe("implement");
		expect(approved.blocked_since).toBeUndefined();
	});

	test("a loop runs a node again with a growing iteration until its guard lets the run move on", async () => {
		const graph = graphOf(
			[agent("review", { trigger: { event: "issues.opened" }, outputs: ["clean"] }), agent("fix"), automation("merge")],
			[
				{
					from: "review",
					to: "fix",
					on: { node_outcome: "success", when: "clean == false" },
					loop: { kind: "self_review", safety_budget: 5 },
				},
				{ from: "fix", to: "review", on: { node_outcome: "success" } },
				{ from: "review", to: "merge", on: { node_outcome: "success", when: "clean == true" } },
			],
		);
		const { handlers, calls } = scripted({
			review: (_ctx, call) => ({ outcome: "success", outputs: { clean: call >= 3 } }),
		});
		const state = await runGraph(graph, runDir(), handlers, opened);
		expect(calls.map((call) => `${call.node}#${call.iteration}`)).toEqual([
			"review#1",
			"fix#1",
			"review#2",
			"fix#2",
			"review#3",
			"merge#1",
		]);
		expect(state.iterations).toEqual({ review: 3, fix: 2, merge: 1 });
	});

	test("a handler that throws is a failed node and follows the failure edge", async () => {
		const graph = graphOf(
			[automation("push", { trigger: { event: "issues.opened" } }), agent("repair")],
			[{ from: "push", to: "repair", on: { node_outcome: "failure" } }],
		);
		const { handlers, calls } = scripted({
			push: () => {
				throw new Error("remote rejected");
			},
		});
		const state = await runGraph(graph, runDir(), handlers, opened);
		expect(calls.map((call) => call.node)).toEqual(["push", "repair"]);
		expect(state.outputs.error).toBe("remote rejected");
	});

	test("an undeclared endless loop is stopped by maxSteps", async () => {
		const graph = graphOf(
			[agent("spin", { trigger: { event: "issues.opened" } })],
			[{ from: "spin", to: "spin", on: { node_outcome: "success" } }],
		);
		await expect(runGraph(graph, runDir(), scripted({}).handlers, opened, { maxSteps: 10 })).rejects.toThrow(
			"exceeded 10 node runs",
		);
	});
});

describe("runGraph fan-out", () => {
	const fanGraph = (maxParallel: number, retry: boolean) =>
		graphOf(
			[
				automation("split", { trigger: { event: "issues.opened" }, outputs: ["chunks"] }),
				agent("chunk", { foreach: { items: "chunks", max_parallel: maxParallel, as: "chunk" } }),
				automation("open-pr"),
			],
			[
				{ from: "split", to: "chunk", on: { node_outcome: "success" } },
				{ from: "chunk", to: "open-pr", on: { children: "all_done" } },
				...(retry
					? [
							{
								from: "chunk",
								to: "chunk",
								on: { children: "any_failed" as const },
								loop: { kind: "ci_repair" as const, safety_budget: 3 },
							},
						]
					: []),
			],
		);

	test("runs one child per item with at most max_parallel at once, then follows all_done", async () => {
		let active = 0;
		let peak = 0;
		const { handlers, calls } = scripted({
			split: () => ({ outcome: "success", outputs: { chunks: ["a", "b", "c", "d", "e"] } }),
			chunk: async (ctx) => {
				active++;
				peak = Math.max(peak, active);
				await new Promise((resolve) => setTimeout(resolve, 20));
				active--;
				return { outcome: "success", outputs: { done: ctx.outputs.chunk } };
			},
		});
		const state = await runGraph(fanGraph(2, false), runDir(), handlers, opened);
		expect(peak).toBe(2);
		expect(
			calls
				.filter((call) => call.node === "chunk")
				.map((call) => call.item)
				.sort(),
		).toEqual(["a", "b", "c", "d", "e"]);
		expect(calls.at(-1)?.node).toBe("open-pr");
		expect(
			(state.outputs.chunk_results as { outputs: { done: string } }[]).map((result) => result.outputs.done),
		).toEqual(["a", "b", "c", "d", "e"]);
	});

	test("a retried fan-out re-runs only the children that did not succeed", async () => {
		const attempts = new Map<string, number>();
		const { handlers, calls } = scripted({
			split: () => ({ outcome: "success", outputs: { chunks: ["a", "b", "c"] } }),
			chunk: (ctx) => {
				const item = String(ctx.item);
				const attempt = (attempts.get(item) ?? 0) + 1;
				attempts.set(item, attempt);
				return { outcome: item === "b" && attempt === 1 ? "failure" : "success", outputs: {} };
			},
		});
		const state = await runGraph(fanGraph(3, true), runDir(), handlers, opened);
		expect(
			calls
				.filter((call) => call.node === "chunk")
				.map((call) => `${call.item}#${call.iteration}`)
				.sort(),
		).toEqual(["a#1", "b#1", "b#2", "c#1"]);
		expect(calls.at(-1)?.node).toBe("open-pr");
		expect(state.iterations?.chunk).toBe(2);
	});
});


describe("generic durable review lifecycle", () => {
	const reviewAdapter = { subject: "planning" as const, validate: () => [] };

	const planningGraph = (): WorkflowGraph =>
		graphOf(
			[
				agent("planning", {
					trigger: { event: "issues.opened" },
					outputs: ["planning_context", "plan_artifact"],
				}),
				agent("planning-review", {
					inputs: ["planning_context", "plan_artifact"],
					outputs: ["planning_findings", "planning_review_clean"],
					review: {
						subject: "planning",
						phase: "review",
						context: "planning_context",
						artifact: "plan_artifact",
						findings: "planning_findings",
						clean: "planning_review_clean",
					},
				}),
				agent("planning-fix", {
					inputs: ["planning_context", "plan_artifact", "planning_findings"],
					outputs: ["plan_artifact"],
					review: {
						subject: "planning",
						phase: "fix",
						context: "planning_context",
						artifact: "plan_artifact",
						findings: "planning_findings",
					},
				}),
				{
					id: "planning-gate",
					kind: "gate",
					author_associations: ["OWNER"],
					command: "^\\s*(?:/df\\s+|/)(?:approve|reject|revise)\\s*$",
					approves_review: "planning",
				},
				agent("implement", { requires_review_approval: "planning" }),
			],
			[
				{ from: "planning", to: "planning-review", on: { node_outcome: "success" } },
				{
					from: "planning-review",
					to: "planning-fix",
					on: { node_outcome: "success", when: "planning_review_clean == false" },
					loop: { kind: "planning_revision", safety_budget: 5 },
				},
				{
					from: "planning-fix",
					to: "planning-review",
					on: { node_outcome: "success" },
					loop: { kind: "review_fix", safety_budget: 5 },
				},
				{
					from: "planning-review",
					to: "planning-gate",
					on: { node_outcome: "success", when: "planning_review_clean == true" },
				},
				{ from: "planning-gate", to: "implement", on: { gate_outcome: "approved" } },
			],
		);

	test("Planning review, fix and re-review share one persisted state and approval gate", async () => {
		const dir = runDir();
		const { handlers, calls } = scripted({
			planning: () => ({
				outcome: "success",
				outputs: { planning_context: { request: 391, version: 1 }, plan_artifact: { text: "draft" } },
			}),
			"planning-review": (_ctx, call) => ({
				outcome: "success",
				outputs: { planning_findings: call === 1 ? ["invented owner"] : [] },
			}),
			"planning-fix": (ctx) => {
				expect(ctx.review?.findings.map((finding) => finding.message)).toEqual(["invented owner"]);
				return { outcome: "success", outputs: { plan_artifact: { text: "fixed" } } };
			},
		});
		const waiting = await runGraph(planningGraph(), dir, handlers, opened, {
			reviewAdapters: { planning: reviewAdapter },
		});
		expect(calls.map((call) => call.node)).toEqual([
			"planning",
			"planning-review",
			"planning-fix",
			"planning-review",
		]);
		expect(waiting.current_node).toBe("planning-gate");
		expect(waiting.reviews?.planning).toMatchObject({ clean: true, iteration: 2 });
		expect(waiting.reviews?.planning?.history.map((entry) => entry.phase)).toEqual(["review", "fix", "review"]);

		const approved = await runGraph(
			planningGraph(),
			dir,
			handlers,
			{ type: "comment", body: "/df approve", actor: owner },
			{ reviewAdapters: { planning: reviewAdapter } },
		);
		expect(approved.reviews?.planning?.approvedFingerprint).toBe(approved.reviews?.planning?.contextFingerprint);
		expect(calls.at(-1)?.node).toBe("implement");
	});

	test("material context change invalidates clean review and stale approval cannot advance", async () => {
		const dir = runDir();
		const { handlers } = scripted({
			planning: () => ({
				outcome: "success",
				outputs: { planning_context: { request: 391, version: 1 }, plan_artifact: { text: "draft" } },
			}),
			"planning-review": () => ({ outcome: "success", outputs: { planning_findings: [] } }),
		});
		await runGraph(planningGraph(), dir, handlers, opened, { reviewAdapters: { planning: reviewAdapter } });
		const path = join(dir, "state.df");
		const persisted = JSON.parse(readFileSync(path, "utf8")) as RunState;
		persisted.outputs.planning_context = { request: 391, version: 2 };
		writeFileSync(path, JSON.stringify(persisted));

		const stale = await runGraph(
			planningGraph(),
			dir,
			handlers,
			{ type: "comment", body: "/df approve", actor: owner },
			{ reviewAdapters: { planning: reviewAdapter } },
		);
		expect(stale.current_node).toBe("planning-gate");
		expect(stale.reviews?.planning?.clean).toBe(false);
		expect(stale.reviews?.planning?.approvedFingerprint).toBeUndefined();
	});

	test("implementation review uses the same review/fix engine", async () => {
		const graph = graphOf(
			[
				agent("implement", {
					trigger: { event: "issues.opened" },
					outputs: ["implementation_context", "implementation_artifact"],
				}),
				agent("self-review", {
					inputs: ["implementation_context", "implementation_artifact"],
					outputs: ["review_findings", "review_clean"],
					review: {
						subject: "implementation",
						phase: "review",
						context: "implementation_context",
						artifact: "implementation_artifact",
						findings: "review_findings",
						clean: "review_clean",
					},
				}),
				agent("review-fix", {
					inputs: ["implementation_context", "implementation_artifact", "review_findings"],
					outputs: ["implementation_artifact"],
					review: {
						subject: "implementation",
						phase: "fix",
						context: "implementation_context",
						artifact: "implementation_artifact",
						findings: "review_findings",
					},
				}),
				automation("done"),
			],
			[
				{ from: "implement", to: "self-review", on: { node_outcome: "success" } },
				{
					from: "self-review",
					to: "review-fix",
					on: { node_outcome: "success", when: "review_clean == false" },
					loop: { kind: "self_review", safety_budget: 5 },
				},
				{
					from: "review-fix",
					to: "self-review",
					on: { node_outcome: "success" },
					loop: { kind: "review_fix", safety_budget: 5 },
				},
				{ from: "self-review", to: "done", on: { node_outcome: "success", when: "review_clean == true" } },
			],
		);
		const { handlers, calls } = scripted({
			implement: () => ({
				outcome: "success",
				outputs: { implementation_context: { base: "a" }, implementation_artifact: { diff: "x" } },
			}),
			"self-review": (_ctx, call) => ({
				outcome: "success",
				outputs: { review_findings: call === 1 ? ["bug"] : [] },
			}),
			"review-fix": () => ({ outcome: "success", outputs: { implementation_artifact: { diff: "fixed" } } }),
		});
		const state = await runGraph(graph, runDir(), handlers, opened);
		expect(calls.map((call) => call.node)).toEqual(["implement", "self-review", "review-fix", "self-review", "done"]);
		expect(state.reviews?.implementation?.history.map((entry) => entry.phase)).toEqual(["review", "fix", "review"]);
		expect(state.reviews?.implementation?.clean).toBe(true);
	});
});
