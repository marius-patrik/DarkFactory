import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertMergeAuthorization } from "../../../../packages/harness/src/graph/approval-evidence.ts";
import { runGraph, type NodeHandlers } from "../../../../packages/harness/src/graph/executor.ts";
import type { GraphEvent, WorkflowGraph } from "../../../../packages/harness/src/graph/types.ts";

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
const head = "a".repeat(40);
const actor = { login: "maintainer", association: "OWNER" as const, is_bot: false };
const graph: WorkflowGraph = {
	version: 1,
	checks: [{ name: "quality", required: true }],
	nodes: [
		{ id: "align", kind: "agent" },
		{
			id: "merge-gate",
			kind: "gate",
			author_associations: ["OWNER"],
			command: "^\\s*(?:/df\\s+|/)(?:approve|reject|revise)\\s*$",
		},
		{ id: "merge", kind: "automation", script: "pr-merge" },
	],
	edges: [
		{ from: "align", to: "merge-gate", on: { checks: "required_green" } },
		{ from: "merge-gate", to: "merge", on: { gate_outcome: "approved" } },
	],
};

async function ready() {
	const dir = await mkdtemp(join(tmpdir(), "df-merge-gate-"));
	roots.push(dir);
	await mkdir(dir, { recursive: true });
	await writeFile(
		join(dir, "state.df"),
		JSON.stringify({
			run_id: "request-2698",
			current_node: "align",
			iterations: {},
			hints: [],
			outputs: {
				commit_sha: head,
				pr_number: 901,
				aligned: true,
				planning_context: { request: 2698, revision: 1 },
				plan_artifact: { scope: ["src/**"] },
				implementation_artifact: { commit: head },
				verification: [{ check: "quality", status: "success", head }],
			},
			reviews: {
				planning: {
					subject: "planning",
					clean: true,
					findings: [],
					contextFingerprint: "approved-plan",
					approvedFingerprint: "approved-plan",
				},
			},
		}),
	);
	const handlers: NodeHandlers = {
		agent: async () => ({ outcome: "failure", outputs: {} }),
		automation: async () => ({ outcome: "success", outputs: { merged: true } }),
	};
	const checks: GraphEvent = { type: "checks.completed", conclusion: "required_green", ref: head };
	const gate = await runGraph(graph, dir, handlers, checks, { eventId: "checks" });
	expect(gate.current_node).toBe("merge-gate");
	expect(gate.outputs.awaiting_merge_fingerprint).toBeTruthy();
	return { dir, handlers };
}

describe("final approval is bound to the proposal presented at the gate", () => {
	test("a changed plan after checks invalidates authorization before merge", async () => {
		const { dir, handlers } = await ready();
		const path = join(dir, "state.df");
		const state = JSON.parse(await readFile(path, "utf8"));
		state.outputs.plan_artifact = { scope: ["other/**"] };
		await writeFile(path, JSON.stringify(state));
		await expect(
			runGraph(
				graph,
				dir,
				handlers,
				{ type: "comment", body: "/df approve", actor },
				{ eventId: "approval" },
			),
		).rejects.toThrow("Final merge gate changed");
	});

	test("unchanged checked proposal produces attributable exact-head approval", async () => {
		const { dir, handlers } = await ready();
		const approved = await runGraph(
			graph,
			dir,
			handlers,
			{ type: "comment", body: "/df approve", actor },
			{ eventId: "approval" },
		);
		expect(assertMergeAuthorization(approved.outputs)).toMatchObject({
			prNumber: 901,
			headSha: head,
			actor: "maintainer",
		});
	});
});
