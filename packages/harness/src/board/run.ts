/**
 * What a board run knows about its own budget, and how it fails.
 *
 * There is no per-run mutation cap. A reconciliation sweep may write as many items as the live
 * GraphQL quota allows; the only write gate is the reserve below it, so a long run finishes the work
 * it was given instead of being truncated at an arbitrary count and leaving the board half-updated.
 */

/** Phrases that mean GitHub is refusing further work, across REST, GraphQL and `gh`. */
const RATE_LIMIT_INDICATORS = [
	"unknown owner type",
	"rate limit",
	"rate_limit",
	"too many requests",
	"secondary rate limit",
	"was submitted too quickly",
	"quota exceeded",
];

/** Why a run stops writing, and what it records. */
interface BoardRunOptions {
	/** The environment the thresholds are read from. */
	readonly env?: Readonly<Record<string, string | undefined>>;
	/** Live GraphQL points below which every mutation pauses. */
	readonly quotaMinimum?: number;
	/** Live GraphQL points below which bulk reconciliation pauses to protect real-time events. */
	readonly reconciliationThreshold?: number;
	/** Where ordinary progress reporting goes. */
	readonly stdout?: (line: string) => void;
	/** Where notices and failures go. */
	readonly stderr?: (line: string) => void;
}

/** A `gh` invocation that exited non-zero, carrying whatever the command printed. */
export class CommandFailure extends Error {
	readonly #stderr: string | Uint8Array | undefined;
	readonly #stdout: string | Uint8Array | undefined;

	constructor(message: string, stderr?: string | Uint8Array, stdout?: string | Uint8Array) {
		super(message);
		this.name = "CommandFailure";
		this.#stderr = stderr;
		this.#stdout = stdout;
	}

	/** The command's standard error, as text. */
	get stderr(): string | undefined {
		return asText(this.#stderr);
	}

	/** The command's standard output, as text. */
	get stdout(): string | undefined {
		return asText(this.#stdout);
	}
}

/** An error from a transport that carries a response body, which usually explains the failure. */
export class BoardRequestError extends Error {
	constructor(
		readonly status: number,
		readonly body: string,
		readonly request: string,
	) {
		super(`HTTP ${status} on ${request}: ${body}`);
		this.name = "BoardRequestError";
	}
}

/** An error from a GraphQL call, which carries the messages GitHub returned. */
export class GraphqlError extends Error {
	constructor(
		message: string,
		readonly errors: readonly { readonly message?: string }[],
	) {
		super(message);
		this.name = "GraphqlError";
	}
}

/** Decoded command output, whether it arrived as text or as bytes. */
function asText(captured: string | Uint8Array | undefined): string | undefined {
	if (captured === undefined) return undefined;
	return typeof captured === "string" ? captured : new TextDecoder().decode(captured);
}

/** The message an error carries, whichever kind it is. */
function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** Output a failure captured, preferring standard error and falling back to standard output. */
function capturedOutput(error: unknown): string | undefined {
	if (error instanceof CommandFailure) return error.stderr ?? error.stdout;
	return undefined;
}

/**
 * An error rendered together with the output that explains it.
 *
 * The first captured line is included because `str(exc)` alone names the command and the exit status
 * and nothing else - "returned non-zero exit status 1" says a command failed, and "unknown owner
 * type" says why. An error with no captured output renders as itself, so it never gains empty
 * parentheses.
 */
export function describeFailure(error: unknown): string {
	const message = messageOf(error);
	const captured = capturedOutput(error);
	const first = captured
		?.split("\n")
		.map((line) => line.trim())
		.find((line) => line !== "");
	return first ? `${message} (${first})` : message;
}

/** Whether an error means a rate limit, quota exhaustion or throttling. */
export function isRateLimited(error: unknown): boolean {
	const text = describeFailure(error).toLowerCase();
	return RATE_LIMIT_INDICATORS.some((indicator) => text.includes(indicator));
}

/** An integer environment override, or the fallback when it is absent or not a whole number. */
function integerEnv(raw: string | undefined, fallback: number): number {
	if (raw === undefined || raw.trim() === "") return fallback;
	const parsed = Number.parseInt(raw, 10);
	return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * One run's board writes: what it has done, what it may still do, and what failed.
 *
 * State lives here rather than in module globals so two runs in one process - a test's, or a
 * long-lived caller driving several events - cannot see each other's quota, and so a run's outcome
 * is a value that can be asserted on instead of a side effect.
 */
export class BoardRun {
	/** Live GraphQL points below which every mutation pauses. */
	readonly quotaMinimum: number;
	/** Live GraphQL points below which bulk reconciliation pauses. */
	readonly reconciliationThreshold: number;
	/** Board writes completed in this run, retained for operational observability only. */
	mutationsPerformed = 0;
	/** Whether a rate limit has been seen, after which this run only reports. */
	rateLimited = false;
	/** Remaining GraphQL points, as last reported by GitHub's rate-limit header. */
	graphqlRemaining: number | null = null;
	/** Board writes that failed during this run. A non-empty list fails the run. */
	readonly failures: string[] = [];

	readonly #stdout: (line: string) => void;
	readonly #stderr: (line: string) => void;

	constructor(options: BoardRunOptions = {}) {
		const env = options.env ?? process.env;
		this.quotaMinimum = options.quotaMinimum ?? integerEnv(env.PROJECT_QUOTA_MINIMUM, 50);
		this.reconciliationThreshold =
			options.reconciliationThreshold ?? integerEnv(env.PROJECT_QUOTA_RECONCILIATION_THRESHOLD, 1000);
		this.#stdout = options.stdout ?? ((line) => console.log(line));
		this.#stderr = options.stderr ?? ((line) => console.error(line));
	}

	/** Reports progress. */
	say(message: string): void {
		this.#stdout(message);
	}

	/** Reports something the operator should know that is not a failure. */
	notice(message: string): void {
		this.#stderr(`Notice: ${message}`);
	}

	/** Records a board failure. A non-empty failure list is what makes a run exit non-zero. */
	fail(message: string): void {
		this.failures.push(message);
		this.#stderr(`Error: ${message}`);
	}

	/** Stops writing for the rest of the run. */
	markRateLimited(message?: string): void {
		this.rateLimited = true;
		if (message) this.#stderr(`Notice: ${message}; pausing.`);
	}

	/** Records that a mutation was performed. */
	recordMutation(): void {
		this.mutationsPerformed += 1;
	}

	/**
	 * Whether this run may write.
	 *
	 * A rate limit stops everything. Otherwise the live reserve is the only gate: at or below it,
	 * writes pause so the remaining quota is left for whoever needs it.
	 */
	canMutate(): boolean {
		if (this.rateLimited) return false;
		return this.graphqlRemaining === null || this.graphqlRemaining > this.quotaMinimum;
	}

	/**
	 * Whether a bulk reconciliation is safe to start.
	 *
	 * A sweep spends an order of magnitude more quota than a single event, so it holds back a much
	 * higher reserve. Skipping a sweep costs nothing - the next one sees the same items - whereas
	 * spending the reserve costs every real-time event that follows.
	 */
	canReconcile(): boolean {
		if (this.rateLimited) return false;
		if (this.graphqlRemaining !== null && this.graphqlRemaining < this.reconciliationThreshold) {
			this.#stderr(
				`Notice: GraphQL quota below reserve (${this.graphqlRemaining} < ${this.reconciliationThreshold}); ` +
					"skipping bulk reconciliation to preserve quota for real-time events.",
			);
			return false;
		}
		return this.canMutate();
	}
}
