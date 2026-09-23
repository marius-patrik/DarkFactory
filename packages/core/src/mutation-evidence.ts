import {
	type MutationClaim,
	type MutationClaimPayload,
	type MutationEvidence,
	type MutationValidationResult,
	mutationClaimSchema,
} from "@darkfactory/protocol/mutation-evidence";

export {
	type MutationClaim,
	type MutationClaimPayload,
	type MutationEvidence,
	type MutationValidationResult,
	mutationClaimItemSchema,
	mutationClaimSchema,
} from "@darkfactory/protocol/mutation-evidence";

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
	if (left.length !== right.length) return false;
	const a = [...left].sort();
	const b = [...right].sort();
	return a.every((value, index) => value === b[index]);
}

/**
 * Validate typed mutation claims against exact observed effect targets.
 *
 * Presence of some mutation evidence is never sufficient: branch, commit, PR and
 * file targets must match the effect that was actually observed.
 *
 * @param claims - Typed claims emitted by the routed structured-output boundary.
 * @param evidence - Deterministic workspace/git/GitHub evidence observed by the engine.
 * @returns Validation result containing every unsupported claim.
 */
export function validateMutationClaims(
	claims: readonly MutationClaim[],
	evidence: MutationEvidence,
): MutationValidationResult {
	const unsupportedClaims: MutationClaim[] = [];

	for (const claim of claims) {
		if (!evidence.hasWritePath) {
			unsupportedClaims.push(claim);
			continue;
		}

		switch (claim.kind) {
			case "pushed":
				if (evidence.pushedBranch !== claim.branch) unsupportedClaims.push(claim);
				break;
			case "merged":
				if (evidence.mergedPr !== claim.pr) unsupportedClaims.push(claim);
				break;
			case "committed":
				if (evidence.committedSha !== claim.sha) unsupportedClaims.push(claim);
				break;
			case "resolved_conflicts":
				if (!evidence.resolvedConflicts || !sameStringSet(evidence.resolvedConflicts, claim.files)) {
					unsupportedClaims.push(claim);
				}
				break;
			case "modified_files":
				if (!evidence.changedFiles || !sameStringSet(evidence.changedFiles, claim.files)) {
					unsupportedClaims.push(claim);
				}
				break;
		}
	}

	return {
		valid: unsupportedClaims.length === 0,
		unsupportedClaims,
	};
}

/**
 * Enforce truthful prose using an already-extracted typed claim payload.
 *
 * Claim extraction belongs to the routed structured-output boundary; this layer
 * only compares typed claims with deterministic effect evidence.
 *
 * @param text - Candidate human-readable answer.
 * @param payload - Structured mutation claims extracted from that answer.
 * @param evidence - Observed engine evidence for the run.
 * @returns Original or annotated text plus unsupported claims.
 */
export function enforceTruthfulAnswer(
	text: string,
	payload: MutationClaimPayload,
	evidence: MutationEvidence,
): { allowed: boolean; text: string; unsupportedClaims: MutationClaim[] } {
	const parsed = mutationClaimSchema.safeParse(payload);
	if (!parsed.success) {
		throw new Error(`Invalid mutation claim payload: ${parsed.error.message}`);
	}
	const validation = validateMutationClaims(parsed.data.claims, evidence);
	if (validation.valid) {
		return { allowed: true, text, unsupportedClaims: [] };
	}

	const warningNotice = evidence.hasWritePath
		? "\n\n> [!NOTE]\n> One or more repository mutation claims were not supported by the observed branch, commit, PR, or file effects."
		: "\n\n> [!NOTE]\n> This run had no repository write path. No repository mutation claim is accepted as completed.";

	return {
		allowed: false,
		text: `${text.trim()}${warningNotice}`,
		unsupportedClaims: validation.unsupportedClaims,
	};
}
