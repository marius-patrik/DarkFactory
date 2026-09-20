import type { WorkflowGraph } from "./types.ts";

/**
 * Source for retrieving current check states for a given ref.
 * Implementations should provide a method to fetch check statuses from a CI system.
 */
export interface CheckStateSource {
	checkStates(ref: string): Promise<Map<string, "success" | "pending" | "failure">>;
}
/**
 * Result of the checks gate evaluation.
 */
export type ChecksGateResult =
	| { conclusion: "required_green" | "failed"; failing: string[]; missing: string[] }
	| { conclusion: "pending"; failing: string[]; missing: string[]; pending: string[] };

/**
 * Evaluate the checks gate for a given workflow graph and ref.
 * @param graph - The workflow graph containing checks definitions.
 * @param source - Source to retrieve current check states.
 * @param ref - The ref (e.g., commit SHA) to evaluate checks for.
 * @returns The result of the checks gate evaluation.
 */
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
