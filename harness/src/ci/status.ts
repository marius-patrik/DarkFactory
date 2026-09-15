import type { GitHubRepository } from "../github/repository.ts";
import { resolveChecksForRepo } from "./config.ts";
import { requiredChecksState } from "./guard.ts";
import type { CheckRunItem, CheckState, CiConfig, RequiredChecksResult } from "./schema.ts";

export interface StatusCheckItem {
	name: string;
	required: boolean;
	status: string;
	conclusion: string | null;
	started_at?: string;
	completed_at?: string;
	html_url?: string;
}

export interface CiStatusReport {
	ref: string;
	state: CheckState;
	checks: StatusCheckItem[];
	summary: RequiredChecksResult;
}

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

export interface WorkflowRunSummary {
	id: number;
	name: string;
	head_branch: string;
	head_sha: string;
	event: string;
	status: string;
	conclusion: string | null;
	actor: string;
	created_at: string;
	html_url?: string;
}

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

export interface JobLogResult {
	id: number;
	name: string;
	status: string;
	conclusion: string | null;
	excerpt: string;
}

export interface RunLogsReport {
	runId: number;
	jobs: JobLogResult[];
}

export function stripAnsi(text: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: matches ANSI escape sequences on purpose
	return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

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
	}>("GET", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/actions/runs/${runId}/jobs`);

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
