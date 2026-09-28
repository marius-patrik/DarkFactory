import { describe, expect, test } from "bun:test";
import type { BoardEntity } from "../../src/pipeline/board-status.ts";
import { SCOPE_AMENDMENT_MARKER } from "../../src/pipeline/pr-body.ts";
import { runPrFeedbackFix } from "../../src/pipeline/pr-feedback-fix.ts";
import { AGENT_ERROR_PREFIX, QUOTA_EXHAUSTED_NOTICE } from "../../src/pipeline/signals.ts";
import {
	gitCommands,
	type HandlerContextOptions,
	handlerContext,
	labelChanges,
	postedComments,
	recordingIo,
	recordingWorkspace,
} from "./handlers.ts";

const REPO = "marius-patrik/DarkFactory";
const PR = 1160;
const PLAN = 1150;
const REQUEST = 1148;
const HEAD = "fix/scope-gate";
const FEEDBACK = "Use `bun run test`, not `npm test`.";

const PLAN_BODY = "### Implementation Plan\n\n## Scope\n- `packages/harness/src/pipeline/plan-scope.ts`\n";

/** What a feedback-fix context is built from. */
interface FeedbackFixContextOptions extends Partial<HandlerContextOptions> {
	/** Standard output for `git status --porcelain`; empty means the agent changed nothing. */
	dirty?: boolean;
	/** Git commands that fail, keyed by their joined arguments. */
	gitError?: Record<string, string>;
}

/**
 * A feedback-fix context with a board double and a workspace with staged changes.
 *
 * @param options - The port, the agent's answers, and the working copy's state.
 * @returns The context and the doubles behind it.
 */
function feedbackContext(options: FeedbackFixContextOptions = {}) {
	const io = options.io ?? feedbackPort();
	const board: Array<BoardEntity & { status: string }> = [];
	const base = handlerContext({ ...options, io, answers: options.answers ?? ["Updated the test command."] });
	const workspace = recordingWorkspace({
		gitOutput: {
			"status --porcelain": options.dirty === false ? "" : " M packages/harness/src/pipeline/plan-scope.ts",
		},
		gitError: options.gitError,
	});
	return {
		context: {
			...base.context,
			workspace: workspace.io,
			board: (entity: BoardEntity, status: string) => {
				board.push({ ...entity, status });
			},
		},
		agent: base.agent,
		reported: base.reported,
		workspace,
		board,
	};
}

/**
 * The port, wired to the plan issue and a head branch to check out.
 *
 * @param options - Overrides for the issue fixture, per-operation behaviour, or the plan's comments.
 * @returns The recording port.
 */
function feedbackPort(
	options: {
		comments?: string[];
		body?: string;
		behaviour?: Parameters<typeof recordingIo>[1];
		planNumber?: number;
	} = {},
) {
	const planNumber = options.planNumber ?? PLAN;
	return recordingIo(
		{ [planNumber]: { title: "Plan: scope gate", body: options.body ?? PLAN_BODY, comments: options.comments ?? [] } },
		options.behaviour ?? {},
		{ [PR]: { headRefName: HEAD } },
	);
}

/** The feedback a rejection carries. */
const FEEDBACK_REQUEST = { prNumber: PR, planNumber: PLAN, requestNumber: REQUEST, feedback: FEEDBACK, repo: REPO };

describe("runPrFeedbackFix: feedback that reaches the branch", () => {
	test("commits, pushes, posts the answer, and starts self-review at iteration 1", async () => {
		const port = feedbackPort();
		const { context, agent, workspace, board } = feedbackContext({ io: port.io });

		const outcome = await runPrFeedbackFix(context, FEEDBACK_REQUEST);

		expect(outcome.kind).toBe("self-review-dispatched");
		expect(agent.requests[0]?.kind).toBe("fix");
		expect(agent.requests[0]?.timeout).toBe("10m0s");
		expect(agent.requests[0]?.checkpoint).toEqual({
			issueNumber: PR,
			repo: REPO,
			isPr: true,
			completedSteps: ["Feedback fix"],
		});
		expect(gitCommands(workspace)).toEqual([
			"fetch origin fix/scope-gate",
			"checkout -B fix/scope-gate origin/fix/scope-gate",
			"add -A",
			"status --porcelain",
			"commit -m fix(feedback): address owner feedback",
			"push origin HEAD",
		]);
		expect(postedComments(port)).toEqual(["### Feedback addressed\n\nUpdated the test command."]);
		// Back to iteration 1, not the interrupted one: a rejection produced a new branch state, and
		// a review resuming mid-loop would compare new findings against a digest that no longer applies.
		expect(port.calls.at(-1)).toEqual({
			op: "dispatchAgentStage",
			args: [REPO, { stage: "self-review", pr: PR, plan: PLAN, request: REQUEST, iteration: 1 }],
		});
		expect(board).toEqual([]);
	});

	test("passes the owner's feedback verbatim, not paraphrased", async () => {
		// An owner who wrote a specific requirement meant that sentence, and a paraphrase is one more
		// place the agent can lose it.
		const port = feedbackPort();
		const { context, agent } = feedbackContext({ io: port.io });

		await runPrFeedbackFix(context, FEEDBACK_REQUEST);

		expect(agent.requests[0]?.prompt).toBe(
			`Plan approved:\n${PLAN_BODY}\n\nOwner feedback:\n${FEEDBACK}\n\n` +
				"Make the necessary changes to address the feedback.",
		);
	});

	test("judges the revision against the newest plan comment, so an amendment is honoured", async () => {
		const amended = `${PLAN_BODY}\n\n### ${SCOPE_AMENDMENT_MARKER}\n\nAlso cover the new helper.`;
		const port = feedbackPort({ comments: [amended, "Looks fine to me."] });
		const { context, agent } = feedbackContext({ io: port.io });

		await runPrFeedbackFix(context, FEEDBACK_REQUEST);

		expect(agent.requests[0]?.prompt).toContain("Also cover the new helper.");
		expect(agent.requests[0]?.prompt).not.toContain("Looks fine to me.");
	});

	test("trims a long answer, because an over-long comment fails to post", async () => {
		// A pull request comment that exceeds GitHub's limit is a failed comment. The revision is on
		// the branch but the summary never lands, and the owner reads the feedback as unaddressed.
		const long = "x".repeat(3200);
		const port = feedbackPort();
		const { context } = feedbackContext({ io: port.io, answers: [long] });

		await runPrFeedbackFix(context, FEEDBACK_REQUEST);

		const posted = postedComments(port)[0] ?? "";
		expect(posted).toBe(`### Feedback addressed\n\n${"x".repeat(3000)}`);
	});

	test("formats the revision before committing it, not after", async () => {
		// The next self review fails on a format check, and the feedback reads as unapplied.
		const port = feedbackPort();
		const { context, workspace } = feedbackContext({ io: port.io });

		await runPrFeedbackFix(context, FEEDBACK_REQUEST);

		const formatted = workspace.calls.findIndex((call) => call.op === "formatRepository");
		const committed = workspace.calls.findIndex(
			(call) => call.op === "git" && (call.args[0] as string[])[0] === "commit",
		);
		expect(formatted).toBeGreaterThan(-1);
		expect(committed).toBeGreaterThan(formatted);
	});
});

describe("runPrFeedbackFix: feedback that did not reach the branch", () => {
	test("an agent that changed nothing says so and blocks, rather than reporting it addressed", async () => {
		// This is the load-bearing case. A `### Feedback addressed` comment on a branch with no new
		// commit is a false report, and it ends the exchange: the owner stops asking.
		const port = feedbackPort();
		const { context, board } = feedbackContext({ io: port.io, dirty: false });

		const outcome = await runPrFeedbackFix(context, FEEDBACK_REQUEST);

		expect(outcome).toMatchObject({ kind: "not-applied", reason: "no-changes" });
		expect(postedComments(port)).toEqual([
			"<!-- darkfactory-agent -->\n### Feedback Fix Error\n\n" +
				"The agent finished without changing any file, so nothing was pushed.\n\n" +
				"The feedback was not applied. Reply `/df reject <feedback>` to try again.",
		]);
		expect(board).toEqual([
			{ number: PR, isPr: true, status: "Blocked" },
			{ number: REQUEST, isPr: false, status: "Blocked" },
		]);
		// Nothing is pushed, so nothing is reviewed: a review of an unchanged branch repeats the
		// findings the owner just rejected.
		expect(port.calls.filter((call) => call.op === "dispatchAgentStage")).toEqual([]);
	});

	test("a rejected commit reports the git output and blocks both entities", async () => {
		const port = feedbackPort();
		const { context, board } = feedbackContext({
			io: port.io,
			gitError: { "commit -m fix(feedback): address owner feedback": "error: nothing to commit" },
		});

		const outcome = await runPrFeedbackFix(context, FEEDBACK_REQUEST);

		expect(outcome).toMatchObject({ kind: "not-applied", reason: "git-failed" });
		expect(postedComments(port).at(-1)).toBe(
			"<!-- darkfactory-agent -->\n### Feedback Fix Error\n\n" +
				"Committing or pushing the revision failed:\n\n```\nerror: nothing to commit\n```\n\n" +
				"The feedback was not applied. Reply `/df reject <feedback>` to try again.",
		);
		expect(board).toEqual([
			{ number: PR, isPr: true, status: "Blocked" },
			{ number: REQUEST, isPr: false, status: "Blocked" },
		]);
	});

	test("a rejected push is the same event to the owner, and is reported the same way", async () => {
		const port = feedbackPort();
		const { context, board } = feedbackContext({
			io: port.io,
			gitError: { "push origin HEAD": "! [rejected] fix/scope-gate -> fix/scope-gate (stale info)" },
		});

		const outcome = await runPrFeedbackFix(context, FEEDBACK_REQUEST);

		expect(outcome).toMatchObject({ kind: "not-applied", reason: "git-failed" });
		expect(postedComments(port).at(-1)).toContain("! [rejected] fix/scope-gate");
		expect(board).toHaveLength(2);
	});

	test("an agent failure blocks both and never reports the feedback as addressed", async () => {
		const port = feedbackPort();
		const { context, board } = feedbackContext({
			io: port.io,
			answers: [`${AGENT_ERROR_PREFIX}: the fix harness exited 1`],
		});

		const outcome = await runPrFeedbackFix(context, FEEDBACK_REQUEST);

		expect(outcome.kind).toBe("agent-error");
		expect(postedComments(port)).toEqual([
			`<!-- darkfactory-agent -->\n### Feedback Fix Error\n\n${AGENT_ERROR_PREFIX}: the fix harness exited 1`,
		]);
		expect(board).toEqual([
			{ number: PR, isPr: true, status: "Blocked" },
			{ number: REQUEST, isPr: false, status: "Blocked" },
		]);
		expect(labelChanges(port)).toEqual([
			{ number: PR, labels: ["Blocked"], add: true },
			{ number: REQUEST, labels: ["Blocked"], add: true },
		]);
	});
});

describe("runPrFeedbackFix: failure paths", () => {
	test("a branch that cannot be checked out posts a notice and blocks only the pull request", async () => {
		// Only the pull request: the owner can retry the feedback without re-approving anything, so
		// blocking the Request would stop a conversation rather than a run.
		const port = recordingIo({}, { prView: new Error("HTTP 404: no pull request found") });
		const { context, board, agent } = feedbackContext({ io: port.io });

		const outcome = await runPrFeedbackFix(context, FEEDBACK_REQUEST);

		expect(outcome).toEqual({ kind: "blocked", pr: PR, reason: "checkout-failed" });
		expect(postedComments(port)).toEqual([
			"<!-- darkfactory-agent -->\n### Branch checkout failed\n\n" +
				"The pull request branch could not be checked out, so this stage did not run.",
		]);
		expect(board).toEqual([{ number: PR, isPr: true, status: "Blocked" }]);
		expect(agent.requests).toEqual([]);
	});

	test("a plan that cannot be read reports and blocks nothing", async () => {
		// A failed read is not a decision about the work. Blocking the owner's Request over it stops
		// a pipeline on a transient error and tells the owner nothing they can retry.
		const port = feedbackPort({ behaviour: { issueView: new Error("HTTP 503") } });
		const { context, board, agent, reported } = feedbackContext({ io: port.io });

		const outcome = await runPrFeedbackFix(context, FEEDBACK_REQUEST);

		expect(outcome).toEqual({ kind: "plan-unavailable", pr: PR, reason: "Failed to load plan #1150: HTTP 503" });
		expect(board).toEqual([]);
		expect(agent.requests).toEqual([]);
		expect(reported).toEqual(["Failed to load plan #1150: HTTP 503"]);
	});

	test("a quota notice posts nothing, because that run already checkpointed and blocked", async () => {
		const port = feedbackPort();
		const { context, board } = feedbackContext({ io: port.io, answers: [QUOTA_EXHAUSTED_NOTICE] });

		const outcome = await runPrFeedbackFix(context, FEEDBACK_REQUEST);

		expect(outcome).toEqual({ kind: "quota-exhausted", pr: PR, notice: QUOTA_EXHAUSTED_NOTICE });
		expect(postedComments(port)).toEqual([]);
		expect(board).toEqual([]);
	});

	test("with no Request named, the next review falls back to the plan's own parent", async () => {
		// A repository where both gates share one issue has no separate Request, and the plan's parent
		// is the only thing left to dispatch against. Guessing the pull request number instead would
		// dispatch a review naming an issue that is not there.
		const port = feedbackPort({ body: "Parent Request: #1140\n\n### Implementation Plan\n\n## Scope\n- `a.ts`\n" });
		const { context } = feedbackContext({ io: port.io });

		await runPrFeedbackFix(context, { ...FEEDBACK_REQUEST, requestNumber: undefined });

		expect(port.calls.at(-1)?.args[1]).toMatchObject({ stage: "self-review", request: 1140, iteration: 1 });
	});

	test("with no Request named and no parent to find, the next review falls back to the plan", async () => {
		const port = feedbackPort();
		const { context } = feedbackContext({ io: port.io });

		await runPrFeedbackFix(context, { ...FEEDBACK_REQUEST, requestNumber: undefined });

		expect(port.calls.at(-1)?.args[1]).toMatchObject({ stage: "self-review", request: PLAN, iteration: 1 });
	});

	test("the answer comment carries no agent marker, so the owner's next reply is still read", async () => {
		// This comment announces the owner's own feedback as handled. Marking it as the agent's own
		// output would make a later pass skip the owner's reply as agent chatter.
		const port = feedbackPort();
		const { context } = feedbackContext({ io: port.io });

		await runPrFeedbackFix(context, FEEDBACK_REQUEST);

		expect(postedComments(port)[0]?.startsWith("<!-- darkfactory-agent -->")).toBe(false);
	});
});
