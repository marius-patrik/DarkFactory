import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CHECKPOINT_FILENAME, saveCheckpoint } from "../../src/pipeline/checkpoint.ts";
import { AgentRunFailure } from "../../src/pipeline/handler-context.ts";
import { handleImplement } from "../../src/pipeline/implement.ts";
import { AGENT_ERROR_PREFIX, QUOTA_EXHAUSTED_NOTICE } from "../../src/pipeline/signals.ts";
import {
	gitCommands,
	implementContext,
	labelChanges,
	operations,
	postedComments,
	recordingIo,
	recordingWorkspace,
	type WorkspaceBehaviour,
	workspaceOperations,
} from "./handlers.ts";

const REPO = "marius-patrik/DarkFactory";
const PLAN = 1150;
const REQUEST = 1148;

const REQUEST_ISSUE = {
	title: "Request: the scope gate passes on a pull request whose base does not resolve",
	body: "A shallow checkout makes the base unresolvable and the gate reads the change as in scope.",
};
const PLAN_ISSUE = {
	title: "Plan: scope gate fails on an unresolvable base",
	body: "## Scope\n- `packages/harness/src/pipeline/plan-scope.ts`\n- `packages/harness/test/pipeline/plan-scope.test.ts`\n\n## Verification\nRun the suite.",
};

/** The branch name the plan title produces; the handler derives it and every git call names it. */
const BRANCH = "feature/scope-gate-fails-on-an-unresolvable-base";

/**
 * The Conventional Commit the plan's own text classifies to.
 *
 * The type is `test` and the area is `agents` because the plan's Scope section names
 * `plan-scope.test.ts` under a `packages/harness/` path, and the classifier reads the plan's title
 * and body together. Pinned because the commit type is what the repository's own rules are checked
 * against, so a change in what this body classifies to is a change in what the pipeline commits.
 */
const COMMIT_TITLE = "test(agents): scope gate fails on an unresolvable base";

/** The git outputs a clean checkout has: one remote trunk, no branch of this name, a staged change. */
function cleanWorkspaceOutput(): Record<string, string> {
	return {
		"branch -r": "  origin/develop\n  origin/main",
		branch: "* develop\n  feature/other-work",
		"status --porcelain": " M packages/harness/src/pipeline/plan-scope.ts",
		"diff --stat origin/develop...HEAD": " plan-scope.ts | 14 ++++++++++++\n 1 file changed",
	};
}

/** A working copy that behaves like a clean checkout with a new commit in it. */
function cleanWorkspace(extra: WorkspaceBehaviour = {}) {
	return recordingWorkspace({ gitOutput: cleanWorkspaceOutput(), ...extra });
}

/** A port that has no open pull request for the branch until the poll that finds one. */
function openingPort(found: number | undefined, extra: Parameters<typeof recordingIo>[1] = {}) {
	return recordingIo(
		{ [PLAN]: PLAN_ISSUE, [REQUEST]: REQUEST_ISSUE },
		{ prNumberSequence: [[], ...(found === undefined ? [] : [[found]])], ...extra },
	);
}

describe("handleImplement: the ordinary path", () => {
	test("reads the plan and the Request, then the branch, the agent, format, test, commit, push", async () => {
		const recording = openingPort(1160);
		const workspace = cleanWorkspace();
		const { implementContext: context, agent } = implementContext({
			io: recording.io,
			workspace,
			answers: ["Implemented plan-scope.ts and its test."],
		});

		const outcome = await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(operations(recording)).toEqual([
			"issueView",
			"issueView",
			"prNumbersForBranch",
			"runWorkflow",
			"prNumbersForBranch",
			"dispatchAgentStage",
		]);
		expect(recording.calls[0]?.args).toEqual([REPO, PLAN, ["title", "body"]]);
		expect(recording.calls[1]?.args).toEqual([REPO, REQUEST, ["title", "body"]]);
		expect(workspaceOperations(workspace)).toEqual([
			"configureGitIdentity",
			"git",
			"git",
			"git",
			"git",
			"formatRepository",
			"verifyRepository",
			"git",
			"git",
			"git",
			"git",
			"resolveBaseRefs",
			"git",
			"sleep",
		]);
		expect(gitCommands(workspace).slice(0, 4)).toEqual([
			"fetch origin",
			"branch -r",
			"branch",
			`checkout -b ${BRANCH} origin/develop`,
		]);
		expect(gitCommands(workspace).slice(4, 9)).toEqual([
			"add -A",
			"status --porcelain",
			`commit -m ${COMMIT_TITLE}`,
			`push origin ${BRANCH}`,
			"diff --stat origin/develop...HEAD",
		]);
		expect(agent.requests).toHaveLength(1);
		expect(outcome).toEqual({ kind: "dispatched", pr: 1160, commitTitle: COMMIT_TITLE });
	});

	test("the implementation prompt carries both issues and forbids work outside the plan", async () => {
		const recording = openingPort(1160);
		const { implementContext: context, agent } = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: ["done"],
		});

		await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		const prompt = agent.requests[0]?.prompt ?? "";
		expect(prompt).toContain(`## Parent Request (#${REQUEST})`);
		expect(prompt).toContain(`Title: ${REQUEST_ISSUE.title}`);
		expect(prompt).toContain(`## Implementation Plan (#${PLAN})`);
		expect(prompt).toContain(`Title: ${PLAN_ISSUE.title}`);
		expect(prompt).toContain("Do NOT create or modify files outside the scope of the plan.");
		expect(agent.requests[0]?.kind).toBe("implement");
		expect(agent.requests[0]?.timeout).toBe("15m0s");
	});

	test("the checkpoint names the branch, so a resume knows what it is resuming", async () => {
		const recording = openingPort(1160);
		const { implementContext: context, agent } = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: ["done"],
		});

		await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(agent.requests[0]?.checkpoint).toEqual({
			issueNumber: PLAN,
			repo: REPO,
			branchName: BRANCH,
			completedSteps: [
				`Loaded Plan #${PLAN} and Parent Request #${REQUEST}`,
				`Created and checked out feature branch '${BRANCH}'`,
			],
		});
	});

	test("opens the pull request through open-pr.yml, in draft, against the development branch", async () => {
		const recording = openingPort(1160);
		const { implementContext: context } = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: ["done"],
		});

		await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		const dispatch = recording.calls.find((call) => call.op === "runWorkflow");
		const inputs = dispatch?.args[2] as Record<string, string>;
		expect(dispatch?.args).toEqual([REPO, "open-pr.yml", inputs, undefined]);
		expect(inputs.branch).toBe(BRANCH);
		expect(inputs.base).toBe("develop");
		expect(inputs.draft).toBe("true");
		expect(inputs.title).toBe(COMMIT_TITLE);
		// No direct creation happened, because the dispatch did not fail.
		expect(operations(recording)).not.toContain("prCreate");
	});

	test("the pull request body quotes the suite that ran and the agent's own notes", async () => {
		const recording = openingPort(1160);
		const { implementContext: context } = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: ["Implemented plan-scope.ts. No other file was touched."],
		});

		await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		const inputs = recording.calls.find((call) => call.op === "runWorkflow")?.args[2] as Record<string, string>;
		expect(inputs.body).toContain("- **Command**: `bun run test`");
		expect(inputs.body).toContain("- **Result**: `0 fail`");
		expect(inputs.body).toContain("## Changed Files");
		expect(inputs.body).toContain("plan-scope.ts | 14 ++++++++++++");
		expect(inputs.body).toContain("Implemented plan-scope.ts. No other file was touched.");
		expect(inputs.body).toContain(`Closes #${REQUEST}`);
	});

	test("hands the opened pull request to self-review iteration 1", async () => {
		const recording = openingPort(1160);
		const { implementContext: context } = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: ["done"],
		});

		await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		const dispatch = recording.calls.find((call) => call.op === "dispatchAgentStage");
		expect(dispatch?.args).toEqual([
			REPO,
			{ stage: "self-review", pr: 1160, plan: PLAN, request: REQUEST, iteration: 1 },
		]);
	});
});

describe("handleImplement: the branch", () => {
	test("tracks and fast-forwards a branch an earlier run already pushed", async () => {
		// A remote branch of this name means an earlier run got as far as pushing, which is exactly
		// the case the pull-request probe below is about.
		const recording = recordingIo({ [PLAN]: PLAN_ISSUE, [REQUEST]: REQUEST_ISSUE }, { prNumberSequence: [[1160]] });
		const workspace = recordingWorkspace({
			gitOutput: {
				"branch -r": `  origin/develop\n  origin/${BRANCH}`,
				branch: `  ${BRANCH}\n* develop`,
				"status --porcelain": " M packages/harness/src/pipeline/plan-scope.ts",
			},
		});
		const { implementContext: context } = implementContext({ io: recording.io, workspace, answers: ["done"] });

		await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(gitCommands(workspace).slice(0, 5)).toEqual([
			"fetch origin",
			"branch -r",
			"branch",
			`checkout ${BRANCH}`,
			`pull --ff-only origin ${BRANCH}`,
		]);
	});

	test("checks out an existing local branch rather than recreating it", async () => {
		const recording = recordingIo({ [PLAN]: PLAN_ISSUE, [REQUEST]: REQUEST_ISSUE }, { prNumberSequence: [[1160]] });
		const workspace = recordingWorkspace({
			gitOutput: {
				"branch -r": "  origin/develop",
				// The current branch is marked with `*`, so a handler that did not strip the marker
				// would believe the branch was absent and cut it again, losing the commit on it.
				branch: `* ${BRANCH}\n  develop`,
				"status --porcelain": " M packages/harness/src/pipeline/plan-scope.ts",
			},
		});
		const { implementContext: context } = implementContext({ io: recording.io, workspace, answers: ["done"] });

		await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(gitCommands(workspace).slice(2, 4)).toEqual(["branch", `checkout ${BRANCH}`]);
	});

	test("a branch that cannot be prepared posts the reason on the Plan and ends the run non-zero", async () => {
		const recording = openingPort(undefined);
		const workspace = recordingWorkspace({
			gitOutput: { "branch -r": "  origin/develop", branch: "  develop" },
			gitError: { "fetch origin": "fatal: could not read from remote repository" },
		});
		const { implementContext: context, agent } = implementContext({ io: recording.io, workspace, answers: ["done"] });

		const failing = handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		await expect(failing).rejects.toBeInstanceOf(AgentRunFailure);
		expect(postedComments(recording)).toEqual([
			`<!-- darkfactory-agent -->\n### DarkFactory Agent Execution Error\n\nFailed to create/checkout branch ${BRANCH}: fatal: could not read from remote repository`,
		]);
		// Nothing was implemented, committed or pushed: the branch is the precondition for all of it.
		expect(agent.requests).toEqual([]);
		expect(gitCommands(workspace)).toEqual(["fetch origin"]);
	});
});

describe("handleImplement: resuming", () => {
	let workspaceDir = "";

	beforeEach(() => {
		workspaceDir = mkdtempSync(join(tmpdir(), "df-implement-"));
	});

	afterEach(() => {
		rmSync(workspaceDir, { recursive: true, force: true });
	});

	test("an open pull request for the branch means implementation is skipped, not repeated", async () => {
		// This is the interrupted-run case: the branch was pushed and the pull request opened, and a
		// re-run must finish rather than implement the same plan a second time.
		const recording = recordingIo({ [PLAN]: PLAN_ISSUE, [REQUEST]: REQUEST_ISSUE }, { prNumberSequence: [[1160]] });
		const {
			implementContext: context,
			agent,
			reported,
		} = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: ["done"],
		});

		const outcome = await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(agent.requests).toEqual([]);
		expect(outcome).toEqual({ kind: "already-open", pr: 1160 });
		expect(reported).toContain(`Found existing open PR #1160 for branch ${BRANCH}, skipping implementation.`);
		expect(operations(recording)).toEqual(["issueView", "issueView", "prNumbersForBranch", "dispatchAgentStage"]);
	});

	test("a pull request that cannot be listed does not stop the run", async () => {
		// The Python swallowed this probe's failure. Treating it as fatal would abandon a run over a
		// read that GitHub was refusing at one moment.
		const recording = recordingIo(
			{ [PLAN]: PLAN_ISSUE, [REQUEST]: REQUEST_ISSUE },
			{ prNumberSequence: [new Error("HTTP 502"), [1160]] },
		);
		const {
			implementContext: context,
			agent,
			reported,
		} = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: ["done"],
		});

		const outcome = await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(agent.requests).toHaveLength(1);
		expect(outcome.kind).toBe("dispatched");
		// Silent, as the Python's `except Exception: pass` was.
		expect(reported.filter((line) => line.includes("502"))).toEqual([]);
	});

	test("a checkpoint that says the code was written is not implemented a second time", async () => {
		saveCheckpoint(
			{
				timestamp: "2026-09-28T09:00:00Z",
				issueNumber: PLAN,
				repo: REPO,
				isPr: false,
				branchName: BRANCH,
				completedSteps: [
					`Loaded Plan #${PLAN} and Parent Request #${REQUEST}`,
					"Implemented code and test changes according to plan",
				],
				status: "Blocked",
				errorDetail: "quota exhausted",
			},
			workspaceDir,
		);
		const recording = openingPort(1160);
		const {
			implementContext: context,
			agent,
			reported,
		} = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: ["done"],
			workspaceDir,
		});

		await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(agent.requests).toEqual([]);
		expect(reported).toContain("Implementation already completed according to checkpoint; resuming pipeline.");
		expect(gitCommands(cleanWorkspace())).toEqual([]);
	});

	test("a checkpoint that will not parse is treated as no checkpoint at all", async () => {
		// A truncated checkpoint is what a run killed mid-write leaves. Refusing to run would strand
		// the plan; starting over costs a run and produces the same code.
		writeFileSync(join(workspaceDir, CHECKPOINT_FILENAME), '{"completed_steps": ["Loaded Pl', "utf8");
		const recording = openingPort(1160);
		const { implementContext: context, agent } = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: ["done"],
			workspaceDir,
		});

		await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(agent.requests).toHaveLength(1);
		expect(agent.requests[0]?.checkpoint?.completedSteps).toEqual([
			`Loaded Plan #${PLAN} and Parent Request #${REQUEST}`,
			`Created and checked out feature branch '${BRANCH}'`,
		]);
	});

	test("no checkpoint at all is the ordinary case, and records the two steps already done", async () => {
		const recording = openingPort(1160);
		const { implementContext: context, agent } = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: ["done"],
			workspaceDir,
		});

		await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(agent.requests[0]?.checkpoint?.completedSteps).toEqual([
			`Loaded Plan #${PLAN} and Parent Request #${REQUEST}`,
			`Created and checked out feature branch '${BRANCH}'`,
		]);
	});
});

describe("handleImplement: the agent failing", () => {
	test("a quota notice on implementation posts nothing and is not a failure", async () => {
		const recording = openingPort(undefined);
		const {
			implementContext: context,
			agent,
			reported,
		} = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: [QUOTA_EXHAUSTED_NOTICE],
		});

		const outcome = await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(outcome).toEqual({ kind: "quota-exhausted", stage: "implement", notice: QUOTA_EXHAUSTED_NOTICE });
		expect(postedComments(recording)).toEqual([]);
		expect(reported).not.toContain(`Found PR #${1160}`);
		// Nothing was committed, so nothing was pushed: the caller checkpoints and blocks instead.
		expect(gitCommands(cleanWorkspace())).toEqual([]);
		expect(agent.requests).toHaveLength(1);
	});

	test("an agent failure posts the error on the Plan issue and ends the run non-zero", async () => {
		const recording = openingPort(undefined);
		const { implementContext: context } = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: [`${AGENT_ERROR_PREFIX}: the harness produced no output`],
		});

		const failing = handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		await expect(failing).rejects.toBeInstanceOf(AgentRunFailure);
		expect(postedComments(recording)).toEqual([
			`<!-- darkfactory-agent -->\n### DarkFactory Agent Execution Error\n\n${AGENT_ERROR_PREFIX}: the harness produced no output`,
		]);
		expect(operations(recording)).not.toContain("runWorkflow");
	});

	test("a failing suite is handed to the agent, and a failure there is reported as the fix's", async () => {
		// The two failures name themselves differently, because a reader has to tell "the
		// implementation did not happen" from "the implementation happened and did not pass".
		const recording = openingPort(undefined);
		const workspace = cleanWorkspace({
			verification: {
				args: ["bun", "run", "test"],
				returncode: 1,
				stdout: "3 fail\n(FAIL) plan-scope.test.ts",
				stderr: "error: expected 4 to be 2",
			},
		});
		const { implementContext: context, agent } = implementContext({
			io: recording.io,
			workspace,
			answers: ["done", `${AGENT_ERROR_PREFIX}: the fix run also failed`],
		});

		const failing = handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		await expect(failing).rejects.toBeInstanceOf(AgentRunFailure);
		expect(agent.requests.map((entry) => entry.kind)).toEqual(["implement", "fix"]);
		expect(agent.requests[1]?.prompt).toContain("(FAIL) plan-scope.test.ts");
		expect(agent.requests[1]?.prompt).toContain("error: expected 4 to be 2");
		expect(agent.requests[1]?.timeout).toBe("10m0s");
		expect(agent.requests[1]?.checkpoint?.completedSteps).toContain(
			"Executed test suite (failures detected; attempting automated fix)",
		);
		expect(postedComments(recording)).toEqual([
			`<!-- darkfactory-agent -->\n### DarkFactory Agent Execution Error\n\n${AGENT_ERROR_PREFIX}: the fix run also failed`,
		]);
	});

	test("a quota notice on the fix stops the run at the fix, and the stage says so", async () => {
		const recording = openingPort(undefined);
		const workspace = cleanWorkspace({
			verification: { args: ["bun", "run", "test"], returncode: 1, stdout: "1 fail", stderr: "" },
		});
		const { implementContext: context } = implementContext({
			io: recording.io,
			workspace,
			answers: ["done", QUOTA_EXHAUSTED_NOTICE],
		});

		const outcome = await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(outcome).toEqual({ kind: "quota-exhausted", stage: "fix", notice: QUOTA_EXHAUSTED_NOTICE });
		expect(operations(recording)).not.toContain("runWorkflow");
	});

	test("a fixed suite is formatted again, because the fix's own output is what gets committed", async () => {
		const recording = openingPort(1160);
		const workspace = cleanWorkspace({
			verification: { args: ["bun", "run", "test"], returncode: 1, stdout: "1 fail", stderr: "" },
		});
		const { implementContext: context } = implementContext({
			io: recording.io,
			workspace,
			answers: ["done", "Fixed the assertion."],
		});

		await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		const formatPositions = workspace.calls
			.map((call, index) => (call.op === "formatRepository" ? index : -1))
			.filter((index) => index >= 0);
		expect(formatPositions).toHaveLength(2);
		// Both before the first git call of the commit, which is what the second pass is for.
		const commitIndex = workspace.calls.findIndex(
			(call) => call.op === "git" && (call.args[0] as string[])[0] === "add",
		);
		expect(formatPositions[1]).toBeLessThan(commitIndex);
	});
});

describe("handleImplement: nothing to commit", () => {
	test("an implementation that changed no file posts a notice and opens no pull request", async () => {
		// There is nothing to open a pull request from, and a pull request with an empty diff is a
		// review topic nobody can resolve - so the run says so and stops.
		const recording = openingPort(undefined);
		const workspace = cleanWorkspace({ gitOutput: { ...cleanWorkspaceOutput(), "status --porcelain": "" } });
		const { implementContext: context, reported } = implementContext({
			io: recording.io,
			workspace,
			answers: ["I found nothing to change."],
		});

		const outcome = await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(outcome).toEqual({ kind: "no-changes" });
		expect(postedComments(recording)).toEqual([
			[
				"<!-- darkfactory-agent -->",
				"### DarkFactory Agent Notice",
				"",
				"No file changes produced by implementation. Please review the plan scope.",
			].join("\n"),
		]);
		expect(operations(recording)).not.toContain("runWorkflow");
		expect(gitCommands(workspace)).not.toContain(`commit -m ${COMMIT_TITLE}`);
		expect(reported).toContain("No changes to commit after implementation.");
	});
});

describe("handleImplement: the commit and push failing", () => {
	test("a push refused for missing workflow permission is reported as a resolution, not a git error", async () => {
		const recording = openingPort(undefined);
		const workspace = cleanWorkspace({
			gitError: {
				"push origin feature/scope-gate-fails-on-an-unresolvable-base":
					"remote: error: refusing to allow a GitHub App to create or update workflow `.github/workflows/ci.yml` without `workflows` permission",
			},
		});
		const { implementContext: context } = implementContext({ io: recording.io, workspace, answers: ["done"] });

		const failing = handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		await expect(failing).rejects.toBeInstanceOf(AgentRunFailure);
		const comment = postedComments(recording)[0] ?? "";
		expect(comment).toContain("Git commit/push rejected due to missing GitHub Actions workflow permissions");
		expect(comment).toContain("**Resolution**: The GitHub Actions runner token requires `workflows: write`");
		expect(comment).not.toContain("Git commit/push failed:");
	});

	test("any other push failure is reported with git's own words", async () => {
		const recording = openingPort(undefined);
		const workspace = cleanWorkspace({
			gitError: {
				"push origin feature/scope-gate-fails-on-an-unresolvable-base":
					"! [rejected]        main -> main (non-fast-forward)",
			},
		});
		const { implementContext: context } = implementContext({ io: recording.io, workspace, answers: ["done"] });

		const failing = handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		await expect(failing).rejects.toBeInstanceOf(AgentRunFailure);
		expect(postedComments(recording)).toEqual([
			"<!-- darkfactory-agent -->\n### DarkFactory Agent Execution Error\n\n" +
				"Git commit/push failed: ! [rejected]        main -> main (non-fast-forward)",
		]);
	});

	test("a base that does not resolve stops the run before a pull request with an empty diff opens", async () => {
		const recording = openingPort(1160);
		const workspace = cleanWorkspace({ baseRefsError: "Cannot resolve base branch 'develop'" });
		const { implementContext: context } = implementContext({ io: recording.io, workspace, answers: ["done"] });

		const failing = handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		await expect(failing).rejects.toThrow("Cannot resolve base branch 'develop'");
		expect(operations(recording)).not.toContain("runWorkflow");
		// The commit and the push already happened, and neither was undone.
		expect(gitCommands(workspace)).toContain(`push origin ${BRANCH}`);
	});
});

describe("handleImplement: opening the pull request", () => {
	test("a failed workflow dispatch falls back to creating the pull request directly", async () => {
		const recording = recordingIo(
			{ [PLAN]: PLAN_ISSUE, [REQUEST]: REQUEST_ISSUE },
			{ prNumberSequence: [[], [1160]], runWorkflow: new Error("HTTP 404: workflow not found") },
		);
		const { implementContext: context, reported } = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: ["done"],
		});

		const outcome = await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		const created = recording.calls.find((call) => call.op === "prCreate");
		const input = created?.args[1] as { head: string; base: string; title: string; body: string; draft: boolean };
		expect(created?.args[0]).toBe(REPO);
		expect(input).toEqual({ head: BRANCH, base: "develop", title: COMMIT_TITLE, body: input.body, draft: true });
		// The same body the workflow would have received: the fallback is only about how the pull
		// request is opened, never about what is in it.
		const dispatched = recording.calls.find((call) => call.op === "runWorkflow");
		const dispatchedInputs = dispatched?.args[2] as { body: string };
		expect(input.body).toBe(dispatchedInputs?.body);
		expect(input.body).toContain(`Closes #${REQUEST}`);
		expect(reported).toContain("Failed to dispatch open-pr.yml: HTTP 404: workflow not found");
		expect(outcome).toEqual({ kind: "dispatched", pr: 1160, commitTitle: COMMIT_TITLE });
	});

	test("neither the dispatch nor the direct call opening one stops the run without failing it", async () => {
		const recording = recordingIo(
			{ [PLAN]: PLAN_ISSUE, [REQUEST]: REQUEST_ISSUE },
			{
				prNumberSequence: [],
				runWorkflow: new Error("HTTP 404: workflow not found"),
				prCreate: new Error("HTTP 422: a pull request already exists for develop"),
			},
		);
		const { implementContext: context, reported } = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: ["done"],
		});

		const outcome = await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(outcome).toEqual({ kind: "not-opened" });
		expect(reported).toContain("Direct PR creation also failed: HTTP 422: a pull request already exists for develop");
		expect(operations(recording)).not.toContain("dispatchAgentStage");
	});

	test("a pull request that never appears is a timeout, not a failure", async () => {
		// The branch is pushed and the commit exists; the run gives up on the pull request rather
		// than failing, and a later run's probe finds it.
		const recording = openingPort(undefined);
		const workspace = cleanWorkspace();
		const { implementContext: context, reported } = implementContext({
			io: recording.io,
			workspace,
			answers: ["done"],
		});

		const outcome = await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(outcome).toEqual({ kind: "pr-timeout", attempts: 30 });
		expect(workspaceOperations(workspace).filter((op) => op === "sleep")).toHaveLength(30);
		expect(reported).toContain("Timed out waiting for PR creation.");
		expect(operations(recording)).not.toContain("dispatchAgentStage");
	});

	test("a pull request that appears on the third poll is found without reading it twice", async () => {
		const recording = recordingIo(
			{ [PLAN]: PLAN_ISSUE, [REQUEST]: REQUEST_ISSUE },
			{ prNumberSequence: [[], [], [], [1160]] },
		);
		const workspace = cleanWorkspace();
		const { implementContext: context } = implementContext({ io: recording.io, workspace, answers: ["done"] });

		const outcome = await handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		expect(outcome.kind).toBe("dispatched");
		expect(operations(recording).filter((op) => op === "prNumbersForBranch")).toHaveLength(4);
		expect(workspaceOperations(workspace).filter((op) => op === "sleep")).toHaveLength(3);
	});
});

describe("handleImplement: the self-review dispatch failing", () => {
	test("posts on the pull request, blocks it and its parent Request, and re-raises", async () => {
		// A dispatch that fails leaves the pull request in draft with nobody reviewing it, which is
		// the state the pipeline must never leave an item in.
		const recording = recordingIo(
			{ [PLAN]: PLAN_ISSUE, [REQUEST]: REQUEST_ISSUE },
			{ prNumberSequence: [[], [1160]], dispatchAgentStage: new Error("HTTP 410: gone") },
		);
		const {
			implementContext: context,
			board,
			reported,
		} = implementContext({
			io: recording.io,
			workspace: cleanWorkspace(),
			answers: ["done"],
		});

		const failing = handleImplement(context, { planNumber: PLAN, requestNumber: REQUEST, repo: REPO });

		await expect(failing).rejects.toThrow("HTTP 410: gone");
		expect(postedComments(recording)).toEqual([
			"<!-- darkfactory-agent -->\n### Self-Review Dispatch Error\n\nFailed to dispatch next stage: HTTP 410: gone",
		]);
		expect(recording.calls.find((call) => call.op === "addComment")?.args[1]).toBe(1160);
		expect(labelChanges(recording)).toEqual([
			{ number: 1160, labels: ["Blocked"], add: true },
			{ number: REQUEST, labels: ["Blocked"], add: true },
		]);
		expect(board).toEqual([
			{ number: 1160, isPr: true, status: "Blocked" },
			{ number: REQUEST, isPr: false, status: "Blocked" },
		]);
		expect(reported).toContain(`Failed to dispatch agent-dispatch to ${REPO}: HTTP 410: gone`);
	});
});
