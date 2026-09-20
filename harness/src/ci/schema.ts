import { z } from "zod";

export const ciCheckPerRepoSchema = z.record(
	z.string(),
	z
		.object({
			required: z.boolean().optional(),
		})
		.passthrough(),
);

export type CiCheckPerRepo = z.infer<typeof ciCheckPerRepoSchema>;

export const ciCheckSchema = z
	.object({
		name: z.string().min(1, "check name must not be empty"),
		required: z.boolean().default(true),
		workflow: z.string().optional(),
		job: z.string().optional(),
		per_repo: ciCheckPerRepoSchema.optional(),
	})
	.passthrough();

export type CiCheck = z.infer<typeof ciCheckSchema>;

export const rawCiConfigSchema = z
	.object({
		alert_after: z.number().int().nonnegative().optional(),
		checks: z.array(ciCheckSchema).default([]),
		pipeline_repo: z.string().optional(),
		pipeline_ref: z.string().optional(),
		upstream_repo: z.string().optional(),
		upstream_ref: z.string().optional(),
	})
	.passthrough();

export const ciFileSchema = z.union([
	z
		.object({
			ci: rawCiConfigSchema,
		})
		.passthrough()
		.transform((val) => val.ci),
	rawCiConfigSchema,
]);

export type CiConfig = z.infer<typeof rawCiConfigSchema>;

export interface ResolvedCheck {
	name: string;
	required: boolean;
	workflow?: string;
	job?: string;
}

export type CheckState = "green" | "pending" | "failed";

export interface CheckRunItem {
	name: string;
	status: string; // e.g. "queued" | "in_progress" | "completed"
	conclusion: string | null; // e.g. "success" | "failure" | "neutral" | "cancelled" | "timed_out" | "action_required" | "skipped" | null
	started_at?: string;
	completed_at?: string;
	html_url?: string;
}

export interface RequiredChecksResult {
	state: CheckState;
	failing: string[];
	pending: string[];
	missing: string[];
	passed: string[];
	details: Record<string, { required: boolean; status?: string; conclusion?: string | null }>;
}
