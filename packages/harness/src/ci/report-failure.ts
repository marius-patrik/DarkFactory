import type { GitHubRepository } from "../github/repository";

/** Label carried by every issue this module opens, so they can be found and filtered as a set. */
export const FAILURE_LABEL = "pipeline-failure";

/**
 * Hidden marker naming the workflow an issue belongs to.
 *
 * Identity lives in the body rather than the title so that renaming an issue by hand — or an agent
 * rewording it — does not spawn a second issue for the same failing workflow.
 */
export const failureMarker = (workflow: string): string => `<!-- pipeline-failure: ${workflow} -->`;

export interface ReportFailureOptions {
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
export interface FailureOutcome {
	/** The issue now tracking this workflow, or `null` when one could not be filed. */
	number: number | null;
	/** Duplicates closed because two runs raced to file. */
	duplicatesClosed: number[];
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
