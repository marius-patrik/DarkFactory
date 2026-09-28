import { readFileSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

/**
 * The quota checkpoint the agent runner leaves behind when a run exhausts its quota.
 *
 * A checkpoint is a record of a pause, not a statement about the present. The project automation
 * reads the same file so a reopen cannot wipe `Blocked` resume state - an issue whose agent stopped
 * for quota must not re-enter the ready queue the moment somebody comments on it.
 *
 * The age bound is the load-bearing part. `remove_checkpoint` is reachable only from an explicit
 * resume, and the quota-resume sweep is the only other thing that clears these, so without a bound
 * one quota exhaustion in a persisted state directory pinned its issue to `Blocked` forever, and the
 * board projection re-applied it on every later event - rolling a live issue backward from a stale
 * artefact. The bound treats an aged checkpoint as abandoned rather than pending, so the board
 * follows the repository instead of the artefact.
 */

/** The file the agent runner writes on exhaustion, in the same state directory. */
export const CHECKPOINT_FILENAME = ".antigravity_checkpoint.json";

/** How long a checkpoint keeps an issue `Blocked` before it is treated as abandoned. */
export const DEFAULT_CHECKPOINT_MAX_AGE_SECONDS = 86_400;

/**
 * The exact shape the runner writes: whole seconds, `Z` suffix, no offset and no fraction.
 *
 * Anything else is treated as unparseable rather than handed to a lenient date parser, because the
 * difference between "the runner wrote this" and "something else wrote this" decides whether a live
 * checkpoint is believed.
 */
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

/** The directories a checkpoint may live in, in the order they are consulted. */
const CHECKPOINT_DIRECTORIES = ["STATE_DIR", "GITHUB_WORKSPACE"] as const;

/**
 * The age bound, overridable for operators whose quota horizon is longer than a day.
 *
 * An unparseable override falls back to the default rather than failing the run: a typo in an
 * operator's environment should not stop the board from reconciling, and the default is the
 * documented behaviour anyway.
 */
export function checkpointMaxAgeSeconds(env: Readonly<Record<string, string | undefined>> = process.env): number {
	const declared = env.DF_CHECKPOINT_MAX_AGE_SECONDS;
	if (declared === undefined || declared.trim() === "") return DEFAULT_CHECKPOINT_MAX_AGE_SECONDS;
	const parsed = Number.parseInt(declared, 10);
	return Number.isNaN(parsed) ? DEFAULT_CHECKPOINT_MAX_AGE_SECONDS : parsed;
}

/** The checkpoint payload, in the fields that decide whether it covers an issue. */
export interface Checkpoint {
	readonly issue_number?: number;
	readonly timestamp?: string;
	readonly [key: string]: unknown;
}

/**
 * The age of a checkpoint in seconds, or null when it cannot be established at all.
 *
 * The `timestamp` the runner writes is preferred. A checkpoint with a missing or unparseable one is
 * judged on the file's mtime instead, so it is weighed against evidence that exists rather than
 * trusted indefinitely - and a file written moments ago with no timestamp still reads as current,
 * which is what keeps the reopen guarantee intact.
 *
 * Negative ages count as zero. A timestamp written ahead of this host is clock skew, and treating it
 * as expired would release a live checkpoint and put a quota-blocked issue back in the ready queue;
 * treating it as current costs nothing, because the bound still expires it once the skew passes.
 */
export function checkpointAgeSeconds(path: string, data: unknown, now: number = Date.now()): number | null {
	if (data && typeof data === "object" && !Array.isArray(data)) {
		const stamp = (data as Checkpoint).timestamp;
		if (typeof stamp === "string" && stamp.trim() !== "" && TIMESTAMP_PATTERN.test(stamp.trim())) {
			const written = Date.parse(stamp.trim());
			if (!Number.isNaN(written)) return Math.max(0, (now - written) / 1000);
		}
	}
	try {
		return Math.max(0, (now - statSync(path).mtimeMs) / 1000);
	} catch {
		return null;
	}
}

/** Every candidate checkpoint path, deduplicated, in the order they are consulted. */
function checkpointPaths(env: Readonly<Record<string, string | undefined>>): string[] {
	const paths: string[] = [];
	const seen = new Set<string>();
	const declared = CHECKPOINT_DIRECTORIES.map((key) => env[key]).filter((value): value is string => Boolean(value));
	for (const directory of [...declared, "."]) {
		const path = isAbsolute(directory)
			? join(directory, CHECKPOINT_FILENAME)
			: resolve(String(directory), CHECKPOINT_FILENAME);
		if (seen.has(path)) continue;
		seen.add(path);
		paths.push(path);
	}
	return paths;
}

/**
 * Whether a current quota checkpoint exists for this issue.
 *
 * The checkpoint file is written by the agent runner on exhaustion; the project automation reads the
 * same path so a reopen cannot wipe `Blocked` resume state. A checkpoint older than the bound is
 * abandoned rather than pending, and does not hold the issue.
 *
 * A file that names this issue but whose age cannot be read at all releases it. Holding an issue
 * `Blocked` on unreadable evidence is the exact failure the bound exists to prevent, so the burden
 * of proof is on the checkpoint.
 */
export function checkpointCoversIssue(
	issueNumber: number | null | undefined,
	options: {
		readonly env?: Readonly<Record<string, string | undefined>>;
		readonly now?: number;
		readonly maxAgeSeconds?: number;
	} = {},
): boolean {
	if (!issueNumber) return false;
	const env = options.env ?? process.env;
	const now = options.now ?? Date.now();
	const maxAge = options.maxAgeSeconds ?? checkpointMaxAgeSeconds(env);

	for (const path of checkpointPaths(env)) {
		let data: unknown;
		try {
			data = JSON.parse(readFileSync(path, "utf8")) as unknown;
		} catch {
			continue;
		}
		if (!data || typeof data !== "object" || Array.isArray(data)) continue;
		if ((data as Checkpoint).issue_number !== issueNumber) continue;
		const age = checkpointAgeSeconds(path, data, now);
		if (age === null) continue;
		if (age <= maxAge) return true;
	}
	return false;
}
