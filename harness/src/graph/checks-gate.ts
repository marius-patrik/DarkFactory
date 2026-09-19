import type { WorkflowGraph } from "./types.ts";

export interface CheckStateSource {
	checkStates(ref: string): Promise<Map<string, "success" | "pending" | "failure">>;
}
export type ChecksGateResult =
	| { conclusion: "required_green" | "failed"; failing: string[]; missing: string[] }
	| { conclusion: "pending"; failing: string[]; missing: string[]; pending: string[] };

export async function evaluateChecksGate(
	graph: WorkflowGraph,
	source: CheckStateSource,
	ref: string,
): Promise<ChecksGateResult> {
	const states = await source.checkStates(ref);
	const required = graph.checks.filter((check) => check.required);
	const failing: string[] = [];
	const missing: string[] = [];
	const pending: string[] = [];
	for (const check of required) {
		const matches = [...states.entries()].filter(
			([reported]) => reported === check.name || reported.startsWith(`${check.name} (`),
		);
		if (matches.length === 0) {
			missing.push(check.name);
		} else if (matches.some(([, status]) => status === "failure")) {
			failing.push(check.name);
		} else if (matches.some(([, status]) => status === "pending")) {
			pending.push(check.name);
		}
	}
	if (failing.length) return { conclusion: "failed", failing, missing };
	if (missing.length || pending.length) return { conclusion: "pending", failing, missing, pending };
	return { conclusion: "required_green", failing: [], missing: [] };
}
