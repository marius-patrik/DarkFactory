import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { FailureKind } from "../quota.ts";
import type { Candidate } from "../failover.ts";
import { withFileLock } from "../storage/file-lock.ts";

export interface CooldownEntry {
	provider: string;
	model: string;
	account: string;
	kind: FailureKind;
	markedAt: number;
	resetAt?: number;
}

interface QuotaFile {
	version: 1;
	entries: Record<string, CooldownEntry>;
}

export function candidateKey(candidate: Candidate): string {
	return `${candidate.provider}/${candidate.model}@${candidate.account}`;
}

function validEntry(value: unknown): value is CooldownEntry {
	if (!value || typeof value !== "object") return false;
	const entry = value as Record<string, unknown>;
	return typeof entry.provider === "string" && typeof entry.model === "string" && typeof entry.account === "string" &&
		(entry.kind === "quota_exhausted" || entry.kind === "rate_limited" || entry.kind === "auth" || entry.kind === "transient" || entry.kind === "fatal") &&
		typeof entry.markedAt === "number" && (entry.resetAt === undefined || typeof entry.resetAt === "number");
}

function parseQuota(value: unknown): QuotaFile {
	if (!value || typeof value !== "object") throw new Error("Invalid quota file");
	const file = value as { version?: unknown; entries?: unknown };
	if (file.version !== 1 || !file.entries || typeof file.entries !== "object" ||
		!Object.values(file.entries).every(validEntry)) throw new Error("Invalid quota file");
	return { version: 1, entries: file.entries as Record<string, CooldownEntry> };
}

export class QuotaStore {
	readonly path: string;
	readonly lockPath: string;
	private readonly fallbackTtlMs: number;
	private readonly persist: (entry: Pick<CooldownEntry, "provider" | "model" | "account">) => boolean;

	constructor(home: string, options: { fallbackTtlMs?: number; persist?: (entry: Pick<CooldownEntry, "provider" | "model" | "account">) => boolean } = {}) {
		this.path = join(home, "quota.json");
		this.lockPath = `${this.path}.lock`;
		this.fallbackTtlMs = options.fallbackTtlMs ?? 15 * 60_000;
		this.persist = options.persist ?? (() => true);
	}

	private async load(): Promise<QuotaFile> {
		try {
			return parseQuota(JSON.parse(await readFile(this.path, "utf8")) as unknown);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, entries: {} };
			if (error instanceof SyntaxError) throw new Error("Invalid quota file JSON");
			throw error;
		}
	}

	async active(candidate: Candidate, now = Date.now()): Promise<CooldownEntry | undefined> {
		const entry = (await this.load()).entries[candidateKey(candidate)];
		if (!entry) return undefined;
		const expiresAt = entry.resetAt ?? entry.markedAt + this.fallbackTtlMs;
		return expiresAt <= now ? undefined : entry;
	}

	mark(candidate: Candidate, kind: CooldownEntry["kind"], resetAt?: number, now = Date.now()): Promise<void> {
		if (!this.persist(candidate)) return Promise.resolve();
		return this.modify((file) => {
			file.entries[candidateKey(candidate)] = { ...candidate, kind, markedAt: now, ...(resetAt === undefined ? {} : { resetAt }) };
		});
	}

	clearAccount(provider: string, account: string): Promise<void> {
		return this.modify((file) => {
			for (const [key, entry] of Object.entries(file.entries)) {
				if (entry.provider === provider && entry.account === account) delete file.entries[key];
			}
		});
	}

	private modify(fn: (file: QuotaFile) => void): Promise<void> {
		return withFileLock(this.lockPath, async () => {
			await mkdir(dirname(this.path), { recursive: true });
			const file = await this.load();
			fn(file);
			const temporary = `${this.path}.${process.pid}.${crypto.randomUUID()}.tmp`;
			try {
				await writeFile(temporary, `${JSON.stringify(file, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
				await rename(temporary, this.path);
			} catch (error) {
				await Bun.file(temporary).delete().catch(() => undefined);
				throw error;
			}
		});
	}
}
