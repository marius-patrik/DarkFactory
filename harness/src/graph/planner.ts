import type { AgentNode, GateNode, GraphEdge, GraphEvent, PlanAction, RunState, WorkflowGraph } from "./types.ts";

const COMMAND = /^\s*(?:\/df\s+|\/)(approve|reject|revise)\s*$/;
const RESUME = /^\s*(?:\/df\s+|\/)resume\s*$/;
function none(reason: string): PlanAction { return { type: "none", reason }; }
function guard(expression: string | undefined, outputs: Record<string, unknown>): boolean {
	if (!expression) return true;
	return expression.split(/\s*&&\s*/).every((term) => {
		const match = term.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(==|!=)\s*(true|false|null|-?\d+|"[^"]*")$/);
		if (!match) return false;
		const rhs = match[3] === "true" ? true : match[3] === "false" ? false : match[3] === "null" ? null : match[3]!.startsWith('"') ? match[3]!.slice(1, -1) : Number(match[3]);
		return match[2] === "==" ? outputs[match[1]!] === rhs : outputs[match[1]!] !== rhs;
	});
}
function actionFor(graph: WorkflowGraph, edge: GraphEdge, state: RunState, feedback?: string): PlanAction {
	const target = graph.nodes.find((node) => node.id === edge.to)!;
	const alerts = edge.loop?.safety_budget !== undefined && (state.iterations?.[edge.from] ?? 0) >= edge.loop.safety_budget ? [`${edge.from} exceeded safety budget ${edge.loop.safety_budget}`] : undefined;
	if (target.kind === "gate") return { type: "gate", node: target.id, status: "Blocked" };
	return { type: "run", nodes: [target.id], ...(feedback ? { feedback } : {}), ...(edge.loop?.kind === "deviation_rework" ? { revert: "out_of_scope_commits" as const } : {}), ...(alerts ? { alerts } : {}) };
}
function matchingEdge(graph: WorkflowGraph, from: string, predicate: (edge: GraphEdge) => boolean, outputs: Record<string, unknown>): GraphEdge | undefined {
	return graph.edges.find((edge) => edge.from === from && predicate(edge) && guard(edge.on.when, outputs));
}
function authorized(gate: GateNode, event: Extract<GraphEvent, {actor: unknown}>, state: RunState): boolean {
	return !event.actor.is_bot && (gate.author_associations.includes(event.actor.association as never) || (gate.requester_can_approve === true && event.actor.login === state.requester));
}

export function plan(graph: WorkflowGraph, event: GraphEvent, state: RunState): PlanAction {
	const current = graph.nodes.find((node) => node.id === state.current_node);
	if (!current) return none(`unknown current node ${state.current_node}`);
	if ("actor" in event && event.actor.is_bot) return none("bot ingress ignored");
	if (event.type === "issues.opened" || event.type === "issues.labeled") {
		const root = graph.nodes.find((node) => node.trigger?.event?.split("|").includes(event.type));
		if (root && event.type === "issues.labeled") {
			const ingress = graph.edges.find((edge) => edge.from === root.id && "event" in edge.on && edge.on.event.split("|").includes(event.type));
			if (ingress && "event" in ingress.on && ingress.on.filter.label && ingress.on.filter.label !== event.label) return none("event filter did not match");
		}
		return root ? { type: "run", nodes: [root.id] } : none("event has no trigger");
	}
	if (event.type === "node.completed") {
		if (event.node !== state.current_node) return none("event node disagrees with persisted state");
		if (event.outcome === "quota_exhausted" && (current as AgentNode).quota_policy) return { type: "comment", node: current.id, status: "Blocked", message: "Quota exhausted; run checkpointed. Use /df resume after quota resets." };
		const outputs = { ...state.outputs, ...event.outputs };
		const edge = matchingEdge(graph, current.id, (item) => "node_outcome" in item.on && item.on.node_outcome === event.outcome, outputs);
		return edge ? actionFor(graph, edge, state) : none("no matching node edge");
	}
	if (event.type === "checks.completed") {
		const edge = matchingEdge(graph, current.id, (item) => "checks" in item.on && item.on.checks === event.conclusion, state.outputs);
		return edge ? actionFor(graph, edge, state) : none("no matching check edge");
	}
	if (event.type === "comment") {
		if (state.quota_blocked && RESUME.test(event.body ?? "")) return { type: "run", nodes: [current.id], resume_run_id: state.run_id };
		if (current.kind !== "gate") return none("comment is not actionable here");
		if (!authorized(current, event, state)) return none("actor is not authorized");
		const command = (event.body ?? "").match(COMMAND)?.[1];
		if (!command) return state.hints.includes(current.id) ? none("gate command not recognized") : { type: "hint", node: current.id, message: "Use /df approve, /df reject, or /df revise." };
		const outcome = command === "approve" ? "approved" : "rejected";
		const edge = matchingEdge(graph, current.id, (item) => "gate_outcome" in item.on && item.on.gate_outcome === outcome, state.outputs);
		return edge ? actionFor(graph, edge, state, outcome === "rejected" ? event.body : undefined) : none("no matching gate edge");
	}
	if (event.type === "review") {
		if (current.kind !== "gate" || !authorized(current, event, state)) return none("actor is not authorized");
		if (event.state !== "APPROVED" || !current.allow_review_state?.includes("APPROVED")) return none("review is not an approval");
		const edge = matchingEdge(graph, current.id, (item) => "gate_outcome" in item.on && item.on.gate_outcome === "approved", state.outputs);
		return edge ? actionFor(graph, edge, state) : none("no matching gate edge");
	}
	if (event.type === "schedule") {
		if (current.id === "resume-sweep") {
			const checkpoint = state.checkpoints?.find((item) => item.eligible);
			return checkpoint ? { type: "run", nodes: [checkpoint.node], resume_run_id: checkpoint.run_id } : none("no eligible checkpoints");
		}
		if (current.kind === "gate" && current.reminder_after_days && state.blocked_since && event.now && Date.parse(event.now) - Date.parse(state.blocked_since) >= current.reminder_after_days * 86_400_000) return { type: "comment", node: current.id, status: "Blocked", message: "Reminder: the plan deviation is awaiting approval or rejection." };
		const root = graph.nodes.find((node) => node.trigger?.schedule === event.schedule);
		return root ? { type: "run", nodes: [root.id] } : none("schedule has no trigger");
	}
	return none("event is not actionable");
}
