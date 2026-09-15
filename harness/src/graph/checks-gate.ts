import type { WorkflowGraph } from "./types.ts";

/**
 * Source for retrieving current check states for a given ref.
 * Implementations should provide a method to fetch check statuses from a CI system.
 */
export interface CheckStateSource {
	/** Get the current check states for the given ref. */
	checkStates(ref: string): Promise<Map<string, "success" | "pending" | "failure">>
}
/**
 * Result of the checks gate evaluation.
 */
export type ChecksGateResult =
/** Result when checks are required green or failed. */
| {
  /** Overall conclusion of the checks gate. */
  conclusion: "required_green" | "failed";
  /** List of failing check names. */
  failing: string[];
  /** List of missing check names. */
  missing: string[];
}
/** Result when checks are pending. */
| {
  /** Overall conclusion of the checks gate. */
  conclusion: "pending";
  /** List of failing check names. */
  failing: string[];
  /** List of missing check names. */
  missing: string[];
  /** List of pending check names. */
  pending: string[];
};

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
	ref: string
): Promise<ChecksGateResult> {
	const states = await source.checkStates(ref);
	const required = graph.checks.filter((check) => check.required);
	const failing: string[] = [];
	const missing: string[] = [];
	const pending: string[] = [];
	for (const check of required) {
		const matches = [...states.entries()].filter(([reported]) => reported === check.name || reported.startsWith(`${check.name} (`));
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
