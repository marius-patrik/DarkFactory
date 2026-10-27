/**
 * Implementing an approved plan, end to end: branch, agent, format, test, commit, push, open the
 * pull request, and hand it to self-review.
 *
 * Replaces `handle_implement` in `.github/scripts/agent_runner.py`. This is the longest handler in
 * the runner and the one with the most order in it. The order is the behaviour and is preserved
 * step for step, including the steps that look redundant:
 *
 * - The branch is checked out *before* the checkpoint is read, because the checkpoint is written
 *   into the working copy and a resume has to read the tree the interrupted run left.
 * - The open-pull-request probe comes *before* the agent runs, so a re-run that already pushed a
 *   branch does not spend a run re-implementing work that is already on a pull request.
 * - Formatting runs *after* the agent and *again* after an automated test fix, so the fix's own
 *   output is formatted before anything is committed.
 * - A repository whose agent produced no changes posts a notice and stops. There is nothing to open
 *   a pull request from, and a pull request with an empty diff is a review topic nobody can resolve.
 * - The pull request opens through `open-pr.yml` first and by direct API call only if that dispatch
 *   fails, because the workflow is what runs the repository's own opening conventions.
 */

import { type BoardStatus, blockEntity } from "./board-status.ts";
import { loadCheckpoint } from "./checkpoint.ts";
import type { PipelineContext, PipelineEnvironment } from "./handler-context.ts";
import { classifyTypeAndArea } from "./labels.ts";
import { bestEffort, errorMessage } from "./pipeline-io.ts";
import { buildPrBody, extractTestResultLine, formatConventionalCommit, generateBranchName } from "./pr-body.ts";
import { AGENT_ERROR_PREFIX, isQuotaExhaustionNotice, isWorkflowPermissionError } from "./signals.ts";
import type { WorkspaceIo } from "./workspace-io.ts";

/** Marks every comment this pipeline posts, so a later pass can recognise its own output. */
const AGENT_MARKER = "<!-- darkfactory-agent -->";

/** The completed step that means the agent already wrote the code, so a resume must not re-implement. */
const IMPLEMENTED_STEP = "Implemented code and test changes";

/** How long to wait between pull request polls while the workflow opens one. */
const PR_POLL_INTERVAL_MS = 2000;

/** How many times to poll before giving up on the pull request appearing. */
const PR_POLL_ATTEMPTS = 30;

/** Longest a failing suite's standard output is in the agent's fix prompt. */
const MAX_FIX_STDOUT = 2000;

/** Longest a failing suite's standard error is in the agent's fix prompt. */
const MAX_FIX_STDERR = 1000;

/** What implementing a plan did. */
type ImplementOutcome =
	/**
	 * A pull request already existed for the branch, so implementation was skipped and the run
	 * resumed at self-review. The probe is what makes an interrupted run finish rather than redo.
	 */
	| { kind: "already-open"; pr: number }
	/** A draft pull request was opened and self-review iteration 1 was dispatched. */
	| { kind: "dispatched"; pr: number; commitTitle: string }
	/**
	 * The agent ran out of quota, so nothing further was done.
	 *
	 * This is not a failure: the work done so far is real, and the caller checkpoints and blocks.
	 * The stage is named because the fix prompt stops the run at a different point than the
	 * implementation prompt does, and a resume has to know which one.
	 */
	| { kind: "quota-exhausted"; stage: "implement" | "fix"; notice: string }
	/** The agent produced no file changes, so there was nothing to open a pull request from. */
	| { kind: "no-changes" }
	/** Neither the workflow dispatch nor the direct pull request call could open one. */
	| { kind: "not-opened" }
	/** The pull request never appeared within the poll budget. */
	| { kind: "pr-timeout"; attempts: number }
	/** The agent failed, an execution-error comment was posted, and the run ends non-zero. */
	| { kind: "failed"; notice: string; comment: string };

/** What to implement. */
interface ImplementRequest {
	/** The Plan issue number, which is the Request itself once both gates share one issue. */
	planNumber: number;
	/** The parent Request issue number. */
	requestNumber: number;
	/** The repository slug, `owner/name`. */
	repo: string;
}

/** A plan and its parent Request, as the implementation prompt needs them. */
interface PlanAndRequest {
	plan: { title: string; body: string };
	parent: { title: string; body: string };
}

/**
 * What `handle_implement` needs in addition to what every ported handler is given.
 *
 * The workspace and the board are here rather than on {@link PipelineContext} because only the
 * handlers that commit, or that move a board item, need them - and a context carrying two ports
 * every handler must supply is a context the handlers that do not use them will get wrong.
 */
export interface ImplementContext extends PipelineContext {
	/** The working copy, for git, the formatters and the test suites. */
	workspace: WorkspaceIo;
	/** The project board, for the self-review dispatch failure path. */
	board: BoardStatus;
	/** The environment, for the workspace directory the checkpoint lives in. */
	environment: PipelineEnvironment;
}

/** The implementation prompt, as the Python assembled it. */
function implementPrompt(planNumber: number, requestNumber: number, issues: PlanAndRequest): string {
	return (
		"You are implementing a plan for a code repository.\n\n" +
		`## Parent Request (#${requestNumber})\n` +
		`Title: ${issues.parent.title}\n${issues.parent.body}\n\n` +
		`## Implementation Plan (#${planNumber})\n` +
		`Title: ${issues.plan.title}\n${issues.plan.body}\n\n` +
		"## Instructions\n" +
		"Implement ALL changes described in the plan above. " +
		"Write production code and corresponding unit tests. " +
		"Follow the binding rules in AGENTS.md: inline API documentation on every public item, " +
		"Conventional Commits, and a unit test for every behavior you add. " +
		"Do NOT create or modify files outside the scope of the plan."
	);
}

/**
 * The commit description, which drops the `Plan: ` prefix the plan issue's title carries.
 *
 * The Python's `removeprefix("Plan: ")`, not a looser pattern: a title reading `Plan:fix the thing`
 * has no space after the colon, and the Python left that prefix in place.
 */
function planDescription(planTitle: string): string {
	const prefix = "Plan: ";
	return (planTitle.startsWith(prefix) ? planTitle.slice(prefix.length) : planTitle).trim();
}

/**
 * Check out the implementation branch, or throw why the branch could not be prepared.
 *
 * The shape is the Python's: a remote branch of this name means an earlier run got this far, so it
 * is tracked and fast-forwarded; otherwise the branch is cut from the repository's development
 * branch. An existing *local* branch is checked out rather than recreated, so a run that already
 * committed on it does not lose that commit.
 */
async function checkoutBranch(workspace: WorkspaceIo, branchName: string, developmentBranch: string): Promise<void> {
	await workspace.git(["fetch", "origin"]);
	const remoteBranches = await workspace.git(["branch", "-r"]);
	if (remoteBranches.includes(`origin/${branchName}`)) {
		await checkoutExistingOrTrack(workspace, branchName, `origin/${branchName}`);
		await workspace.git(["pull", "--ff-only", "origin", branchName]);
		return;
	}
	await checkoutExistingOrTrack(workspace, branchName, `origin/${developmentBranch}`);
}

/**
 * Check out the local branch of this name, or create it at `startPoint`.
 *
 * `git branch` marks the current branch with a leading `*`; the Python stripped it and the padding
 * spaces, and so does this, so a branch checked out by an earlier step is found rather than
 * recreated.
 */
async function checkoutExistingOrTrack(workspace: WorkspaceIo, branchName: string, startPoint: string): Promise<void> {
	const localBranches = (await workspace.git(["branch"]))
		.split("\n")
		.map((line) => line.replace(/^[*\s]+/u, "").replace(/[*\s]+$/u, ""));
	if (localBranches.includes(branchName)) {
		await workspace.git(["checkout", branchName]);
		return;
	}
	await workspace.git(["checkout", "-b", branchName, startPoint]);
}

/** The steps a run records before it asks the agent to implement, when there is no checkpoint. */
function freshSteps(planNumber: number, requestNumber: number, branchName: string): string[] {
	return [
		`Loaded Plan #${planNumber} and Parent Request #${requestNumber}`,
		`Created and checked out feature branch '${branchName}'`,
	];
}

/** Post the `### DarkFactory Agent Execution Error` comment the Python posted on every failure. */
async function postAgentError(
	context: PipelineContext,
	repo: string,
	planNumber: number,
	detail: string,
): Promise<void> {
	await context.io.addComment(repo, planNumber, `${AGENT_MARKER}\n### DarkFactory Agent Execution Error\n\n${detail}`);
}

/**
 * Dispatch self-review iteration 1 for a pull request, as the Python's `start_self_review` did.
 *
 * A dispatch that fails is not a hiccup. The pipeline hands a stage to itself, and a stage that
 * never ran leaves the pull request sitting in draft with nobody reviewing it, so the failure is
 * posted on the pull request, the pull request and its parent Request are both blocked, and the
 * error is re-raised. The parent Request is the caller's to resolve: `handle_implement` always has
 * one, so the fallback chain that reads it back off the Plan issue is not reachable from here.
 */
async function startSelfReview(
	context: ImplementContext,
	pr: number,
	planNumber: number,
	requestNumber: number,
): Promise<void> {
	const repo = context.repo;
	try {
		await context.io.dispatchAgentStage(repo, {
			stage: "self-review",
			pr,
			plan: planNumber,
			request: requestNumber,
			iteration: 1,
		});
	} catch (error) {
		const reason = `Failed to dispatch agent-dispatch to ${repo}: ${errorMessage(error)}`;
		context.warn(reason);
		await context.io.addComment(
			repo,
			pr,
			`${AGENT_MARKER}\n### Self-Review Dispatch Error\n\nFailed to dispatch next stage: ${errorMessage(error)}`,
		);
		const port = { io: context.io, board: context.board, warn: context.warn };
		blockEntity(port, repo, pr, true);
		blockEntity(port, repo, requestNumber, false);
		throw error;
	}
	context.say(`Dispatched self-review iteration 1 for PR #${pr}`);
}

/**
 * Implement an approved plan and open its draft pull request.
 *
 * Replaces `handle_implement`. The Python returned `None` and left its effect on the repository and
 * on the issue; the outcome is returned here so a caller - and the tests - can see which of the seven
 * paths ran without going back to GitHub to find out.
 *
 * @param context - The handler's GitHub port, workspace, agent, board and reporting.
 * @param request - The Plan and parent Request to implement, and the repository they live in.
 * @returns What implementing did.
 * @throws {@link AgentRunFailure} when the branch cannot be prepared, the agent fails, or the commit
 *   or push is rejected. Each of those posts its notice on the Plan issue first.
 */
export async function handleImplement(context: ImplementContext, request: ImplementRequest): Promise<ImplementOutcome> {
	const { planNumber, requestNumber, repo } = request;
	const { io, workspace } = context;
	const developmentBranch = context.developmentBranch;

	const plan = await io.issueView(repo, planNumber, ["title", "body"]);
	const parent = await io.issueView(repo, requestNumber, ["title", "body"]);

	const branchName = generateBranchName(plan.title);
	context.say(`Creating branch: ${branchName}`);

	for (const notice of workspace.configureGitIdentity()) context.warn(notice);

	try {
		await checkoutBranch(workspace, branchName, developmentBranch);
	} catch (error) {
		// The Python read stderr before stdout; this port's git failure carries git's own stderr in
		// the error message, which is the same text named by the port that raised it.
		const notice = `Failed to create/checkout branch ${branchName}: ${errorMessage(error)}`;
		context.warn(notice);
		await postAgentError(context, repo, planNumber, notice);
		context.fail(`Branch setup failed for plan #${planNumber}; Execution Error posted.`);
	}

	// Read after the checkout: the checkpoint is written into the working copy, so a resume has to
	// read the tree the interrupted run left rather than the one it started from.
	const checkpoint = loadCheckpoint(context.environment.workspaceDir);
	const completedSteps = checkpoint
		? [...(checkpoint.completedSteps ?? [])]
		: freshSteps(planNumber, requestNumber, branchName);

	// Probe for an open pull request before spending a run. An interrupted run that already pushed
	// its branch resumes here rather than implementing the same plan a second time. A failed probe
	// is silent, as it was in the Python: a pull request that cannot be listed yet is a reason to
	// proceed, not to stop.
	const existing = await bestEffort(
		`list open pull requests for ${branchName}`,
		() => io.prNumbersForBranch(repo, branchName, developmentBranch),
		() => undefined,
	);
	const existingPr = existing?.[0];
	if (existingPr !== undefined) {
		context.say(`Found existing open PR #${existingPr} for branch ${branchName}, skipping implementation.`);
		await startSelfReview(context, existingPr, planNumber, requestNumber);
		return { kind: "already-open", pr: existingPr };
	}

	const alreadyImplemented = completedSteps.some((step) => step.includes(IMPLEMENTED_STEP));
	let implementationNotes: string;
	if (alreadyImplemented) {
		context.say("Implementation already completed according to checkpoint; resuming pipeline.");
		implementationNotes = "Implementation resumed from checkpoint.";
	} else {
		implementationNotes = await context.runAgentPrompt({
			prompt: implementPrompt(planNumber, requestNumber, { plan, parent }),
			kind: "implement",
			timeout: "15m0s",
			checkpoint: { issueNumber: planNumber, repo, branchName, completedSteps: [...completedSteps] },
		});
		if (isQuotaExhaustionNotice(implementationNotes)) {
			return { kind: "quota-exhausted", stage: "implement", notice: implementationNotes };
		}
		if (implementationNotes.startsWith(AGENT_ERROR_PREFIX)) {
			await postAgentError(context, repo, planNumber, implementationNotes);
			context.fail(`Implementation failed for plan #${planNumber}; Execution Error posted.`);
		}
		context.say(`Implementation complete. Agent output:\n${implementationNotes.slice(0, 500)}`);
		completedSteps.push("Implemented code and test changes according to plan");
	}

	for (const notice of workspace.formatRepository().notices) context.warn(notice);
	completedSteps.push("Formatted code with the repository formatters");

	const verification = workspace.verifyRepository();
	if (verification.returncode !== 0) {
		context.say(`Tests failed, asking agent to fix...\n${verification.stdout.slice(-500)}`);
		const fixResult = await context.runAgentPrompt({
			prompt:
				"The following test failures occurred after implementing the plan:\n\n" +
				`\`\`\`\n${verification.stdout.slice(-MAX_FIX_STDOUT)}\n${verification.stderr.slice(-MAX_FIX_STDERR)}\n\`\`\`\n\n` +
				"Fix the failures while staying within the plan scope.",
			kind: "fix",
			timeout: "10m0s",
			checkpoint: {
				issueNumber: planNumber,
				repo,
				branchName,
				completedSteps: [...completedSteps, "Executed test suite (failures detected; attempting automated fix)"],
			},
		});
		if (isQuotaExhaustionNotice(fixResult)) {
			return { kind: "quota-exhausted", stage: "fix", notice: fixResult };
		}
		if (fixResult.startsWith(AGENT_ERROR_PREFIX)) {
			await postAgentError(context, repo, planNumber, fixResult);
			context.fail(`Automated test fix failed for plan #${planNumber}; Execution Error posted.`);
		}
		// Formatted again: the fix's own output is what is about to be committed, and formatting is
		// not a review topic, so it has to be normalized before it is.
		for (const notice of workspace.formatRepository().notices) context.warn(notice);
		completedSteps.push("Resolved automated test fixes");
	}

	const { type, area } = classifyTypeAndArea(`${plan.title} ${plan.body}`, context.taxonomy);
	const commitTitle = formatConventionalCommit(type, area, planDescription(plan.title));

	try {
		await workspace.git(["add", "-A"]);
		const status = await workspace.git(["status", "--porcelain"]);
		if (!status) {
			context.say("No changes to commit after implementation.");
			await io.addComment(
				repo,
				planNumber,
				`${AGENT_MARKER}\n### DarkFactory Agent Notice\n\n` +
					"No file changes produced by implementation. Please review the plan scope.",
			);
			return { kind: "no-changes" };
		}
		await workspace.git(["commit", "-m", commitTitle]);
		await workspace.git(["push", "origin", branchName]);
		context.say(`Pushed branch ${branchName}`);
	} catch (error) {
		const rawError = errorMessage(error).trim();
		const notice = isWorkflowPermissionError(rawError)
			? "Git commit/push rejected due to missing GitHub Actions workflow permissions:\n\n" +
				`\`\`\`\n${rawError}\n\`\`\`\n\n` +
				"**Resolution**: The GitHub Actions runner token requires `workflows: write` permissions " +
				"in `.github/workflows/agent.yml` to modify workflows under `.github/workflows/`."
			: `Git commit/push failed: ${rawError}`;
		context.warn(notice);
		await postAgentError(context, repo, planNumber, notice);
		context.fail(`Commit/push failed for plan #${planNumber}; Execution Error posted.`);
	}

	// The base is resolved through the same check the scope gate uses, so a run that cannot reach
	// its base fails here naming the ref rather than opening a pull request whose "Changed Files"
	// section is empty because nothing was compared.
	const baseRef = workspace.resolveBaseRefs(developmentBranch)[0] as string;
	const diffStat = await workspace.git(["diff", "--stat", baseRef]);
	const prBody = buildPrBody({
		planTitle: plan.title,
		planText: plan.body,
		requestNumber,
		planNumber,
		diffStat,
		testCommand: verification.args.join(" "),
		testResultLine: extractTestResultLine(verification.stdout, verification.stderr),
		agentNotes: implementationNotes,
	});

	try {
		await io.runWorkflow(repo, "open-pr.yml", {
			branch: branchName,
			title: commitTitle,
			body: prBody,
			base: developmentBranch,
			draft: "true",
		});
		context.say("Dispatched open-pr.yml workflow");
	} catch (dispatchError) {
		context.warn(`Failed to dispatch open-pr.yml: ${errorMessage(dispatchError)}`);
		try {
			await io.prCreate(repo, {
				head: branchName,
				base: developmentBranch,
				title: commitTitle,
				body: prBody,
				draft: true,
			});
		} catch (createError) {
			context.warn(`Direct PR creation also failed: ${errorMessage(createError)}`);
			return { kind: "not-opened" };
		}
	}

	const opened = await waitForPullRequest(context, repo, branchName, developmentBranch);
	if (opened === undefined) {
		context.say("Timed out waiting for PR creation.");
		return { kind: "pr-timeout", attempts: PR_POLL_ATTEMPTS };
	}
	context.say(`Found PR #${opened}`);
	await startSelfReview(context, opened, planNumber, requestNumber);
	return { kind: "dispatched", pr: opened, commitTitle };
}

/**
 * Poll for the pull request the workflow is opening.
 *
 * The Python slept first and then listed, thirty times, swallowing every failure of the listing: a
 * pull request still being created is a read that can fail, and failing the run over one would
 * abandon a branch that is already pushed.
 */
async function waitForPullRequest(
	context: ImplementContext,
	repo: string,
	branchName: string,
	developmentBranch: string,
): Promise<number | undefined> {
	for (let attempt = 0; attempt < PR_POLL_ATTEMPTS; attempt += 1) {
		await context.workspace.sleep(PR_POLL_INTERVAL_MS);
		const numbers = await bestEffort(
			`list open pull requests for ${branchName}`,
			() => context.io.prNumbersForBranch(repo, branchName, developmentBranch),
			// Deliberately silent, as the Python's `except Exception: pass` was: a pull request that
			// cannot be listed yet is not a problem to report on every one of thirty polls.
			() => undefined,
		);
		const found = numbers?.[0];
		if (found !== undefined) return found;
	}
	return undefined;
}
