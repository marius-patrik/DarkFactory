import { afterEach, describe, expect, test } from "bun:test";
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	FileProductionEffectJournal,
	IndeterminateEffectError,
} from "../../../../packages/harness/src/graph/durable-effects.ts";
import {
	type NodeHandlers, runGraph,
} from "../../../../packages/harness/src/graph/executor.ts";
import {
	type WorkflowGraph,
	type GraphEvent,
} from "../../../../packages/harness/src/graph/types.ts";
import { dispatch } from "../../../../packages/harness/src/graph/dispatch.ts";
import { assertMergeAuthorization } from "../../../../packages/harness/src/graph/approval-evidence.ts";

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
const owner = { login: "owner", association: "OWNER" as const, is_bot: false };
const opened: GraphEvent = { type: "issues.opened", actor: owner };
const sha = "a".repeat(40);

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), "df-production-graph-"));
	roots.push(root);
	const runDir = join(root, "run");
	const external = join(root, "observed-remote.jsonl");
	const effects = new FileProductionEffectJournal(join(runDir, "effects"));
	const graph: WorkflowGraph = {
		version: 1, checks: [],
		nodes: [
			{ id: "intake", kind: "automation", script: "request-intake", trigger: { event: "issues.opened" } },
			{ id: "apply", kind: "automation", script: "apply" },
		],
		edges: [{ from: "intake", to: "apply", on: { node_outcome: "success" } }],
	};
	let calls = 0;
	const handlers: NodeHandlers = {
		agent: async () => ({ outcome: "failure", outputs: { error: "unexpected agent" } }),
		automation: async (node, ctx) => {
			if (node.id === "intake") return { outcome: "success", outputs: { request: "immutable" } };
			if (!ctx.effect) throw new Error("missing production journal");
			const entry = await ctx.effect("external.apply", {
				observe: async (effectId) => {
					let rows: Array<{ id: string; value: string }> = [];
					try { rows = (await readFile(external, "utf8")).trim().split("\n").filter(Boolean).map((x) => JSON.parse(x)); }
					catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
					const found = rows.find((x) => x.id === effectId);
					return found ? { value: found.value, evidence: found.id } : undefined;
				},
				execute: async (effectId) => {
					calls++;
					await appendFile(external, `${JSON.stringify({ id: effectId, value: "applied" })}\n`);
					return { value: "applied", evidence: effectId };
				},
			});
			return { outcome: "success", outputs: { external_evidence: entry.evidence } };
		},
	};
	return { root, runDir, effects, external, graph, handlers, writes: () => calls };
}

describe("canonical production graph recovery", () => {
	test("concurrent identical ingress executes the same external mutation once", async () => {
		const f = await fixture();
		const result = await Promise.all([
			runGraph(f.graph, f.runDir, f.handlers, opened, { effects: f.effects, eventId: "delivery-a" }),
			runGraph(f.graph, f.runDir, f.handlers, opened, { effects: f.effects, eventId: "delivery-a" }),
		]);
		expect(f.writes()).toBe(1);
		expect(result[0]?.outputs.external_evidence).toBe(result[1]?.outputs.external_evidence);
		expect((await readFile(f.external, "utf8")).trim().split("\n")).toHaveLength(1);
		const durable = JSON.parse(await readFile(join(f.runDir, "state.df"), "utf8"));
		expect(durable.processed_event_ids).toContain("delivery-a");
		expect(durable.pending_node).toBeUndefined();
	});

	test("adopts a durable completion checkpoint instead of re-running an interrupted node", async () => {
		const f = await fixture();
		const result = await runGraph(f.graph, f.runDir, f.handlers, opened, {
			effects: f.effects, eventId: "delivery-b",
		});
		expect(f.writes()).toBe(1);
		const checkpoint = JSON.parse(await readFile(join(f.runDir, "checkpoints", "apply", "1.df"), "utf8"));
		expect(checkpoint.state.outputs.external_evidence).toEqual(result.outputs.external_evidence);
		const interrupted = {
			...result,
			processed_event_ids: [],
			recovery_event: undefined,
			active_event_id: "delivery-b",
			pending_node: { node: "apply", iteration: 1 },
		};
		await writeFile(join(f.runDir, "state.df"), JSON.stringify(interrupted));
		const resumed = await runGraph(f.graph, f.runDir, f.handlers, opened, {
			effects: new FileProductionEffectJournal(f.effects.directory), eventId: "delivery-b",
		});
		expect(resumed.outputs.external_evidence).toBe(result.outputs.external_evidence);
		expect(f.writes()).toBe(1);
		expect((resumed as typeof resumed & { processed_event_ids?: string[] }).processed_event_ids).toContain("delivery-b");
	});

	test("an interrupted node without committed evidence fails closed", async () => {
		const f = await fixture();
		await mkdir(f.runDir, { recursive: true });
		await writeFile(join(f.runDir, "state.df"), JSON.stringify({
			run_id: "pending", current_node: "apply", outputs: {}, hints: [],
			iterations: { apply: 1 }, pending_node: { node: "apply", iteration: 1 },
			active_event_id: "delivery-c",
		}));
		await expect(runGraph(f.graph, f.runDir, f.handlers, opened, {
			effects: f.effects, eventId: "delivery-c",
		})).rejects.toThrow("no committed result");
		expect(f.writes()).toBe(0);
	});

	test("an indeterminate mutation cannot follow ordinary node failure/retry edges", async () => {
		const f = await fixture();
		let repaired = false;
		const graph: WorkflowGraph = {
			version: 1, checks: [],
			nodes: [
				{ id: "mutate", kind: "automation", script: "mutate", trigger: { event: "issues.opened" } },
				{ id: "repair", kind: "automation", script: "repair" },
			],
			edges: [{ from: "mutate", to: "repair", on: { node_outcome: "failure" } }],
		};
		const handlers: NodeHandlers = {
			agent: async () => ({ outcome: "failure", outputs: {} }),
			automation: async (node) => {
				if (node.id === "repair") { repaired = true; return { outcome: "success", outputs: {} }; }
				throw new IndeterminateEffectError("a".repeat(64));
			},
		};
		await expect(runGraph(graph, f.runDir, handlers, opened, { eventId: "ambiguous", effects: f.effects }))
			.rejects.toBeInstanceOf(IndeterminateEffectError);
		expect(repaired).toBe(false);
		const saved = JSON.parse(await readFile(join(f.runDir, "state.df"), "utf8"));
		expect(saved.pending_node).toMatchObject({ node: "mutate", iteration: 1 });
	});

	test("dispatch executes via the same graph rather than merely printing a plan", async () => {
		const f = await fixture();
		const graphFile = join(f.root, "graph.json");
		const eventFile = join(f.root, "issue.json");
		await writeFile(graphFile, JSON.stringify(f.graph));
		await writeFile(eventFile, JSON.stringify({
			action: "opened", issue: { number: 18, author_association: "OWNER" },
			sender: { login: "owner", type: "User" },
		}));
		const logs: string[] = [];
		const original = console.log;
		console.log = (v) => { logs.push(String(v)); };
		try {
			const args = ["--event-name", "issues", "--event", eventFile, "--graph", graphFile,
				"--runs", join(f.root, "dispatch")];
			const runtime = async ({ runDir }: { runDir: string }) => ({
				handlers: f.handlers,
				effects: new FileProductionEffectJournal(join(runDir, "effects")),
			});
			await dispatch(args, { runtime, deliveryId: "webhook-18" });
			await dispatch(args, { runtime, deliveryId: "webhook-18" });
		} finally {
			console.log = original;
		}
		expect(logs.map((line) => JSON.parse(line).type)).toEqual(["executed", "executed"]);
		expect(f.writes()).toBe(1);
		const state = JSON.parse(await readFile(join(f.root, "dispatch", "18", "state.df"), "utf8"));
		expect(state.outputs.external_evidence).toMatch(/^[a-f0-9]{64}$/);
		expect(state.processed_event_ids).toContain("webhook-18");
	});

	test("quota checkpoint blocks mutation and authorized resume re-enters the same graph run", async () => {
		const f = await fixture();
		const g: WorkflowGraph = {
			version: 1, checks: [],
			nodes: [{
				id: "planning", kind: "agent", trigger: { event: "issues.opened" },
				quota_policy: { on_exhaustion: "checkpoint_and_block", resume: "sweep_or_command" },
			}],
			edges: [],
		};
		let attempts = 0;
		const handlers: NodeHandlers = {
			automation: f.handlers.automation,
			agent: async () => {
				attempts++;
				return attempts === 1
					? { outcome: "quota_exhausted", outputs: {
						quota_candidate: { provider: "p", account: "a", model: "m" },
					} }
					: { outcome: "success", outputs: { resumed: true } };
			},
		};
		const blocked = await runGraph(g, f.runDir, handlers, opened, {
			eventId: "quota-event", onAction: async () => {},
		});
		expect(blocked.quota_blocked).toBe(true);
		expect(blocked.checkpoints).toEqual([{
			run_id: blocked.run_id, node: "planning", eligible: false,
		}]);
		const resumed = await runGraph(g, f.runDir, handlers,
			{ type: "comment", body: "/df resume", actor: owner }, {
				eventId: "resume-event", onAction: async () => {},
			});
		expect(resumed.run_id).toBe(blocked.run_id);
		expect(resumed.quota_blocked).toBeUndefined();
		expect(resumed.outputs.resumed).toBe(true);
		expect(attempts).toBe(2);
	});

	test("pre-aborted signal prevents executing an externally mutating node", async () => {
		const f = await fixture();
		const abort = new AbortController();
		abort.abort();
		await expect(runGraph(f.graph, f.runDir, f.handlers, opened,
			{ effects: f.effects, eventId: "cancel-event", signal: abort.signal }))
			.rejects.toThrow("cancelled");
		expect(f.writes()).toBe(0);
	});

	test("production dispatch cannot trust a green webhook when authoritative checks remain pending", async () => {
		const f = await fixture();
		const graphFile = join(f.root, "checks-graph.json");
		const eventFile = join(f.root, "check-suite.json");
		const graph: WorkflowGraph = {
			version: 1, checks: [{ name: "quality", required: true }],
			nodes: [{ id: "verify", kind: "agent", trigger: { event: "checks.completed" } }],
			edges: [],
		};
		await writeFile(graphFile, JSON.stringify(graph));
		await writeFile(eventFile, JSON.stringify({
			action: "completed",
			check_suite: { conclusion: "success", head_sha: sha, pull_requests: [{ number: 27 }] },
		}));
		const logs: string[] = [];
		const previousLog = console.log;
		console.log = (v) => { logs.push(String(v)); };
		const runsRoot = join(f.root, "checks");
		await mkdir(join(runsRoot, "13"), { recursive: true });
		await writeFile(join(runsRoot, "13", "state.df"), JSON.stringify({
			run_id: "request-13", current_node: "verify", outputs: { pr_number: 27 }, hints: [],
		}));
		let verificationCalls = 0;
		try {
			await dispatch([
				"--event-name", "check_suite", "--event", eventFile,
				"--graph", graphFile, "--runs", join(f.root, "checks"),
			], {
				deliveryId: "untrusted-green",
				runtime: async () => ({
					handlers: f.handlers,
					effects: f.effects,
					verifyChecks: async (ref) => {
						expect(ref).toBe(sha);
						verificationCalls++;
						return "pending" as const;
					},
				}),
			});
		} finally {
			console.log = previousLog;
		}
		expect(verificationCalls).toBe(1);
		expect(JSON.parse(logs[0]!).type).toBe("none");
		expect(JSON.parse(await readFile(join(runsRoot, "13", "state.df"), "utf8")).current_node).toBe("verify");
	});

	test("merge gate rejects an external check result for a different head", async () => {
		const f = await fixture();
		const g: WorkflowGraph = {
			version: 1, checks: [{ name: "quality", required: true }],
			nodes: [
				{ id: "plan-alignment", kind: "agent" },
				{ id: "merge-gate", kind: "gate", author_associations: ["OWNER"], command: "^/df approve$" },
				{ id: "merge", kind: "automation", script: "pr-merge" },
			],
			edges: [
				{ from: "plan-alignment", to: "merge-gate", on: { checks: "required_green" } },
				{ from: "merge-gate", to: "merge", on: { gate_outcome: "approved" } },
			],
		};
		await mkdir(f.runDir, { recursive: true });
		await writeFile(join(f.runDir, "state.df"), JSON.stringify({
			run_id: "merge-test", current_node: "plan-alignment", hints: [],
			outputs: { commit_sha: sha, pr_number: 1, aligned: true,
				plan_artifact: { scope: ["src/*"] }, planning_context: { issue: 1 },
				implementation_artifact: { files: ["src/a.ts"] } },
		}));
		await expect(runGraph(g, f.runDir, f.handlers,
			{ type: "checks.completed", conclusion: "required_green", ref: "b".repeat(40) } as GraphEvent,
			{ eventId: "check-wrong" })).rejects.toThrow("exact implementation SHA");
		const current = JSON.parse(await readFile(join(f.runDir, "state.df"), "utf8"));
		expect(current.current_node).toBe("plan-alignment");
		expect(() => assertMergeAuthorization(current.outputs)).toThrow("authorization");
	});
});
