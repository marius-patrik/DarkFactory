import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Candidate } from "../failover.ts";
import { withFileLock } from "../storage/file-lock.ts";
import type { ProviderConfig, DeclaredLimitConfig } from "../providers/schema.ts";
import { LimitLedger } from "./ledger.ts";
import type { TaskEstimate } from "./routing.ts";

export interface UsageEvent {
	id: string;
	provider: string;
	account: string;
	model: string;
	timestamp: number;
	inputTokens: number;
	outputTokens: number;
	success: boolean;
	pool?: string;
}

export interface UsageStoreFile {
	version: 1;
	events: UsageEvent[];
}

export interface QuotaStatusItem {
	provider: string;
	account: string;
	model: string;
	pool?: string;
	type: string;
	dimension?: string;
	limit?: number;
	used: number;
	remaining?: number;
	resetAt?: number;
	state: "available" | "waiting" | "exhausted" | "unknown";
	source: string;
}

export class QuotaEngine {
	readonly path: string;
	readonly lockPath: string;

	constructor(
		readonly home: string,
		readonly ledger: LimitLedger,
		readonly providerConfigs: ReadonlyMap<string, ProviderConfig>
	) {
		this.path = join(home, "usage.json");
		this.lockPath = `${this.path}.lock`;
	}

	async record(event: Omit<UsageEvent, "id">): Promise<void> {
		const fullEvent: UsageEvent = { id: crypto.randomUUID(), ...event };
		await withFileLock(this.lockPath, async () => {
			let file: UsageStoreFile;
			try {
				const raw = JSON.parse(await readFile(this.path, "utf8")) as UsageStoreFile;
				file = raw.version === 1 && Array.isArray(raw.events) ? raw : { version: 1, events: [] };
			} catch {
				file = { version: 1, events: [] };
			}
			const cutoff = Date.now() - 7 * 86_400_000;
			file.events = [...file.events.filter((e) => e.timestamp > cutoff), fullEvent];
			await mkdir(dirname(this.path), { recursive: true });
			const temp = `${this.path}.${process.pid}.${crypto.randomUUID()}.tmp`;
			await writeFile(temp, `${JSON.stringify(file, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
			await rename(temp, this.path);
		});
	}

	async queryUsage(candidate: Candidate, windowMs: number, dimension: "requests" | "tokens" | "usage" | "concurrency" = "requests", pool?: string, now = Date.now()): Promise<number> {
		let file: UsageStoreFile;
		try {
			const raw = JSON.parse(await readFile(this.path, "utf8")) as UsageStoreFile;
			file = raw.version === 1 && Array.isArray(raw.events) ? raw : { version: 1, events: [] };
		} catch {
			return 0;
		}
		const cutoff = now - windowMs;
		const matching = file.events.filter((e) => {
			if (e.timestamp < cutoff) return false;
			if (pool && e.pool === pool) return true;
			return e.provider === candidate.provider && e.account === candidate.account && (e.model === candidate.model || e.model === "*");
		});
		if (dimension === "tokens") {
			return matching.reduce((sum, e) => sum + (e.inputTokens ?? 0) + (e.outputTokens ?? 0), 0);
		}
		return matching.length;
	}

	async getDeclaredLimits(candidate: Candidate): Promise<DeclaredLimitConfig[]> {
		const config = this.providerConfigs.get(candidate.provider);
		if (!config || !config.limits?.declared) return [];
		return config.limits.declared.filter((d) => !d.model || d.model === "*" || d.model === candidate.model);
	}

	async status(candidate: Candidate, now = Date.now()): Promise<QuotaStatusItem[]> {
		const config = this.providerConfigs.get(candidate.provider);
		const declared = await this.getDeclaredLimits(candidate);
		const learned = await this.ledger.forCandidate(candidate, now);
		const results: QuotaStatusItem[] = [];

		if (declared.length === 0 && learned.length === 0) {
			results.push({
				provider: candidate.provider,
				account: candidate.account,
				model: candidate.model,
				type: "unknown",
				used: 0,
				state: "unknown",
				source: "unknown",
			});
		}

		for (const d of declared) {
			const used = await this.queryUsage(candidate, d.windowMs, d.dimension ?? "requests", d.pool, now);
			const reserve = (d.dimension === "tokens" ? config?.limits?.reserve?.tokens : config?.limits?.reserve?.requests) ?? 0;
			const remaining = Math.max(0, d.limit - used - reserve);
			const activeLearned = learned.find((l) => l.type === d.type && (!d.dimension || l.dimension === d.dimension));
			const resetAt = activeLearned?.resetAt ?? (d.reset === "fixed" ? nextFixedReset(d.windowMs, now) : undefined);
			const exhausted = remaining <= 0 || (activeLearned !== undefined && activeLearned.resetAt > now);
			const state: QuotaStatusItem["state"] = exhausted ? (resetAt && resetAt > now ? "exhausted" : "waiting") : "available";
			results.push({
				provider: candidate.provider,
				account: candidate.account,
				model: candidate.model,
				...(d.pool ? { pool: d.pool } : {}),
				type: d.type,
				...(d.dimension ? { dimension: d.dimension } : {}),
				limit: d.limit,
				used,
				remaining,
				...(resetAt ? { resetAt } : {}),
				state,
				source: d.source ?? "docs",
			});
		}

		for (const l of learned) {
			if (results.some((r) => r.type === l.type && r.dimension === l.dimension)) continue;
			results.push({
				provider: candidate.provider,
				account: candidate.account,
				model: candidate.model,
				...(l.pool ? { pool: l.pool } : {}),
				type: l.type,
				...(l.dimension ? { dimension: l.dimension } : {}),
				limit: l.limit,
				used: 0,
				remaining: l.remaining,
				resetAt: l.resetAt,
				state: l.resetAt > now ? "exhausted" : "available",
				source: l.source,
			});
		}

		return results;
	}

	async admit(candidate: Candidate, taskEstimate?: TaskEstimate, now = Date.now()): Promise<{ decision: "admit" | "wait" | "skip"; waitUntil?: number; reason?: string }> {
		await this.ledger.recover(now);
		const learned = await this.ledger.forCandidate(candidate, now);
		if (learned.some((l) => l.resetAt > now && (l.remaining === undefined || l.remaining <= 0))) {
			const earliest = learned.sort((a, b) => a.resetAt - b.resetAt)[0];
			return { decision: "skip", reason: `exhausted by learned limit (${earliest?.type})`, waitUntil: earliest?.resetAt };
		}

		const declared = await this.getDeclaredLimits(candidate);
		const config = this.providerConfigs.get(candidate.provider);
		const oneStepTokens = taskEstimate ? taskEstimate.contextTokens + taskEstimate.expectedOutputTokens : 0;

		for (const d of declared) {
			const used = await this.queryUsage(candidate, d.windowMs, d.dimension ?? "requests", d.pool, now);
			const reserve = (d.dimension === "tokens" ? config?.limits?.reserve?.tokens : config?.limits?.reserve?.requests) ?? 0;
			const remaining = d.limit - used - reserve;
			if (d.dimension === "tokens" && oneStepTokens > remaining) {
				const resetAt = now + d.windowMs;
				return { decision: "wait", waitUntil: resetAt, reason: `token limit exceeded in window` };
			}
			if (d.dimension === "requests" && remaining < 1) {
				const resetAt = now + (d.windowMs / Math.max(1, d.limit));
				return { decision: "wait", waitUntil: resetAt, reason: `request rate limit reached` };
			}
		}

		return { decision: "admit" };
	}
}

function nextFixedReset(windowMs: number, now: number): number {
	if (windowMs >= 86_400_000) {
		const d = new Date(now);
		return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
	}
	return now + windowMs;
}
