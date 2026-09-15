import { z } from "zod";

/**
 * Schema for per-repository CI check configuration.
 * Maps repository names to an object describing whether the check is required.
 */
export const ciCheckPerRepoSchema = z.record(
	z.string(),
	z.object({
		required: z.boolean().optional(),
	}).passthrough(),
);

/** Type representing per-repository CI check configuration inferred from {@link ciCheckPerRepoSchema}. */
export type CiCheckPerRepo = z.infer<typeof ciCheckPerRepoSchema>;

/**
 * Schema for a single CI check definition.
 * Includes name, requirement flag, and optional workflow/job references.
 */
export const ciCheckSchema = z.object({
	/**
	 * Human‑readable name of the check.
	 */
	name: z.string().min(1, "check name must not be empty"),
	/**
	 * Whether the check is required (default true).
	 */
	required: z.boolean().default(true),
	/**
	 * Optional workflow identifier where the check is defined.
	 */
	workflow: z.string().optional(),
	/**
	 * Optional job identifier within the workflow.
	 */
	job: z.string().optional(),
	/**
	 * Optional per-repository overrides.
	 */
	per_repo: ciCheckPerRepoSchema.optional(),
}).passthrough();

/** Type representing a CI check definition inferred from {@link ciCheckSchema}. */
export type CiCheck = z.infer<typeof ciCheckSchema>;

/**
 * Schema for the raw CI configuration file.
 * Contains optional alert threshold, list of checks, and pipeline/upstream settings.
 */
export const rawCiConfigSchema = z.object({
	/**
	 * Alert after this many minutes (optional).
	 */
	alert_after: z.number().int().nonnegative().optional(),
	/**
	 * List of CI checks.
	 */
	checks: z.array(ciCheckSchema).default([]),
	/**
	 * Optional repository for pipeline configuration.
	 */
	pipeline_repo: z.string().optional(),
	/**
	 * Optional ref for pipeline configuration.
	 */
	pipeline_ref: z.string().optional(),
	/**
	 * Optional upstream repository.
	 */
	upstream_repo: z.string().optional(),
	/**
	 * Optional upstream ref.
	 */
	upstream_ref: z.string().optional(),
}).passthrough();

/**
 * Union schema for CI configuration files.
 * Accepts either an object with a top-level "ci" field or the raw config directly.
 */
export const ciFileSchema = z.union([
	z.object({
		/**
		 * CI configuration object.
		 */
		ci: rawCiConfigSchema,
	}).passthrough().transform((val) => val.ci),
	rawCiConfigSchema,
]);

/** Type representing the CI configuration inferred from {@link rawCiConfigSchema}. */
export type CiConfig = z.infer<typeof rawCiConfigSchema>;

/**
 * Resolved representation of a CI check after processing configuration.
 */
export interface ResolvedCheck {
	/**
	 * Human‑readable name of the check.
	 */
	name: string;
	/**
	 * Whether the check is required for the CI to pass.
	 */
	required: boolean;
	/**
	 * Optional workflow identifier where the check is defined.
	 */
	workflow?: string;
	/**
	 * Optional job identifier within the workflow.
	 */
	job?: string;
}

/**
 * Possible overall states for a check after evaluation.
 * - "green": all required checks passed.
 * - "pending": some checks are still in progress.
 * - "failed": one or more required checks failed.
 */
export type CheckState = "green" | "pending" | "failed";

/**
 * Information about a single run of a CI check.
 */
export interface CheckRunItem {
	/**
	 * Name of the check run.
	 */
	name: string;
	/**
	 * Current status of the run (e.g. "queued", "in_progress", "completed").
	 */
	status: string; // e.g. "queued" | "in_progress" | "completed"
	/**
	 * Final conclusion of the run, if completed (e.g. "success", "failure", ...).
	 */
	conclusion: string | null; // e.g. "success" | "failure" | "neutral" | "cancelled" | "timed_out" | "action_required" | "skipped" | null
	/**
	 * ISO‑8601 timestamp when the run started.
	 */
	started_at?: string;
	/**
	 * ISO‑8601 timestamp when the run completed.
	 */
	completed_at?: string;
	/**
	 * URL to the run details on the CI platform.
	 */
	html_url?: string;
}

/**
 * Result of evaluating required checks for a commit or PR.
 * Includes overall state, lists of failing/pending/missing/passed checks, and detailed per-check info.
 */
export interface RequiredChecksResult {
	/**
	 * Overall state after evaluating all required checks.
	 */
	state: CheckState;
	/**
	 * List of required checks that have failed.
	 */
	failing: string[];
	/**
	 * List of required checks that are still pending.
	 */
	pending: string[];
	/**
	 * List of required checks that are missing (not present in the run).
	 */
	missing: string[];
	/**
	 * List of required checks that have passed.
	 */
	passed: string[];
	/**
	 * Detailed per‑check information.
	 * Keys are check names; values indicate requirement, current status, and conclusion.
	 */
	details: Record<string, { required: boolean; status?: string; conclusion?: string | null }>;
}
