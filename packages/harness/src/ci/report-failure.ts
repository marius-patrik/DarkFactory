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
	/** The event which started the incident observer, not the observed workflow's event. */
	eventName: string;
	/** The GitHub-controlled ref of the observer invocation. */
	ref: string;
}

/** Reject PR-origin events even if pull_request_target points GITHUB_REF at main. */
export function incidentInvocationAllowed(invocation: IncidentInvocation, defaultBranch: string): boolean {
	return (
		invocation.eventName.length > 0 &&
		!invocation.eventName.startsWith("pull_request") &&
		invocation.eventName !== "merge_group" &&
		invocation.ref === `refs/heads/${defaultBranch}`
	);
}

/** A PR-origin workflow is never evidence of repository-wide operational health. */
export function incidentRunEventAllowed(eventName: string): boolean {
	return eventName.length > 0 && !eventName.startsWith("pull_request") && eventName !== "merge_group";
}

export interface ObservedCompletion extends ReportFailureOptions {
	conclusion: string | null | undefined;
	invocation: IncidentInvocation;
}

/**
 * Confirm the complete run identity using trusted GitHub metadata before any issue reads or writes.
 *
 * Workflow-call inputs are claims, not evidence. The Actions API must establish that
 * the named run really completed in this same repository, from its default branch,
 * for a non-PR event, with the claimed conclusion and URL.
 *
 * Invalid claims fail closed. Transient API errors propagate and do not mutate incidents.
 */
export async function verifyWorkflowCompletion(options: ObservedCompletion): Promise<ObservedWorkflowRun> {
	const { repo, runId, runUrl, workflow, conclusion, invocation } = options;
	if (!/^[1-9]\d*$/u.test(runId) || !Number.isSafeInteger(Number(runId)))
		throw new Error("Incident observation requires a positive numeric run ID");
	if (!workflow || !runUrl || !conclusion)
		throw new Error("Incident observation requires complete run name, URL and conclusion");

	const repoData = await repo.client.rest<{ default_branch: string; full_name: string }>(
		"GET",
		`/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`,
	);
	const slug = repo.slug.toLowerCase();
	if (repoData.full_name?.toLowerCase() !== slug || !repoData.default_branch)
		throw new Error("Incident repository could not be verified against GitHub");

	if (!incidentInvocationAllowed(invocation, repoData.default_branch))
		throw new Error("Incident observer was not invoked from an eligible default-branch event");

	const run = await repo.client.rest<ObservedWorkflowRun>(
		"GET",
		`/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/actions/runs/${runId}`,
	);
	if (
		String(run.id) !== runId ||
		run.name !== workflow ||
		run.html_url !== runUrl ||
		run.status !== "completed" ||
		run.conclusion !== conclusion ||
		run.head_branch !== repoData.default_branch ||
		run.repository?.full_name?.toLowerCase() !== slug ||
		run.head_repository?.full_name?.toLowerCase() !== slug ||
		!incidentRunEventAllowed(run.event)
	)
		throw new Error("Observed workflow metadata disagrees with the completed default-branch GitHub Actions run");
	return run;
}

/**
 * Verifies a completed workflow via GitHub before applying repository-wide issue effects.
 * No arbitrary caller-provided 'success' can close a real incident.
 */
export async function observeWorkflowCompletion(options: ObservedCompletion): Promise<"report" | "resolve" | "ignore"> {
	const run = await verifyWorkflowCompletion(options);
	const action = failureActionForConclusion(run.conclusion);
	if (action === "ignore") {
		options.log?.(`Ignoring non-recovery workflow conclusion: ${run.conclusion ?? "missing"}`);
		return action;
	}
	if (action === "resolve") {
		await resolveFailure(options.repo, run.name, options.log);
		return action;
	}
	const outcome = await reportFailure({ ...options, workflow: run.name, runUrl: run.html_url, runId: String(run.id) });
	if (outcome.number === null) throw new Error(`could not file a failure issue for ${run.name}`);
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
 * Closes any extra failure issues covering the same workflow.
 *
 * The check and the create are not atomic, so two runs finishing together can both find nothing
 * open and both file. Filing stays unserialised deliberately: a concurrency group would cancel a
 * queued run, and a cancelled observer is a failure nobody hears about. The lowest number is kept,
 * because that is the one whose comments people replied to.
 */
export async function closeDuplicateFailures(
	repo: GitHubRepository,
	workflow: string,
	keep: number,
	log: (message: string) => void = () => {},
): Promise<number[]> {
	const marker = failureMarker(workflow);
	const closed: number[] = [];
	for (const issue of await repo.listIssues({ state: "open", labels: [FAILURE_LABEL] })) {
		const number = Number(issue.number);
		if (number === keep || !(issue.body ?? "").includes(marker)) continue;
		await repo.createComment(number, `Duplicate of #${keep}; both runs filed before either saw the other.`);
		await repo.closeIssue(number);
		log(`Closed duplicate #${number} of #${keep}.`);
		closed.push(number);
	}
	return closed;
}

/** Opens or updates the issue for a failing workflow, then reconciles any duplicate. */
export async function reportFailure(options: ReportFailureOptions): Promise<FailureOutcome> {
	const { repo, workflow, runUrl, runId, log = () => {} } = options;

	const existing = await findOpenFailure(repo, workflow);
	if (existing !== null) {
		await repo.createComment(existing, `Failed again: ${runUrl}`);
		log(`Commented on #${existing} for ${workflow}.`);
		return { number: existing, duplicatesClosed: [] };
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
	return { number, duplicatesClosed };
}

/** Closes the failure issue for a workflow that has succeeded again. */
export async function resolveFailure(
	repo: GitHubRepository,
	workflow: string,
	log: (message: string) => void = () => {},
): Promise<number | null> {
	const existing = await findOpenFailure(repo, workflow);
	if (existing === null) return null;
	await repo.createComment(existing, `**${workflow}** succeeded again; closing.`);
	await repo.closeIssue(existing);
	log(`Closed #${existing}: ${workflow} is green again.`);
	return existing;
}
