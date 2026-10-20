/**
 * Pull request approval and auto-merge automation.
 *
 * Listens for maintainer approvals (native review or an approval comment), transitions the draft PR
 * to ready, submits a proxy approval when the branch protection still demands one, enables
 * auto-merge with branch auto-deletion, and reconciles bound issues and the project board to `Done`
 * after the merge lands.
 *
 * Board mutations are delegated to the board's own target, so field and option ids are
 * resolved at runtime rather than hardcoded.
 */

import type { BoardTarget } from "../board/client.ts";
import { ALLOWED_ASSOCIATIONS, isAllowedApprover, parsePrCommand } from "./commands.ts";

/** Seconds between merge-completion polls, and how many polls to attempt. */
const MERGE_POLL_INTERVAL_MS = 5_000;
export const MERGE_POLL_ATTEMPTS = 12;

/**
 * Recognises a closing or fixing reference, short (`#12`) or by cross-repository URL.
 *
 * This is the matcher the project automation also uses to extract bound issues. It is repeated
 * here rather than imported because that module is not yet ported; when it is, both must read one
 * copy, or a pull request can bind an issue one way for merging and another way for the board.
 */
const CLOSING_REFERENCE_PATTERN =
	/\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+(?:#(\d+)|https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/issues\/(\d+))\b/giu;

/** The outcome of one `gh` invocation. */
export interface GhResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

/** How one `gh` invocation should be run. */
interface GhOptions {
	/** Throw when the command exits non-zero, rather than returning the failure. */
	check?: boolean;
	/**
	 * Run with `BOT_TOKEN` instead of `GH_TOKEN`.
	 *
	 * Required for submitting the proxy review: `GH_TOKEN` is the maintainer's token, and GitHub
	 * refuses to let an author approve their own pull request, so an approval sent with it fails
	 * silently.
	 */
	asBot?: boolean;
}

/** Runs one `gh` command scoped to a repository. Injected so the merge path is testable. */
export type GhRunner = (args: readonly string[], repo: string, options?: GhOptions) => GhResult;

/** The board mutations post-merge reconciliation needs. */
/**
 * Board mutations go through the board's own {@link BoardTarget}.
 *
 * This handler used to declare a `ProjectBoardClient` of its own, with `addItem` then `editStatus`.
 * That was a second expression of one mechanism and it was wrong twice over: no production value
 * satisfied it, and `BoardTarget.track(url, status)` already does the whole job in one call. The two
 * steps only existed because the test's fake was synchronous and could pretend a write completed
 * before the next line ran.
 */
export type ProjectBoardClient = BoardTarget;

/** Where the handler narrates what it is doing. */
export interface PrApprovalLogger {
	out(message: string): void;
	err(message: string): void;
}

/**
 * Everything the handler reads from its surroundings.
 *
 * The index signature is what lets a raw `process.env` be handed in unchanged; the named members
 * are the only keys it reads.
 */
export interface PrApprovalEnvironment {
	readonly [name: string]: string | undefined;
	GITHUB_ACTOR?: string;
	GITHUB_REPOSITORY?: string;
	GITHUB_EVENT_NAME?: string;
	PR_MERGED?: string;
	PR_BASE_BRANCH?: string;
	DEFAULT_BRANCH?: string;
	BOT_TOKEN?: string;
	APPROVER_ASSOCIATION?: string;
	APPROVER_TYPE?: string;
	ISSUE_AUTHOR?: string;
	IS_PR?: string;
	PR_NUMBER?: string;
	REVIEW_STATE?: string;
	REVIEW_HEAD_SHA?: string;
	COMMENT_BODY?: string;
}

/** What the handler did, and why it stopped where it did. */
export interface PrApprovalOutcome {
	/** Whether the maintainer passed the actor gate and the event was an approval. */
	entered: boolean;
	/** Why the handler stopped, when it stopped before arming auto-merge. */
	reason: string | null;
	/** Whether a merge was observed landing during the poll. */
	merged: boolean;
}

/** The side channels {@link submitProxyReview} reads rather than the pull request itself. */
interface ProxyReviewDeps {
	run?: GhRunner;
	env?: PrApprovalEnvironment;
	logger?: PrApprovalLogger;
}

/** Injection points for {@link handlePrApproval}. */
interface HandlePrApprovalDeps {
	run: GhRunner;
	/** The board client post-merge reconciliation writes through. */
	client: ProjectBoardClient;
	logger?: PrApprovalLogger;
	env?: PrApprovalEnvironment;
	/** Replaces the poll's sleep so a test need not wait out the interval. */
	sleep?: (milliseconds: number) => void | Promise<void>;
}

/** The default logger: stdout for progress, stderr for anything an operator must act on. */
const CONSOLE: PrApprovalLogger = {
	out: (message) => console.log(message),
	err: (message) => console.error(message),
};

/** Runs `gh` with the repository pinned through `GH_REPO`, as the Python handler did. */
export const runGh: GhRunner = (args, repo, options = {}) => {
	const env: Record<string, string> = { ...process.env, GH_REPO: repo };
	const botToken = process.env.BOT_TOKEN ?? "";
	if (options.asBot && botToken) env.GH_TOKEN = botToken;
	const result = Bun.spawnSync(["gh", ...args], { env, stdout: "pipe", stderr: "pipe" });
	const outcome: GhResult = {
		exitCode: result.exitCode,
		stdout: result.stdout.toString(),
		stderr: result.stderr.toString(),
	};
	if (options.check && outcome.exitCode !== 0) {
		throw new Error(`gh ${args.join(" ")} failed: ${outcome.stderr.trim()}`);
	}
	return outcome;
};

/** The pull request fields post-merge reconciliation reads. */
interface PullRequestView {
	state?: string;
	closingIssuesReferences?: readonly { number?: number | string; url?: string | null }[] | null;
	body?: string | null;
	url?: string | null;
}

/**
 * Submits the bot's approving review and verifies that it landed.
 *
 * Branch protection requires one approving review. Pull requests are opened with a token belonging
 * to the maintainer, so the maintainer cannot approve them — GitHub rejects self-approval. The
 * approval therefore has to come from `github-actions[bot]`, which requires the repository's
 * `can_approve_pull_request_reviews` permission and a `BOT_TOKEN` distinct from `GH_TOKEN`.
 *
 * The result is verified rather than assumed: a failed approval used to leave the pull request
 * stuck at `REVIEW_REQUIRED` with auto-merge armed and nothing in the log to explain it.
 *
 * @returns `true` when an approving review exists after the attempt.
 */
export function submitProxyReview(prNumber: number, repo: string, actor: string, deps: ProxyReviewDeps = {}): boolean {
	const run = deps.run ?? runGh;
	const env = deps.env ?? process.env;
	const logger = deps.logger ?? CONSOLE;

	if (!env.BOT_TOKEN) {
		logger.err(
			"BOT_TOKEN is not set. The proxy approval would be sent as the pull request's own " +
				"author and rejected as self-approval; skipping. Set BOT_TOKEN to secrets.GITHUB_TOKEN " +
				"in the workflow.",
		);
		return false;
	}

	logger.out(`Submitting approving review as the bot on PR #${prNumber}...`);
	const result = run(
		["pr", "review", String(prNumber), "--approve", "-b", `Approved via automation on behalf of @${actor}.`],
		repo,
		{ asBot: true },
	);
	if (result.exitCode !== 0) {
		const detail = (result.stderr || result.stdout).trim().split("\n");
		logger.err(`Proxy approval FAILED: ${detail[0] ?? "unknown error"}`);
	}

	const check = run(["api", `repos/${repo}/pulls/${prNumber}/reviews`, "--jq", ".[].state"], repo);
	const approved = (check.stdout ?? "").includes("APPROVED");
	if (!approved) {
		logger.err(
			`PR #${prNumber} still has no approving review. Auto-merge will stay armed but the ` +
				"pull request cannot merge until one is submitted.",
		);
	}
	return approved;
}

/**
 * Collects bound issue numbers from both GitHub's link graph and the pull request body.
 *
 * GitHub's `closingIssuesReferences` is authoritative but only populated for well-formed references
 * in the current body; the regex pass catches valid in-repository links and edits that have not
 * propagated yet. Cross-repository issue links must never close local issues.
 *
 * @param prData - Result of `gh pr view --json state,closingIssuesReferences,body,url`.
 * @returns Sorted list of unique issue numbers.
 */
export function collectBoundIssues(prData: PullRequestView, repo: string): number[] {
	const numbers = new Set<number>();
	const prefix = `https://github.com/${repo.toLowerCase()}/issues/`;
	for (const ref of prData.closingIssuesReferences ?? []) {
		if (ref.number === undefined || typeof ref.url !== "string") continue;
		const value = typeof ref.number === "string" ? Number.parseInt(ref.number, 10) : ref.number;
		if (Number.isSafeInteger(value) && value > 0 && ref.url.toLowerCase() === `${prefix}${value}`) numbers.add(value);
	}
	// Cross-repository closing references must never close same-numbered local issues.
	CLOSING_REFERENCE_PATTERN.lastIndex = 0;
	for (const match of (prData.body ?? "").matchAll(CLOSING_REFERENCE_PATTERN)) {
		if (match[2] && `${match[2]}/${match[3]}`.toLowerCase() !== repo.toLowerCase()) continue;
		const value = Number.parseInt(match[1] ?? match[4] ?? "", 10);
		if (Number.isSafeInteger(value) && value > 0) numbers.add(value);
	}
	return [...numbers].sort((a, b) => a - b);
}

/** The decision one event carries about one pull request. */
interface ApprovalDetection {
	prNumber: string | null;
	approved: boolean;
}

/**
 * Determines whether the current event is a maintainer approval.
 *
 * Native `pull_request_review` events count by review state alone: an `APPROVED` state is an
 * approval, anything else (including a body that merely mentions approving) is not.
 * `issue_comment` events count when the body is an approval command in the shared command grammar —
 * so `/df reject` is a change request, never a merge.
 */
export function detectApproval(env: PrApprovalEnvironment = process.env): ApprovalDetection {
	if (env.GITHUB_EVENT_NAME === "pull_request_review") {
		return {
			prNumber: env.PR_NUMBER ?? null,
			approved: (env.REVIEW_STATE ?? "").toUpperCase() === "APPROVED",
		};
	}
	if (env.GITHUB_EVENT_NAME === "issue_comment") {
		// An `approve` on a plain issue is a plan gate, not a merge instruction.
		if (env.IS_PR !== "true") return { prNumber: null, approved: false };
		return { prNumber: env.PR_NUMBER ?? null, approved: parsePrCommand((env.COMMENT_BODY ?? "").trim()) === "approve" };
	}
	return { prNumber: null, approved: false };
}

/**
 * Closes bound issues and moves the pull request and its issues to `Done` on the board.
 *
 * @param prNumber - Pull request number.
 * @param repo - Repository slug (`owner/name`).
 * @param run - The `gh` runner the issue-closing commands are issued through.
 * @param client - The board client that resolves field and option ids at runtime.
 */
async function reconcilePostMerge(
	prNumber: number,
	repo: string,
	run: GhRunner,
	client: ProjectBoardClient,
	logger: PrApprovalLogger = CONSOLE,
): Promise<void> {
	const view = run(["pr", "view", String(prNumber), "--json", "state,closingIssuesReferences,body,url"], repo, {
		check: true,
	});
	if (view.exitCode !== 0) throw new Error(`Cannot inspect merged PR #${prNumber}: ${view.stderr}`);

	const data = JSON.parse(view.stdout) as PullRequestView;
	if (data.state !== "MERGED")
		throw new Error(`Cannot reconcile PR #${prNumber}: expected MERGED, found ${data.state}`);
	if (data.url !== `https://github.com/${repo}/pull/${prNumber}`)
		throw new Error(`Cannot reconcile PR #${prNumber}: merged PR URL does not match target repository`);

	const issueNumbers = collectBoundIssues(data, repo);
	logger.out(`Reconciling post-merge for PR #${prNumber}. Bound issues: [${issueNumbers.join(", ")}]`);

	// Every write is awaited. The Python's client was synchronous, so `add_item` had returned by the
	// time the next line ran; a GraphQL client is not, and without the await a failure surfaces as an
	// unhandled rejection after this function has already returned — which is a board that silently
	// stopped being updated, the exact outcome this reconciliation exists to prevent.
	//
	// A rejected write propagates, which is what the Python did: it had no try/except around these
	// calls, so a failed board write failed the run. Swallowing it would hide the very failure this
	// reconciliation exists to prevent.
	await client.track(data.url, "Done", { fastPath: true });
	await client.setStatusLabel(repo, prNumber, "Done");

	for (const num of issueNumbers) {
		run(["issue", "close", String(num), "--repo", repo, "--reason", "completed"], repo, { check: true });
		await client.setStatusLabel(repo, num, "Done");
		await client.track(`https://github.com/${repo}/issues/${num}`, "Done", { fastPath: true });
		logger.out(`Closed issue #${num} and marked it Done on the project board`);
	}
}

/**
 * Gates on the actor, then readies, approves, and auto-merges the pull request.
 *
 * Every early return is a success: an event that is not an approval is not a failure, and the
 * workflow step should not redden because a stranger commented.
 */
/**
 * Now asynchronous, because the post-merge reconciliation it calls writes to a GraphQL board client
 * and those writes must complete before this returns. It was synchronous because the fake client in
 * the test suite was, and a synchronous fake makes a real asynchronous dependency look like a
 * synchronous one — the signature was shaped by the test rather than by the code it would run against
 * in production.
 */
export async function handlePrApproval(deps: HandlePrApprovalDeps): Promise<PrApprovalOutcome> {
	const { client, run } = deps;
	const logger = deps.logger ?? CONSOLE;
	const env = deps.env ?? process.env;
	const sleep = deps.sleep ?? ((milliseconds: number) => Bun.sleep(milliseconds));
	const actor = env.GITHUB_ACTOR ?? "";
	const repo = env.GITHUB_REPOSITORY ?? "";

	// A queued merge can complete after its approval job exits.
	// Reconcile from the trusted merged-close webhook.
	if (env.GITHUB_EVENT_NAME === "pull_request_target") {
		const number = env.PR_NUMBER ?? "";
		if (!/^[0-9]+$/u.test(number) || env.PR_MERGED !== "true")
			return { entered: false, reason: "not a merged pull request", merged: false };
		if (!env.PR_BASE_BRANCH || !env.DEFAULT_BRANCH)
			throw new Error("Missing trusted base/default branch identity for merged-close reconciliation");
		if (env.PR_BASE_BRANCH !== env.DEFAULT_BRANCH)
			return { entered: false, reason: "merged outside default branch", merged: false };
		await reconcilePostMerge(Number(number), repo, run, client, logger);
		return { entered: true, reason: null, merged: true };
	}

	if (
		!isAllowedApprover(actor, {
			authorAssociation: env.APPROVER_ASSOCIATION,
			issueAuthor: env.ISSUE_AUTHOR,
			userType: env.APPROVER_TYPE,
		})
	) {
		logger.out(`Actor ${actor} is not the author nor ${[...ALLOWED_ASSOCIATIONS].join("/")}. Skipping.`);
		return { entered: false, reason: "actor may not approve", merged: false };
	}

	const detection = detectApproval(env);
	if (!detection.prNumber || !detection.approved) {
		logger.out("Not an approval event. Skipping.");
		return { entered: false, reason: "not an approval event", merged: false };
	}

	const pr = Number.parseInt(detection.prNumber, 10);
	logger.out(`PR #${pr} approved by @${actor}. Preparing for auto-merge.`);

	const view = run(["pr", "view", String(pr), "--json", "isDraft,state,reviewDecision,headRefOid,baseRefName"], repo, {
		check: true,
	});
	const data = JSON.parse(view.stdout) as {
		isDraft?: boolean;
		state?: string;
		reviewDecision?: string;
		headRefOid?: string;
		baseRefName?: string;
	};
	if (data.state !== "OPEN") {
		logger.out(`PR #${pr} is ${data.state}. Exiting.`);
		return { entered: true, reason: `pull request is ${data.state}`, merged: false };
	}

	// GitHub may rewrite a native stack head after the review event was emitted.
	// Never merge a different commit than the one the maintainer reviewed.
	if (env.GITHUB_EVENT_NAME === "pull_request_review" && env.REVIEW_HEAD_SHA !== data.headRefOid)
		throw new Error(`PR #${pr} head changed since the approving review; fresh approval required`);

	if (data.isDraft) {
		logger.out(`Marking PR #${pr} ready for review...`);
		run(["pr", "ready", String(pr)], repo, { check: true });
	}

	if (data.reviewDecision === "REVIEW_REQUIRED") {
		submitProxyReview(pr, repo, actor, { run, env, logger });
	}

	// A merge-async request merges *every open downstack PR* too, not just this
	// approved PR. Refuse to merge a stack parent as a side effect of approving
	// its child. The caller can approve each PR independently after restacking.
	if (!data.baseRefName) throw new Error(`Cannot merge PR #${pr}: missing base branch identity`);
	const headFilter = encodeURIComponent(`${repo.split("/")[0]}:${data.baseRefName}`);
	const list = run(["api", `repos/${repo}/pulls?state=open&head=${headFilter}&per_page=100`], repo, {
		check: true,
	});
	const open = JSON.parse(list.stdout) as { number: number; head?: { ref?: string; repo?: { full_name?: string } } }[];
	const parent = open.find(
		(candidate) =>
			candidate.number !== pr &&
			candidate.head?.ref === data.baseRefName &&
			candidate.head?.repo?.full_name?.toLowerCase() === repo.toLowerCase(),
	);
	if (parent) {
		logger.out(`PR #${pr} has open downstack parent #${parent.number}; defer merge until that PR lands.`);
		return { entered: true, reason: `unmerged downstack PR #${parent.number}`, merged: false };
	}

	// GitHub's native PR stacks require asynchronous REST merging. The old gh pr
	// merge/GraphQL auto-merge APIs reject stacks even when approved and green.
	// The same REST endpoint works for single PRs and honors branch protections.
	if (!data.headRefOid || !/^[a-f0-9]{40}$/u.test(data.headRefOid))
		throw new Error(`Cannot merge PR #${pr}: reviewed head SHA is missing or invalid`);
	logger.out(`Submitting asynchronous merge for PR #${pr} at ${data.headRefOid}...`);
	const response = run(
		[
			"api",
			"--method",
			"PUT",
			`repos/${repo}/pulls/${pr}/merge-async`,
			"-H",
			"X-GitHub-Api-Version: 2026-03-10",
			"-f",
			`sha=${data.headRefOid}`,
			"-f",
			"merge_method=merge",
			"-f",
			"merge_action=default",
		],
		repo,
	);
	let submitted: {
		status?: string;
		details?: { uuid?: string; message?: string; expected_head_sha?: string; merge_action?: string };
	};
	try {
		submitted = JSON.parse(response.stdout);
	} catch {
		throw new Error(`Cannot parse async merge response for PR #${pr}: ${response.stderr || response.stdout}`);
	}
	if (response.exitCode !== 0) {
		// A repeated approval can race an existing, still-pending merge request.
		// GitHub returns 409 with the original UUID/options. Only reuse a
		// request targeting this exact reviewed head and merge action.
		if (
			submitted.status !== "pending" ||
			!submitted.details?.uuid ||
			submitted.details.expected_head_sha !== data.headRefOid ||
			submitted.details.merge_action !== "default"
		)
			throw new Error(`Cannot submit async merge for PR #${pr}: ${(response.stderr || response.stdout).trim()}`);
	}
	if (!["pending", "enqueued", "merged"].includes(submitted.status ?? ""))
		throw new Error(`GitHub did not accept merge of PR #${pr}: ${response.stdout}`);
	const requestId = submitted.details?.uuid;
	if (submitted.status === "pending" && !requestId)
		throw new Error(`GitHub omitted the async merge request ID for PR #${pr}`);
	logger.out(`Merge request: ${submitted.status}${requestId ? ` (${requestId})` : ""}.`);
	if (submitted.status === "enqueued") {
		logger.out(`PR #${pr} queued; merge-complete event will reconcile it.`);
		return { entered: true, reason: "merge queued", merged: false };
	}

	for (let attempt = 0; attempt < MERGE_POLL_ATTEMPTS; attempt += 1) {
		if (requestId) {
			const status = run(
				["api", `repos/${repo}/pulls/${pr}/merge-async/${requestId}`, "-H", "X-GitHub-Api-Version: 2026-03-10"],
				repo,
				{ check: true },
			);
			const response = JSON.parse(status.stdout) as { status?: string; details?: { message?: string } };
			if (response.status === "failed")
				throw new Error(`Async merge of PR #${pr} failed: ${response.details?.message ?? "unknown reason"}`);
			if (!["pending", "merged", "enqueued"].includes(response.status ?? ""))
				throw new Error(`Unexpected async merge status for PR #${pr}: ${status.stdout}`);
			if (response.status === "enqueued") {
				logger.out(`PR #${pr} queued; merge-complete event will reconcile it.`);
				return { entered: true, reason: "merge queued", merged: false };
			}
		}
		const check = run(["pr", "view", String(pr), "--json", "state"], repo);
		if (check.exitCode === 0 && (JSON.parse(check.stdout) as { state?: string }).state === "MERGED") {
			logger.out(`PR #${pr} merged successfully.`);
			return { entered: true, reason: null, merged: true };
		}
		await sleep(MERGE_POLL_INTERVAL_MS);
	}

	logger.out(`PR #${pr} has not merged; asynchronous request ${requestId ?? submitted.status} remains unconfirmed.`);
	return { entered: true, reason: "asynchronous merge pending", merged: false };
}
