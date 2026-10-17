import type { GitHubClient } from "../github/client.ts";
import type { GitHubRepository } from "../github/repository";

/**
 * An incident is resolved only by an observed successful workflow run.
 * Cancellation, timeout, neutral and skipped outcomes are not recovery.
 */
export function failureActionForConclusion(conclusion: string | null | undefined): "report" | "resolve" | "ignore" {
	if (conclusion === "failure") return "report";
	if (conclusion === "success") return "resolve";
	return "ignore";
}

export const FAILURE_LABEL = "pipeline-failure";

/**
 * Hidden marker naming the workflow an issue belongs to.
 *
 * Identity lives in the body rather than the title so that renaming an issue by hand — or an agent
 * rewording it — does not spawn a second issue for the same failing workflow.
 */
export const failureMarker = (workflow: string): string => `<!-- pipeline-failure: ${workflow} -->`;
interface ReportFailureOptions {
	/** Repository the issue is opened in. */
	repo: GitHubRepository;
	/** Workflow that failed. */
	workflow: string;
	/** Link to the failing run. */
	runUrl: string;
	/** Identifier of the failing run. */
	runId: string;
	/** Notice sink for duplicates closed and other progress. */
	log?: (message: string) => void;
}

/** What one report or resolve did. */
interface FailureOutcome {
	/** The issue now tracking this workflow, or `null` when one could not be filed. */
	number: number | null;
	/** Duplicates closed because two runs raced to file. */
	duplicatesClosed: number[];
}

/** A completed Actions run as reported by GitHub's authenticated REST API. */
export interface ObservedWorkflowRun {
	id: number;
	workflow_id: number;
	run_number: number;
	name: string;
	html_url: string;
	status: string;
	conclusion: string | null;
	event: string;
	head_branch: string | null;
	repository: { full_name: string } | null;
	head_repository: { full_name: string } | null;
}

export interface IncidentInvocation {
	/** The effective GitHub event and ref for direct and reusable workflows. */
	eventName: string;
	ref: string;
	/** Immutable ID from github.event.workflow_run.id, not user-provided workflow_call inputs. */
	triggerRunId: string;
}

/** Only a genuine completed-workflow event from the default-branch observer is eligible. */
export function incidentInvocationAllowed(invocation: IncidentInvocation, defaultBranch: string): boolean {
	return (
		invocation.eventName === "workflow_run" &&
		invocation.ref === `refs/heads/${defaultBranch}` &&
		/^[1-9]\d*$/u.test(invocation.triggerRunId)
	);
}

/** PR-origin and merge-queue runs must never affect repository-wide incidents. */
export function incidentRunEventAllowed(eventName: string): boolean {
	return ["push", "schedule", "workflow_dispatch", "repository_dispatch", "issues"].includes(eventName);
}

export interface ObservedCompletion extends ReportFailureOptions {
	conclusion: string | null | undefined;
	invocation: IncidentInvocation;
	/** Optional independent read client; default is the caller's Actions-capable GITHUB_TOKEN. */
	reader?: Pick<GitHubClient, "rest">;
}

interface RepositoryMetadata {
	full_name: string;
	default_branch: string;
}

/** All claims are checked against the authenticated Actions API before incident mutation. */
export async function verifyWorkflowCompletion(options: ObservedCompletion): Promise<ObservedWorkflowRun> {
	const { repo, runId, runUrl, workflow, conclusion, invocation } = options;
	if (!/^[1-9]\d*$/u.test(runId) || !Number.isSafeInteger(Number(runId)))
		throw new Error("Incident observation requires a positive numeric run ID");
	if (!workflow || !runUrl || !conclusion)
		throw new Error("Incident observation requires complete run name, URL and conclusion");
	if (invocation.triggerRunId !== runId)
		throw new Error("Observed run ID does not match the original GitHub workflow_run event");

	const reader = options.reader ?? repo.client;
	const path = `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;
	const repository = await reader.rest<RepositoryMetadata>("GET", path);
	const slug = repo.slug.toLowerCase();
	if (repository.full_name?.toLowerCase() !== slug || !repository.default_branch)
		throw new Error("Incident repository could not be verified against GitHub");
	if (!incidentInvocationAllowed(invocation, repository.default_branch))
		throw new Error("Incident observer was not invoked from a completed-workflow default-branch event");

	const run = await reader.rest<ObservedWorkflowRun>("GET", `${path}/actions/runs/${runId}`);
	if (
		String(run.id) !== runId ||
		!Number.isSafeInteger(run.workflow_id) ||
		run.workflow_id <= 0 ||
		!Number.isSafeInteger(run.run_number) ||
		run.run_number <= 0 ||
		run.name !== workflow ||
		run.html_url !== runUrl ||
		run.status !== "completed" ||
		run.conclusion !== conclusion ||
		run.head_branch !== repository.default_branch ||
		run.repository?.full_name?.toLowerCase() !== slug ||
		run.head_repository?.full_name?.toLowerCase() !== slug ||
		!incidentRunEventAllowed(run.event)
	)
		throw new Error("Observed workflow metadata disagrees with the completed default-branch GitHub Actions run");
	return run;
}

/**
 * Authoritative incident state: the most recent eligible, completed and actionable run
 * of the same workflow. This prevents old events and manual replays from reopening
 * incidents after recovery or closing them after a newer failure.
 *
 * The observer job is serialized per workflow (cancel-in-progress=false); GitHub
 * may replace older pending jobs, so every invocation reconciles this newest result.
 */
export async function latestActionableWorkflowRun(
	repo: GitHubRepository,
	reader: Pick<GitHubClient, "rest">,
	observed: ObservedWorkflowRun,
): Promise<ObservedWorkflowRun | null> {
	const path = `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;
	const repository = await reader.rest<RepositoryMetadata>("GET", path);
	if (repository.full_name?.toLowerCase() !== repo.slug.toLowerCase() || !repository.default_branch)
		throw new Error("Cannot determine authenticated default-branch incident state");
	const query = new URLSearchParams({ branch: repository.default_branch, status: "completed", per_page: "100" });
	const page = await reader.rest<{ workflow_runs: ObservedWorkflowRun[] }>(
		"GET",
		`${path}/actions/workflows/${observed.workflow_id}/runs?${query}`,
	);
	if (!Array.isArray(page.workflow_runs)) throw new Error("Actions response omitted workflow runs");
	const slug = repo.slug.toLowerCase();
	const candidates = page.workflow_runs.filter(
		(run) =>
			run.workflow_id === observed.workflow_id &&
			Number.isSafeInteger(run.id) &&
			Number.isSafeInteger(run.run_number) &&
			run.run_number > 0 &&
			run.status === "completed" &&
			run.head_branch === repository.default_branch &&
			run.repository?.full_name?.toLowerCase() === slug &&
			run.head_repository?.full_name?.toLowerCase() === slug &&
			incidentRunEventAllowed(run.event) &&
			failureActionForConclusion(run.conclusion) !== "ignore",
	);
	candidates.sort((left, right) => right.run_number - left.run_number || right.id - left.id);
	const latest = candidates[0] ?? null;
	// A lagging list response is not evidence that a known completed run is old.
	// Fail closed rather than applying an older result when the observed run
	// has a later run_number than everything the listing currently returned.
	if (latest && observed.run_number > latest.run_number && failureActionForConclusion(observed.conclusion) !== "ignore")
		throw new Error("Actions workflow list is stale relative to the observed completed run");
	return latest;
}

/**
 * Apply the newest authoritative completed result, not whichever event arrived
 * last. This also recovers when GitHub replaces an older pending observer job.
 */
export async function observeWorkflowCompletion(options: ObservedCompletion): Promise<"report" | "resolve" | "ignore"> {
	const observed = await verifyWorkflowCompletion(options);
	const latest = await latestActionableWorkflowRun(options.repo, options.reader ?? options.repo.client, observed);
	if (!latest) return "ignore";
	const action = failureActionForConclusion(latest.conclusion);
	if (action === "resolve") {
		await resolveFailure(options.repo, latest.name, options.log);
		return action;
	}
	const outcome = await reportFailure({
		...options,
		workflow: latest.name,
		runUrl: latest.html_url,
		runId: String(latest.id),
	});
	if (outcome.number === null) throw new Error(`could not file a failure issue for ${latest.name}`);
	return action;
}

/** Builds the body of a failure issue, carrying the marker that identifies its workflow. */
export function failureBody(workflow: string, runUrl: string, runId: string): string {
	return (
		`${failureMarker(workflow)}\n\n` +
		`The **${workflow}** workflow failed.\n\n` +
		`- Run: ${runUrl}\n` +
		`- Run id: \`${runId}\`\n\n` +
		"This issue was opened by the pipeline itself and closes automatically when " +
		`**${workflow}** next succeeds on the default branch.`
	);
}

/**
 * Finds the open failure issue for a workflow, if one exists.
 *
 * The marker in the body is the identity, not the title, so a retitled issue is still found.
 */
export async function findOpenFailure(repo: GitHubRepository, workflow: string): Promise<number | null> {
	const marker = failureMarker(workflow);
	const issues = await repo.listIssues({ state: "open", labels: [FAILURE_LABEL] });
	const match = issues.find((issue) => (issue.body ?? "").includes(marker));
	return match ? Number(match.number) : null;
}

/**
 * Keep the globally lowest issue number, regardless of which concurrent reporter
 * created the issue. Both observers must select the same survivor, never each other.
 */
export async function closeDuplicateFailures(
	repo: GitHubRepository,
	workflow: string,
	keep: number,
	log: (message: string) => void = () => {},
): Promise<number[]> {
	const marker = failureMarker(workflow);
	const matches = (await repo.listIssues({ state: "open", labels: [FAILURE_LABEL] }))
		.filter((issue) => (issue.body ?? "").includes(marker))
		.map((issue) => Number(issue.number))
		.filter((number) => Number.isSafeInteger(number))
		.sort((a, b) => a - b);
	const survivor = matches[0] ?? keep;
	const closed: number[] = [];
	for (const number of matches) {
		if (number === survivor) continue;
		await repo.createComment(number, `Duplicate of #${survivor}; both runs filed before either saw the other.`);
		await repo.closeIssue(number);
		log(`Closed duplicate #${number} of #${survivor}.`);
		closed.push(number);
	}
	return closed;
}

/** Opens or updates the issue for a failing workflow, then reconciles any duplicate. */
export async function reportFailure(options: ReportFailureOptions): Promise<FailureOutcome> {
	const { repo, workflow, runUrl, runId, log = () => {} } = options;

	const existing = await findOpenFailure(repo, workflow);
	if (existing !== null) {
		const duplicatesClosed = await closeDuplicateFailures(repo, workflow, existing, log);
		const survivor = (await findOpenFailure(repo, workflow)) ?? existing;
		const marker = `<!-- pipeline-failure-run: ${runId} -->`;
		const issue = await repo.getIssue(survivor);
		const initialRun = `- Run id: \`${runId}\``;
		if ((issue.body ?? "").includes(initialRun)) return { number: survivor, duplicatesClosed };
		const comments = await repo.listComments(survivor);
		if (comments.some((comment) => (comment.body ?? "").includes(marker)))
			return { number: survivor, duplicatesClosed };
		await repo.createComment(survivor, `Failed again: ${runUrl}\n${marker}`);
		log(`Commented on #${survivor} for ${workflow}.`);
		return { number: survivor, duplicatesClosed };
	}

	const issue = await repo.createIssue({
		title: `Pipeline failure: ${workflow}`,
		body: failureBody(workflow, runUrl, runId),
		labels: [FAILURE_LABEL],
	});
	const number = Number(issue.number);
	log(`Opened #${number} for ${workflow}.`);
	// Another run may have filed between the check above and this create.
	const duplicatesClosed = await closeDuplicateFailures(repo, workflow, number, log);
	return { number: (await findOpenFailure(repo, workflow)) ?? number, duplicatesClosed };
}

/** Closes the failure issue for a workflow that has succeeded again. */
export async function resolveFailure(
	repo: GitHubRepository,
	workflow: string,
	log: (message: string) => void = () => {},
): Promise<number | null> {
	const marker = failureMarker(workflow);
	const matches = (await repo.listIssues({ state: "open", labels: [FAILURE_LABEL] }))
		.filter((issue) => (issue.body ?? "").includes(marker))
		.map((issue) => Number(issue.number))
		.sort((a, b) => a - b);
	for (const number of matches) {
		await repo.createComment(number, `**${workflow}** succeeded again; closing.`);
		await repo.closeIssue(number);
		log(`Closed #${number}: ${workflow} is green again.`);
	}
	return matches[0] ?? null;
}
