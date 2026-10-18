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
export const failureMarker = (workflow: string, workflowId?: number): string =>
	workflowId === undefined
		? `<!-- pipeline-failure: ${workflow} -->`
		: `<!-- pipeline-failure-workflow-id: ${workflowId} -->`;
interface ReportFailureOptions {
	/** Repository the issue is opened in. */
	repo: GitHubRepository;
	/** Workflow that failed. */
	workflow: string;
	/** Link to the failing run. */
	runUrl: string;
	/** Identifier of the failing run. */
	runId: string;
	/** Verified, stable GitHub workflow ID; omitted only by legacy direct callers. */
	workflowId?: number;
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
	// A completed run can be visible by ID before the Actions list catches up.
	// A single stale read would lose the incident permanently when no later workflow
	// completes: the observer itself is not in the workflow_run trigger list.
	// Retry the *read* with bounded backoff; never mutate on stale evidence.
	let lastReadHadCandidate = false;
	for (let attempt = 0; attempt < 5; attempt++) {
		// GitHub returns at most 100 runs per page; cancelled/PR-origin runs can
		// hide the last actionable default-branch result on a later page.
		// Entries are newest first; stop at the first page with eligible runs.
		let latest: ObservedWorkflowRun | null = null;
		for (let pageNumber = 1; pageNumber <= 10; pageNumber++) {
			const page = await reader.rest<{ workflow_runs: ObservedWorkflowRun[] }>(
				"GET",
				`${path}/actions/workflows/${observed.workflow_id}/runs?${query}&page=${pageNumber}`,
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
			latest = candidates[0] ?? null;
			if (latest || page.workflow_runs.length < 100) break;
		}

		const observedActionable = failureActionForConclusion(observed.conclusion) !== "ignore";
		lastReadHadCandidate = latest !== null;
		// A known completed run newer than the listing must not be superseded by
		// older state. Non-actionable runs are intentionally ignored.
		const stale = observedActionable && (!latest || observed.run_number > latest.run_number);
		if (!stale) return latest;
		if (attempt < 4) await Bun.sleep(250 * 2 ** attempt);
	}
	throw new Error(
		lastReadHadCandidate
			? "Actions workflow list is stale relative to the observed completed run after retries"
			: "Actions workflow list omitted an authenticated completed actionable run after retries",
	);
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
	// Existing active incident issues used display names as keys. Verify their
	// original Actions run identities before giving them durable workflow IDs.
	await migrateLegacyFailureIssues(
		options.repo,
		latest.workflow_id,
		options.reader ?? options.repo.client,
		options.log,
	);
	if (action === "resolve") {
		await resolveFailure(options.repo, latest.name, options.log, latest.workflow_id);
		return action;
	}
	const outcome = await reportFailure({
		...options,
		workflow: latest.name,
		runUrl: latest.html_url,
		runId: String(latest.id),
		workflowId: latest.workflow_id,
	});
	if (outcome.number === null) throw new Error(`could not file a failure issue for ${latest.name}`);
	return action;
}

/**
 * Migrate pre-ID operational incidents only when their stored first run can
 * be independently tied to this exact workflow ID. Name-only matching is not
 * safe: unrelated workflow files can share a display name, and names change.
 */
export async function migrateLegacyFailureIssues(
	repo: GitHubRepository,
	workflowId: number,
	reader: Pick<GitHubClient, "rest">,
	log: (message: string) => void = () => {},
): Promise<void> {
	const issues = await repo.listIssues({ state: "open", labels: [FAILURE_LABEL] });
	for (const issue of issues) {
		const body = issue.body ?? "";
		if (
			"pull_request" in issue ||
			!body.includes("<!-- pipeline-failure: ") ||
			body.includes("<!-- pipeline-failure-workflow-id: ")
		)
			continue;
		const id = body.match(/^- Run id: `([1-9]\d*)`$/mu)?.[1];
		if (!id || !Number.isSafeInteger(Number(id))) {
			log(`Unverifiable legacy incident #${issue.number}; leaving untouched.`);
			continue;
		}
		let original: ObservedWorkflowRun;
		try {
			original = await reader.rest<ObservedWorkflowRun>(
				"GET",
				`/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/actions/runs/${id}`,
			);
		} catch {
			log(`Cannot authenticate legacy incident #${issue.number} run ${id}; leaving untouched.`);
			continue;
		}
		if (
			String(original.id) !== id ||
			original.workflow_id !== workflowId ||
			original.repository?.full_name?.toLowerCase() !== repo.slug.toLowerCase()
		)
			continue;
		await repo.updateIssue(Number(issue.number), {
			body: `${failureMarker(original.name, workflowId)}\n${body}`,
		});
		log(`Assigned verified workflow identity ${workflowId} to legacy incident #${issue.number}.`);
	}
}

/** Builds the body of a failure issue, carrying the marker that identifies its workflow. */
export function failureBody(workflow: string, runUrl: string, runId: string, workflowId?: number): string {
	return (
		`${failureMarker(workflow, workflowId)}\n\n` +
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
export async function findOpenFailure(
	repo: GitHubRepository,
	workflow: string,
	workflowId?: number,
): Promise<number | null> {
	const marker = failureMarker(workflow, workflowId);
	const issues = await repo.listIssues({ state: "open", labels: [FAILURE_LABEL] });
	const match = issues.find((issue) => !("pull_request" in issue) && (issue.body ?? "").includes(marker));
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
	workflowId?: number,
): Promise<number[]> {
	const marker = failureMarker(workflow, workflowId);
	const matches = (await repo.listIssues({ state: "open", labels: [FAILURE_LABEL] }))
		.filter((issue) => !("pull_request" in issue) && (issue.body ?? "").includes(marker))
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
	const { repo, workflow, runUrl, runId, workflowId, log = () => {} } = options;

	const existing = await findOpenFailure(repo, workflow, workflowId);
	if (existing !== null) {
		const duplicatesClosed = await closeDuplicateFailures(repo, workflow, existing, log, workflowId);
		const survivor = (await findOpenFailure(repo, workflow, workflowId)) ?? existing;
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
		body: failureBody(workflow, runUrl, runId, workflowId),
		labels: [FAILURE_LABEL],
	});
	const number = Number(issue.number);
	log(`Opened #${number} for ${workflow}.`);
	// Another run may have filed between the check above and this create.
	const duplicatesClosed = await closeDuplicateFailures(repo, workflow, number, log, workflowId);
	return { number: (await findOpenFailure(repo, workflow, workflowId)) ?? number, duplicatesClosed };
}

/** Closes the failure issue for a workflow that has succeeded again. */
export async function resolveFailure(
	repo: GitHubRepository,
	workflow: string,
	log: (message: string) => void = () => {},
	workflowId?: number,
): Promise<number | null> {
	const marker = failureMarker(workflow, workflowId);
	const matches = (await repo.listIssues({ state: "open", labels: [FAILURE_LABEL] }))
		.filter((issue) => !("pull_request" in issue) && (issue.body ?? "").includes(marker))
		.map((issue) => Number(issue.number))
		.sort((a, b) => a - b);
	for (const number of matches) {
		await repo.createComment(number, `**${workflow}** succeeded again; closing.`);
		await repo.closeIssue(number);
		log(`Closed #${number}: ${workflow} is green again.`);
	}
	return matches[0] ?? null;
}
