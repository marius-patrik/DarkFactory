/**
 * The process entry point: which command was asked for, and what exit status the run reports.
 *
 * Ported from `main` in `.github/scripts/agent_runner.py` - 88 lines of dispatch, and the last
 * structural piece before the Python entrypoint can be swapped. The nine command bodies are already
 * ported and are called here, not re-implemented: `dispatch_event`, `handle_interpret`, `handle_plan`,
 * `handle_implement`, `run_self_review_iteration`, `run_self_review_fix`, `handle_plan_alignment`,
 * `handle_respond`, and the account setup that `token-refresh` reports on.
 *
 * Three things are the entry's alone, and are why this is not another handler.
 *
 * **The command surface is a contract.** Workflow YAML invokes this process by name, so the command
 * names, the flag names, the defaults, and the behaviour when a required flag is absent are all
 * load-bearing. A renamed flag is a broken pipeline, not a refactor.
 *
 * **Exit status.** `AgentRunFailure` carries the demand of a run that has already posted its failure
 * notice and must now end non-zero, and deliberately does not choose a code - that belongs to the
 * one place that knows what a run should report. A posted `[Execution Error]` followed by a normal
 * return used to exit 0, so the failure reporter saw success and filed nothing.
 *
 * **The context is assembled once, from the real implementations.** Every handler is given a context
 * built by {@link buildRunnerPorts}, so there is exactly one answer to what a run's GitHub port,
 * agent, repository, taxonomy and environment are, and a caller that wants a different one supplies a
 * different {@link RunnerPorts} rather than a stub buried inside a handler.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoardAutomation } from "../board/automation.ts";
import { GitHubClient } from "../github/client.ts";
import { loadRepositoryManifest } from "../install/manifest.ts";
import { setupDfAccounts } from "./agent-credentials.ts";
import { githubQuotaBlockStore } from "./agent-failures.ts";
import { agentPromptRunner, spawnProcess } from "./agent-prompt.ts";
import type { BoardStatus } from "./board-status.ts";
import type { AgentDispatchPayload } from "./dispatch.ts";
import { dispatchEvent, type PipelineStages } from "./event.ts";
import {
	AgentRunFailure,
	type PipelineEnv,
	type PipelineEnvironment,
	pipelineContext,
	pipelineEnvironment,
	type RunAgentPrompt,
} from "./handler-context.ts";
import { handleImplement } from "./implement.ts";
import { handleInterpret } from "./interpret.ts";
import type { AreaTaxonomy } from "./labels.ts";
import { errorMessage, githubPipelineIo, type PipelineIo } from "./pipeline-io.ts";
import { handlePlan } from "./plan.ts";
import { handlePlanAlignment } from "./plan-alignment.ts";
import { handleRespond } from "./respond.ts";
import { runSelfReviewIteration } from "./self-review.ts";
import { runSelfReviewFix } from "./self-review-fix.ts";
import { localWorkspaceIo, type WorkspaceIo } from "./workspace-io.ts";

/**
 * The commands this process runs, in the order `argparse` declared them.
 *
 * The order is the contract twice over: it is what an unknown choice is reported against, and it is
 * the order {@link runCommand} tries its branches in.
 */
export const RUNNER_COMMANDS = [
	"dispatch",
	"interpret",
	"plan",
	"implement",
	"self-review",
	"self-review-fix",
	"plan-alignment",
	"respond",
	"token-refresh",
] as const;

/** One of the commands this process runs. */
export type RunnerCommand = (typeof RUNNER_COMMANDS)[number];

/**
 * The command a bare invocation runs.
 *
 * The positional is optional and defaults to `dispatch`, because that is the invocation the event
 * workflows make: they name no command and hand over `GITHUB_EVENT_PATH` instead.
 */
export const DEFAULT_RUNNER_COMMAND: RunnerCommand = "dispatch";

/**
 * The parsed command surface.
 *
 * A number the invocation did not carry is `undefined` rather than a sentinel, because whether a
 * required flag was *absent* is what decides whether the command runs at all.
 */
export interface RunnerArgs {
	/** The command to run. */
	command: RunnerCommand;
	/** `--issue`: the issue or pull request the command acts on. */
	issue: number | undefined;
	/** `--request-issue`: the parent Request issue. */
	requestIssue: number | undefined;
	/** `--plan-issue`: the child Plan issue. */
	planIssue: number | undefined;
	/** `--pr-number`: the pull request the command acts on. */
	prNumber: number | undefined;
	/** `--iteration`: the self-review iteration, defaulting to the first. */
	iteration: number;
	/** `--repo`: `owner/name`, defaulting to `GITHUB_REPOSITORY` and then the manifest's slug. */
	repo: string;
	/**
	 * `--comment`: the comment body for `respond`.
	 *
	 * `argparse` held `None` and the one call site read `args.comment or ""`, so an absent flag and an
	 * empty one are the same value to every command that can observe it.
	 */
	comment: string;
	/** `--is-pr`: whether the comment is on a pull request. */
	isPr: boolean;
}

/** An invocation the argument surface rejected, which exits 2 as `argparse` did. */
export class RunnerArgsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RunnerArgsError";
	}
}

/** The flags that take a number, mapped to the field they fill. */
const NUMBER_FLAGS = {
	"--issue": "issue",
	"--request-issue": "requestIssue",
	"--plan-issue": "planIssue",
	"--pr-number": "prNumber",
	"--iteration": "iteration",
} as const satisfies Record<string, keyof RunnerArgs>;

/** The flags that take a string, mapped to the field they fill. */
const STRING_FLAGS = {
	"--repo": "repo",
	"--comment": "comment",
} as const satisfies Record<string, keyof RunnerArgs>;

/** The flags that take nothing, as `store_true` did. */
const BOOLEAN_FLAGS = {
	"--is-pr": "isPr",
} as const satisfies Record<string, keyof RunnerArgs>;

/**
 * A signed decimal integer, as `int()` accepted.
 *
 * Deliberately equally permissive about a sign, and stricter about the digits: a workflow passes an
 * issue number, and rejecting a form the old entry accepted would break a pipeline that is working.
 */
const INTEGER = /^[+-]?\d+$/u;

/**
 * Reads the `owner/name` a repository `GITHUB_REPOSITORY` does not name, or `""` when unreadable.
 *
 * The Python's `_manifest_slug` swallowed every failure and returned an empty string, because a
 * missing manifest must not stop the process from parsing its arguments. An empty `--repo` is then
 * what the handlers see, which is the same demand as before.
 */
async function manifestSlug(workspaceDir: string, env: PipelineEnv): Promise<string> {
	try {
		const manifest = await loadRepositoryManifest(workspaceDir, env);
		return manifest.slug(env);
	} catch {
		return "";
	}
}

/** What the argument surface reads its defaults from. */
export interface ParseRunnerArgsOptions {
	/** The environment `--repo` defaults to; defaults to the live process environment. */
	env?: PipelineEnv;
	/** The workspace the manifest is read from, for a repository `GITHUB_REPOSITORY` does not name. */
	workspaceDir?: string;
}

/** One flag's value, and whether reading it consumed the following argument. */
interface FlagValue {
	/** The value itself. */
	raw: string;
	/** Whether the value was the next argument rather than part of the flag. */
	consumedNext: boolean;
}

/**
 * Parse the command surface out of an argument vector.
 *
 * Reproduces the Python's `argparse` for the nine commands and the flags above: the optional
 * positional with its `dispatch` default and its `choices`, both the `--flag value` and the
 * `--flag=value` forms, the integer flags rejecting a non-integer, and `--is-pr` as a `store_true`.
 * An unrecognised flag, a second positional, and a command outside the nine are all rejections, and
 * argparse's answer to each was the same: report it and exit 2.
 *
 * One convenience is not reproduced: `argparse` accepted any unambiguous prefix of a flag name, so
 * `--iss 5` was `--issue 5`. No workflow relies on that, and a flag name this port would have to
 * guess at is exactly the quiet divergence a contract like this cannot carry.
 *
 * @param argv - The arguments after the process name.
 * @param options - Where the defaults are read from.
 * @returns The parsed surface.
 * @throws {@link RunnerArgsError} for anything the surface rejects.
 */
export async function parseRunnerArgs(
	argv: readonly string[],
	options: ParseRunnerArgsOptions = {},
): Promise<RunnerArgs> {
	const env = options.env ?? process.env;
	const environment = pipelineEnvironment(env);
	const args: RunnerArgs = {
		command: DEFAULT_RUNNER_COMMAND,
		issue: undefined,
		requestIssue: undefined,
		planIssue: undefined,
		prNumber: undefined,
		iteration: 1,
		repo: env.GITHUB_REPOSITORY || (await manifestSlug(options.workspaceDir ?? environment.workspaceDir, env)),
		comment: "",
		isPr: false,
	};

	const reject = (message: string): never => {
		throw new RunnerArgsError(message);
	};

	const parseInteger = (flag: string, raw: string): number => {
		if (!INTEGER.test(raw)) reject(`argument ${flag}: invalid int value: '${raw}'`);
		return Number.parseInt(raw, 10);
	};

	/**
	 * Read a flag's value, from `--flag=value` or from the argument after it.
	 *
	 * The next argument is taken whatever it looks like, as argparse did: `--comment -1` is a comment
	 * reading `-1`, not an unrecognised option.
	 */
	const flagValue = (flag: string, inline: string | undefined, at: number): FlagValue => {
		if (inline !== undefined) return { raw: inline, consumedNext: false };
		const next = argv[at + 1];
		if (next === undefined) throw new RunnerArgsError(`argument ${flag}: expected one argument`);
		return { raw: next, consumedNext: true };
	};

	let command: RunnerCommand | undefined;

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index] as string;

		if (argument === "--") continue;
		if (argument === "-" || !argument.startsWith("-")) {
			if (command !== undefined) reject(`unrecognized arguments: ${argument}`);
			if (!(RUNNER_COMMANDS as readonly string[]).includes(argument)) {
				reject(
					`argument command: invalid choice: '${argument}' ` +
						`(choose from ${RUNNER_COMMANDS.map((name) => `'${name}'`).join(", ")})`,
				);
			}
			command = argument as RunnerCommand;
			continue;
		}

		if (!argument.startsWith("--")) reject(`unrecognized arguments: ${argument}`);
		const equals = argument.indexOf("=");
		const flag = equals === -1 ? argument : argument.slice(0, equals);
		const inline = equals === -1 ? undefined : argument.slice(equals + 1);

		if (flag in BOOLEAN_FLAGS) {
			// `store_true` takes no value, and argparse said so rather than ignoring what followed.
			if (inline !== undefined) reject(`argument ${flag}: ignored explicit argument '${inline}'`);
			args[BOOLEAN_FLAGS[flag as keyof typeof BOOLEAN_FLAGS]] = true;
			continue;
		}
		if (flag in NUMBER_FLAGS) {
			const field = NUMBER_FLAGS[flag as keyof typeof NUMBER_FLAGS];
			const value = flagValue(flag, inline, index);
			if (value.consumedNext) index += 1;
			args[field] = parseInteger(flag, value.raw);
			continue;
		}
		if (flag in STRING_FLAGS) {
			const field = STRING_FLAGS[flag as keyof typeof STRING_FLAGS];
			const value = flagValue(flag, inline, index);
			if (value.consumedNext) index += 1;
			args[field] = value.raw;
			continue;
		}
		reject(`unrecognized arguments: ${flag}`);
	}

	args.command = command ?? DEFAULT_RUNNER_COMMAND;
	return args;
}

/** Where a run narrates and complains, as the Python's two `print`s did. */
export interface RunnerReporting {
	/** Writes a progress line, as the Python's `print` did. */
	say: (message: string) => void;
	/** Writes a warning or an error, as the Python's `print(..., file=sys.stderr)` did. */
	warn: (message: string) => void;
}

/** The default reporting: the console, on the stream each belongs to. */
const CONSOLE_REPORTING: RunnerReporting = {
	say: (message) => console.log(message),
	warn: (message) => console.error(message),
};

/** Everything a command needs from the outside world, assembled by {@link buildRunnerPorts}. */
export interface RunnerPorts {
	/** The GitHub port every handler performs through. */
	io: PipelineIo;
	/** The project board, for the board half of an item's blocked state. */
	board: BoardStatus;
	/** The working copy, for the stages that commit to a branch. */
	workspace: WorkspaceIo;
	/** The environment the run reads, as `os.environ` presents it. */
	env: PipelineEnv;
	/** The environment contract: workspace, state and repository. */
	environment: PipelineEnvironment;
	/** Runs one agent prompt, with the attempt ladder behind it. */
	runAgentPrompt: RunAgentPrompt;
	/** The stage bodies `dispatch` hands an event to. */
	stages: PipelineStages;
	/** The repository's area taxonomy, which the classifier needs. */
	taxonomy: AreaTaxonomy;
	/** The branch pull requests open against. */
	developmentBranch: string;
	/** The repository slug the command acts on. */
	repo: string;
	/** Writes a progress line, as the Python's `print` did. */
	say: (message: string) => void;
	/** Writes a warning or an error, as the Python's `print(..., file=sys.stderr)` did. */
	warn: (message: string) => void;
	/** Reads and parses an event payload; `undefined` when the file is not there. */
	readEvent: (eventPath: string) => unknown;
	/** Configures `df`'s accounts; the only work `token-refresh` does of its own. */
	setupAccounts: () => Promise<void>;
	/** Waits for the board writes the run started but did not await. */
	settle: () => Promise<void>;
}

/** What {@link buildRunnerPorts} is given beyond the parsed surface. */
export interface BuildRunnerPortsOptions extends RunnerReporting {
	/** The live environment; the account setup writes `DF_HOME` and `DF_CONFIG_DIR` into it. */
	env: Record<string, string | undefined>;
	/** The parsed command surface. */
	args: RunnerArgs;
}

/**
 * Assemble the ports a command runs against, from the real implementations.
 *
 * Every one of these is a port with a real adapter rather than a stand-in, because a stand-in here is
 * the failure mode the rest of this port exists to remove: a stubbed GitHub port makes a dispatched
 * stage look like it ran, and a run nobody can read is reported as a success.
 *
 * The board port is the one place where the port's synchronous shape and this subsystem's
 * asynchronous one disagree. `BoardStatus` returns nothing, and a write started from it would be lost
 * when the process exits, so the started write is collected and {@link RunnerPorts.settle} waits for
 * it before the run reports its exit status. That is what the Python's synchronous `gh` call did
 * implicitly; doing it at the end rather than mid-stage is the same guarantee at a lower cost.
 *
 * @param options - The parsed surface, the live environment, and where the run reports.
 * @returns The ports.
 */
export async function buildRunnerPorts(options: BuildRunnerPortsOptions): Promise<RunnerPorts> {
	const { env, args, say, warn } = options;
	const environment = pipelineEnvironment(env);
	const manifest = await loadRepositoryManifest(environment.workspaceDir, env);
	const client = new GitHubClient({ token: env.GH_TOKEN ?? env.GITHUB_TOKEN ?? "" });
	const io = githubPipelineIo(client);
	const workspace = localWorkspaceIo(environment.workspaceDir);

	const automation = new BoardAutomation({ env, root: environment.workspaceDir });
	const report: RunnerReporting = { say, warn };
	const pendingBoards = new Set<Promise<void>>();
	const board: BoardStatus = (entity, status) => {
		const write = moveBoardItem(automation, args.repo, entity.number, status, report);
		pendingBoards.add(write);
		void write.finally(() => pendingBoards.delete(write));
	};

	const runAgentPrompt = agentPromptRunner({
		io,
		workspace,
		board,
		run: spawnProcess,
		quotaBlocks: githubQuotaBlockStore(client),
		env,
		say,
		warn,
	});

	// `dispatch_stage`'s port. The event's own repository is resolved inside `dispatchEvent` for the
	// routes it handles; a `repository_dispatch` this pipeline sends goes to the repository it was
	// triggered in, which is the one `--repo` and `GITHUB_REPOSITORY` name.
	const stage = (payload: AgentDispatchPayload): Promise<void> => io.dispatchAgentStage(args.repo, payload);
	const stages: PipelineStages = {
		selfReview: stage,
		selfReviewFix: stage,
		prFeedbackFix: stage,
		resume: stage,
	};

	return {
		io,
		board,
		workspace,
		env,
		environment,
		runAgentPrompt,
		stages,
		taxonomy: { defaultArea: manifest.defaultArea(), areaKeywords: manifest.areaKeywords() },
		developmentBranch: manifest.developmentBranch(),
		repo: args.repo,
		say,
		warn,
		readEvent,
		setupAccounts: async () => {
			await setupDfAccounts({
				live: env,
				roots: [environment.workspaceDir, join(environment.workspaceDir, ".darkfactory-pipeline")],
				say,
				warn,
			});
		},
		settle: async () => {
			await Promise.all([...pendingBoards]);
		},
	};
}

/**
 * Put one item in a status column on every board this repository is linked to.
 *
 * Never throws, because the board is the second half of an item's state and a run that cannot reach
 * it has still labelled the item it stopped on. The Python caught every exception here and printed a
 * notice, and the wording is the one `board-status.ts` uses for the same failure.
 */
async function moveBoardItem(
	automation: BoardAutomation,
	repo: string,
	number: number,
	status: string,
	report: RunnerReporting,
): Promise<void> {
	try {
		for (const projectNumber of await automation.resolveBoards()) {
			await automation.projectClient(projectNumber).setStatusLabel(repo, number, status);
		}
	} catch (error) {
		report.warn(`Notice: Failed to update project status: ${errorMessage(error)}`);
	}
}

/**
 * Read the event payload the dispatch workflows wrote, or report that there is none.
 *
 * `undefined` is the one thing the caller cannot infer from a payload: a file holding `null` is a
 * payload that normalises to nothing, and the Python reported those two differently. A file that is
 * present but is not JSON raises, as `json.load` did, and the run ends non-zero.
 *
 * @param eventPath - `GITHUB_EVENT_PATH`.
 * @returns The parsed payload, or `undefined` when the file is not there.
 */
function readEvent(eventPath: string): unknown {
	if (!eventPath) return undefined;
	let source: string;
	try {
		source = readFileSync(eventPath, "utf8");
	} catch {
		return undefined;
	}
	return JSON.parse(source) as unknown;
}

/** What a command did, as far as the entry point reports it. */
export type RunnerOutcome =
	/** A command's body ran. */
	| { kind: "ran"; command: RunnerCommand }
	/**
	 * A command's guard did not match and the Python fell through to doing nothing.
	 *
	 * The silence is deliberate and is reproduced: the workflows invoke a command with the flags that
	 * command needs, and a guard that complained would file noise on every stage with nothing to name.
	 */
	| { kind: "skipped"; command: RunnerCommand };

/**
 * Run one command.
 *
 * The branch order is the Python's and the guards are the Python's, including the guards that read
 * truthiness rather than presence: a command whose flag is absent, and the one whose flag is `0`,
 * both match no branch.
 *
 * @param args - The parsed surface.
 * @param ports - The assembled ports.
 * @returns What happened.
 * @throws {@link AgentRunFailure} when a handler ends the run after posting its notice.
 */
export async function runCommand(args: RunnerArgs, ports: RunnerPorts): Promise<RunnerOutcome> {
	const { io, runAgentPrompt, repo, taxonomy, environment, say, warn } = ports;
	const context = pipelineContext({
		io,
		runAgentPrompt,
		taxonomy,
		repo,
		developmentBranch: ports.developmentBranch,
		env: ports.env,
		say,
		warn,
	});
	const { issue, requestIssue, planIssue, prNumber, iteration, comment, isPr } = args;

	// Every agent call in the pipeline goes through df, so its accounts are configured from the
	// environment before anything dispatches. A setup failure is a notice and the command still runs:
	// a container whose `df` is missing or misconfigured has still a stage that can be reported.
	try {
		await ports.setupAccounts();
	} catch (error) {
		warn(`df setup notice: ${errorMessage(error)}`);
	}

	if (args.command === "token-refresh") {
		say("df account setup completed successfully.");
		return { kind: "ran", command: args.command };
	}

	if (args.command === "interpret" && issue) {
		await handleInterpret(context, { issueNumber: issue, repo });
		return { kind: "ran", command: args.command };
	}

	if (args.command === "plan" && requestIssue && planIssue) {
		await handlePlan(context, { requestNumber: requestIssue, planNumber: planIssue, repo });
		return { kind: "ran", command: args.command };
	}

	if (args.command === "implement" && planIssue && requestIssue) {
		await handleImplement(
			{ ...context, workspace: ports.workspace, board: ports.board, environment },
			{ planNumber: planIssue, requestNumber: requestIssue, repo },
		);
		return { kind: "ran", command: args.command };
	}

	if (args.command === "self-review" && prNumber && planIssue) {
		await runSelfReviewIteration(
			{ ...context, workspace: ports.workspace, board: ports.board, environment },
			{
				prNumber,
				planNumber: planIssue,
				// The Python's `args.request_issue or args.plan_issue`: a self-review naming no Request
				// is still reviewable against its Plan, so the Plan stands in.
				requestNumber: requestIssue ?? planIssue,
				iteration,
				repo,
			},
		);
		return { kind: "ran", command: args.command };
	}

	if (args.command === "self-review-fix" && prNumber && planIssue && requestIssue) {
		await runSelfReviewFix(
			{ ...context, workspace: ports.workspace, board: ports.board },
			{ prNumber, planNumber: planIssue, requestNumber: requestIssue, iteration, repo },
		);
		return { kind: "ran", command: args.command };
	}

	if (args.command === "plan-alignment" && prNumber && planIssue && requestIssue) {
		await handlePlanAlignment(
			{ ...context, board: ports.board, environment },
			{ prNumber, planNumber: planIssue, requestNumber: requestIssue, repo },
		);
		return { kind: "ran", command: args.command };
	}

	if (args.command === "respond" && issue) {
		await handleRespond(context, { number: issue, commentText: comment, repo, isPr });
		return { kind: "ran", command: args.command };
	}

	if (args.command === "dispatch") {
		const eventPath = ports.env.GITHUB_EVENT_PATH ?? "";
		await dispatchEvent(
			{ ...context, stages: ports.stages, board: ports.board, environment },
			{ eventPath, eventName: ports.env.GITHUB_EVENT_NAME ?? "", payload: ports.readEvent(eventPath) },
		);
		return { kind: "ran", command: args.command };
	}

	return { kind: "skipped", command: args.command };
}

/** The exit status a run that ended in a failure notice reports, as `SystemExit(1)` did. */
const RUN_FAILED = 1;

/** The exit status a rejected argument vector reports, as `argparse` did. */
const ARGS_REJECTED = 2;

/** What {@link runnerMain} is given beyond the argument vector. */
export interface RunnerMainOptions {
	/** The environment; defaults to the live process environment. */
	env?: Record<string, string | undefined>;
	/**
	 * The ports, when a caller supplies its own.
	 *
	 * The entry assembles the real ones; this is the seam that lets the command surface be proved
	 * without a GitHub token or a working copy, which is what the ported bodies are tested through.
	 */
	ports?: RunnerPorts;
	/** Writes a progress line; defaults to the console. */
	say?: (message: string) => void;
	/** Writes a warning or an error; defaults to the console. */
	warn?: (message: string) => void;
}

/**
 * Run the process: parse, set `df` up, dispatch, and report an exit status.
 *
 * The outcomes are the Python's. A rejected argument vector is 2, a run that posted its failure
 * notice is 1, and everything else - including a command whose guard did not match, and a stage that
 * completed - is 0.
 *
 * @param argv - The arguments after the process name.
 * @param options - The environment, the ports, and where the run reports.
 * @returns The process exit status.
 */
export async function runnerMain(argv: readonly string[], options: RunnerMainOptions = {}): Promise<number> {
	const env = options.env ?? (process.env as Record<string, string | undefined>);
	const say = options.say ?? CONSOLE_REPORTING.say;
	const warn = options.warn ?? CONSOLE_REPORTING.warn;

	let args: RunnerArgs;
	try {
		args = await parseRunnerArgs(argv, { env });
	} catch (error) {
		if (error instanceof RunnerArgsError) {
			warn(error.message);
			return ARGS_REJECTED;
		}
		throw error;
	}

	const ports = options.ports ?? (await buildRunnerPorts({ env, args, say, warn }));

	try {
		await runCommand(args, ports);
		await ports.settle();
		return 0;
	} catch (error) {
		if (error instanceof AgentRunFailure) {
			// The notice is already posted: `pipelineContext`'s `fail` wrote it before throwing, and
			// the only thing left to decide is that this process ends non-zero so that the failure
			// reporter files it rather than seeing a success.
			return RUN_FAILED;
		}
		warn(errorMessage(error));
		return RUN_FAILED;
	}
}
