import { mkdir, open, readFile, stat, unlink } from "node:fs/promises";
import { dirname } from "node:path";

const localQueues = new Map<string, Promise<unknown>>();

/** Options for configuring file lock behavior.
 * @property staleMs - Time in milliseconds after which a lock is considered stale. Defaults to 30,000 ms.
 * @property timeoutMs - Maximum time to wait for acquiring the lock before giving up. Defaults to 10,000 ms.
 * @property retryMs - Delay between lock acquisition attempts in milliseconds. Defaults to 10 ms.
 */
export interface FileLockOptions {
	/**
 * Maximum age of an existing lock file before it is considered stale.
 * @default 30000
 */
staleMs?: number;
	/**
 * How long to wait for the lock before timing out.
 * @default 10000
 */
timeoutMs?: number;
	/**
 * Interval between attempts to acquire the lock.
 * @default 10
 */
retryMs?: number;
}

function ownerIsAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === "EPERM";
	}
}

async function recoverStaleLock(path: string, staleMs: number): Promise<boolean> {
	try {
		const [metadata, info] = await Promise.all([readFile(path, "utf8"), stat(path)]);
		const pid = Number((JSON.parse(metadata) as { pid?: unknown }).pid);
		const oldEnough = Date.now() - info.mtimeMs >= staleMs;
		if (!oldEnough) return false;
		if (Number.isSafeInteger(pid) && pid > 0 && ownerIsAlive(pid)) return false;
		if (oldEnough) {
			await unlink(path).catch(() => undefined);
			return true;
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
	}
	return false;
}

async function acquire(path: string, options: FileLockOptions): Promise<() => Promise<void>> {
	const staleMs = options.staleMs ?? 30_000;
	const timeoutMs = options.timeoutMs ?? 10_000;
	const retryMs = options.retryMs ?? 10;
	const started = Date.now();
	const token = crypto.randomUUID();
	while (true) {
		try {
			const handle = await open(path, "wx", 0o600);
			await handle.writeFile(JSON.stringify({ pid: process.pid, token, createdAt: Date.now() }));
			await handle.close();
			return async () => {
				try {
					const current = JSON.parse(await readFile(path, "utf8")) as { token?: unknown };
					if (current.token === token) await unlink(path);
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
				}
			};
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			// Windows can report EPERM, rather than EEXIST, while another process
			// is creating or deleting the lock file. Treat that brief state as contention.
			if (code !== "EEXIST" && !(process.platform === "win32" && code === "EPERM")) throw error;
			if (await recoverStaleLock(path, staleMs)) continue;
			if (Date.now() - started >= timeoutMs) throw new Error(`Timed out waiting for storage lock: ${path}`);
			await Bun.sleep(retryMs);
		}
	}
}

/**
 * Executes a task with an exclusive file lock, ensuring only one process modifies the file at a time.
 *
 * @param path - Path to the lock file.
 * @param task - Async function containing the work to perform while the lock is held.
 * @param options - Optional configuration for stale detection, timeouts, and retry intervals.
 * @returns The result of the provided task.
 */
export function withFileLock<T>(path: string, task: () => Promise<T>, options: FileLockOptions = {}): Promise<T> {
	const previous = localQueues.get(path) ?? Promise.resolve();
	const current = (async () => {
		await previous.catch(() => undefined);
		await mkdir(dirname(path), { recursive: true });
		const release = await acquire(path, options);
		try { return await task(); }
		finally { await release(); }
	})();
	const settled = current.catch(() => undefined);
	localQueues.set(path, settled);
	void settled.finally(() => {
		if (localQueues.get(path) === settled) localQueues.delete(path);
	});
	return current;
}
