/**
 * Which Plan a pull request implements, and which Request a Plan belongs to.
 *
 * Ported from `find_plan_issue_for_pr` and `find_parent_request_number` in
 * `.github/scripts/agent_runner.py`. Both exist because the pipeline's links between a Request, a
 * Plan and a pull request are *written in prose*: a plan comment names `- **Parent Request**: #N`,
 * a pull request body says `Closes #N`, and neither is a field anything enforces. So both resolve
 * by reading, in the Python's order, and both can fail to find an answer - which is a real outcome
 * the caller has to handle rather than a reason to guess.
 *
 * The Python's fallback chain is the behaviour and is reproduced step for step, because the order
 * *is* the reliability: a native GitHub relationship beats a body a human wrote, which beats a
 * comment a human wrote, which beats inferring one from a closing reference.
 */

import type { LabelLike } from "./dispatch.ts";
import type { PipelineIo } from "./pipeline-io.ts";
import { bestEffort } from "./pipeline-io.ts";

/** `Parent Request #1148`, `Linked Parent: #1148`, in an issue body. */
const PARENT_IN_BODY_RE = /(?:Parent Request|Linked Parent):?\s*#(\d+)/iu;

/** The same, in a comment, which additionally allows the bolded form the plan comment uses. */
const PARENT_IN_COMMENT_RE = /(?:Parent Request|Linked Parent|\*\*Parent Request\*\*):?\s*#(\d+)/iu;

/** `Plan #1150`, `Child Plan: #1150`, in a pull request body. */
const PLAN_IN_BODY_RE = /(?:Plan|Child Plan):?\s*#(\d+)/iu;

/** The same, in a comment, which additionally allows the bolded form. */
const PLAN_IN_COMMENT_RE = /(?:Plan|Child Plan|\*\*Plan\*\*):?\s*#(\d+)/iu;

/** `Closes #123` or `Closes https://github.com/owner/name/issues/123`, in a pull request body. */
const CLOSING_REF_RE =
	/\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+(?:#(\d+)|https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/issues\/(\d+))/giu;

/** The label or title prefix that marks an issue as a Plan. */
function isPlanIssue(labels: readonly LabelLike[], title: string): boolean {
	const lower = title.toLowerCase();
	return (
		labels.some((label) => (typeof label === "string" ? label : (label.name ?? "")).toLowerCase() === "plan") ||
		lower.startsWith("plan:")
	);
}

/**
 * The parent Request of a Plan issue.
 *
 * Reads GitHub's native sub-issue relationship first, then the Plan's body, then its comments. A
 * Plan that names no parent returns `undefined`, and the caller answers the comment as ordinary
 * feedback rather than guessing a Request.
 *
 * @param io - The GitHub port.
 * @param planNumber - The Plan issue number.
 * @param repo - Repository slug, `owner/name`.
 * @returns The parent Request's number, or `undefined`.
 */
export async function findParentRequestNumber(
	io: Pick<PipelineIo, "issueView">,
	planNumber: number,
	repo: string,
): Promise<number | undefined> {
	const plan = await io.issueView(repo, planNumber, ["body", "comments", "parent"]);

	// 1. GitHub's own sub-issue parent metadata. A repository without sub-issues enabled answers
	//    `undefined` here, which is not an error.
	if (plan.parentIssue !== undefined) return plan.parentIssue;

	// 2. The body the pipeline wrote, which is where a legacy Plan names its parent.
	const fromBody = PARENT_IN_BODY_RE.exec(plan.body);
	if (fromBody) return Number(fromBody[1]);

	// 3. A comment, because a reviewer can record the link there instead.
	for (const comment of plan.comments) {
		const found = PARENT_IN_COMMENT_RE.exec(comment);
		if (found) return Number(found[1]);
	}
	return undefined;
}

/**
 * The Plan a pull request implements.
 *
 * Four sources, in the Python's order: GitHub's own closing references, an explicit reference in
 * the body, one in a comment, and finally the closing references themselves, newest first, checked
 * against the Plan label so a pull request that closes both a Request and its Plan resolves to the
 * Plan.
 *
 * A pull request that cannot be read is not a failure: it has no plan as far as the pipeline can
 * tell, and the caller answers the comment as ordinary feedback.
 *
 * @param io - The GitHub port.
 * @param prNumber - The pull request number.
 * @param repo - Repository slug, `owner/name`.
 * @param warn - Where a read failure is reported.
 * @returns The Plan issue number, or `undefined`.
 */
export async function findPlanIssueForPr(
	io: Pick<PipelineIo, "prView" | "issueView">,
	prNumber: number,
	repo: string,
	warn: (message: string) => void,
): Promise<number | undefined> {
	const pull = await bestEffort(
		`read PR #${prNumber} metadata`,
		() => io.prView(repo, prNumber, ["body", "comments", "closingIssues"]),
		warn,
	);

	const body = pull?.body ?? "";
	const closing = pull?.closingIssues ?? [];

	// 1. A closing reference that *is* a Plan. This is the only source GitHub maintains for us.
	for (const issue of closing) {
		if (issue.number && isPlanIssue(issue.labels, issue.title)) return issue.number;
	}

	// 2. An explicit reference in the body.
	const fromBody = PLAN_IN_BODY_RE.exec(body);
	if (fromBody) return Number(fromBody[1]);

	// 3. A reference in a comment.
	for (const comment of pull?.comments ?? []) {
		const found = PLAN_IN_COMMENT_RE.exec(comment);
		if (found) return Number(found[1]);
	}

	// 4. The closing references in the body, checked against the Plan label. Walked newest first,
	//    because the most recently added reference is the one a pipeline run that reopened the pull
	//    request added. A candidate that cannot be read is skipped silently, as the Python's
	//    `except Exception: continue` was.
	const candidates: number[] = [];
	for (const match of body.matchAll(CLOSING_REF_RE)) {
		const digits = match[1] ?? match[2];
		if (digits) candidates.push(Number(digits));
	}
	for (const number of [...candidates].reverse()) {
		const issue = await bestEffort(
			`read #${number} as a Plan candidate`,
			() => io.issueView(repo, number, ["title", "labels"]),
			() => undefined,
		);
		if (issue && isPlanIssue(issue.labels, issue.title)) return number;
	}

	// 5. With no Plan among them, the last closing reference is the best available answer: it is
	//    the issue the pull request was opened to close.
	return candidates.length > 0 ? candidates[candidates.length - 1] : undefined;
}
