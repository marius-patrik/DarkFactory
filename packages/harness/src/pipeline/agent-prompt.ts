/**
 * The attempt ladder: one prompt, run against the first harness that can answer it.
 *
 * Replaces `run_agent_prompt` in `.github/scripts/agent_runner.py` - the function every ported
 * handler reaches through {@link RunAgentPrompt}. Its order of operations is the behaviour, and the
 * order here is the Python's step for step:
 *
 * - The chain is resolved once, before anything is spawned. An empty chain is the "no usable
 *   harness" error rather than a crash, because the pipeline has one harness by declaration and an
 *   image that lost it is a diagnosable state, not a bug.
 * - A credential that cannot be prepared is not fatal. An unusable account is skipped and the next
 *   one tried, which is the whole point of declaring several.
 * - The backoff is reserved for the *last* attempt in the chain. An unused account or harness is
 *   always a better answer than sleeping, so quota and auth failures rotate immediately and only a
 *   last-attempt rate limit waits.
 * - Anything that is neither quota nor auth returns at once. Falling through on a genuine bug would
 *   burn every harness on the same broken prompt.
 * - An exit 0 with no usable text is a *failed attempt*, not a perfect answer. `agy --print-timeout`
 *   spends its budget and exits 0 with empty output, and posting that empty shell as the agent's
 *   reply was the bug this rule exists for.
 *
 * The return contract is narrow and every handler branches on it: the agent's text, or a message
 * prefixed with {@link AGENT_ERROR_PREFIX}. Changing that prefix silently disables every error path
 * in the pipeline.
 */

import { spawn } from "node:child_process";
import {
	type AttemptEnvironment,
	finishDfLoginFiles,
	type PersistRotatedToken,
	removePromptFile,
	reportingTokenPersistence,
	snapshotDfLoginFiles,
	writePromptFile,
} from "./agent-credentials.ts";
import {
	type CheckpointPort,
	checkpointAndNotifyExhaustion,
	type NoticeTarget,
	postAgentFailureNotice,
	type QuotaBlockStore,
} from "./agent-failures.ts";
import { calculateBackoff } from "./backoff.ts";
import type { Checkpoint } from "./checkpoint.ts";
import { dfFailureDetail, dfSetupSecretNames, parseDfJsonOutput } from "./df-events.ts";
import { DF_LABEL, dfAvailable, dfRunArgv } from "./df-run.ts";
import { DEFAULT_REPOSITORY } from "./dispatch.ts";
import {
	AGENT_DEFAULT_TIMEOUT,
	type AgentPromptRequest,
	type PipelineEnv,
	pipelineEnvironment,
	type RunAgentPrompt,
} from "./handler-context.ts";
import { errorMessage, type PipelineIo } from "./pipeline-io.ts";
import {
	AGENT_ERROR_PREFIX,
	AUTH_FAILED_NOTICE,
	boundedTail,
	isAuthFailure,
	isPrintTimeout,
	isQuotaExhausted,
	QUOTA_EXHAUSTED_NOTICE,
	redactSecrets,
	SHORT_REPORT_LIMIT,
} from "./signals.ts";
import type { WorkspaceIo } from "./workspace-io.ts";

/**
 * Appended to every prompt.
 *
 * The pipeline posts or parses the agent's final message, and nobody can reply during a run. A plan
 * was once written to a file inside the container and the comment only asked whether to post it, so
 * the plan never reached the issue.
 */
export const ANSWER_CONTRACT =
	"\n\nThis is a non-interactive pipeline run. Your final message is used verbatim (posted as " +
	"the GitHub comment or read by the pipeline), so put the complete result in that message. Do " +
	"not write the result to a file instead, do not summarise a file, and do not ask for " +
	"confirmation or offer options: nobody can reply until the run has ended.";

/** `TERM` when the workflow does not set one; several CLIs colour or paginate without it. */
const DEFAULT_TERM = "xterm-256color";

/** Transient attempts on the last rung of the chain before the run gives up and waits. */
const MAX_RETRIES = 2;

/** The initial retry delay, in seconds. */
const BASE_DELAY_SECONDS = 1.0;

/** The exponential multiplier applied to each successive retry. */
const BACKOFF_FACTOR = 2.0;

/** Longest a rotated-credential detail reaches in a notice, as the Python cut it. */
const DETAIL_LIMIT = 400;

/** The notice returned when the agent is not on PATH, which is the one precondition there is. */
const NO_AGENT_NOTICE = `${AGENT_ERROR_PREFIX}: No usable agent. The pipeline runs df as its only agent and it is not on PATH.`;

/** How a command ended, as `subprocess.run` reported it. */
export interface CommandResult {
	/** The process's exit status. */
	exitCode: number;
	/** The process's standard output. */
	stdout: string;
	/** The process's standard error. */
	stderr: string;
}

/**
 * A binary that could not be started at all, as the Python's `FileNotFoundError`.
 *
 * Distinct from a non-zero exit on purpose: a harness whose binary vanished between resolution and
 * invocation is moved past, while a harness that ran and failed is classified. Collapsing the two
 * would either retry a missing binary or give up on a real failure.
 */
export class HarnessBinaryMissing extends Error {
	/** The binary that could not be started. */
	readonly binary: string;

	constructor(binary: string) {
		super(`${binary} is not executable`);
		this.name = "HarnessBinaryMissing";
		this.binary = binary;
	}
}

/**
 * Runs one command to completion with its output captured.
 *
 * The Python passed `capture_output=True, text=True, check=True`, so a non-zero exit arrived as an
 * exception carrying the captured streams. Here the exit is data instead, because the ladder has to
 * read those streams to tell quota from a genuine error.
 *
 * @param argv - The command and its arguments, with no shell between them.
 * @param env - The environment the command runs in.
 * @returns The exit status and both captured streams.
 * @throws {@link HarnessBinaryMissing} when the binary could not be started.
 */
export type ProcessRunner = (
	argv: readonly string[],
	env: Record<string, string | undefined>,
) => Promise<CommandResult>;

/**
 * The {@link ProcessRunner} over a real process, with no shell and no argument-length limit.
 *
 * Standard input is closed rather than inherited: a coding agent that believes it has a TTY will hold
 * a turn open forever, and the harness's own print timeout is the budget this run is relying on.
 */
export const spawnProcess: ProcessRunner = (argv, env) =>
	new Promise<CommandResult>((resolve, reject) => {
		const child = spawn(argv[0] as string, argv.slice(1), {
			env,
			stdio: ["ignore", "pipe", "pipe"],
			windowsHide: true,
		});
		let stdout = "";
		let stderr = "";
		child.stdout?.setEncoding("utf8");
		child.stderr?.setEncoding("utf8");
		child.stdout?.on("data", (chunk: string) => {
			stdout += chunk;
		});
		child.stderr?.on("data", (chunk: string) => {
			stderr += chunk;
		});
		child.on("error", (error: NodeJS.ErrnoException) => {
			// A missing binary arrives as ENOENT rather than a status, which is the same condition the
			// Python caught as FileNotFoundError. Anything else is a real failure and is surfaced as one.
			if (error.code === "ENOENT") {
				reject(new HarnessBinaryMissing(argv[0] ?? ""));
				return;
			}
			reject(error);
		});
		child.on("close", (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
	});

/** What the ladder needs from the outside world, beyond the environment it is given. */
export interface AgentPromptRunnerOptions {
	/** The GitHub port, for the exhaustion notice and the `Blocked` label. */
	io: PipelineIo;
	/** The working copy, for the checkpoint commit and push. */
	workspace: Pick<WorkspaceIo, "git">;
	/** The project board, for the `Blocked` column. */
	board: (entity: { number: number; isPr: boolean }, status: string) => void;
	/** Runs one harness invocation. */
	run: ProcessRunner;
	/** The repository variables a blocked item is recorded in. */
	quotaBlocks: QuotaBlockStore;
	/** The environment the run reads; defaults to the process environment. */
	env?: PipelineEnv;
	/** Resolves a binary to a path, or null when it is absent from `PATH`; defaults to the real one. */
	which?: (binary: string) => string | null;
	/** Where a rotated credential is written back to; defaults to a loud no-op. */
	persistRotatedToken?: PersistRotatedToken;
	/** How long to wait between retries; defaults to a real timer. */
	sleep?: (ms: number) => Promise<void>;
	/** The current time in epoch seconds; defaults to the system clock. */
	now?: () => number;
	/** Writes a progress line; defaults to the console. */
	say?: (message: string) => void;
	/** Writes a warning or an error; defaults to the console. */
	warn?: (message: string) => void;
}

/**
 * What one run of the agent is doing.
 *
 * This carried a harness, a model, a 1-based account, and whether anything was left to rotate to.
 * All four were scaffolding for a fallback chain across nine agent CLIs. There is one agent, it
 * picks its own model, and it reads its own accounts from `DF_HOME`, so none of them was ever a
 * decision the runner could make differently. Only the label survives, because a notice has to say
 * what ran.
 */
interface AttemptState {
	/** The rendered label, which names the agent and never a credential. */
	label: string;
}

/** Which way an attempt ended, as the ladder's four branches distinguish them. */
type AttemptOutcome =
	/** The agent answered. */
	| { kind: "answer"; output: string }
	/** The agent exited cleanly with nothing usable to show. */
	| { kind: "no-output" }
	/** A transient rate limit, and the retry budget is not yet spent. */
	| { kind: "retry" }
	/**
	 * The run ends here, and why is in `progress`: quota becomes a checkpoint, an auth failure becomes
	 * a plain error. Distinct from `no-output`, which means nothing usable was produced at all.
	 */
	| { kind: "exhausted" }
	/** The run ends here, with this notice. */
	| { kind: "error"; notice: string };

/** What the ladder remembers as it walks the chain, for the end-of-chain notice. */
interface ChainProgress {
	/** The last failure's detail, carried into the notice. */
	lastErrorDetail: string;
	/**
	 * What the last rotated failure was: `quota` or `auth`.
	 *
	 * Quota everywhere ends in a checkpoint and a `Blocked` label; auth everywhere is a plain error
	 * with no checkpoint, because resuming the same stale secrets would fail the same way. Defaults to
	 * quota to preserve the previous end-of-chain behaviour for failures carrying neither wording.
	 */
	lastRotatable: string;
	/** Whether any attempt exited cleanly with nothing usable to show. */
	sawNoOutput: boolean;
}

/**
 * Every environment variable whose value may appear in the agent's own output and must not.
 *
 * The account secrets `df` reads, which is all there is: the pipeline provisions them through `df
 * account set`, and `df` reads them from its own store. Names rather than values, because redaction
 * reads the live environment at the moment it is needed and so still recognises a token rotated
 * mid-run.
 */
function redactionNames(): string[] {
	return [...new Set(dfSetupSecretNames())];
}

/**
 * Build the {@link RunAgentPrompt} the ported handlers are given.
 *
 * @param options - The ports, the environment, and the clock and sleep the ladder paces itself with.
 * @returns The runner.
 */
export function agentPromptRunner(options: AgentPromptRunnerOptions): RunAgentPrompt {
	const {
		io,
		workspace,
		board,
		run,
		quotaBlocks,
		which = (binary: string) => Bun.which(binary),
		sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
		now = () => Math.floor(Date.now() / 1000),
		say = (message: string) => console.log(message),
		warn = (message: string) => console.error(message),
	} = options;
	const env = options.env ?? process.env;
	const environment = pipelineEnvironment(env);
	const persist = options.persistRotatedToken ?? reportingTokenPersistence(environment.repository, warn);
	const secretNames = redactionNames();

	/** Redact with every credential name the registry knows. */
	const redact = (text: string): string => redactSecrets(text, secretNames, env);

	/** The ports the failure tail needs, bound to this runner's environment. */
	const failurePort = (): CheckpointPort => ({
		io,
		workspace,
		board,
		warn,
		env,
		workspaceDir: environment.workspaceDir,
		now,
		quotaBlocks,
	});

	/** The failure detail a non-zero exit produced, with df's exit code translated into wording. */
	const failureDetail = (_state: AttemptState, result: CommandResult): string => {
		const detail = `${result.stderr.trim()}\n${result.stdout.trim()}`.trim();
		return dfFailureDetail({ exitCode: result.exitCode, stdout: result.stdout, detail });
	};

	/**
	 * Classify an invocation that exited non-zero.
	 *
	 * Quota is checked before auth: some providers report exhaustion as a 403, and that classification
	 * predates auth rotation and stays as it was.
	 */
	const classifyFailure = (state: AttemptState, result: CommandResult, progress: ChainProgress): AttemptOutcome => {
		const detail = failureDetail(state, result);
		progress.lastErrorDetail = detail;
		const exhausted = isQuotaExhausted(detail);
		const authFailed = !exhausted && isAuthFailure(detail);

		if (!exhausted && !authFailed) {
			const notice =
				`${AGENT_ERROR_PREFIX}: ${DF_LABEL} invocation failed ` + `(exit code ${result.exitCode}): ${detail}`;
			warn(notice);
			return { kind: "error", notice };
		}

		if (authFailed) {
			progress.lastRotatable = "auth";
			const safe = redact(detail).slice(0, DETAIL_LIMIT);
			// `df` resolves its own accounts, so the runner has nothing to rotate to. A credential the
			// agent rejected is a failure to report, not a rung to move past.
			warn(`Authentication failed on ${state.label} and df has no other account to try: ${safe}.`);
			return { kind: "exhausted" };
		}

		progress.lastRotatable = "quota";
		warn(
			`Quota exhausted on ${state.label}: ${detail}. ` +
				"There is no other account to move to, so the run ends in a checkpoint.",
		);
		return { kind: "exhausted" };
	};

	/**
	 * Wait out a last-attempt rate limit, as the Python's `retry < max_retries` test decided.
	 *
	 * @returns `false` once the retries are spent, so the attempt ends rather than looping.
	 */
	const waitOutRateLimit = async (state: AttemptState, retry: number, detail: string): Promise<boolean> => {
		if (retry >= MAX_RETRIES) {
			warn(
				`Quota exhausted on ${state.label} after ${MAX_RETRIES + 1} attempts, ` +
					"with no account, model or harness left to try.",
			);
			return false;
		}
		const delay = calculateBackoff(retry, { baseDelay: BASE_DELAY_SECONDS, backoffFactor: BACKOFF_FACTOR });
		warn(
			`Transient rate limit on ${state.label}, and nothing left to rotate to ` +
				`(attempt ${retry + 1}/${MAX_RETRIES + 1}): ${detail}. ` +
				`Retrying in ${delay.toFixed(2)}s...`,
		);
		await sleep(delay * 1000);
		return true;
	};

	/** What a notice says about what happens next. `df` has nothing to rotate to. */
	const rotationWhere = (): string => "There is no other account for df to try.";

	/**
	 * Classify an invocation that exited cleanly.
	 *
	 * Two reports are rotated rather than returned, and both are guarded by the same limit. A harness
	 * that reports exhaustion or an auth failure *instead of* an answer exits 0 with the report on
	 * stdout, and rotating past it beats posting the error text as the agent's reply. The single-line
	 * limit is what keeps this from catching real answers: an answer may discuss quotas or credentials
	 * at length - a Request about quota handling always does - and that discussion must pass through
	 * untouched.
	 */
	const classifyOutput = (state: AttemptState, result: CommandResult, progress: ChainProgress): AttemptOutcome => {
		const output = parseDfJsonOutput(result.stdout);

		if (output && !output.includes("\n") && output.length <= SHORT_REPORT_LIMIT) {
			const quota = isQuotaExhausted(output);
			const auth = !quota && isAuthFailure(output);
			if (quota || auth) {
				progress.lastRotatable = quota ? "quota" : "auth";
				progress.lastErrorDetail = redact(output);
				warn(
					`${quota ? "Quota exhausted" : "Authentication failed"} on ${state.label} (reported on stdout); ` +
						`detail: ${progress.lastErrorDetail.slice(0, DETAIL_LIMIT)}. ` +
						`${rotationWhere()}`,
				);
				// Quota is retried, because the retry budget is the only resilience left now there is no
				// second agent to move on to. An auth failure is not: a credential the agent has already
				// rejected will be rejected again, so the run ends and says so rather than spending the
				// budget on it.
				return auth ? { kind: "error", notice: progress.lastErrorDetail } : { kind: "retry" };
			}
		}

		// Timeout wording is only trusted from stderr: an agent's real answer may discuss timeouts.
		if (!output || isPrintTimeout(result.stderr)) {
			// A harness may report exhaustion or an auth failure on stdout while exiting 0 with no
			// usable text. That is a rotated failure like any other - not an empty shell - so the
			// combined output is classified before the empty branch below.
			const combined = `${result.stdout}\n${result.stderr}`.trim();
			const quota = isQuotaExhausted(combined);
			const auth = !quota && isAuthFailure(combined);
			if (quota || auth) {
				progress.lastRotatable = quota ? "quota" : "auth";
				progress.lastErrorDetail =
					redact(boundedTail(combined)) ||
					(quota ? `${state.label} reported exhaustion` : `${state.label} reported an authentication failure`);
				warn(
					`${quota ? "Quota exhausted" : "Authentication failed"} on ${state.label} ` +
						`(reported without usable output); ` +
						`stderr tail: ${progress.lastErrorDetail.slice(0, DETAIL_LIMIT)}. ${rotationWhere()}`,
				);
				return { kind: "exhausted" };
			}
			// A harness that exits 0 with no usable text is a failed attempt, not a perfect answer.
			// It rotates exactly like quota - waiting cannot fix a spent time budget - and if nothing
			// produces text anywhere the run raises rather than reporting success over an empty shell.
			progress.sawNoOutput = true;
			progress.lastErrorDetail = redact(boundedTail(result.stderr)) || "the agent produced no output";
			warn(
				`No usable output from ${state.label} (exit 0, empty or print-timed-out); ` +
					`stderr tail: ${progress.lastErrorDetail.slice(0, DETAIL_LIMIT)}. ${rotationWhere()}`,
			);
			return { kind: "no-output" };
		}

		return { kind: "answer", output };
	};

	/** Run one attempt to completion, retries included, and say how it ended. */
	const runAttempt = async (
		state: AttemptState,
		runEnvironment: AttemptEnvironment,
		prompt: string,
		timeout: string,
		kind: string,
		progress: ChainProgress,
	): Promise<AttemptOutcome> => {
		// `df` reads its own accounts, so the environment an invocation runs in is the run's own. There
		// is no per-attempt credential to prepare and no second account to fall back to.
		const attemptEnv = runEnvironment.base;
		const text = prompt + ANSWER_CONTRACT;
		// Progress, not failure, so it goes to stdout. This used to announce the resolved chain; with
		// one agent it says what is about to run, which is the part a reader of a stuck run needs.
		say(`Running ${DF_LABEL} (${kind}), timeout ${timeout}.`);
		for (let retry = 0; retry <= MAX_RETRIES; retry += 1) {
			// df borrows CLI subscription logins and keeps OAuth in its own store; either can rotate
			// mid-run, so the pre-run state is snapshotted for write-back below.
			const dfLoginState = snapshotDfLoginFiles(runEnvironment.live);
			// The prompt travels by file, so a long prompt never meets an argument-length limit. The file
			// is written per retry and removed in the `finally` below.
			const promptFile = writePromptFile(text);
			const argv = dfRunArgv({ promptFile, kind, timeout });

			let result: CommandResult;
			try {
				result = await run(argv, attemptEnv);
			} catch (error) {
				if (error instanceof HarnessBinaryMissing) {
					warn(`Harness binary '${error.binary}' vanished between resolution and invocation.`);
					return { kind: "exhausted" };
				}
				// Anything unexpected is surfaced verbatim rather than classified: the ladder cannot
				// tell a quota failure from a bug it has never seen, and guessing would be worse.
				const notice = `${AGENT_ERROR_PREFIX}: Unexpected failure executing ${state.label}: ${errorMessage(error)}`;
				warn(notice);
				return { kind: "error", notice };
			} finally {
				if (dfLoginState) finishDfLoginFiles(dfLoginState, runEnvironment.live, persist, warn);
				removePromptFile(promptFile);
			}

			// Both verdicts come back through the same retry budget. An agent that reports exhaustion on
			// stdout has exited 0, and used to be handled by rotating to a second CLI; with one agent the only
			// resilience left is this loop, so a verdict that says "try again" has to reach it.
			const outcome =
				result.exitCode !== 0 ? classifyFailure(state, result, progress) : classifyOutput(state, result, progress);
			if (outcome.kind !== "retry") return outcome;
			if (!(await waitOutRateLimit(state, retry, progress.lastErrorDetail))) {
				return { kind: "exhausted" };
			}
		}
		return { kind: "exhausted" };
	};

	return async function runPrompt(request: AgentPromptRequest): Promise<string> {
		const timeout = request.timeout ?? AGENT_DEFAULT_TIMEOUT;
		const kind = request.kind;
		// The one precondition the runner checks for itself. `df` resolves its own model and its own
		// accounts, so there is nothing else to resolve, and a notice about which harness to use is not a
		// thing this pipeline can act on.
		if (!dfAvailable(which)) {
			warn(NO_AGENT_NOTICE);
			return NO_AGENT_NOTICE;
		}

		const base: Record<string, string | undefined> = { ...env };
		// Set, not overwritten: a workflow that pins TERM to something narrower keeps it.
		if (base.TERM === undefined) base.TERM = DEFAULT_TERM;
		const runEnvironment: AttemptEnvironment = { base, live: { ...env } };

		const progress: ChainProgress = { lastErrorDetail: "", lastRotatable: "quota", sawNoOutput: false };
		const state: AttemptState = { label: DF_LABEL };
		const outcome = await runAttempt(state, runEnvironment, request.prompt, timeout, kind, progress);
		if (outcome.kind === "answer") return outcome.output;
		if (outcome.kind === "error") return outcome.notice;

		if (progress.sawNoOutput) {
			// Every attempt produced nothing usable. This is not quota - quota blocks gracefully with a
			// checkpoint - it is the pipeline silently succeeding on an empty shell, which must fail the
			// run so the workflow turns red rather than "passing" with vacuous comments.
			const notice = redact(
				`${AGENT_ERROR_PREFIX}: No usable agent output was produced by ${DF_LABEL} ` +
					`(${progress.lastErrorDetail || "empty output"})`,
			);
			warn(notice);
			await postAgentFailureNotice(
				{ io, board, warn },
				noticeTarget(request.checkpoint, environment.repository),
				notice,
			);
			throw new Error(notice);
		}

		if (progress.lastRotatable === "auth") {
			// Every credential in the chain was rejected. This is not quota - resuming the same stale
			// secrets would fail the same way - so there is no checkpoint and no `Blocked` label, just an
			// error the callers post before failing the run.
			const err = `${AUTH_FAILED_NOTICE} for every account ${DF_LABEL} holds: ${progress.lastErrorDetail || "no detail"}`;
			warn(redact(err));
			return err;
		}

		const err = `${QUOTA_EXHAUSTED_NOTICE} on every account ${DF_LABEL} holds: ${progress.lastErrorDetail || "no detail"}`;
		warn(err);

		const checkpoint = request.checkpoint;
		if (checkpoint) {
			await checkpointAndNotifyExhaustion(failurePort(), {
				// The Python defaulted the issue to 0 rather than skipping the notice, so a checkpoint
				// context without one still checkpointed and blocked something. Reproduced rather than
				// tidied: a resume reads that checkpoint, and quietly not writing one loses the work.
				issueNumber: checkpoint.issueNumber ?? 0,
				// The Python's quota path used a literal default here and did *not* fall back to
				// `GITHUB_REPOSITORY`, unlike the empty-output notice. Reproduced as it is.
				repo: checkpoint.repo || DEFAULT_REPOSITORY,
				isPr: checkpoint.isPr ?? false,
				branchName: checkpoint.branchName,
				completedSteps: checkpoint.completedSteps,
				errorDetail: err,
			});
		}
		return err;
	};
}

/**
 * Where a checkpoint context's notice is posted, when the caller named an item.
 *
 * The empty-output notice falls back to the run's own repository, which is what the Python did; the
 * quota path did not, and {@link agentPromptRunner} keeps that difference rather than papering over
 * it with one shared helper.
 */
function noticeTarget(checkpoint: Partial<Checkpoint> | undefined, fallbackRepo: string): NoticeTarget | undefined {
	if (!checkpoint?.issueNumber) return undefined;
	return {
		number: checkpoint.issueNumber,
		isPr: checkpoint.isPr ?? false,
		repo: checkpoint.repo || fallbackRepo,
	};
}
