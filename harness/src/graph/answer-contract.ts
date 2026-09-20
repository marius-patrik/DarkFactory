import type { Actor, PlanAction } from "./types.ts";

export interface AnswerContractResult {
	valid: boolean;
	message?: string;
}

const MUTATION_CLAIMS = [
	/\b(?:successfully\s+)?resolved\s+(?:the|these|all|any|some)?\s*conflicts\b/iu,
	/\bpushed\s+(?:the|these|all|any|some|my)?\s*(?:changes|commits|branch|code|updates)\b/iu,
	/\bmerged\s+(?:the|this|my)?\s*(?:PR|pull\s+request|branch)\b/iu,
	/\bcommitted\s+(?:the|these|all|any|some|my)?\s*(?:changes|files|code|updates|commits)\b/iu,
];

/**
 * Checks text-only agent responses for unsupported mutation claims.
 * Must never allow a respond run to claim it merged, pushed, resolved, or committed.
 * @param actor - The event actor.
 * @param body - The answer text body.
 * @param action - The planned action (run vs comment/gate).
 */
export function validateAnswerContract(_actor: Actor, body: string, action: PlanAction): AnswerContractResult {
	if (action.type !== "run") {
		for (const pattern of MUTATION_CLAIMS) {
			if (pattern.test(body)) {
				return {
					valid: false,
					message: "Answer contract violation: text-only response contains unsupported mutation claim.",
				};
			}
		}
	}
	return { valid: true };
}
