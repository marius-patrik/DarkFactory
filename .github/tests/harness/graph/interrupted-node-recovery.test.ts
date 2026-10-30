import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	FileProductionEffectJournal,
	IndeterminateEffectError,
	StaleEffectError,
} from "../../../../packages/harness/src/graph/durable-effects.ts";
import { runGraph, type NodeHandlers } from "../../../../packages/harness/src/graph/executor.ts";
import type { GraphEvent, WorkflowGraph } from "../../../../packages/harness/src/graph/types.ts";

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
const ingress: GraphEvent = {
	type: "issues.opened",
	actor: { login: "owner", association: "OWNER", is_bot: false },
};
const graph: WorkflowGraph = {
	version: 1,
	checks: [],
	nodes: [
		{ id: "sync", kind: "automation", script: "board-sync", trigger: { event: "issues.opened" } },
		{
			id: "done",
			kind: "gate",
			author_associations: ["OWNER"],
			command: "^\\s*(?:/df\\s+|/)(?:approve|reject|revise)\\s*$",
		},
	],
	edges: [{ from: "sync", to: "done", on: { node_outcome: "success" } }],
};

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), "df-node-recovery-"));
	roots.push(root);
	const remote = join(root, "remote.txt");
	const effects = join(root, "effects");
	let attempts = 0;
	let before = false;
	const handlers: NodeHandlers = {
		agent: async () => {
			throw new Error("Unexpected model replay");
		},
		automation: async (_node, ctx) => {
			if (!ctx.effect) throw new Error("Missing journal");
			const observed = await ctx.effect("github.comment", {
				observe: async () => {
					try {
						const value = await readFile(remote, "utf8");
						return { value, evidence: `remote:${value}` };
					} catch (error) {
						if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
						throw error;
					}
				},
				execute: async () => {
					attempts++;
					if (before) throw new Error("Crashed before mutation");
					await writeFile(remote, "published");
					throw new Error("Crashed after remote write");
				},
			});
			return { outcome: "success", outputs: { publication: observed.value } };
		},
	};
	const options = () => ({
		eventId: "delivery-1",
		effects: new FileProductionEffectJournal(effects),
		recoverableAutomations: ["board-sync"],
	});
	return {
		root,
		remote,
		handlers,
		options,
		get attempts() {
			return attempts;
		},
		crashBeforeMutation() {
			before = true;
		},
	};
}

describe("same-executor interrupted automation recovery", () => {
	test("remote write before checkpoint is observed, not repeated, after restart and duplicate ingress", async () => {
		const f = await fixture();
		await expect(runGraph(graph, f.root, f.handlers, ingress, f.options())).rejects.toBeInstanceOf(IndeterminateEffectError);
		const pending = JSON.parse(await readFile(join(f.root, "state.df"), "utf8"));
		expect(pending.pending_node).toMatchObject({ node: "sync", iteration: 1 });
		expect(pending.pending_node.action.nodes).toEqual(["sync"]);
		const result = await runGraph(graph, f.root, f.handlers, ingress, f.options());
		expect(result.outputs.publication).toBe("published");
		expect(result.iterations?.sync).toBe(1);
		expect(result.current_node).toBe("done");
		await runGraph(graph, f.root, f.handlers, ingress, f.options());
		expect(f.attempts).toBe(1);
	});

	test("absent remote outcome after durable intent remains ambiguous and never repeats mutation", async () => {
		const f = await fixture();
		f.crashBeforeMutation();
		await expect(runGraph(graph, f.root, f.handlers, ingress, f.options())).rejects.toBeInstanceOf(IndeterminateEffectError);
		await expect(runGraph(graph, f.root, f.handlers, ingress, f.options())).rejects.toBeInstanceOf(IndeterminateEffectError);
		expect(f.attempts).toBe(1);
	});

	test("untrusted automation and changed delivery cannot hijack unfinished intent", async () => {
		const f = await fixture();
		await expect(runGraph(graph, f.root, f.handlers, ingress, f.options())).rejects.toBeInstanceOf(IndeterminateEffectError);
		await expect(
			runGraph(graph, f.root, f.handlers, ingress, {
				...f.options(),
				recoverableAutomations: [],
			}),
		).rejects.toThrow("reconcile effects before retry");
		await expect(
			runGraph(graph, f.root, f.handlers, ingress, {
				...f.options(),
				eventId: "different",
			}),
		).rejects.toThrow("active event");
		expect(f.attempts).toBe(1);
	});

	test("durably completed effect but lost node checkpoint rejects changed remote state", async () => {
		const f = await fixture();
		await expect(runGraph(graph, f.root, f.handlers, ingress, f.options())).rejects.toBeInstanceOf(IndeterminateEffectError);
		const original = f.handlers.automation;
		f.handlers.automation = async (node, ctx) => {
			await original(node, ctx);
			throw new IndeterminateEffectError("simulated-checkpoint-loss");
		};
		await expect(runGraph(graph, f.root, f.handlers, ingress, f.options())).rejects.toBeInstanceOf(IndeterminateEffectError);
		await writeFile(f.remote, "changed");
		await expect(runGraph(graph, f.root, f.handlers, ingress, f.options())).rejects.toBeInstanceOf(StaleEffectError);
		expect(f.attempts).toBe(1);
	});

	test("cancellation during recovery leaves intent intact for a later exact-ID restart", async () => {
		const f = await fixture();
		await expect(runGraph(graph, f.root, f.handlers, ingress, f.options())).rejects.toBeInstanceOf(IndeterminateEffectError);
		const controller = new AbortController();
		controller.abort();
		await expect(
			runGraph(graph, f.root, f.handlers, ingress, {
				...f.options(),
				signal: controller.signal,
			}),
		).rejects.toThrow("cancelled");
		const result = await runGraph(graph, f.root, f.handlers, ingress, f.options());
		expect(result.outputs.publication).toBe("published");
		expect(f.attempts).toBe(1);
	});
});
