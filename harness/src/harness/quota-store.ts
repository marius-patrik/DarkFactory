import type { Candidate } from "../failover.ts";
import { LimitLedger } from "../limits/ledger.ts";
import type { FailureKind } from "../quota.ts";

export interface CooldownEntry {
	provider: string;
	model: string;
	account: string;
	kind: FailureKind;
	markedAt: number;
	resetAt: number;
	pool?: string;
}

/** @deprecated Compatibility adapter; runtime state is stored in limits.df by LimitLedger. */
export class QuotaStore extends LimitLedger {
	private readonly compatibilityTtlMs: number;

	constructor(
		home: string,
		options: {
			fallbackTtlMs?: number;
			persist?: (entry: Pick<CooldownEntry, "provider" | "model" | "account">) => boolean;
		} = {},
	) {
		super(home, options);
		this.compatibilityTtlMs = options.fallbackTtlMs ?? 15 * 60_000;
	}

	async active(candidate: Candidate, now = Date.now()): Promise<CooldownEntry | undefined> {
		const entry = (await this.blocking(candidate, now))[0];
		if (!entry) return undefined;
		const kind: FailureKind =
			entry.type === "rate"
				? "rate_limited"
				: entry.type === "auth"
					? "auth"
					: entry.type === "overload"
						? "transient"
						: "quota_exhausted";
		return {
			...candidate,
			kind,
			markedAt: entry.observedAt,
			resetAt: entry.resetAt,
			...(entry.pool ? { pool: entry.pool } : {}),
		};
	}

	mark(
		candidate: Candidate,
		kind: CooldownEntry["kind"],
		resetAt?: number,
		now = Date.now(),
		pool?: string,
	): Promise<void> {
		const type =
			kind === "rate_limited" ? "rate" : kind === "auth" ? "auth" : kind === "transient" ? "overload" : "daily";
		return this.record([
			{
				...candidate,
				type,
				observedAt: now,
				resetAt: resetAt ?? now + this.compatibilityTtlMs,
				source: resetAt === undefined ? "default" : "rule",
				remaining: 0,
				...(pool ? { pool } : {}),
			},
		]);
	}
}
