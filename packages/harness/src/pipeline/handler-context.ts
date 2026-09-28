/**
 * What every ported pipeline handler is given: the GitHub port, the agent, and the environment.
 *
 * The Python handlers reach for three things the pipeline does not own - the `gh` CLI, `df run` as
 * a subprocess, and `os.environ`. Porting them as free functions would mean each handler re-reading
 * the process environment and re-deriving its own agent invocation, which is the indirection this
 * module exists to remove. Handlers take a {@link PipelineContext} instead, so the two of those
 * that are genuinely shared - the agent request and the environment contract - are stated once.
 *
 * Environment variable names and defaults are a contract with the workflow YAML that sets them, so
 * they are read here through {@link pipelineEnvironment} and nowhere else.
 */

import type { Checkpoint } from "./checkpoint.ts";
import type { AgentDispatchPayload } from "./dispatch.ts";
import { DEFAULT_REPOSITORY } from "./dispatch.ts";
import type { AreaTaxonomy } from "./labels.ts";
import type { PipelineIo } from "./pipeline-io.ts";

/** `run_agent_prompt`'s default print-mode timeout, as a Go duration string. */
export const AGENT_DEFAULT_TIMEOUT = "5m0s";

/** The timeout a plan gets: a plan spans several files and is the longest prompt before implementation. */
export const PLAN_TIMEOUT = "15m0s";

/** The timeout a review gets, shared by self-review and the plan-alignment gate. */
export const REVIEW_TIMEOUT = "10m0s";

/**
 * One `run_agent_prompt` call, as the handlers ask for it.
 *
 * The Python signature is positional (`prompt`, then keyword-only `timeout`, `checkpoint_context`,
 * `kind`); an object keeps the optional arguments from being positional, which is the only place
 * this port is deliberately not a transliteration.
 */
export interface AgentPromptRequest {
	/** The instruction to run. */
	prompt: string;
	/** The semantic task kind, forwarded to `df`; omission preserves `df`'s own inference. */
	kind: string;
	/** The print-mode timeout as a Go duration string; {@link AGENT_DEFAULT_TIMEOUT} when absent. */
	timeout?: string | undefined;
	/**
	 * What the run has completed so far, so a run that stops part-way can be resumed rather than
	 * started over. The Python passed this as `checkpoint_context` and it becomes a `Checkpoint`.
	 */
	checkpoint?: Partial<Checkpoint> | undefined;
}

/**
 * Runs one prompt against the agent and returns its answer text.
 *
 * @param request - The prompt, its kind, and its timeout and checkpoint context.
 * @returns The agent's text, or a message prefixed `[DarkFactory Agent Execution Error]`.
 */
export type RunAgentPrompt = (request: AgentPromptRequest) => Promise<string>;

/**
 * A run that has already posted its failure notice and must now end non-zero.
 *
 * Ported from `fail_agent_run`, which raised `SystemExit(1)` after the notice went out. A posted
 * `[Execution Error]` comment used to be followed by a normal return, so the container exited 0 and
 * the failure reporter saw success and filed nothing. This carries the same demand without choosing
 * an exit code: turning it into a process exit belongs to the entrypoint, which is the one place
 * that knows what exit status a run should report.
 */
export class AgentRunFailure extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AgentRunFailure";
	}
}

/** The environment a pipeline run reads, as `os.environ` presents it. */
export type PipelineEnv = Readonly<Record<string, string | undefined>>;

/**
 * The environment contract the pipeline shares with its workflow YAML.
 *
 * The names and defaults are the Python's, unchanged, because a renamed variable or a changed
 * default is a silent behaviour change in a pipeline that reads them from YAML.
 */
export interface PipelineEnvironment {
	/** `GITHUB_WORKSPACE`, defaulting to `/workspace`; where the working copy and checkpoint live. */
	workspaceDir: string;
	/** `STATE_DIR`, defaulting to the workspace; where run state lives. */
	stateDir: string;
	/** `GITHUB_REPOSITORY`, defaulting to the pipeline's own repository. */
	repository: string;
}

/**
 * Reads the pipeline's environment contract.
 *
 * @param env - The environment to read; defaults to `process.env`.
 * @returns The resolved workspace, state and repository.
 */
export function pipelineEnvironment(env: PipelineEnv = process.env): PipelineEnvironment {
	const workspaceDir = env.GITHUB_WORKSPACE ?? "/workspace";
	return {
		workspaceDir,
		stateDir: env.STATE_DIR ?? workspaceDir,
		repository: env.GITHUB_REPOSITORY ?? DEFAULT_REPOSITORY,
	};
}

/** The dependencies and configuration a ported handler performs its work with. */
export interface PipelineContext {
	/** The GitHub I/O. */
	io: PipelineIo;
	/** Runs one agent prompt. */
	runAgentPrompt: RunAgentPrompt;
	/** The repository slug handlers default to when a caller names none. */
	repo: string;
	/** The branch pull requests are opened against, from the repository's declaration. */
	developmentBranch: string;
	/** The repository's area taxonomy, which `classifyTypeAndArea` needs. */
	taxonomy: AreaTaxonomy;
	/**
	 * Ends the run non-zero, after a failure notice has been posted.
	 *
	 * @param message - Why the run is ending, already posted as a comment.
	 */
	fail: (message: string) => never;
	/** Writes a progress line, as the Python's `print` did. */
	say: (message: string) => void;
	/** Writes a warning or an error, as the Python's `print(..., file=sys.stderr)` did. */
	warn: (message: string) => void;
}

/** The pieces of a context a caller supplies, with the rest defaulted to the Python's behaviour. */
export interface PipelineContextOptions {
	/** The GitHub I/O the handler performs through. */
	io: PipelineIo;
	/** Runs one agent prompt. */
	runAgentPrompt: RunAgentPrompt;
	/** The repository's area taxonomy. */
	taxonomy: AreaTaxonomy;
	/** The repository slug; defaults to the environment's. */
	repo?: string;
	/** The branch pull requests open against; defaults to `main`, as a repository with no manifest does. */
	developmentBranch?: string;
	/** The environment the repository slug and anything else is read from; defaults to `process.env`. */
	env?: PipelineEnv;
	/** Writes a progress line; defaults to the console. */
	say?: (message: string) => void;
	/** Writes a warning or an error; defaults to the console. */
	warn?: (message: string) => void;
}

/**
 * Builds a handler's context, defaulting everything the Python read from the environment or the
 * console.
 *
 * @param options - The context's required and optional parts.
 * @returns The context.
 */
export function pipelineContext(options: PipelineContextOptions): PipelineContext {
	const environment = pipelineEnvironment(options.env);
	const say = options.say ?? ((message: string) => console.log(message));
	const warn = options.warn ?? ((message: string) => console.error(message));
	return {
		io: options.io,
		runAgentPrompt: options.runAgentPrompt,
		repo: options.repo ?? environment.repository,
		developmentBranch: options.developmentBranch ?? "main",
		taxonomy: options.taxonomy,
		fail: (message: string) => {
			warn(message);
			throw new AgentRunFailure(message);
		},
		say,
		warn,
	};
}

/** The `repository_dispatch` client payload a stage hands to itself. */
export type { AgentDispatchPayload };
