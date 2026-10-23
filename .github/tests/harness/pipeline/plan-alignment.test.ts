import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BoardEntity } from "../../src/pipeline/board-status.ts";
import { CHECKPOINT_FILENAME, saveCheckpoint } from "../../src/pipeline/checkpoint.ts";
import type { PlanAlignmentContext } from "../../src/pipeline/plan-alignment.ts";
import { handlePlanAlignment, MATCHES_PLAN } from "../../src/pipeline/plan-alignment.ts";
import { SCOPE_AMENDMENT_MARKER } from "../../src/pipeline/pr-body.ts";
import { AGENT_ERROR_PREFIX, QUOTA_EXHAUSTED_NOTICE } from "../../src/pipeline/signals.ts";
import {
	type HandlerContextOptions,
	handlerContext,
	labelChanges,
	operations,
	postedComments,
	recordingIo,
} from "./handlers.ts";

const REPO = "marius-patrik/DarkFactory";
const PR = 1160;
const PLAN = 1150;
const REQUEST = 1148;

const PLAN_BODY = [
	"## Scope",
	"- `packages/harness/src/pipeline/plan-scope.ts`",
	"- `packages/harness/test/pipeline/plan-scope.test.ts`",
	"",
	"## Verification",
	"Run the suite.",
].join("\n");

const DIFF = [
	"diff --git a/packages/harness/src/pipeline/plan-scope.ts b/packages/harness/src/pipeline/plan-scope.ts",
	"--- a/packages/harness/src/pipeline/plan-scope.ts",
	"+++ b/packages/harness/src/pipeline/plan-scope.ts",
	"@@ -247,4 +247,9 @@ export function checkScope(",
	"+  // A plan that names no files defines no scope.",
	"+  if (planFiles.size === 0) return { inScope: [...changedFiles], outOfScope };",
	"   const inScope: string[] = [];",
].join("\n");

/** A plan issue whose comments carry one scope amendment, as a reviewer who widened it would leave. */
const PLAN_ISSUE = {
	title: "Plan: scope gate fails on an unresolvable base",
	body: PLAN_BODY,
	comments: [
		"Looks right, but the fix also has to cover the amendment below.",
		`### ${SCOPE_AMENDMENT_MARKER}\n\nAdd \`packages/harness/src/workspace/gitWorkspace.ts\` to the scope.`,
	],
};

/** The port a plan issue with no amendments, and the alignment gate's own fixture. */
function alignmentPort(extra: Parameters<typeof recordingIo>[1] = {}) {
	return recordingIo({ [PLAN]: PLAN_ISSUE, [REQUEST]: { title: "Request: …", body: "…" } }, { prDiff: DIFF, ...extra });
}

/** What an {@link alignmentContext} is built from. */
interface AlignmentContextOptions extends HandlerContextOptions {
	/** The directory the checkpoint is read from and cleared from. */
	workspaceDir?: string;
}

/**
 * A plan-alignment context with a board double, because the aligned path moves three entities.
 *
 * @param options - The port, the agent's answers, and the repository's declarations.
 * @returns The context and the doubles behind it.
 */
function alignmentContext(options: AlignmentContextOptions) {
	const board: Array<BoardEntity & { status: string }> = [];
	const base = handlerContext(options);
	const context: PlanAlignmentContext = {
		...base.context,
		board: (entity, status) => {
			board.push({ ...entity, status });
		},
		environment: { workspaceDir: options.workspaceDir ?? "/workspace", stateDir: "/workspace", repository: REPO },
	};
	return { context, board, agent: base.agent, reported: base.reported };
}

describe("handlePlanAlignment: the aligned path", () => {
	test("reads the diff and the plan, asks the agent, then posts and marks the pull request ready", async () => {
		const recording = alignmentPort();
		const { context, agent } = alignmentContext({
			io: recording.io,
			answers: [`${MATCHES_PLAN}\n\nNothing outside the scope changed.`],
		});

		const outcome = await handlePlanAlignment(context, {
			prNumber: PR,
			planNumber: PLAN,
			requestNumber: REQUEST,
			repo: REPO,
		});

		expect(operations(recording)).toEqual([
			"prDiff",
			"issueView",
			"addComment",
			"prReady",
			"changeLabels",
			"changeLabels",
			"changeLabels",
		]);
		expect(recording.calls[0]?.args).toEqual([REPO, PR]);
		expect(recording.calls[1]?.args).toEqual([REPO, PLAN, ["title", "body", "comments"]]);
		expect(agent.requests).toHaveLength(1);
		expect(agent.requests[0]?.kind).toBe("review");
		expect(agent.requests[0]?.timeout).toBe("10m0s");
		expect(outcome.kind).toBe("aligned");
	});

	test("the plan's scope amendments are folded into what the agent judges against", async () => {
		// A reviewer widened the plan in a comment. Judging the implementation against the original
		// body alone would report a divergence for a change the reviewer asked for.
		const recording = alignmentPort();
		const { context, agent } = alignmentContext({ io: recording.io, answers: [`${MATCHES_PLAN}\n\nAligned.`] });

		await handlePlanAlignment(context, { prNumber: PR, planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		const prompt = agent.requests[0]?.prompt ?? "";
		expect(prompt).toContain("## Scope Amendments");
		expect(prompt).toContain("Add `packages/harness/src/workspace/gitWorkspace.ts` to the scope.");
		// The ordinary comment is not an amendment and must not be folded in.
		expect(prompt).not.toContain("Looks right, but the fix also has to cover");
	});

	test("the diff goes to the agent fenced, so its own fences cannot end the block", async () => {
		const recording = alignmentPort();
		const { context, agent } = alignmentContext({ io: recording.io, answers: [`${MATCHES_PLAN}\n\nAligned.`] });

		await handlePlanAlignment(context, { prNumber: PR, planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		const prompt = agent.requests[0]?.prompt ?? "";
		expect(prompt).toContain("## PR Diff\n```diff\n");
		expect(prompt).toContain("+  if (planFiles.size === 0) return { inScope: [...changedFiles], outOfScope };");
		expect(prompt).toContain("Determine if the implementation matches the plan scope EXACTLY.");
	});

	test("the verdict is read from the first fifty characters, not from anywhere in the answer", async () => {
		// An agent asked to list divergences quotes the token while explaining why it does not match.
		// Reading it from the whole answer marks a diverged pull request aligned on a sentence saying
		// it is not.
		const recording = alignmentPort();
		const { context } = alignmentContext({
			io: recording.io,
			answers: ["I cannot answer that with this diff.\n\nIf it matched I would say MATCHES_PLAN_YES."],
		});

		const outcome = await handlePlanAlignment(context, {
			prNumber: PR,
			planNumber: PLAN,
			requestNumber: REQUEST,
			repo: REPO,
		});

		expect(outcome.kind).toBe("diverged");
	});

	test("alignment unblocks every entity to In Progress, because alignment is not completion", async () => {
		const recording = alignmentPort();
		const { context, board } = alignmentContext({ io: recording.io, answers: [`${MATCHES_PLAN}\n\nAligned.`] });

		await handlePlanAlignment(context, { prNumber: PR, planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(board).toEqual([
			{ number: PR, isPr: true, status: "In Progress" },
			{ number: PLAN, isPr: false, status: "In Progress" },
			{ number: REQUEST, isPr: false, status: "In Progress" },
		]);
		expect(labelChanges(recording)).toEqual([
			{ number: PR, labels: ["Blocked"], add: false },
			{ number: PLAN, labels: ["Blocked"], add: false },
			{ number: REQUEST, labels: ["Blocked"], add: false },
		]);
	});

	test("the aligned comment says so in the form the plan issue's readers expect", async () => {
		const recording = alignmentPort();
		const { context } = alignmentContext({ io: recording.io, answers: [`${MATCHES_PLAN}\n\nAligned.`] });

		await handlePlanAlignment(context, { prNumber: PR, planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(postedComments(recording)).toEqual([
			"<!-- darkfactory-agent -->\n### Implementation Review\n\n**Matches Plan**: Yes\n\n" +
				"All changes in the PR align with the plan scope.",
		]);
	});
});

describe("handlePlanAlignment: the diverged path", () => {
	test("posts the verdict on the Request and on the Plan, and blocks nothing", async () => {
		const recording = alignmentPort();
		const { context, board } = alignmentContext({
			io: recording.io,
			answers: ["Divergences:\n1. `gitWorkspace.ts` is out of scope."],
		});

		const outcome = await handlePlanAlignment(context, {
			prNumber: PR,
			planNumber: PLAN,
			requestNumber: REQUEST,
			repo: REPO,
		});

		expect(postedComments(recording)).toEqual([
			"<!-- darkfactory-agent -->\n### Plan Alignment\n\nDivergences:\n1. `gitWorkspace.ts` is out of scope.",
			"<!-- darkfactory-agent -->\n### Implementation Review\n\n**Matches Plan**: No\n\n" +
				"Divergences:\n1. `gitWorkspace.ts` is out of scope.",
		]);
		expect(operations(recording)).not.toContain("prReady");
		expect(board).toEqual([]);
		expect(outcome.kind).toBe("diverged");
	});

	test("a divergence leaves the checkpoint, because the run has not finished", async () => {
		// Clearing it here would make a later resume believe the pipeline had reached the end.
		const directory = mkdtempSync(join(tmpdir(), "df-align-"));
		try {
			saveCheckpoint(
				{
					timestamp: "2026-09-28T09:00:00Z",
					issueNumber: PLAN,
					repo: REPO,
					isPr: false,
					completedSteps: ["Completed implementation and PR #1160"],
					status: "Blocked",
					errorDetail: "quota exhausted",
				},
				directory,
			);
			const recording = alignmentPort();
			const { context } = alignmentContext({
				io: recording.io,
				answers: ["Divergences:\n1. out of scope."],
				workspaceDir: directory,
			});

			await handlePlanAlignment(context, { prNumber: PR, planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

			expect(existsSync(join(directory, CHECKPOINT_FILENAME))).toBe(true);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});

describe("handlePlanAlignment: the aligned path clearing the checkpoint", () => {
	let directory = "";

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), "df-align-"));
	});

	afterEach(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	const checkpoint = {
		timestamp: "2026-09-28T09:00:00Z",
		issueNumber: PLAN,
		repo: REPO,
		isPr: false,
		completedSteps: ["Completed implementation and PR #1160", "Evaluating plan alignment"],
		status: "Blocked",
		errorDetail: "quota exhausted",
	};

	test("an aligned pull request clears it, so a later run does not resume finished work", async () => {
		saveCheckpoint(checkpoint, directory);
		const recording = alignmentPort();
		const { context } = alignmentContext({
			io: recording.io,
			answers: [`${MATCHES_PLAN}\n\nAligned.`],
			workspaceDir: directory,
		});

		await handlePlanAlignment(context, { prNumber: PR, planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(existsSync(join(directory, CHECKPOINT_FILENAME))).toBe(false);
	});

	test("a checkpoint that is not there is not an error", async () => {
		// The aligned path is the only thing that writes the repository, and it runs on a fresh
		// workspace for a first-time pull request.
		const recording = alignmentPort();
		const { context } = alignmentContext({
			io: recording.io,
			answers: [`${MATCHES_PLAN}\n\nAligned.`],
			workspaceDir: directory,
		});

		const outcome = await handlePlanAlignment(context, {
			prNumber: PR,
			planNumber: PLAN,
			requestNumber: REQUEST,
			repo: REPO,
		});

		expect(outcome.kind).toBe("aligned");
	});

	test("a checkpoint left malformed by a killed run does not fail the gate", async () => {
		writeFileSync(join(directory, CHECKPOINT_FILENAME), '{"issue_number": 1150, "comple', "utf8");
		const recording = alignmentPort();
		const { context } = alignmentContext({
			io: recording.io,
			answers: [`${MATCHES_PLAN}\n\nAligned.`],
			workspaceDir: directory,
		});

		const outcome = await handlePlanAlignment(context, {
			prNumber: PR,
			planNumber: PLAN,
			requestNumber: REQUEST,
			repo: REPO,
		});

		expect(outcome.kind).toBe("aligned");
	});
});

describe("handlePlanAlignment: failure paths", () => {
	test("a diff that cannot be read is reported and reaches no verdict at all", async () => {
		// A gate that decided "not aligned" from a diff it never read would block a correct
		// implementation on a read, so the Python reported and returned.
		const recording = alignmentPort({ prDiff: new Error("HTTP 404: no pull request found") });
		const { context, agent, reported } = alignmentContext({
			io: recording.io,
			answers: [`${MATCHES_PLAN}\n\nAligned.`],
		});

		const outcome = await handlePlanAlignment(context, {
			prNumber: PR,
			planNumber: PLAN,
			requestNumber: REQUEST,
			repo: REPO,
		});

		expect(outcome).toEqual({ kind: "diff-unavailable" });
		expect(agent.requests).toEqual([]);
		expect(postedComments(recording)).toEqual([]);
		expect(reported).toEqual(["Failed to get PR diff for alignment: HTTP 404: no pull request found"]);
	});

	test("a quota notice posts no verdict and is not a failure", async () => {
		const recording = alignmentPort();
		const { context, board } = alignmentContext({ io: recording.io, answers: [QUOTA_EXHAUSTED_NOTICE] });

		const outcome = await handlePlanAlignment(context, {
			prNumber: PR,
			planNumber: PLAN,
			requestNumber: REQUEST,
			repo: REPO,
		});

		expect(outcome).toEqual({ kind: "quota-exhausted", notice: QUOTA_EXHAUSTED_NOTICE });
		expect(postedComments(recording)).toEqual([]);
		expect(operations(recording)).not.toContain("prReady");
		expect(board).toEqual([]);
	});

	test("an agent failure posts a Plan Alignment Error on the Plan, not the generic one", async () => {
		// The heading names which gate failed, because a reader on a Plan issue has to know whether
		// the implementation or the alignment review went wrong.
		const recording = alignmentPort();
		const { context } = alignmentContext({ io: recording.io, answers: [`${AGENT_ERROR_PREFIX}: review unavailable`] });

		const failing = handlePlanAlignment(context, {
			prNumber: PR,
			planNumber: PLAN,
			requestNumber: REQUEST,
			repo: REPO,
		});

		await expect(failing).rejects.toThrow("Plan alignment failed on issue #1150; Execution Error posted.");
		expect(postedComments(recording)).toEqual([
			`<!-- darkfactory-agent -->\n### Plan Alignment Error\n\n${AGENT_ERROR_PREFIX}: review unavailable`,
		]);
	});

	test("a pull request that cannot be marked ready still unblocks, because it is aligned", async () => {
		// A pull request that is aligned but still a draft is a state a human can act on; a failed
		// run that leaves everything Blocked is not.
		const recording = alignmentPort({ prReady: new Error("HTTP 422: pull request is not a draft") });
		const { context, board, reported } = alignmentContext({
			io: recording.io,
			answers: [`${MATCHES_PLAN}\n\nAligned.`],
		});

		const outcome = await handlePlanAlignment(context, {
			prNumber: PR,
			planNumber: PLAN,
			requestNumber: REQUEST,
			repo: REPO,
		});

		expect(outcome.kind === "aligned" && outcome.ready).toBe(false);
		expect(board).toHaveLength(3);
		expect(reported).toContain("Failed to mark PR ready: HTTP 422: pull request is not a draft");
	});

	test("a plan issue that cannot be read throws, because there is no scope to judge against", async () => {
		const recording = alignmentPort({ issueView: new Error("Not Found") });
		const { context, agent } = alignmentContext({ io: recording.io, answers: [`${MATCHES_PLAN}\n\nAligned.`] });

		expect(
			handlePlanAlignment(context, { prNumber: PR, planNumber: PLAN, requestNumber: REQUEST, repo: REPO }),
		).rejects.toThrow("Not Found");
		expect(agent.requests).toEqual([]);
	});
});
