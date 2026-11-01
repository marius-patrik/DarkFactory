import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileProductionEffectJournal } from "../../../../packages/harness/src/graph/durable-effects.ts";
import {
	runGraph,
	type DistributedGraphLease,
	type NodeHandlers,
} from "../../../../packages/harness/src/graph/executor.ts";
import type { GraphEvent, WorkflowGraph } from "../../../../packages/harness/src/graph/types.ts";

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
const event: GraphEvent = {
	type: "issues.opened",
	actor: { login: "owner", association: "OWNER", is_bot: false },
};
const graph: WorkflowGraph = {
	version: 1,
	checks: [],
	nodes: [{ id: "apply", kind: "automation", script: "board-sync", trigger: { event: "issues.opened" } }],
	edges: [],
};

describe("DF-10 distributed execution lease integration boundary", () => {
	test("a lost fence blocks an external effect before it can mutate", async () => {
		const dir = await mkdtemp(join(tmpdir(), "df-lease-lost-"));
		roots.push(dir);
		let checks = 0;
		let writes = 0;
		const lease: DistributedGraphLease = {
			withLease: async (_run, work) =>
				work({
					assertOwned: async () => {
						if (++checks >= 3) throw new Error("distributed lease ownership lost");
					},
				}),
		};
		const handlers: NodeHandlers = {
			agent: async () => {
				throw new Error("unexpected agent");
			},
			automation: async (_node, ctx) => {
				if (!ctx.effect) throw new Error("missing durable effect");
				await ctx.effect("external.write", {
					observe: async () => undefined,
					execute: async () => {
						writes++;
						return { value: true, evidence: "remote" };
					},
				});
				return { outcome: "success", outputs: {} };
			},
		};
		await expect(
			runGraph(graph, dir, handlers, event, {
				eventId: "lease-event",
				effects: new FileProductionEffectJournal(join(dir, "effects")),
				distributedLease: lease,
			}),
		).rejects.toThrow("distributed lease ownership lost");
		expect(writes).toBe(0);
	});

	test("different local run directories cannot overlap while a shared remote lease is held", async () => {
		const root = await mkdtemp(join(tmpdir(), "df-two-runner-"));
		roots.push(root);
		let owned = false;
		let maxConcurrent = 0;
		let running = 0;
		const lease: DistributedGraphLease = {
			withLease: async (_run, work) => {
				while (owned) await Bun.sleep(5);
				owned = true;
				try {
					return await work({
						assertOwned: async () => {
							if (!owned) throw new Error("lost lease");
						},
					});
				} finally {
					owned = false;
				}
			},
		};
		const handlers: NodeHandlers = {
			agent: async () => {
				throw new Error("unexpected agent");
			},
			automation: async () => {
				running++;
				maxConcurrent = Math.max(maxConcurrent, running);
				await Bun.sleep(30);
				running--;
				return { outcome: "success", outputs: {} };
			},
		};
		await Promise.all(
			[1, 2].map((number) =>
				runGraph(graph, join(root, `worker-${number}`), handlers, event, {
					eventId: `runner-${number}`,
					distributedLease: lease,
				}),
			),
		);
		expect(maxConcurrent).toBe(1);
	});
});
