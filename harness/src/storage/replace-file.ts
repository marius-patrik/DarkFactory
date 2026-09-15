import { rename } from "node:fs/promises";

/** Error codes Windows reports while another process holds the target open (a reader or antivirus scan). */
const TRANSIENT_CODES = new Set(["EPERM", "EACCES", "EBUSY"]);

/** Options for replaceFile operation.
 * @property rename - Optional custom rename function for testing.
 * @property delaysMs - Sequence of delays in milliseconds between retries.
 * @property sleep - Optional custom sleep implementation for testing.
 */
export interface ReplaceFileOptions {
	/** Rename implementation; injectable for tests. */
	rename?: (from: string, to: string) => Promise<void>;
	/** Wait before each retry, in milliseconds. The default totals a little over 3 seconds. */
	delaysMs?: readonly number[];
	/** Sleep implementation; injectable for tests. */
	sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_DELAYS_MS = [5, 10, 20, 40, 80, 120, 160, 200, 250, 300, 400, 500, 500, 500];

/**
 * Atomically replaces `target` with `temporary` (a rename), retrying while the target is briefly locked.
 *
 * On Windows a rename over a file fails with EPERM/EACCES/EBUSY when any other process has the target open,
 * even only for reading. Concurrent df processes read the shared state files (limits, usage, credentials) without
 * the writer's lock, so a writer must wait for readers to close the file instead of failing the whole run.
 *
 * @throws The last rename error when the target stays locked through every retry, or at once for any other error.
 */
export async function replaceFile(temporary: string, target: string, options: ReplaceFileOptions = {}): Promise<void> {
	const doRename = options.rename ?? rename;
	const delays = options.delaysMs ?? DEFAULT_DELAYS_MS;
	const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
	for (let attempt = 0; ; attempt++) {
		try {
			await doRename(temporary, target);
			return;
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (!code || !TRANSIENT_CODES.has(code) || attempt >= delays.length) throw error;
			await sleep(delays[attempt]!);
		}
	}
}
