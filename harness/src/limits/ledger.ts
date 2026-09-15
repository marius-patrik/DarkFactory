import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Candidate } from "../failover.ts";
import { withFileLock } from "../storage/file-lock.ts";
import { replaceFile } from "../storage/replace-file.ts";
import { limitKey, type LimitEntry } from "./types.ts";

/** Represents the JSON structure of the limits file. */
interface LedgerFile { version: 1; entries: Record<string, LimitEntry> }
/** Creates an empty LedgerFile with version 1 and no entries. */
const empty = (): LedgerFile => ({ version: 1, entries: {} });

/** Checks if a value conforms to the LimitEntry shape. */
function valid(value: unknown): value is LimitEntry {
	if (!value || typeof value !== "object") return false;
	const item = value as Record<string, unknown>;
	return typeof item.provider === "string" && typeof item.account === "string" && typeof item.model === "string" &&
		["rate", "daily", "window", "monthly", "overload", "auth"].includes(String(item.type)) &&
		typeof item.observedAt === "number" && typeof item.resetAt === "number" && Number.isFinite(item.resetAt) &&
		["header", "body", "rule", "default", "migration", "manual"].includes(String(item.source));
}

/**
 * Persists and queries rate-limit entries for candidates.
 *
 * The ledger stores per-provider/account/model limit entries in a JSON file
 * under the home directory and uses file locking for concurrent access.
 */
export class LimitLedger {
	/** Path to the `limits.json` file that stores the ledger entries. */
	readonly path: string;
	/** Path to the lock file used to serialize writes. */
	readonly lockPath: string;
	/** Path to the audit log file (`limits-audit.jsonl`). */
	readonly auditPath: string;
	/** Path to the quota file used for migration. */
private readonly quotaPath: string;
	/** Fallback TTL (ms) for migrated entries without reset time. */
private readonly fallbackTtlMs: number;
	/** Predicate deciding whether to persist an entry; defaults to always true. */
private readonly persist: (candidate: Candidate) => boolean;

	/**
	 * Creates a ledger rooted at `home`.
	 * @param home - Home directory used to locate the ledger and quota files.
	 * @param options - Optional configuration.
	 * @param options.fallbackTtlMs - Fallback time-to-live in milliseconds for
	 *   migrated quota entries without a reset time.
	 * @param options.persist - Predicate that decides whether an entry should be
	 *   persisted; defaults to always persisting.
	 */
	constructor(home: string, options: { fallbackTtlMs?: number; persist?: (candidate: Candidate) => boolean } = {}) {
		this.path = join(home, "limits.json");
		this.lockPath = `${this.path}.lock`;
		this.auditPath = join(home, "limits-audit.jsonl");
		this.quotaPath = join(home, "quota.json");
		this.fallbackTtlMs = options.fallbackTtlMs ?? 15 * 60_000;
		this.persist = options.persist ?? (() => true);
	}

	/** Reads the existing ledger file if present and valid; returns undefined if not found. */
private async readExisting(): Promise<LedgerFile | undefined> {
		try {
			const raw = JSON.parse(await readFile(this.path, "utf8")) as { version?: unknown; entries?: unknown };
			if (raw.version !== 1 || !raw.entries || typeof raw.entries !== "object" || !Object.values(raw.entries).every(valid)) throw new Error("Invalid limits file");
			return { version: 1, entries: raw.entries as Record<string, LimitEntry> };
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
				if (error instanceof SyntaxError) throw new Error("Invalid limits file JSON");
				throw error;
			}
		}
		return undefined;
	}

	/** Retrieves the ledger, reading or migrating as needed. */
private async readRaw(): Promise<LedgerFile> {
		const existing = await this.readExisting();
		if (existing) return existing;
		return withFileLock(this.lockPath, async () => {
			const afterLock = await this.readExisting();
			if (afterLock) return afterLock;
			const migrated = await this.migrateQuota();
			if (Object.keys(migrated.entries).length > 0) await this.write(migrated);
			return migrated;
		});
	}

	/** Migrates legacy quota entries into the ledger format. */
private async migrateQuota(): Promise<LedgerFile> {
		let quota: { entries?: Record<string, Record<string, unknown>> };
		try { quota = JSON.parse(await readFile(this.quotaPath, "utf8")) as typeof quota; }
		catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty(); throw error; }
		const file = empty();
		for (const old of Object.values(quota.entries ?? {})) {
			if (typeof old.provider !== "string" || typeof old.account !== "string" || typeof old.model !== "string") continue;
			const observedAt = typeof old.markedAt === "number" ? old.markedAt : Date.now();
			const kind = String(old.kind);
			const type: LimitEntry["type"] = kind === "rate_limited" ? "rate" : kind === "auth" ? "auth" : kind === "transient" ? "overload" : "daily";
			const entry: LimitEntry = { provider: old.provider, account: old.account, model: old.model, type, observedAt, resetAt: typeof old.resetAt === "number" ? old.resetAt : observedAt + this.fallbackTtlMs, source: "migration", remaining: 0, ...(typeof old.pool === "string" ? { pool: old.pool } : {}) };
			file.entries[limitKey(entry)] = entry;
		}
		return file;
	}

	/** Writes the ledger file atomically, ensuring directory existence. */
private async write(file: LedgerFile): Promise<void> {
		await mkdir(dirname(this.path), { recursive: true });
		const temporary = `${this.path}.${process.pid}.${crypto.randomUUID()}.tmp`;
		try { await writeFile(temporary, `${JSON.stringify(file, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" }); await replaceFile(temporary, this.path); }
		catch (error) { await Bun.file(temporary).delete().catch(() => undefined); throw error; }
	}

	/** Applies a modification function to the ledger under a file lock. */
private modify(fn: (file: LedgerFile) => void): Promise<void> {
		return withFileLock(this.lockPath, async () => { const file = await this.readExisting() ?? await this.migrateQuota(); fn(file); await this.write(file); });
	}

	/**
	 * Returns all limit entries sorted by reset time ascending.
	 */
	async list(): Promise<LimitEntry[]> { return Object.values((await this.readRaw()).entries).sort((a, b) => a.resetAt - b.resetAt); }

	/**
	 * Persists the given limit entries, keeping only those that pass
	 * `options.persist`.
	 * @param entries - The limit entries to record.
	 */
	record(entries: readonly LimitEntry[]): Promise<void> {
		const kept = entries.filter((entry) => this.persist(entry));
		if (kept.length === 0) return Promise.resolve();
		return this.modify((file) => { for (const entry of kept) file.entries[limitKey(entry)] = entry; });
	}

	/**
	 * Returns entries for `candidate` that have not yet reset and are
	 * optionally scoped to the given pools.
	 * @param candidate - The candidate to check.
	 * @param now - Current timestamp in milliseconds.
	 * @param pools - Pool names to consider; empty means all pools.
	 */
	async forCandidate(candidate: Candidate, now = Date.now(), pools: readonly string[] = []): Promise<LimitEntry[]> {
		return (await this.list()).filter((entry) => entry.provider === candidate.provider && entry.account === candidate.account && entry.resetAt > now && (entry.model === candidate.model || (!!entry.pool && pools.includes(entry.pool))));
	}

	/**
	 * Returns entries for `candidate` that are currently blocking, i.e.
	 * where the remaining budget is exhausted considering `reserve`.
	 * @param candidate - The candidate to check.
	 * @param now - Current timestamp in milliseconds.
	 * @param reserve - Optional reserved budget to subtract.
	 * @param pools - Pool names to consider.
	 */
	async blocking(candidate: Candidate, now = Date.now(), reserve: { requests?: number; tokens?: number } = {}, pools: readonly string[] = []): Promise<LimitEntry[]> {
		return (await this.forCandidate(candidate, now, pools)).filter((entry) => entry.remaining === undefined || entry.remaining <= (entry.dimension === "requests" ? reserve.requests ?? 0 : entry.dimension === "tokens" ? reserve.tokens ?? 0 : 0));
	}

	/**
	 * Removes entries matching `selector` and appends an audit record.
	 * @param selector - A selector string; `"*"` clears all entries.
	 * @returns The number of entries removed.
	 */
	async clear(selector: string): Promise<number> {
		let removed = 0;
		await this.modify((file) => { for (const [key, entry] of Object.entries(file.entries)) { const id = `${entry.provider}/${entry.model}@${entry.account}`; if (selector === "*" || id === selector || entry.provider === selector || `${entry.provider}:${entry.account}` === selector) { delete file.entries[key]; removed++; } } });
		await appendFile(this.auditPath, `${JSON.stringify({ action: "clear", selector, removed, observedAt: Date.now() })}\n`, { encoding: "utf8", mode: 0o600 });
		return removed;
	}


	/**
	 * Clears all entries for a specific provider and account.
	 * @param provider - Provider identifier.
	 * @param account - Account identifier.
	 * @returns A promise resolved when the operation completes.
	 */
	clearAccount(provider: string, account: string): Promise<void> { return this.clear(`${provider}:${account}`).then(() => undefined); }

	/**
	 * Moves entries whose reset time has passed back off, optionally
	 * confirming each one before recovery.
	 * @param now - Current timestamp in milliseconds.
	 * @param confirm - Optional async predicate to approve recovery.
	 * @returns The recovered entries.
	 */
	async recover(now = Date.now(), confirm?: (entry: LimitEntry) => Promise<boolean>): Promise<LimitEntry[]> {
		const recovered: LimitEntry[] = [];
		await withFileLock(this.lockPath, async () => {
			const file = await this.readExisting() ?? await this.migrateQuota();
			for (const [key, entry] of Object.entries(file.entries)) {
				if (entry.resetAt > now) continue;
				if (entry.source === "default" && confirm && !await confirm(entry)) {
					// Still limited: back off (doubling, capped at six hours) instead of probing on a fixed short timer.
					const window = Math.max(entry.resetAt - entry.observedAt, this.fallbackTtlMs);
					entry.observedAt = now; entry.resetAt = now + Math.min(window * 2, 6 * 60 * 60_000);
					continue;
				}
				recovered.push(entry); delete file.entries[key];
			}
			await this.write(file);
		});
		return recovered;
	}
}
