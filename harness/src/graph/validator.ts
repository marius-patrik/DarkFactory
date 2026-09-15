import { z } from "zod";
import { CANONICAL_STATUSES, type GraphEdge, type GraphNode, type WorkflowGraph } from "./types.ts";

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const base = z.object({ id, kind: z.enum(["agent", "gate", "automation", "check-reference"]), description: z.string().optional(), inputs: z.array(z.string()).optional(), outputs: z.array(z.string()).optional(), board_status: z.record(z.string(), z.string()).optional(), trigger: z.object({ event: z.string().optional(), schedule: z.string().optional() }).optional(), filter: z.object({ label: z.string().optional(), ignore_bots: z.boolean().optional() }).optional(), foreach: z.object({ items: z.string(), max_parallel: z.number().int().positive().optional(), as: z.string().optional() }).optional() });
const nodeSchema = z.discriminatedUnion("kind", [
	base.extend({ kind: z.literal("agent"), identity: z.string().optional(), reasoning: z.enum(["standard", "hard"]).optional(), chain: z.array(z.string()).optional(), timeout: z.string().optional(), iteration: z.object({ context_file: z.string(), safety_budget: z.number().int().positive().optional() }).optional(), quota_policy: z.object({ on_exhaustion: z.literal("checkpoint_and_block"), resume: z.literal("sweep_or_command") }).optional(), prompt: z.string().optional(), mode: z.enum(["read", "write"]).optional(), workdir: z.string().optional(), max_turns: z.number().int().positive().optional() }),
	base.extend({ kind: z.literal("gate"), author_associations: z.array(z.enum(["OWNER", "MEMBER", "COLLABORATOR", "AUTHOR"])).min(1), requester_can_approve: z.boolean().optional(), command: z.string(), allow_review_state: z.tuple([z.literal("APPROVED")]).optional(), reminder_after_days: z.number().int().positive().optional(), on_reject: z.object({ action: z.enum(["route_to", "revert_deviation"]), target: id }).optional() }),
	base.extend({ kind: z.literal("automation"), script: z.string(), side_effects: z.object({ close_bound_issues: z.boolean().optional(), clear_checkpoints: z.boolean().optional() }).optional() }),
	base.extend({ kind: z.literal("check-reference"), check: z.string(), required: z.boolean() }),
]);
const onSchema = z.union([
	z.object({ event: z.string(), filter: z.object({ ignore_bots: z.boolean().optional(), label: z.string().optional() }), when: z.string().optional() }).strict(),
	z.object({ schedule: z.literal(true), when: z.string().optional() }).strict(),
	z.object({ node_outcome: z.enum(["success", "failure", "quota_exhausted"]), when: z.string().optional() }).strict(),
	z.object({ gate_outcome: z.enum(["approved", "rejected"]), when: z.string().optional() }).strict(),
	z.object({ checks: z.enum(["required_green", "failed"]), when: z.string().optional() }).strict(),
	z.object({ children: z.enum(["all_done", "any_failed"]), when: z.string().optional() }).strict(),
]);
const rawSchema = z.object({ version: z.literal(1), checks: z.array(z.object({ name: z.string().min(1), required: z.boolean() })), nodes: z.array(nodeSchema), edges: z.array(z.object({ from: id, to: id, on: onSchema, loop: z.object({ kind: z.enum(["self_review", "ci_repair", "gate_revision", "deviation_rework"]), safety_budget: z.number().int().positive().optional() }).optional() })) });
const STRICT_GATE_COMMAND = "^\\s*(?:/df\\s+|/)(?:approve|reject|revise)\\s*$";

export class GraphValidationError extends Error {
	constructor(public readonly issues: string[]) { super(`Invalid workflow graph:\n${issues.map((issue) => `- ${issue}`).join("\n")}`); this.name = "GraphValidationError"; }
}

function pathOf(path: PropertyKey[]): string { return path.map((part, index) => typeof part === "number" ? `[${part}]` : index === 0 ? String(part) : `.${String(part)}`).join(""); }

function pathBetween(edges: GraphEdge[], start: string, goal: string): string[] | undefined {
	const queue: string[][] = [[start]];
	while (queue.length) {
		const path = queue.shift()!;
		for (const edge of edges.filter((item) => item.from === path.at(-1))) {
			if (path.includes(edge.to)) continue;
			const next = [...path, edge.to];
			if (edge.to === goal) return next;
			queue.push(next);
		}
	}
}

export function validateGraph(value: unknown): WorkflowGraph {
	const parsed = rawSchema.safeParse(value);
	if (!parsed.success) throw new GraphValidationError(parsed.error.issues.map((issue) => `${pathOf(issue.path)}: ${issue.message}`));
	const graph = parsed.data as WorkflowGraph;
	const issues: string[] = [];
	const ids = new Set<string>();
	for (const node of graph.nodes) {
		if (ids.has(node.id)) issues.push(`nodes[${node.id}].id: duplicate node id`);
		ids.add(node.id);
		for (const [key, status] of Object.entries(node.board_status ?? {})) if (!(CANONICAL_STATUSES as readonly string[]).includes(status!)) issues.push(`nodes[${node.id}].board_status.${key}: unknown canonical status \"${status}\"`);
		if (node.kind === "gate" && node.command !== STRICT_GATE_COMMAND) issues.push(`nodes[${node.id}].command: must accept only /df approve|reject|revise and /approve|reject|revise`);
		if (node.kind === "gate" && node.on_reject && !graph.nodes.some((candidate) => candidate.id === node.on_reject!.target)) issues.push(`nodes[${node.id}].on_reject.target: unknown node \"${node.on_reject.target}\"`);
		if (node.kind === "agent") for (const [index, candidate] of (node.chain ?? []).entries()) if (!/^[^/@]+\/[^@]+@[^@]+$/.test(candidate)) issues.push(`nodes[${node.id}].chain[${index}]: expected provider/model@account`);
	}
	graph.edges.forEach((edge, index) => {
		if (!ids.has(edge.from)) issues.push(`edges[${index}].from: unknown node \"${edge.from}\"`);
		if (!ids.has(edge.to)) issues.push(`edges[${index}].to: unknown node \"${edge.to}\"`);
		if ("event" in edge.on && edge.on.filter.ignore_bots !== true) issues.push(`edges[${index}].on.filter.ignore_bots: event ingress must explicitly be true`);
		if (edge.on.when) {
			const source = graph.nodes.find((node) => node.id === edge.from);
			const words = [...edge.on.when.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?:==|!=)/g)].map((match) => match[1]!);
			for (const word of words) if (!source?.outputs?.includes(word)) issues.push(`edges[${index}].on.when: \"${word}\" is not a declared output of ${edge.from}`);
		}
		// Validate children edges: must start at a node with foreach
		if ("children" in edge.on) {
			const sourceNode = graph.nodes.find((node) => node.id === edge.from);
			if (!sourceNode?.foreach) {
				issues.push(`edges[${index}].on.children: edge with children trigger must originate from a node with a foreach field`);
			}
		}
	});
	for (const node of graph.nodes) (node.inputs ?? []).forEach((input, index) => {
		const upstream = graph.nodes.some((producer) => producer.outputs?.includes(input) && (producer.id === node.id || pathBetween(graph.edges, producer.id, node.id)));
		if (!upstream) issues.push(`nodes[${node.id}].inputs[${index}]: \"${input}\" is not produced by an upstream node`);
	});
	// Validate foreach.items: must be a declared output of an upstream node
	graph.nodes.forEach((node, nodeIndex) => {
		if (node.foreach) {
			const { items } = node.foreach;
			// Check that items is an output of some upstream node
			const upstream = graph.nodes.some((producer) => producer.outputs?.includes(items) && (producer.id === node.id || pathBetween(graph.edges, producer.id, node.id)));
			if (!upstream) {
				issues.push(`nodes[${nodeIndex}].foreach.items: \"${items}\" is not produced by an upstream node`);
			}
		}
	});
	const roots = graph.nodes.filter((node) => node.trigger?.event || node.trigger?.schedule || node.kind === "check-reference").map((node) => node.id);
	const reachable = new Set(roots);
	for (let changed = true; changed;) { changed = false; for (const edge of graph.edges) if (reachable.has(edge.from) && !reachable.has(edge.to)) { reachable.add(edge.to); changed = true; } }
	for (const node of graph.nodes) if (!reachable.has(node.id)) issues.push(`nodes[${node.id}]: unreachable from an event trigger or schedule`);
	const order = new Map(graph.nodes.map((node, index) => [node.id, index]));
	graph.edges.forEach((edge) => {
		if (!ids.has(edge.from) || !ids.has(edge.to) || (order.get(edge.to) ?? 0) > (order.get(edge.from) ?? 0)) return;
		const path = pathBetween(graph.edges.filter((candidate) => candidate !== edge), edge.to, edge.from);
		if (path && !edge.loop) issues.push(`edges: cycle ${[edge.from, ...path].join(" -> ")} is not declared as a loop`);
	});
	for (const node of graph.nodes.filter((item): item is Extract<GraphNode, {kind: "check-reference"}> => item.kind === "check-reference")) if (!graph.checks.some((check) => check.name === node.check)) issues.push(`nodes[${node.id}].check: unknown external check \"${node.check}\"`);
	if (issues.length) throw new GraphValidationError([...new Set(issues)]);
	return graph;
}
