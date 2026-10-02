/**
 * The `verify-bound-issue` gate: a pull request must name a tracking issue in its description.
 *
 * The gate is a required status check, so it is written to fail rather than to pass quietly. An
 * event that is not a `pull_request` has no description to read and is skipped; every other event
 * with a body that carries no binding is a failure, and a failure is the interesting outcome rather
 * than the exceptional one.
 *
 * The pattern is kept as source text rather than as a regex literal so it stays diffable against
 * the grammar the repository documents. It is deliberately dependency-free: the workflow runs it
 * straight from a checkout, and a consumer's copy of the gate has to run the same file.
 */

/** Closing keywords, and the two ways a tracking issue may be written. */
export const BOUND_ISSUE_PATTERN = String.raw`\b(?:advance|advances|advanced|close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+(?:#\d+|https://github\.com/[^/\s]+/[^/\s]+/issues/\d+)\b`;

/** The event that carries a pull request description. */
const PULL_REQUEST_EVENT = "pull_request";

/** What one run of the gate concluded. */
interface BoundIssueResult {
	/** Whether the event carries a description at all. A false here is a clean no-op. */
	applicable: boolean;
	/** Every binding found, in the order the body states them. */
	bindings: string[];
	/** Process exit code: 0 when the check passes or does not apply, 1 when nothing was bound. */
	exitCode: number;
}

/**
 * Every issue binding in a pull request description.
 *
 * @param body The pull request description.
 * @returns The matched binding phrases, empty when the description binds nothing.
 */
export function findBoundIssues(body: string): string[] {
	return [...body.matchAll(new RegExp(BOUND_ISSUE_PATTERN, "gi"))].map((match) => match[0]);
}

/**
 * Judges one pull request description.
 *
 * @param body The pull request description; empty when there is none.
 * @param eventName The GitHub event name that produced this run.
 * @returns The verdict, the bindings behind it, and the exit code to report.
 */
export function checkBoundIssue(body: string, eventName: string): BoundIssueResult {
	if (eventName !== PULL_REQUEST_EVENT) {
		return { applicable: false, bindings: [], exitCode: 0 };
	}
	const bindings = findBoundIssues(body);
	return { applicable: true, bindings, exitCode: bindings.length > 0 ? 0 : 1 };
}

/**
 * The gate's report, as it reaches the workflow log.
 *
 * @param result The verdict to report.
 * @param eventName The event name, named in the skip line.
 * @returns One line for the log, or the failure explanation for stderr.
 */
export function renderBoundIssueReport(result: BoundIssueResult, eventName: string): string {
	if (!result.applicable) return `Skipping check for non-pull_request event: ${eventName}`;
	if (result.exitCode === 0) return `✅ Bound issue syntax verified: ${result.bindings.join(", ")}`;
	return [
		"❌ ERROR: Every pull request must explicitly bind a tracking issue in the description.",
		"   Partial delivery: Advances #123",
		"   Terminal delivery: Closes #123, Fixes #123, Resolves #123",
	].join("\n");
}

if (import.meta.main) {
	const eventName = process.env.GITHUB_EVENT_NAME ?? "";
	const result = checkBoundIssue(process.env.PR_BODY ?? "", eventName);
	const report = renderBoundIssueReport(result, eventName);
	if (result.exitCode === 0) {
		console.log(report);
	} else {
		console.error(report);
	}
	process.exit(result.exitCode);
}
