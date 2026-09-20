import type { Actor, PlanAction } from "./types.ts";

export interface AnswerContractResult {
	valid: boolean;
	message?: string;
}

const MUTATION_CLAIMS = [
	/\b(?:i|we)(?:\s+(?:have|had)|'ve)?\s+(?:successfully\s+)?resolved\s+(?:the|these|all|any|some|my)?\s*conflicts\b/iu,
	/\b(?:i|we)(?:\s+(?:have|had)|'ve)?\s+pushed\s+(?:the|these|all|any|some|my)?\s*(?:changes|commits|branch|code|updates)\b/iu,
	/\b(?:i|we)(?:\s+(?:have|had)|'ve)?\s+merged\s+(?:the|this|my)?\s*(?:PR|pull\s+request|branch)\b/iu,
	/\b(?:i|we)(?:\s+(?:have|had)|'ve)?\s+committed\s+(?:the|these|all|any|some|my)?\s*(?:changes|files|code|updates|commits)\b/iu,
];

/**
 * Checks text-only agent responses (non-run actions such as comments or gates) for unsupported mutation claims.
 * Must never allow a text-only agent response or non-run action to claim it merged, pushed, resolved, or committed without observed effects.
 * @param actor - The event actor.
 * @param body - The answer text body.
 * @param action - The planned action (run vs comment/gate/hint).
 */
export function validateAnswerContract(_actor: Actor, body: string, action: PlanAction): AnswerContractResult {
	if (typeof body !== "string" || !body.trim()) {
		return { valid: true };
	}

	if (action.type !== "run") {
		const sanitizedBody = body
			.replace(/```[\s\S]*?```/g, "") // Strip code blocks
			.replace(/^>.*$/gm, ""); // Strip blockquotes

		for (const pattern of MUTATION_CLAIMS) {
			if (pattern.test(sanitizedBody)) {
				return {
					valid: false,
					message: "Answer contract violation: text-only response contains unsupported mutation claim.",
				};
			}
		}
	}
	return { valid: true };
}
