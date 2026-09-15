import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Candidate } from "../failover.ts";
import { withFileLock } from "../storage/file-lock.ts";
import { replaceFile } from "../storage/replace-file.ts";
import { limitKey, type LimitEntry } from "./types.ts";

interface LedgerFile { version: 1; entries: Record<string, LimitEntry> }
const empty = (): LedgerFile => ({ version: 1, entries: {} });

function valid(value: unknown): value is LimitEntry {
	if (!value || typeof value !== "object") return false;
	const item = value as Record<string, unknown>;
	return typeof item.provider === "string" && typeof item.account === "string" && typeof item.model === "string" &&
		["rate", "daily", "window", "monthly", "overload", "auth"].includes(String(item.type)) &&
		typeof item.observedAt === "number" && typeof item.resetAt === "number" && Number.isFinite(item.resetAt) &&
		["header", "body", "rule", "default", "migration", "manual"].includes(String(item.source));
}

export class LimitLedger {
	readonly path: string;
	readonly lockPath: string;
	readonly auditPath: string;
	private readonly quotaPath: string;
	private readonly fallbackTtlMs: number;
	private readonly persist: (candidate: Candidate) => boolean;

	constructor(home: string, options: { fallbackTtlMs?: number; persist?: (candidate: Candidate) => boolean } = {}) {
		this.path = join(home, "limits.json");
		this.lockPath = `${this.path}.lock`;
		this.auditPath = join(home, "limits-audit.jsonl");
		this.quotaPath = join(home, "quota.json");
		this.fallbackTtlMs = options.fallbackTtlMs ?? 15 * 60_000;
		this.persist = options.persist ?? (() => true);
	}

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

	private async write(file: LedgerFile): Promise<void> {
		await mkdir(dirname(this.path), { recursive: true });
		const temporary = `${this.path}.${process.pid}.${crypto.randomUUID()}.tmp`;
		try { await writeFile(temporary, `${JSON.stringify(file, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" }); await replaceFile(temporary, this.path); }
		catch (error) { await Bun.file(temporary).delete().catch(() => undefined); throw error; }
	}

	private modify(fn: (file: LedgerFile) => void): Promise<void> {
		return withFileLock(this.lockPath, async () => { const file = await this.readExisting() ?? await this.migrateQuota(); fn(file); await this.write(file); });
	}

	async list(): Promise<LimitEntry[]> { return Object.values((await this.readRaw()).entries).sort((a, b) => a.resetAt - b.resetAt); }

	record(entries: readonly LimitEntry[]): Promise<void> {
		const kept = entries.filter((entry) => this.persist(entry));
		if (kept.length === 0) return Promise.resolve();
		return this.modify((file) => { for (const entry of kept) file.entries[limitKey(entry)] = entry; });
	}

	async forCandidate(candidate: Candidate, now = Date.now(), pools: readonly string[] = []): Promise<LimitEntry[]> {
		return (await this.list()).filter((entry) => entry.provider === candidate.provider && entry.account === candidate.account && entry.resetAt > now && (entry.model === candidate.model || (!!entry.pool && pools.includes(entry.pool))));
	}

	async blocking(candidate: Candidate, now = Date.now(), reserve: { requests?: number; tokens?: number } = {}, pools: readonly string[] = []): Promise<LimitEntry[]> {
		return (await this.forCandidate(candidate, now, pools)).filter((entry) => entry.remaining === undefined || entry.remaining <= (entry.dimension === "requests" ? reserve.requests ?? 0 : entry.dimension === "tokens" ? reserve.tokens ?? 0 : 0));
	}

	async clear(selector: string): Promise<number> {
		let removed = 0;
		await this.modify((file) => { for (const [key, entry] of Object.entries(file.entries)) { const id = `${entry.provider}/${entry.model}@${entry.account}`; if (selector === "*" || id === selector || entry.provider === selector || `${entry.provider}:${entry.account}` === selector) { delete file.entries[key]; removed++; } } });
		await appendFile(this.auditPath, `${JSON.stringify({ action: "clear", selector, removed, observedAt: Date.now() })}\n`, { encoding: "utf8", mode: 0o600 });
		return removed;
	}

	clearAccount(provider: string, account: string): Promise<void> { return this.clear(`${provider}:${account}`).then(() => undefined); }

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
