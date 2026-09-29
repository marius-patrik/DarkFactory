/**
 * How the pipeline invokes the agent.
 *
 * There is exactly one agent and it is `df`. This replaces a "harness registry" — a table of nine
 * coding-agent CLIs with a per-entry argv template, credential names, install instructions and a
 * configurable fallback order — which described a capability the pipeline never had. `df` owns its own
 * model choice, its own accounts and its own in-flight failover, so there was nothing for the runner to
 * choose between, and the ladder it walked had one rung.
 *
 * What the runner still owns is the part `df` cannot: writing the prompt somewhere it can be read, and
 * retrying the invocation. Model selection and account rotation are `df`'s, and a comment or a notice
 * that enumerates a "chain" of harnesses describes a chain that does not exist.
 */

/** The agent binary. Resolved on PATH, so a wrapper or a relocated install works. */
export const DF_BINARY = "df";

/** One invocation of the agent. */
export interface DfInvocation {
	/** Absolute path of the file the prompt is written to. */
	promptFile: string;
	/** The kind of run, which selects the agent's own workflow. */
	kind: string;
	/**
	 * How long the agent may take, as a duration string such as `5m0s`.
	 *
	 * A string, not a count of seconds: the value is handed to `df` verbatim, and a duration the agent
	 * parses is one fewer thing to get wrong here. `Number("5m0s")` is `NaN`, which is how a
	 * well-intended conversion hands the agent a timeout that is not a timeout.
	 */
	timeout: string;
}

/**
 * The argument vector for one agent run.
 *
 * `--json` because the runner parses the event stream into the final answer text. The prompt travels by
 * file so a long prompt never meets an argument-length limit.
 */
export function dfRunArgv(invocation: DfInvocation): string[] {
	return [
		DF_BINARY,
		"run",
		"--json",
		"--prompt-file",
		invocation.promptFile,
		"--kind",
		invocation.kind,
		"--timeout",
		invocation.timeout,
	];
}

/** Whether the agent is on PATH, which is the only precondition the runner checks for itself. */
export function dfAvailable(which: (binary: string) => string | null, binary: string = DF_BINARY): boolean {
	return which(binary) !== null;
}

/** How the agent is described in a notice, which names the agent and never a credential. */
export const DF_LABEL = "`df`";
