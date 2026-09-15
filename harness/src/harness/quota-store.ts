import type { FailureKind } from "../quota.ts";
import type { Candidate } from "../failover.ts";
import { LimitLedger } from "../limits/ledger.ts";

/**
 * Represents a cooldown entry for a provider/model/account that has been throttled or failed.
 * It records when the entry was first observed and when it will reset.
 */
export interface CooldownEntry {
	/** Provider identifier, e.g., "openai". */
	provider: string;
	/** Model name, e.g., "gpt-4". */
	model: string;
	/** Account identifier within the provider. */
	account: string;
	/** Type of failure that triggered the cooldown. */
	kind: FailureKind;
	/** Timestamp (ms since epoch) when the cooldown was first marked. */
	markedAt: number;
	/** Timestamp (ms since epoch) when the cooldown expires. */
	resetAt: number;
	/** Optional pool name associated with this entry. */
	pool?: string;
}

/**
 * Compatibility adapter for the older QuotaStore API.
 * Internally delegates to {@link LimitLedger} which persists state in `limits.json`.
 *
 * @deprecated Use {@link LimitLedger} directly.
 */
export class QuotaStore extends LimitLedger {
	private readonly compatibilityTtlMs: number;

	/**
 * Create a new QuotaStore instance.
 *
 * @param home - Directory path where the ledger files are stored.
 * @param options - Optional configuration.
 * @param options.fallbackTtlMs - TTL in ms for entries when no explicit reset is provided (default 15 min).
 * @param options.persist - Optional predicate to decide whether to persist a given entry.
 */
constructor(home: string, options: { fallbackTtlMs?: number; persist?: (entry: Pick<CooldownEntry, "provider" | "model" | "account">) => boolean } = {}) {
		super(home, options);
		this.compatibilityTtlMs = options.fallbackTtlMs ?? 15 * 60_000;
	}

	/**
 * Retrieve the active cooldown entry for a candidate, if any.
 *
 * @param candidate - The candidate to check for an active cooldown.
 * @param now - Optional current timestamp (ms). Defaults to `Date.now()`.
 * @returns The {@link CooldownEntry} if the candidate is on cooldown, otherwise `undefined`.
 */
async active(candidate: Candidate, now = Date.now()): Promise<CooldownEntry | undefined> {
		const entry = (await this.blocking(candidate, now))[0];
		if (!entry) return undefined;
		const kind: FailureKind = entry.type === "rate" ? "rate_limited" : entry.type === "auth" ? "auth" : entry.type === "overload" ? "transient" : "quota_exhausted";
		return { ...candidate, kind, markedAt: entry.observedAt, resetAt: entry.resetAt, ...(entry.pool ? { pool: entry.pool } : {}) };
	}

	/**
 * Mark a candidate as being in cooldown.
 *
 * @param candidate - The candidate to mark.
 * @param kind - The kind of failure causing the cooldown.
 * @param resetAt - Optional explicit reset timestamp (ms). If omitted, uses the fallback TTL.
 * @param now - Optional current timestamp (ms). Defaults to `Date.now()`.
 * @param pool - Optional pool name to associate with the entry.
 */
mark(candidate: Candidate, kind: CooldownEntry["kind"], resetAt?: number, now = Date.now(), pool?: string): Promise<void> {
		const type = kind === "rate_limited" ? "rate" : kind === "auth" ? "auth" : kind === "transient" ? "overload" : "daily";
		return this.record([{ ...candidate, type, observedAt: now, resetAt: resetAt ?? now + this.compatibilityTtlMs, source: resetAt === undefined ? "default" : "rule", remaining: 0, ...(pool ? { pool } : {}) }]);
	}
}
