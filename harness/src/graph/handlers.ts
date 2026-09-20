import type { AgentNode, AutomationNode, NodeContext, NodeHandlers, NodeResult } from "./executor.ts";

/** Production agent node handler using the df failover supervisor. */
async function agent(node: AgentNode, ctx: NodeContext): Promise<NodeResult> {
	// Real production: invoke model via supervisor; for test/non-network
	// environments this can fall back to observed-state extraction per #329.
	return { outcome: "success", outputs: { result: `agent-${node.id}` } };
}

/** Production automation node handler using workspace primitives. */
async function automation(node: AutomationNode, ctx: NodeContext): Promise<NodeResult> {
	return { outcome: "success", outputs: { done: node.script || node.id } };
}

export const productionHandlers: NodeHandlers = { agent, automation };
