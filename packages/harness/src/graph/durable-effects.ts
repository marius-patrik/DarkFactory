import { createHash, randomUUID } from "node:crypto";
import { open, mkdir, readFile, rename, stat, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { isDeepStrictEqual } from "node:util";

/**
 * Local-file durability boundary for graph effects. This serializes cooperating
 * processes on one host; distributed runners require a shared transactional
 * lock/store (for example a GitHub conditional ref or database transaction).
 */
export interface ObservedEffect<T> {
	value: T;
	/** An independently observed external identity, not model-provided prose. */
	evidence: string;
}

export type EffectRecord<T> =
	| { id: string; kind: string; status: "pending"; startedAt: string }
	| { id: string; kind: string; status: "completed"; observedAt: string; evidence: string; value: T };

export class IndeterminateEffectError extends Error {
	constructor(readonly effectId: string) {
		super(`External effect ${effectId} has an unresolved attempt; reconcile the remote operation before retrying`);
		this.name = "IndeterminateEffectError";
	}
}

export class StaleEffectError extends Error {
	constructor(readonly effectId: string) {
		super(`Previously committed effect ${effectId} no longer matches external observation`);
		this.name = "StaleEffectError";
	}
}

function errno(error: unknown): string | undefined {
	return (error as NodeJS.ErrnoException)?.code;
}

async function syncDirectory(path: string): Promise<void> {
	// A successful rename alone does not prove power-loss durability. Fail
	// closed rather than reporting a committed effect if dir fsync fails.
	const directory = await open(path, "r");
	try {
		await directory.sync();
	} finally {
		await directory.close();
	}
}

/** Write/rename with file and parent-directory synchronization. */
export async function replaceDurableJson(path: string, value: unknown): Promise<void> {
	const body = JSON.stringify(value);
	if (body === undefined) throw new Error("Cannot persist an undefined graph record");
	const dir = dirname(path);
	await mkdir(dir, { recursive: true });
	const temporary = `${path}.${randomUUID()}.tmp`;
	const handle = await open(temporary, "wx", 0o600);
	try {
		await handle.writeFile(`${body}\n`, "utf8");
		await handle.sync();
	} finally {
		await handle.close();
	}
	try {
		await rename(temporary, path);
		await syncDirectory(dir);
	} catch (error) {
		try {
			await unlink(temporary);
		} catch {
			/* rename may already have consumed it */
		}
		throw error;
	}
}

async function readOptionalJson<T>(path: string): Promise<T | undefined> {
	try {
		return JSON.parse(await readFile(path, "utf8")) as T;
	} catch (error) {
		if (errno(error) === "ENOENT") return undefined;
		throw error;
	}
}

function pidAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return errno(error) !== "ESRCH";
	}
}

/**
 * Exclusive per-key lock for local processes. A crashed process's lock may be
 * reclaimed only when its PID is confirmed dead; unknown ownership fails closed.
 * Lock acquisition is bounded, so active contention cannot hang forever.
 */
export async function withGraphFileLock<T>(
	directory: string,
	key: string,
	work: () => Promise<T>,
	options: { waitMs?: number } = {},
): Promise<T> {
	if (!/^[a-z0-9][a-z0-9-]{0,127}$/u.test(key)) throw new Error("Invalid lock key");
	await mkdir(directory, { recursive: true });
	const path = join(directory, `${key}.lock`);
	const cleanupPath = join(directory, `${key}.cleanup.lock`);
	const token = randomUUID();
	const until = Date.now() + (options.waitMs ?? 15_000);
	let acquired = false;
	while (!acquired) {
		try {
			const handle = await open(path, "wx", 0o600);
			try {
				await handle.writeFile(JSON.stringify({ pid: process.pid, token }), "utf8");
				await handle.sync();
				acquired = true;
			} finally {
				await handle.close();
			}
		} catch (error) {
			if (errno(error) !== "EEXIST") throw error;
			// A separate exclusive cleaner prevents two recovering actors from
			// removing one another's freshly acquired replacement lock.
			let cleanup;
			try {
				cleanup = await open(cleanupPath, "wx", 0o600);
			} catch (cleanError) {
				if (errno(cleanError) !== "EEXIST") throw cleanError;
			}
			if (cleanup) {
				try {
					let owner: { pid?: number; token?: string } | undefined;
					try {
						owner = await readOptionalJson(path);
					} catch (error) {
						// A competitor may still be writing the just-created lock.
						if (!(error instanceof SyntaxError)) throw error;
					}
					const age = Date.now() - (await stat(path)).mtimeMs;
					if (owner && Number.isSafeInteger(owner.pid) && owner.pid! > 0 && !pidAlive(owner.pid!)) {
						await unlink(path);
						await syncDirectory(directory);
					} else if (!owner && age > 5_000) {
						// Never steal an unidentifiable lock: its owner may be
						// paused between exclusive creation and writing identity.
						throw new Error(`Unowned graph lock ${path} requires operator reconciliation`);
					}
				} catch (error) {
					if (errno(error) !== "ENOENT") throw error;
				} finally {
					await cleanup.close();
					await unlink(cleanupPath);
				}
			}
			if (Date.now() >= until) throw new Error(`Graph lock contention timeout: ${path}`);
			await new Promise((resolve) => setTimeout(resolve, 25));
		}
	}
	try {
		return await work();
	} finally {
		// Fail closed if ownership was unexpectedly replaced.
		const owner = await readOptionalJson<{ token?: string }>(path);
		if (owner?.token !== token) throw new Error(`Graph lock ownership was lost: ${path}`);
		await unlink(path);
		await syncDirectory(directory);
	}
}

export class FileProductionEffectJournal {
	constructor(readonly directory: string) {}

	private path(id: string): string {
		if (!/^[0-9a-f]{64}$/u.test(id)) throw new Error(`Invalid graph effect identity: ${id}`);
		return join(this.directory, `${id}.df`);
	}

	async read<T>(id: string): Promise<EffectRecord<T> | undefined> {
		const record = await readOptionalJson<EffectRecord<T>>(this.path(id));
		if (record && (record.id !== id || !["pending", "completed"].includes(record.status))) {
			throw new Error(`Corrupt graph effect record: ${id}`);
		}
		return record;
	}

	async write<T>(record: EffectRecord<T>): Promise<void> {
		await replaceDurableJson(this.path(record.id), record);
	}

	async exclusive<T>(id: string, work: () => Promise<T>): Promise<T> {
		this.path(id);
		return withGraphFileLock(join(this.directory, "locks"), id, work);
	}
}

/** Effect IDs intentionally exclude the delivery event ID: replay must reuse the same identity. */
export function productionEffectId(
	runId: string,
	nodeId: string,
	iteration: number,
	kind: string,
	suffix = "",
): string {
	if (!runId || !nodeId || !Number.isSafeInteger(iteration) || iteration < 1 || !kind)
		throw new Error("Invalid deterministic graph effect identity");
	return createHash("sha256")
		.update(JSON.stringify([runId, nodeId, iteration, kind, suffix]))
		.digest("hex");
}

/**
 * Execute a mutation only after recording intent. On recovery the observer must
 * prove the exact external effect before completion. An ambiguous pending
 * operation is NEVER blindly executed again.
 *
 * Each adapter's observe must verify identity and expected targets (SHA, PR,
 * branch or comment marker), not simply that an arbitrary effect exists.
 */
export async function runObservedProductionEffect<T>(
	journal: FileProductionEffectJournal,
	id: string,
	kind: string,
	operations: {
		observe(): Promise<ObservedEffect<T> | undefined>;
		execute(): Promise<ObservedEffect<T>>;
	},
): Promise<EffectRecord<T> & { status: "completed" }> {
	if (!kind.trim()) throw new Error("Effect kind is required");
	return journal.exclusive(id, async () => {
		const previous = await journal.read<T>(id);
		if (previous && previous.kind !== kind) throw new Error(`Effect ${id} belongs to ${previous.kind}, not ${kind}`);
		let observed: ObservedEffect<T> | undefined;
		try {
			observed = await operations.observe();
		} catch (error) {
			// Once an effect has durable intent, inability to read external
			// truth cannot be converted into a normal node failure/retry.
			if (previous) throw new IndeterminateEffectError(id);
			throw error;
		}
		if (previous?.status === "completed") {
			if (
				!observed ||
				observed.evidence !== previous.evidence ||
				!previous.evidence.trim() ||
				!isDeepStrictEqual(observed.value, previous.value)
			)
				throw new StaleEffectError(id);
			return previous;
		}
		if (previous?.status === "pending" && !observed) throw new IndeterminateEffectError(id);
		if (!previous) {
			await journal.write({ id, kind, status: "pending", startedAt: new Date().toISOString() });
		}
		let result = observed;
		if (!result) {
			try {
				result = await operations.execute();
			} catch {
				throw new IndeterminateEffectError(id);
			}
		}
		if (!result.evidence?.trim()) throw new IndeterminateEffectError(id);
		// An adapter's execute() response is not authoritative proof of an
		// externally committed mutation. Re-observe through the independent
		// read boundary before committing the local journal.
		let confirmed: ObservedEffect<T> | undefined;
		try {
			confirmed = await operations.observe();
		} catch {
			throw new IndeterminateEffectError(id);
		}
		if (!confirmed || confirmed.evidence !== result.evidence ||
			!isDeepStrictEqual(confirmed.value, result.value))
			throw new IndeterminateEffectError(id);
		const record: EffectRecord<T> & { status: "completed" } = {
			id,
			kind,
			status: "completed",
			value: result.value,
			evidence: result.evidence,
			observedAt: new Date().toISOString(),
		};
		try {
			await journal.write(record);
		} catch {
			// The remote may have committed while the local acknowledgement
			// failed; the next actor must reconcile rather than retry.
			throw new IndeterminateEffectError(id);
		}
		return record;
	});
}
