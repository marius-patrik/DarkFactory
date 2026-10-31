import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	FileProductionEffectJournal,
	IndeterminateEffectError,
} from "../../../../packages/harness/src/graph/durable-effects.ts";
import { runGraph, type NodeHandlers } from "../../../../packages/harness/src/graph/executor.ts";
import type { GraphEvent, WorkflowGraph } from "../../../../packages/harness/src/graph/types.ts";

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const opened: GraphEvent = {
	type: "issues.opened",
	actor: { login: "owner", association: "OWNER", is_bot: false },
};
const graph: WorkflowGraph = {
	version: 1,
	checks: [],
	nodes: [
		{ id: "intake", kind: "automation", script: "request-intake", trigger: { event: "issues.opened" } },
		{
			id: "fanout",
			kind: "automation",
			script: "board-sync",
			foreach: { items: "chunks", as: "chunk", max_parallel: 1 },
		},
	],
	edges: [{ from: "intake", to: "fanout", on: { node_outcome: "success" } }],
};

describe("durable fan-out recovery", () => {
	test("restarts an interrupted journaled automation with completed children reused", async () => {
		const root = await mkdtemp(join(tmpdir(), "df-foreach-recovery-"));
		roots.push(root);
		const effects = new FileProductionEffectJournal(join(root, "effects"));
		const remote = new Map<string, { value: number; evidence: string }>();
		const writes: number[] = [];
		let crash = true;
		const handlers: NodeHandlers = {
			agent: async () => {
				throw new Error("unexpected agent");
			},
			automation: async (node, ctx) => {
				if (node.id === "intake") return { outcome: "success", outputs: { chunks: [1, 2, 3] } };
				if (!ctx.effect || typeof ctx.item !== "number") throw new Error("missing journaled child");
				const item = ctx.item;
				const observed = await ctx.effect("remote.child", {
					observe: async (id) => remote.get(id),
					execute: async (id) => {
						writes.push(item);
						const result = { value: item, evidence: `remote:${id}` };
						remote.set(id, result);
						if (item === 2 && crash) {
							crash = false;
							throw new Error("crash after observed remote mutation");
						}
						return result;
					},
				});
				return { outcome: "success", outputs: { number: observed.value } };
			},
		};
		const options = () => ({
			eventId: "same-delivery",
			effects: new FileProductionEffectJournal(effects.directory),
			recoverableAutomations: ["board-sync"],
		});
		await expect(runGraph(graph, root, handlers, opened, options())).rejects.toBeInstanceOf(
			IndeterminateEffectError,
		);
		expect(writes).toEqual([1, 2]);
		const resumed = await runGraph(graph, root, handlers, opened, options());
		expect(writes).toEqual([1, 2, 3]);
		expect(resumed.iterations?.fanout).toBe(1);
		expect(resumed.outputs.fanout_results).toMatchObject([
			{ index: 0, outcome: "success", outputs: { number: 1 } },
			{ index: 1, outcome: "success", outputs: { number: 2 } },
			{ index: 2, outcome: "success", outputs: { number: 3 } },
		]);
		await runGraph(graph, root, handlers, opened, options());
		expect(writes).toEqual([1, 2, 3]);
	});

	test("cancellation reaches fan-out children without advancing a new effect ID", async () => {
		const root = await mkdtemp(join(tmpdir(), "df-foreach-cancel-"));
		roots.push(root);
		const controller = new AbortController();
		const items: number[] = [];
		const handlers: NodeHandlers = {
			agent: async () => {
				throw new Error("unexpected agent");
			},
			automation: async (node, ctx) => {
				if (node.id === "intake") return { outcome: "success", outputs: { chunks: [1, 2] } };
				if (typeof ctx.item !== "number") throw new Error("missing child item");
				expect(ctx.signal).toBe(controller.signal);
				items.push(ctx.item);
				controller.abort();
				return { outcome: "success", outputs: {} };
			},
		};
		await expect(
			runGraph(graph, root, handlers, opened, {
				eventId: "cancelled",
				effects: new FileProductionEffectJournal(join(root, "effects")),
				recoverableAutomations: ["board-sync"],
				signal: controller.signal,
			}),
		).rejects.toThrow("fan-out cancelled");
		expect(items).toEqual([1]);
	});

	test("parallel child failure waits for sibling completion before releasing the run lock", async () => {
		const root = await mkdtemp(join(tmpdir(), "df-foreach-parallel-"));
		roots.push(root);
		const parallel: WorkflowGraph = {
			...graph,
			nodes: graph.nodes.map((node) =>
				node.id === "fanout" ? { ...node, foreach: { items: "chunks", as: "chunk", max_parallel: 2 } } : node,
			),
		};
		let siblingSettled = false;
		const handlers: NodeHandlers = {
			agent: async () => {
				throw new Error("unexpected agent");
			},
			automation: async (node, ctx) => {
				if (node.id === "intake") return { outcome: "success", outputs: { chunks: [1, 2] } };
				if (ctx.item === 1) throw new IndeterminateEffectError("a".repeat(64));
				await Bun.sleep(80);
				siblingSettled = true;
				return { outcome: "success", outputs: {} };
			},
		};
		await expect(
			runGraph(parallel, root, handlers, opened, {
				eventId: "parallel",
				effects: new FileProductionEffectJournal(join(root, "effects")),
			}),
		).rejects.toBeInstanceOf(IndeterminateEffectError);
		expect(siblingSettled).toBe(true);
	});

});
