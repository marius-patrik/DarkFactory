import { z } from "zod";

/** Structured repository-mutation claim emitted through the routed extraction boundary. */
export const mutationClaimItemSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("pushed"),
		branch: z.string().min(1),
		detail: z.string().optional(),
	}),
	z.object({
		kind: z.literal("merged"),
		pr: z.number().int().positive(),
		detail: z.string().optional(),
	}),
	z.object({
		kind: z.literal("committed"),
		sha: z.string().min(1),
		detail: z.string().optional(),
	}),
	z.object({
		kind: z.literal("resolved_conflicts"),
		files: z.array(z.string().min(1)).min(1),
		detail: z.string().optional(),
	}),
	z.object({
		kind: z.literal("modified_files"),
		files: z.array(z.string().min(1)).min(1),
		detail: z.string().optional(),
	}),
]);

/** Schema for the structured mutation-claim payload extracted from model output. */
export const mutationClaimSchema = z.object({
	claims: z.array(mutationClaimItemSchema),
	summary: z.string(),
});

/** One typed repository-mutation claim. */
export type MutationClaim = z.infer<typeof mutationClaimItemSchema>;

/** Routed structured payload containing mutation claims. */
export type MutationClaimPayload = z.infer<typeof mutationClaimSchema>;

/** Observed run evidence used to validate mutation claims. */
export interface MutationEvidence {
	/** True if the run had write permissions and an active worktree. */
	hasWritePath: boolean;
	/** SHA of the commit created during the run, if any. */
	committedSha?: string;
	/** Remote branch pushed during the run, if any. */
	pushedBranch?: string;
	/** PR number merged during the run, if any. */
	mergedPr?: number;
	/** Files where merge conflicts were actually resolved. */
	resolvedConflicts?: string[];
	/** Files verified to have been modified in the workspace. */
	changedFiles?: string[];
}

/** Result of validating claimed mutations against observed evidence. */
export interface MutationValidationResult {
	valid: boolean;
	unsupportedClaims: MutationClaim[];
}
