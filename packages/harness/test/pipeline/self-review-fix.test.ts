import { describe, expect, test } from "bun:test";
import type { BoardEntity } from "../../src/pipeline/board-status.ts";
import { runSelfReviewFix } from "../../src/pipeline/self-review-fix.ts";
import { reviewDigest } from "../../src/pipeline/review-convergence.ts";
import { AGENT_ERROR_PREFIX, QUOTA_EXHAUSTED_NOTICE } from "../../src/pipeline/signals.ts";
import {
	type HandlerContextOptions,
	gitCommands,
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

const IN_SCOPE_FILE = "packages/harness/src/pipeline/plan-scope.ts";
const OUT_OF_SCOPE_FILE = "packages/harness/src/pipeline/agent-prompt.ts";

/** What a self-review fix context is built from. */
interface SelfReviewFixContextOptions extends Partial<HandlerContextOptions> {
	/** Standard output for `git status --porcelain`; empty means the fix changed nothing. */
	dirty?: boolean;
	/** Git commands that fail, keyed by their joined arguments. */
	gitError?: Record<string, string>;
	/** What `removePath` finds at a path, for a file the base branch never had. */
	removedPaths?: Record<string, "file" | "directory">;
	/** The commit SHA `rev-parse HEAD` reports. */
	headSha?: string;
}

/**
 * A self-review fix context with a board double and a workspace with staged changes.
 *
 * @param options - The port, the agent's answers, and the working copy's state.
 * @returns The context and the doubles behind it.
 */
function fixContext(options: SelfReviewFixContextOptions = {}) {
	const answers = options.answers ?? ["Fixed the finding."];
	const io = options.io ?? selfReviewFixPort();
	const board: Array<BoardEntity & { status: string }> = [];
	const base = handlerContext({ ...options, io, answers });
	const workspace = recordingWorkspace({
		baseRefs: [`origin/${options.developmentBranch ?? "develop"}...HEAD`, "origin/develop"],
		gitOutput: {
			"status --porcelain": options.dirty === false ? "" : " M packages/harness/src/pipeline/plan-scope.ts",
			"rev-parse HEAD": options.headSha ?? "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
			[`cat-file -e origin/develop:${OUT_OF_SCOPE_FILE}`]: "",
		},
		gitError: options.gitError,
		removedPaths: options.removedPaths,
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

/** The port, wired to the pull request's comments and a head branch to check out. */
function selfReviewFixPort(options: { comments?: string[]; behaviour?: Parameters<typeof recordingIo>[1] } = {}) {
	return recordingIo(
		{ [PR]: { comments: options.comments ?? [] } },
		options.behaviour ?? {},
		{ [PR]: { headRefName: HEAD, comments: options.comments ?? [] } },
	);
}

/**
 * The review comment iteration 2 left behind, exactly as the review stage posts it.
 *
 * Note what the parser makes of it: the hidden marker is neither numbered nor bulleted, so it is
 * read as a continuation of the finding above it and rides along in the summary comment. That is the
 * Python's behaviour and it is preserved rather than tidied - the marker is inert text inside a
 * comment body, and a fix stage that dropped it would be redesigning the loop's record.
 */
const FINDINGS_COMMENT_2 = [
	"### Self-Review — iteration 2",
	`1. Out of scope: ${OUT_OF_SCOPE_FILE} (not in the approved plan)`,
	"2. `checkScope` never excludes test files, so a plan naming only source is judged against its own tests.",
	`<!-- darkfactory-self-review iteration=2 findings=2 digest=${reviewDigest([
		`Out of scope: ${OUT_OF_SCOPE_FILE} (not in the approved plan)`,
		"`checkScope` never excludes test files, so a plan naming only source is judged against its own tests.",
	])} -->`,
].join("\n");

/** The last finding as the fix stage actually reads it, marker included. */
const SECOND_FINDING_WITH_MARKER =
	"`checkScope` never excludes test files, so a plan naming only source is judged against its own tests. " +
	`<!-- darkfactory-self-review iteration=2 findings=2 digest=${reviewDigest([
		`Out of scope: ${OUT_OF_SCOPE_FILE} (not in the approved plan)`,
		"`checkScope` never excludes test files, so a plan naming only source is judged against its own tests.",
	])} -->`;

/** The request a fix stage runs against. */
const FIX_REQUEST = { prNumber: PR, planNumber: PLAN, requestNumber: REQUEST, iteration: 2, repo: REPO };

describe("runSelfReviewFix: applying a review's findings", () => {
	test("reverts the out-of-scope file, hands the rest to the agent, then dispatches iteration N+1", async () => {
		const port = selfReviewFixPort({ comments: [FINDINGS_COMMENT_2] });
		const { context, agent, workspace } = fixContext({ io: port.io });

		const outcome = await runSelfReviewFix(context, FIX_REQUEST);

		expect(outcome.kind).toBe("next-review-dispatched");
		// The reversion comes first and is its own commit: a reviewer has to be able to see in the
		// diff that the file came back from the base rather than being rewritten by the agent.
		expect(agent.requests[0]?.prompt).toContain(
			"1. `checkScope` never excludes test files, so a plan naming only source is judged against its own tests.",
		);
		// The out-of-scope path is not in the agent's prompt at all - it was restored, not reasoned about.
		expect(agent.requests[0]?.prompt).not.toContain(OUT_OF_SCOPE_FILE);
		expect(agent.requests[0]?.kind).toBe("fix");
		expect(agent.requests[0]?.timeout).toBe("10m0s");
		expect(agent.requests[0]?.checkpoint).toEqual({
			issueNumber: PR,
			repo: REPO,
			isPr: true,
			completedSteps: ["Self-review fix iteration 2"],
		});
		expect(gitCommands(workspace)).toContain(`checkout origin/develop -- ${OUT_OF_SCOPE_FILE}`);
		expect(port.calls.at(-1)?.args[1]).toEqual({
			stage: "self-review",
			pr: PR,
			plan: PLAN,
			request: REQUEST,
			iteration: 3,
		});
	});

	test("reverts and pushes the out-of-scope file in a commit of its own", async () => {
		const port = selfReviewFixPort({ comments: [FINDINGS_COMMENT_2] });
		const { context, workspace } = fixContext({ io: port.io });

		await runSelfReviewFix(context, FIX_REQUEST);

		const commands = workspace.calls
			.filter((call) => call.op === "git")
			.map((call) => (call.args[0] as string[]).join(" "));
		const revertCommit = commands.indexOf(
			`commit -m revert(scope): revert files outside plan scope (${OUT_OF_SCOPE_FILE})`,
		);
		const fixCommit = commands.findIndex((command) => command.startsWith("commit -m fix(review): address"));
		// Two commits, and the reversion is the earlier one. A single commit could not say which of
		// the two mechanisms produced any given line.
		expect(revertCommit).toBeGreaterThan(-1);
		expect(fixCommit).toBeGreaterThan(revertCommit);
	});

	test("summarises both mechanisms, naming the reversion commit", async () => {
		const port = selfReviewFixPort({ comments: [FINDINGS_COMMENT_2] });
		const { context } = fixContext({ io: port.io, headSha: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678" });

		await runSelfReviewFix(context, FIX_REQUEST);

		expect(postedComments(port).at(-1)).toBe(
			"<!-- darkfactory-agent -->\n### Self-Review fixes — iteration 2\n\n" +
				`Reverted out-of-scope files (${OUT_OF_SCOPE_FILE}) in commit a1b2c3d.\n\n` +
				`Applied fixes for findings:\n- ${SECOND_FINDING_WITH_MARKER}`,
		);
	});

	test("a file the base branch never had is deleted, not restored", async () => {
		// The scope gate rejects a file the plan never named, and a file that was *added* has nothing
		// in the base to come back to. `git rm --ignore-unmatch` alone would leave an untracked file
		// sitting there, so the working copy removal is what makes this correct.
		const comment = [
			"### Self-Review — iteration 1",
			`1. Out of scope: ${IN_SCOPE_FILE} (not in the approved plan)`,
			`<!-- darkfactory-self-review iteration=1 findings=1 digest=${reviewDigest([
				`Out of scope: ${IN_SCOPE_FILE} (not in the approved plan)`,
			])} -->`,
		].join("\n");
		const port = selfReviewFixPort({ comments: [comment] });
		const { context, workspace, agent } = fixContext({
			io: port.io,
			// The existence probe is the load-bearing call: a path the base does not carry fails it, and
			// that failure is what selects deletion over restoration.
			gitError: { [`cat-file -e origin/develop:${IN_SCOPE_FILE}`]: "fatal: path does not exist" },
			removedPaths: { [IN_SCOPE_FILE]: "file" },
		});

		const outcome = await runSelfReviewFix(context, { ...FIX_REQUEST, iteration: 1 });

		expect(outcome.kind).toBe("next-review-dispatched");
		expect(workspace.calls.map((call) => call.op)).toContain("removePath");
		expect(gitCommands(workspace)).toContain(`rm -f --ignore-unmatch ${IN_SCOPE_FILE}`);
		// Only an out-of-scope finding, so the agent is never asked to reason about it.
		expect(agent.requests).toEqual([]);
	});

	test("a file the base branch does carry is restored from it, not deleted", async () => {
		const comment =
			`### Self-Review — iteration 1\n1. Out of scope: ${IN_SCOPE_FILE} (not in the approved plan)\n` +
			`<!-- darkfactory-self-review iteration=1 findings=1 digest=${reviewDigest([
				`Out of scope: ${IN_SCOPE_FILE} (not in the approved plan)`,
			])} -->`;
		const port = selfReviewFixPort({ comments: [comment] });
		const { context, workspace } = fixContext({ io: port.io });

		await runSelfReviewFix(context, { ...FIX_REQUEST, iteration: 1 });

		expect(workspace.calls.map((call) => call.op)).not.toContain("removePath");
		expect(gitCommands(workspace)).toContain(`checkout origin/develop -- ${IN_SCOPE_FILE}`);
	});

	test("a fix that changed nothing still advances the loop", async () => {
		// The agent was told to address the findings and may have decided one is not worth changing.
		// Skipping the empty commit is right; stopping the loop here would duplicate the convergence
		// check that the *next* review makes from the same findings.
		const port = selfReviewFixPort({ comments: [FINDINGS_COMMENT_2] });
		const { context, workspace, reported } = fixContext({ io: port.io, dirty: false });

		const outcome = await runSelfReviewFix(context, FIX_REQUEST);

		expect(outcome.kind).toBe("next-review-dispatched");
		expect(gitCommands(workspace)).not.toContain(
			"commit -m fix(review): address self-review findings (iteration 2)",
		);
		expect(reported).toContain("No changes after fix attempt on iteration 2");
		expect(port.calls.at(-1)?.args[1]).toMatchObject({ stage: "self-review", iteration: 3 });
	});
});

describe("runSelfReviewFix: a fix that still fails", () => {
	test("an agent failure posts the error and stops, without blocking", async () => {
		// The findings are still on the pull request and the reversion is already pushed, so a retry
		// re-reads them and continues. Blocking here would stop a run that could still be retried.
		const port = selfReviewFixPort({ comments: [FINDINGS_COMMENT_2] });
		const { context, board } = fixContext({
			io: port.io,
			answers: [`${AGENT_ERROR_PREFIX}: the fix harness exited 1`],
		});

		const outcome = await runSelfReviewFix(context, FIX_REQUEST);

		expect(outcome.kind).toBe("agent-error");
		expect(postedComments(port)).toEqual([
			"<!-- darkfactory-agent -->\n### Self-Review Fix Error (Iteration 2)\n\n" +
				`${AGENT_ERROR_PREFIX}: the fix harness exited 1`,
		]);
		expect(board).toEqual([]);
		// Crucially: the loop stops. Dispatching the next review after a failed fix would report the
		// same unfixed findings as a fresh review and start the round over.
		expect(port.calls.filter((call) => call.op === "dispatchAgentStage")).toEqual([]);
	});

	test("a rejected push blocks, because the applied work is on no branch", async () => {
		// A comment with no out-of-scope finding, so the reversion does not push first: the failure
		// under test is the *fix's* push, not the reversion's.
		const comment = `<!-- darkfactory-self-review iteration=2 findings=1 digest=${reviewDigest(["A finding."])} -->`;
		const port = selfReviewFixPort({ comments: [comment] });
		const { context, board } = fixContext({
			io: port.io,
			answers: ["Fixed the finding."],
			gitError: { "push origin HEAD": "! [rejected] main -> main (non-fast-forward)" },
		});

		const outcome = await runSelfReviewFix(context, FIX_REQUEST);

		expect(outcome.kind).toBe("blocked");
		expect(outcome.kind === "blocked" && outcome.reason).toBe("commit-failed");
		expect(postedComments(port).at(-1)).toBe(
			"<!-- darkfactory-agent -->\n### Self-Review Fix Error (Iteration 2)\n\n" +
				"Committing or pushing the fixes failed:\n\n" +
				"```\n! [rejected] main -> main (non-fast-forward)\n```",
		);
		expect(board).toEqual([{ number: PR, isPr: true, status: "Blocked" }]);
		expect(port.calls.filter((call) => call.op === "dispatchAgentStage")).toEqual([]);
	});

	test("a quota notice posts nothing, because that run already checkpointed and blocked", async () => {
		const port = selfReviewFixPort({ comments: [FINDINGS_COMMENT_2] });
		const { context, board } = fixContext({ io: port.io, answers: [QUOTA_EXHAUSTED_NOTICE] });

		const outcome = await runSelfReviewFix(context, FIX_REQUEST);

		expect(outcome).toEqual({ kind: "quota-exhausted", iteration: 2, notice: QUOTA_EXHAUSTED_NOTICE });
		expect(postedComments(port)).toEqual([]);
		expect(board).toEqual([]);
	});

	test("a fix whose own output is unformatted would fail the next gate, so it is formatted first", async () => {
		// The fix's own output is what is about to be committed, and formatting is not a review topic.
		// The checkout's own git calls come first, so this compares the formatter against the commit.
		const port = selfReviewFixPort({ comments: [FINDINGS_COMMENT_2] });
		const { context, workspace } = fixContext({ io: port.io });

		await runSelfReviewFix(context, FIX_REQUEST);

		const commands = gitCommands(workspace);
		const formatted = workspace.calls.findIndex((call) => call.op === "formatRepository");
		// The fix's own commit, not the reversion's: the reversion is committed before the agent runs
		// and is not the thing the formatter pass protects.
		const committed = workspace.calls.findIndex(
			(call) =>
				call.op === "git" &&
				(call.args[0] as string[])[0] === "commit" &&
				(call.args[0] as string[]).includes(`fix(review): address self-review findings (iteration 2)`),
		);
		expect(formatted).toBeGreaterThan(-1);
		expect(committed).toBeGreaterThan(formatted);
		expect(commands).toContain("commit -m fix(review): address self-review findings (iteration 2)");
	});
});

describe("runSelfReviewFix: the findings it acts on", () => {
	test("an iteration with no findings comment blocks rather than fixing nothing", async () => {
		// Proceeding would dispatch a fix for findings nobody posted, and the next review would run
		// against a comment that does not exist.
		const port = selfReviewFixPort({ comments: [] });
		const { context, board, agent } = fixContext({ io: port.io });

		const outcome = await runSelfReviewFix(context, { ...FIX_REQUEST, iteration: 4 });

		expect(outcome).toEqual({ kind: "blocked", iteration: 4, reason: "no-findings-comment" });
		expect(postedComments(port)).toEqual([
			"<!-- darkfactory-agent -->\n### Self-Review Fix Notice\n\nNo self-review findings comment found for iteration 4.",
		]);
		expect(board).toEqual([
			{ number: PR, isPr: true, status: "Blocked" },
			{ number: REQUEST, isPr: false, status: "Blocked" },
		]);
		expect(agent.requests).toEqual([]);
		expect(port.calls.filter((call) => call.op === "dispatchAgentStage")).toEqual([]);
	});

	test("it reads its own iteration's comment, not the newest one", async () => {
		// Several iterations' comments are on the pull request at once. Reading the newest would apply
		// a later review's findings to a fix stage dispatched for an earlier one.
		const newest = FINDINGS_COMMENT_2.replace("iteration=2", "iteration=5").replace("iteration 2", "iteration 5");
		const port = selfReviewFixPort({ comments: [FINDINGS_COMMENT_2, newest] });
		const { context, agent } = fixContext({ io: port.io });

		await runSelfReviewFix(context, FIX_REQUEST);

		expect(agent.requests[0]?.prompt).toContain("checkScope");
		expect(port.calls.at(-1)?.args[1]).toMatchObject({ iteration: 3 });
	});

	test("a marker with a non-hex digest is still this iteration's findings", async () => {
		// Blocking a pull request over an unexpected character in a digest would be a cosmetic problem
		// answered with a stopped pipeline.
		const comment =
			"### Self-Review — iteration 2\n1. Something the agent found.\n" +
			"<!-- darkfactory-self-review iteration=2 findings=1 digest=ZZZnothex -->";
		const port = selfReviewFixPort({ comments: [comment] });
		const { context, agent } = fixContext({ io: port.io });

		const outcome = await runSelfReviewFix(context, FIX_REQUEST);

		expect(outcome.kind).toBe("next-review-dispatched");
		expect(agent.requests[0]?.prompt).toContain("1. Something the agent found.");
	});

	test("a comments read that fails posts the notice rather than throwing", async () => {
		const port = selfReviewFixPort({
			behaviour: { issueComments: new Error("HTTP 500") },
		});
		const { context, board, reported } = fixContext({ io: port.io });

		const outcome = await runSelfReviewFix(context, FIX_REQUEST);

		expect(outcome).toEqual({ kind: "blocked", iteration: 2, reason: "no-findings-comment" });
		expect(reported).toContain("Failed to read comments for PR #1160: HTTP 500");
		expect(board).toEqual([
			{ number: PR, isPr: true, status: "Blocked" },
			{ number: REQUEST, isPr: false, status: "Blocked" },
		]);
	});

	test("a branch that cannot be checked out blocks and applies nothing", async () => {
		const port = recordingIo({}, { prView: new Error("HTTP 404: no pull request found") });
		const { context, board, agent } = fixContext({ io: port.io });

		const outcome = await runSelfReviewFix(context, FIX_REQUEST);

		expect(outcome).toEqual({ kind: "blocked", iteration: 2, reason: "checkout-failed" });
		expect(agent.requests).toEqual([]);
		expect(labelChanges(port)).toEqual([{ number: PR, labels: ["Blocked"], add: true }]);
		expect(board).toEqual([{ number: PR, isPr: true, status: "Blocked" }]);
	});
});
