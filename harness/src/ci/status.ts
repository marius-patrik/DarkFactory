import type { GitHubRepository } from "../github/repository.ts";
import { resolveChecksForRepo } from "./config.ts";
import { requiredChecksState } from "./guard.ts";
import type { CheckRunItem, CheckState, CiConfig, RequiredChecksResult } from "./schema.ts";

/**
 * Represents a single status check result.
 * Contains the name, requirement flag, current status, conclusion, and optional timestamps and URL.
 */
export interface StatusCheckItem {
/**
 * The name of the check.
 */
	name: string;
/**
 * Whether this check is required for the CI status.
 */
	required: boolean;
/**
 * Current status of the check (e.g., queued, in_progress, completed).
 */
	status: string;
/**
 * Final conclusion of the check (success, failure, etc.) or null if not completed.
 */
	conclusion: string | null;
/**
 * ISO timestamp when the check started, if available.
 */
	started_at?: string;
/**
 * ISO timestamp when the check completed, if available.
 */
	completed_at?: string;
/**
 * URL to the check run on GitHub, if available.
 */
	html_url?: string;
}

/**
 * Report summarizing CI status for a specific ref.
 * Includes the ref, overall state, list of checks, and a summary of required checks.
 */
export interface CiStatusReport {
/**
 * Git ref (branch name or commit SHA) the report refers to.
 */
	ref: string;
/**
 * Overall check state (e.g., success, failure, pending).
 */
	state: CheckState;
/**
 * List of status check items.
 */
	checks: StatusCheckItem[];
/**
 * Result of required checks evaluation.
 */
	summary: RequiredChecksResult;
}

/**
 * Retrieves the CI status report for a given repository and ref.
 *
 * @param repo - GitHub repository information and client.
 * @param ref - The git ref (branch or commit SHA) to check.
 * @param config - CI configuration defining required checks.
 * @param repoSlug - Optional slug to resolve checks for a specific repository.
 * @returns A promise resolving to a {@link CiStatusReport}.
 */
export async function getCheckStatus(
	repo: GitHubRepository,
	ref: string,
	config: CiConfig,
	repoSlug?: string,
): Promise<CiStatusReport> {
	const owner = repo.owner;
	const repoName = repo.repo;

	const runsResponse = await repo.client.rest<{
		check_runs?: Array<{
			id?: number;
			name: string;
			status: string;
			conclusion: string | null;
			started_at?: string;
			completed_at?: string;
			html_url?: string;
		}>;
	}>(
		"GET",
		`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/commits/${encodeURIComponent(ref)}/check-runs?per_page=100`,
	);

	let statusesResponse: { statuses?: Array<{ context: string; state: string }> } = {};
	try {
		statusesResponse = await repo.client.rest<{
			statuses?: Array<{ context: string; state: string }>;
		}>(
			"GET",
			`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/commits/${encodeURIComponent(ref)}/status`,
		);
	} catch {
		// status API might not exist or empty
	}

	const checkRuns: CheckRunItem[] = (runsResponse.check_runs ?? []).map((run) => ({
		name: run.name,
		status: run.status,
		conclusion: run.conclusion,
		started_at: run.started_at,
		completed_at: run.completed_at,
		html_url: run.html_url,
	}));

	// Merge legacy statuses if not already in check runs
	const existingNames = new Set(checkRuns.map((r) => r.name));
	for (const s of statusesResponse.statuses ?? []) {
		if (!existingNames.has(s.context)) {
			checkRuns.push({
				name: s.context,
				status: s.state === "pending" ? "in_progress" : "completed",
				conclusion: s.state === "success" ? "success" : s.state === "pending" ? null : "failure",
			});
			existingNames.add(s.context);
		}
	}

	const resolved = resolveChecksForRepo(config, repoSlug ?? repo.slug);
	const requiredSet = new Set(resolved.filter((c) => c.required).map((c) => c.name));

	const checks: StatusCheckItem[] = checkRuns.map((run) => ({
		name: run.name,
		required: requiredSet.has(run.name),
		status: run.status,
		conclusion: run.conclusion,
		started_at: run.started_at,
		completed_at: run.completed_at,
		html_url: run.html_url,
	}));

	// Add missing required checks to display list
	for (const req of resolved.filter((c) => c.required)) {
		if (!existingNames.has(req.name)) {
			checks.push({
				name: req.name,
				required: true,
				status: "queued",
				conclusion: null,
			});
		}
	}

	const summary = requiredChecksState(resolved, checkRuns);

	return {
		ref,
		state: summary.state,
		checks,
		summary,
	};
}

/**
 * Summary of a GitHub Actions workflow run.
 */
export interface WorkflowRunSummary {
/**
 * Numeric identifier of the workflow run.
 */
	id: number;
/**
 * Name of the workflow.
 */
	name: string;
/**
 * Branch name the workflow run.
 */
	head_branch: string;
/**
 * Commit SHA the workflow run.
 */
	head_sha: string;
/**
 * Event that triggered the run (push, pull_request, etc.).
 */
	event: string;
/**
 * Current status of the run (queued, in_progress, completed).
 */
	status: string;
/**
 * Final conclusion of the run (success, failure, cancelled, timed_out, action_required) or null.
 */
	conclusion: string | null;
/**
 * Login of the user who triggered the run.
 */
	actor: string;
/**
 * ISO timestamp when the run was created.
 */
	created_at: string;
/**
 * URL to the workflow run on GitHub, if available.
 */
	html_url?: string;
}

/**
 * Retrieves a list of workflow runs for a repository.
 *
 * @param repo - GitHub repository information and client.
 * @param options - Optional filters such as workflow name, limit, and branch.
 * @returns A promise resolving to an array of {@link WorkflowRunSummary} objects.
 */
export async function getWorkflowRuns(
	repo: GitHubRepository,
	options: { workflow?: string; limit?: number; branch?: string } = {},
): Promise<WorkflowRunSummary[]> {
	const owner = repo.owner;
	const repoName = repo.repo;
	const limit = options.limit ?? 20;

	const q = new URLSearchParams({ per_page: String(limit) });
	if (options.branch) q.set("branch", options.branch);

	const path = options.workflow
		? `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/actions/workflows/${encodeURIComponent(options.workflow)}/runs?${q}`
		: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/actions/runs?${q}`;

	const data = await repo.client.rest<{
		workflow_runs?: Array<{
			id: number;
			name: string;
			head_branch: string;
			head_sha: string;
			event: string;
			status: string;
			conclusion: string | null;
			actor?: { login?: string };
			created_at: string;
			html_url?: string;
		}>;
	}>("GET", path);

	return (data.workflow_runs ?? []).map((run) => ({
		id: run.id,
		name: run.name,
		head_branch: run.head_branch,
		head_sha: run.head_sha,
		event: run.event,
		status: run.status,
		conclusion: run.conclusion,
		actor: run.actor?.login ?? "unknown",
		created_at: run.created_at,
		html_url: run.html_url,
	}));
}

/**
 * Information about a single job log entry.
 */
export interface JobLogResult {
/**
 * Numeric identifier of the job.
 */
	id: number;
/**
 * Name of the job.
 */
	name: string;
/**
 * Current status of the job.
 */
	status: string;
/**
 * Final conclusion of the job or null.
 */
	conclusion: string | null;
/**
 * Extracted excerpt of the job log.
 */
	excerpt: string;
}

/**
 * Report containing logs for a workflow run.
 */
export interface RunLogsReport {
/**
 * Identifier of the workflow run the logs belong to.
 */
	runId: number;
/**
 * Array of job log results.
 */
	jobs: JobLogResult[];
}

/**
 * Removes ANSI escape codes from a string.
 *
 * @param text - The raw string possibly containing ANSI codes.
 * @returns The cleaned string without ANSI codes.
 */
export function stripAnsi(text: string): string {
	return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

/**
 * Extracts a concise excerpt from a log, truncating if it exceeds a byte limit.
 *
 * @param rawLog - The full log text.
 * @param maxBytes - Maximum size of the excerpt in bytes (default 40,000).
 * @returns A possibly truncated excerpt with a notice about omitted bytes.
 */
export function extractFailureExcerpt(rawLog: string, maxBytes = 40_000): string {
	const clean = stripAnsi(rawLog);
	const bytes = new TextEncoder().encode(clean);
	if (bytes.length <= maxBytes) {
		return clean;
	}

	const headBytes = Math.floor(maxBytes * 0.25);
	const tailBytes = maxBytes - headBytes;

	const headPart = new TextDecoder().decode(bytes.slice(0, headBytes));
	const tailPart = new TextDecoder().decode(bytes.slice(bytes.length - tailBytes));
	const truncatedCount = bytes.length - headBytes - tailBytes;

	return `${headPart}\n\n[... truncated ${truncatedCount} bytes of log ...]\n\n${tailPart}`;
}

/**
 * Retrieves logs for a specific workflow run, optionally filtering by job or failure.
 *
 * @param repo - GitHub repository information and client.
 * @param runId - Identifier of the workflow run.
 * @param options - Optional filters: failedOnly, jobId, maxBytes.
 * @returns A promise resolving to a {@link RunLogsReport}.
 */
export async function getRunLogs(
	repo: GitHubRepository,
	runId: number,
	options: { failedOnly?: boolean; jobId?: number; maxBytes?: number } = {},
): Promise<RunLogsReport> {
	const owner = repo.owner;
	const repoName = repo.repo;

	const jobsData = await repo.client.rest<{
		jobs?: Array<{
			id: number;
			name: string;
			status: string;
			conclusion: string | null;
		}>;
	}>(
		"GET",
		`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/actions/runs/${runId}/jobs`,
	);

	let jobs = jobsData.jobs ?? [];
	if (options.jobId !== undefined) {
		jobs = jobs.filter((j) => j.id === options.jobId);
	} else if (options.failedOnly) {
		jobs = jobs.filter((j) => j.conclusion === "failure");
	}

	const results: JobLogResult[] = [];

	for (const job of jobs) {
		let rawLog = "";
		try {
			rawLog = await repo.client.rest<string>(
				"GET",
				`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/actions/jobs/${job.id}/logs`,
				undefined,
				"text/plain",
			);
		} catch (err: unknown) {
			rawLog = `[Failed to fetch logs for job ${job.id}: ${err instanceof Error ? err.message : String(err)}]`;
		}

		results.push({
			id: job.id,
			name: job.name,
			status: job.status,
			conclusion: job.conclusion,
			excerpt: extractFailureExcerpt(typeof rawLog === "string" ? rawLog : JSON.stringify(rawLog), options.maxBytes),
		});
	}

	return {
		runId,
		jobs: results,
	};
}

/**
 * Triggers a re-run of a workflow run, optionally only for failed jobs.
 *
 * @param repo - GitHub repository information and client.
 * @param runId - Identifier of the workflow run to re-run.
 * @param options - Optional flag to rerun only failed jobs.
 */
export async function rerunWorkflowRun(
	repo: GitHubRepository,
	runId: number,
	options: { failedOnly?: boolean } = {},
): Promise<void> {
	const owner = repo.owner;
	const repoName = repo.repo;

	const path = options.failedOnly
		? `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/actions/runs/${runId}/rerun-failed-jobs`
		: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/actions/runs/${runId}/rerun`;

	await repo.client.rest("POST", path);
}
