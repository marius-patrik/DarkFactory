import type { Actor, PlanAction } from "./types.ts";

export interface AnswerContractResult {
	valid: boolean;
	message?: string;
}

/**
 * Checks text-only agent responses for unsupported mutation claims.
 * Must never allow a respond run to claim it merged, pushed, resolved, or committed.
 * @param actor - The event actor.
 * @param body - The answer text body.
 * @param action - The planned action (run vs comment/gate).
 */
export function validateAnswerContract(actor: Actor, body: string, action: PlanAction): AnswerContractResult {
	const mutationClaims = [
		/successfully resolved (?:these )?conflicts/iu,
		/pushed (?:the )?changes/iu,
		/merged (?:the )?PR/iu,
		/committed/iu,
	];

	if (action.type !== "run") {
		for (const pattern of mutationClaims) {
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
