import { describe, expect, test } from "bun:test";
import type { BoardEntity } from "../../src/pipeline/board-status.ts";
import { pipelineEnvironment } from "../../src/pipeline/handler-context.ts";
import { type SelfReviewContext, runSelfReviewIteration } from "../../src/pipeline/self-review.ts";
import { reviewDigest } from "../../src/pipeline/review-convergence.ts";
import { NO_FINDINGS_PREFIX } from "../../src/pipeline/review-findings.ts";
import { AGENT_ERROR_PREFIX, QUOTA_EXHAUSTED_NOTICE } from "../../src/pipeline/signals.ts";
import {
	type HandlerContextOptions,
	handlerContext,
	labelChanges,
	operations,
	postedComments,
	recordingIo,
	recordingWorkspace,
} from "./handlers.ts";

const REPO = "marius-patrik/DarkFactory";
const PR = 1160;
const PLAN = 1150;
const REQUEST = 1148;
const HEAD = "fix/scope-gate";

/** A plan whose file scope the deterministic gate can actually decide on. */
const PLAN_BODY = [
	"### Implementation Plan",
	"",
	"## File Scope",
	"- `packages/harness/src/pipeline/plan-scope.ts`",
	"- `packages/harness/test/pipeline/plan-scope.test.ts`",
	"",
	"## Verification",
	"Run the suite.",
].join("\n");

const IN_SCOPE_FILE = "packages/harness/src/pipeline/plan-scope.ts";
/** A file the plan named nothing about, and which is not a test, so the gate rejects it. */
const OUT_OF_SCOPE_FILE = "packages/harness/src/pipeline/agent-prompt.ts";

const DIFF = [
	`diff --git a/${IN_SCOPE_FILE} b/${IN_SCOPE_FILE}`,
	"--- a/packages/harness/src/pipeline/plan-scope.ts",
	"+++ b/packages/harness/src/pipeline/plan-scope.ts",
	"@@ -247,4 +247,5 @@ export function checkScope(",
	"+  // A plan that names no files defines no scope.",
].join("\n");

/** One review finding, in the numbered form the review prompt asks the agent for. */
const ONE_FINDING = "1. `checkScope` never excludes test files, so a plan naming only source is judged against its own tests.";
const OTHER_FINDING = "1. A different finding entirely, with no shared wording.";

/** What a self-review context is built from. */
interface SelfReviewContextOptions extends HandlerContextOptions {
	/** The changed files the deterministic scope gate sees. */
	changedFiles?: string[];
}

/**
 * A self-review context with a board double and a workspace that reports one branch and one diff.
 *
 * The workspace answers with a pull request branch and a file list, because both are state the
 * handler branches on: the checkout has to find a head branch to succeed at all, and the scope gate
 * has to have files to judge.
 *
 * @param options - The port, the workspace state, the agent's answers, and the repository's names.
 * @returns The context and the doubles behind it.
 */
function selfReviewContext(options: SelfReviewContextOptions) {
	const board: Array<BoardEntity & { status: string }> = [];
	const base = handlerContext(options);
	const workspace = recordingWorkspace({
		baseRefs: [`origin/${options.developmentBranch ?? "develop"}...HEAD`],
		gitOutput: {
			"diff --name-only origin/develop...HEAD": (options.changedFiles ?? [IN_SCOPE_FILE]).join("\n"),
		},
	});
	const context: SelfReviewContext = {
		...base.context,
		workspace: workspace.io,
		board: (entity, status) => {
			board.push({ ...entity, status });
		},
		environment: pipelineEnvironment({ GITHUB_WORKSPACE: "/workspace" }),
	};
	return { context, board, agent: base.agent, reported: base.reported, workspace };
}

/** The port, wired to the plan issue, the diff, the head branch and a comment history. */
function selfReviewPort(options: { comments?: string[] } = {}) {
	return recordingIo(
		{ [PLAN]: { title: "Plan: scope gate", body: PLAN_BODY, comments: options.comments ?? [] } },
		{ prDiff: DIFF },
		{ [PR]: { headRefName: HEAD, comments: options.comments ?? [] } },
	);
}

/** The request a review iteration runs against. */
const REQUEST_FOR_REVIEW = { prNumber: PR, planNumber: PLAN, requestNumber: REQUEST, iteration: 1, repo: REPO };

describe("runSelfReviewIteration: a review that finds nothing", () => {
	test("posts findings=0, says so, and hands off to the plan-alignment gate", async () => {
		const port = selfReviewPort();
		const { context, board, agent } = selfReviewContext({
			io: port.io,
			answers: [`${NO_FINDINGS_PREFIX}\n\nThe diff does what the plan asked.`],
		});

		const outcome = await runSelfReviewIteration(context, REQUEST_FOR_REVIEW);

		expect(outcome.kind).toBe("clean");
		// Two agent runs: the review, then the alignment gate's separate question.
		expect(agent.requests).toHaveLength(2);
		expect(agent.requests[0]?.kind).toBe("review");
		expect(agent.requests[0]?.timeout).toBe("10m0s");
		expect(agent.requests[1]?.kind).toBe("review");
		expect(postedComments(port)[0]).toBe(
			`### Self-Review — iteration 1\nNo actionable findings.\n` +
				`<!-- darkfactory-self-review iteration=1 findings=0 digest=${reviewDigest([])} -->`,
		);
		expect(postedComments(port)[1]).toBe(
			"<!-- darkfactory-agent -->\n### Self-Review — iteration 1\n\n" +
				`✅ Self-review clean at iteration 1\n` +
				`<!-- darkfactory-self-review iteration=1 findings=0 digest=${reviewDigest([])} -->`,
		);
		// Alignment is not completion, so nothing is unblocked and nothing is marked ready here.
		expect(board).toEqual([]);
	});

	test("never dispatches a fix, because there is nothing to fix", async () => {
		const port = selfReviewPort();
		const { context } = selfReviewContext({ io: port.io, answers: [NO_FINDINGS_PREFIX] });

		await runSelfReviewIteration(context, REQUEST_FOR_REVIEW);

		// A clean pass hands off to the alignment gate, which runs in this process. It dispatches
		// nothing: the loop is over, so there is no next iteration to dispatch to.
		expect(port.calls.filter((call) => call.op === "dispatchAgentStage")).toEqual([]);
	});

	test("a clean pass checks out the pull request's own branch, not the default branch", async () => {
		// A dispatched stage starts from the default branch, so a review that read it read the wrong
		// tree entirely - and a fix committing there pushes to a ref the pull request does not merge.
		const port = selfReviewPort();
		const { context, workspace } = selfReviewContext({ io: port.io, answers: [NO_FINDINGS_PREFIX] });

		await runSelfReviewIteration(context, REQUEST_FOR_REVIEW);

		expect(port.calls[0]).toEqual({ op: "prView", args: [REPO, PR, ["headRefName"]] });
		expect(workspace.calls.some((call) => call.op === "git" && (call.args[0] as string[])[0] === "checkout")).toBe(
			true,
		);
	});
});

describe("runSelfReviewIteration: a review that requests a fix", () => {
	test("posts the findings with their digest marker, then dispatches the fix", async () => {
		const port = selfReviewPort();
		const { context, board } = selfReviewContext({ io: port.io, answers: [ONE_FINDING] });

		const outcome = await runSelfReviewIteration(context, REQUEST_FOR_REVIEW);

		expect(outcome.kind).toBe("fix-dispatched");
		const findings = [ONE_FINDING.slice(3)];
		const digest = reviewDigest(findings);
		expect(postedComments(port)).toEqual([
			`### Self-Review — iteration 1\n1. ${findings[0]}\n` +
				`<!-- darkfactory-self-review iteration=1 findings=1 digest=${digest} -->`,
		]);
		expect(port.calls.at(-1)).toEqual({
			op: "dispatchAgentStage",
			args: [REPO, { stage: "self-review-fix", pr: PR, plan: PLAN, request: REQUEST, iteration: 1 }],
		});
		// A review that found something is not a stopped pipeline.
		expect(board).toEqual([]);
	});

	test("a file outside the plan's scope is a finding the model never saw", async () => {
		// The scope gate runs before the agent and its findings lead the list, so a model that missed
		// the stray file does not make it disappear.
		const port = selfReviewPort();
		const { context } = selfReviewContext({
			io: port.io,
			changedFiles: [IN_SCOPE_FILE, OUT_OF_SCOPE_FILE],
			answers: [NO_FINDINGS_PREFIX],
		});

		const outcome = await runSelfReviewIteration(context, REQUEST_FOR_REVIEW);

		expect(outcome.kind).toBe("fix-dispatched");
		expect(postedComments(port)[0]).toBe(
			`### Self-Review — iteration 1\n1. Out of scope: ${OUT_OF_SCOPE_FILE} (not in the approved plan)\n` +
				`<!-- darkfactory-self-review iteration=1 findings=1 digest=${reviewDigest([`Out of scope: ${OUT_OF_SCOPE_FILE} (not in the approved plan)`])} -->`,
		);
	});

	test("the fix carries the iteration it is fixing, so the fix reads the right comment", async () => {
		const port = selfReviewPort();
		const { context } = selfReviewContext({ io: port.io, answers: [ONE_FINDING] });

		await runSelfReviewIteration(context, { ...REQUEST_FOR_REVIEW, iteration: 4 });

		expect(port.calls.at(-1)?.args[1]).toEqual({
			stage: "self-review-fix",
			pr: PR,
			plan: PLAN,
			request: REQUEST,
			iteration: 4,
		});
	});
});

describe("runSelfReviewIteration: a fix that still fails, and the loop's bound", () => {
	/** The comment iteration 1 left behind, for a review now running at iteration 2. */
	const PRIOR_MARKER = (findings: string): string =>
		`### Self-Review — iteration 1\n1. ${findings}\n` +
		`<!-- darkfactory-self-review iteration=1 findings=1 digest=${reviewDigest([findings])} -->`;

	test("identical findings twice in a row is no progress, so the loop stops and blocks", async () => {
		// This is the loop's bound, and it is not an iteration cap: the second identical round is the
		// signal, not the count. A cap would stop a review still making progress and say nothing about
		// one that is not.
		const finding = ONE_FINDING.slice(3);
		const port = selfReviewPort({ comments: [PRIOR_MARKER(finding)] });
		const { context, board } = selfReviewContext({ io: port.io, answers: [ONE_FINDING] });

		const outcome = await runSelfReviewIteration(context, { ...REQUEST_FOR_REVIEW, iteration: 2 });

		expect(outcome).toEqual({ kind: "blocked", iteration: 2, reason: "no-progress" });
		expect(postedComments(port)).toEqual([
			`### Self-Review — iteration 2\n1. ${finding}\n` +
				`<!-- darkfactory-self-review iteration=2 findings=1 digest=${reviewDigest([finding])} -->`,
			"<!-- darkfactory-agent -->\n### Self-Review Findings (Blocked)\n\n" +
				"Self-review made no progress across iterations (identical findings twice in a row):\n\n" +
				finding,
		]);
		expect(board).toEqual([
			{ number: PR, isPr: true, status: "Blocked" },
			{ number: REQUEST, isPr: false, status: "Blocked" },
		]);
		// The whole point of stopping: a third identical round must not be dispatched.
		expect(port.calls.filter((call) => call.op === "dispatchAgentStage")).toEqual([]);
	});

	test("different findings in the same iteration keep the loop going", async () => {
		// The bound detects a repeat, not a count. Iteration 2 finding something new is progress.
		const port = selfReviewPort({ comments: [PRIOR_MARKER(ONE_FINDING.slice(3))] });
		const { context, board } = selfReviewContext({ io: port.io, answers: [OTHER_FINDING] });

		const outcome = await runSelfReviewIteration(context, { ...REQUEST_FOR_REVIEW, iteration: 2 });

		expect(outcome.kind).toBe("fix-dispatched");
		expect(board).toEqual([]);
	});

	test("reworded identical findings still count as no progress", async () => {
		// The digest normalises: stripped, lowercased, sorted. If it did not, a review that reworded
		// itself would be able to loop forever by rephrasing.
		const finding = ONE_FINDING.slice(3);
		const port = selfReviewPort({ comments: [PRIOR_MARKER(finding.toUpperCase())] });
		const { context } = selfReviewContext({ io: port.io, answers: [ONE_FINDING] });

		const outcome = await runSelfReviewIteration(context, { ...REQUEST_FOR_REVIEW, iteration: 2 });

		expect(outcome).toEqual({ kind: "blocked", iteration: 2, reason: "no-progress" });
	});

	test("a run with no parent Request blocks the pull request alone", async () => {
		const finding = ONE_FINDING.slice(3);
		const port = selfReviewPort({ comments: [PRIOR_MARKER(finding)] });
		const { context, board } = selfReviewContext({ io: port.io, answers: [ONE_FINDING] });

		await runSelfReviewIteration(context, {
			prNumber: PR,
			planNumber: PLAN,
			iteration: 2,
			repo: REPO,
		});

		expect(board).toEqual([{ number: PR, isPr: true, status: "Blocked" }]);
	});

	test("the findings comment carries the review marker but not the agent marker", async () => {
		// The agent marker is what a response pass skips, so a findings comment carrying it would be
		// answered as owner feedback on a pull request nobody commented on. The review marker is the
		// only thing the next iteration reads back.
		const port = selfReviewPort();
		const { context } = selfReviewContext({ io: port.io, answers: [ONE_FINDING] });

		await runSelfReviewIteration(context, REQUEST_FOR_REVIEW);

		expect(postedComments(port)[0]?.startsWith("<!-- darkfactory-agent -->")).toBe(false);
		expect(postedComments(port)[0]).toContain("<!-- darkfactory-self-review iteration=1 findings=1");
	});
});

describe("runSelfReviewIteration: failure paths", () => {
	test("a branch that cannot be checked out blocks the pull request and reviews nothing", async () => {
		// `prView` is how the checkout learns the head branch, so a read that fails is a failed
		// checkout - which is the one blocked-without-comment path, because a stopped pipeline is what
		// a human is looking for and Blocked is the label they read.
		const port = recordingIo(
			{ [PLAN]: { body: PLAN_BODY } },
			{ prView: new Error("HTTP 404: no pull request found") },
		);
		const { context, board, agent, reported } = selfReviewContext({ io: port.io, answers: [ONE_FINDING] });

		const outcome = await runSelfReviewIteration(context, REQUEST_FOR_REVIEW);

		expect(outcome).toEqual({ kind: "blocked", iteration: 1, reason: "checkout-failed" });
		expect(agent.requests).toEqual([]);
		expect(labelChanges(port)).toEqual([{ number: PR, labels: ["Blocked"], add: true }]);
		expect(board).toEqual([{ number: PR, isPr: true, status: "Blocked" }]);
		expect(reported).toContain("Could not check out the branch of PR #1160: HTTP 404: no pull request found");
	});

	test("a diff that cannot be read blocks nothing, because there is nothing to say", async () => {
		// A pull request marked Blocked with no comment on it is worse than one that is merely
		// stalled: a human opening it has nothing to act on.
		const port = recordingIo(
			{ [PLAN]: { body: PLAN_BODY } },
			{ prDiff: new Error("HTTP 500") },
			{ [PR]: { headRefName: HEAD } },
		);
		const { context, board, agent, reported } = selfReviewContext({ io: port.io });

		const outcome = await runSelfReviewIteration(context, REQUEST_FOR_REVIEW);

		expect(outcome).toEqual({ kind: "blocked", iteration: 1, reason: "diff-unavailable" });
		expect(agent.requests).toEqual([]);
		expect(board).toEqual([]);
		expect(reported).toEqual(["Failed to get PR diff: HTTP 500"]);
	});

	test("a plan that cannot be read reaches no verdict", async () => {
		const port = recordingIo({}, { issueView: new Error("Not Found") }, { [PR]: { headRefName: HEAD } });
		const { context, agent, reported } = selfReviewContext({ io: port.io });

		const outcome = await runSelfReviewIteration(context, REQUEST_FOR_REVIEW);

		expect(outcome).toEqual({ kind: "blocked", iteration: 1, reason: "plan-unavailable" });
		expect(agent.requests).toEqual([]);
		expect(reported).toEqual(["Failed to get plan data: Not Found"]);
	});

	test("a quota notice posts nothing at all, because that run already blocked", async () => {
		const port = selfReviewPort();
		const { context, board, reported } = selfReviewContext({ io: port.io, answers: [QUOTA_EXHAUSTED_NOTICE] });

		const outcome = await runSelfReviewIteration(context, REQUEST_FOR_REVIEW);

		expect(outcome).toEqual({ kind: "blocked", iteration: 1, reason: "quota-exhausted" });
		expect(postedComments(port)).toEqual([]);
		expect(board).toEqual([]);
		expect(reported).toEqual([]);
	});

	test("an agent failure posts a Self-Review Error naming the iteration, and blocks nothing", async () => {
		const port = selfReviewPort();
		const { context, board } = selfReviewContext({
			io: port.io,
			answers: [`${AGENT_ERROR_PREFIX}: the review harness exited 1`],
		});

		const outcome = await runSelfReviewIteration(context, { ...REQUEST_FOR_REVIEW, iteration: 3 });

		expect(outcome).toEqual({ kind: "blocked", iteration: 3, reason: "agent-error" });
		expect(postedComments(port)).toEqual([
			"<!-- darkfactory-agent -->\n### Self-Review Error (Iteration 3)\n\n" +
				`${AGENT_ERROR_PREFIX}: the review harness exited 1`,
		]);
		expect(board).toEqual([]);
	});

	test("a failed fix dispatch reports, having already posted its notice and blocks", async () => {
		const port = recordingIo(
			{ [PLAN]: { body: PLAN_BODY } },
			{ prDiff: DIFF, dispatchAgentStage: new Error("HTTP 422: dispatch refused") },
			{ [PR]: { headRefName: HEAD } },
		);
		const { context, reported } = selfReviewContext({ io: port.io, answers: [ONE_FINDING] });

		const outcome = await runSelfReviewIteration(context, REQUEST_FOR_REVIEW);

		expect(outcome).toEqual({ kind: "blocked", iteration: 1, reason: "dispatch-failed" });
		// The findings comment still went out: they are on the pull request whatever the dispatch did.
		expect(postedComments(port)).toHaveLength(1);
		expect(reported).toContain("Dispatch failed during self-review: HTTP 422: dispatch refused");
	});

	test("a comments read that fails does not become a no-progress verdict", async () => {
		// Reading the prior digest is best-effort. A failed read leaves it absent, and absent means
		// "dispatch a fix" - not "the findings repeated".
		const port = recordingIo(
			{ [PLAN]: { body: PLAN_BODY } },
			{ prDiff: DIFF, issueComments: new Error("HTTP 500") },
			{ [PR]: { headRefName: HEAD } },
		);
		const { context, reported } = selfReviewContext({ io: port.io, answers: [ONE_FINDING] });

		const outcome = await runSelfReviewIteration(context, { ...REQUEST_FOR_REVIEW, iteration: 2 });

		expect(outcome.kind).toBe("fix-dispatched");
		expect(reported).toEqual([
			"Failed to read previous comments: HTTP 500",
			"Self-review fix dispatched for iteration 2",
		]);
	});

	test("a base branch that cannot be resolved throws rather than reviewing nothing as in-scope", async () => {
		// An empty changed-file list is a scope gate that passes on nothing, which would report a
		// clean review for a pull request that changed a file nobody looked at.
		const port = selfReviewPort();
		const { context, workspace, agent } = selfReviewContext({ io: port.io, answers: [NO_FINDINGS_PREFIX] });
		const broken = recordingWorkspace({ baseRefsError: "Cannot resolve base branch 'develop'" });

		const failing = runSelfReviewIteration({ ...context, workspace: broken.io }, REQUEST_FOR_REVIEW);

		await expect(failing).rejects.toThrow("Cannot resolve base branch 'develop'");
		expect(agent.requests).toEqual([]);
		expect(workspace.calls).toEqual([]);
	});
});

describe("runSelfReviewIteration: the review prompt", () => {
	test("states the plan scope for reference and forbids judging alignment there", async () => {
		const port = selfReviewPort();
		const { context, agent } = selfReviewContext({ io: port.io, answers: [ONE_FINDING] });

		await runSelfReviewIteration(context, REQUEST_FOR_REVIEW);

		const prompt = agent.requests[0]?.prompt ?? "";
		expect(prompt).toContain("## Plan Scope (for reference — do NOT evaluate plan alignment here)");
		expect(prompt).toContain(IN_SCOPE_FILE);
		expect(prompt).toContain("If you find NO actionable issues, respond starting with: NO_FINDINGS");
	});

	test("records the iteration in the checkpoint, so a stopped run knows where it was", async () => {
		const port = selfReviewPort();
		const { context, agent } = selfReviewContext({ io: port.io, answers: [ONE_FINDING] });

		await runSelfReviewIteration(context, { ...REQUEST_FOR_REVIEW, iteration: 2 });

		expect(agent.requests[0]?.checkpoint).toEqual({
			issueNumber: PR,
			repo: REPO,
			isPr: true,
			completedSteps: [
				`Completed implementation and opened PR #${PR}`,
				"Self-review iteration 2",
			],
		});
	});
});
