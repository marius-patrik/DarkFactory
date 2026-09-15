import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Candidate } from "../failover.ts";
import { withFileLock } from "../storage/file-lock.ts";
import { replaceFile } from "../storage/replace-file.ts";
import type { DeclaredLimitConfig, LimitPolicyConfig, ProviderConfig } from "../providers/schema.ts";
import { nextPacificMidnight } from "../quota.ts";
import { LimitLedger } from "./ledger.ts";
import type { LimitEntry, LimitType } from "./types.ts";
import type { TaskEstimate } from "./routing.ts";

/** One model request df sent, counted against declared limits. */
export interface UsageEvent {
	/** Unique identifier for the usage event. */
	id: string;
	/** Provider name. */
	provider: string;
	/** Account identifier. */
	account: string;
	/** Model identifier. */
	model: string;
	/** Event timestamp in milliseconds since epoch. */
	timestamp: number;
	/** Number of input tokens consumed. */
	inputTokens: number;
	/** Number of output tokens produced. */
	outputTokens: number;
	/** Whether the request succeeded. */
	success: boolean;
}

/** Shape of the usage store JSON file on disk. */
export interface UsageStoreFile {
	/** File format version; always 1. */
	version: 1;
	/** Recorded usage events. */
	events: UsageEvent[];
}

/** Possible states of a quota. */
export type QuotaState = "available" | "waiting" | "exhausted" | "unknown";

/** One limit as df knows it right now: what the provider declares, what df counted, what it learned. */
export interface QuotaStatusItem {
	/** Provider name. */
	provider: string;
	/** Account identifier. */
	account: string;
	/** Model identifier. */
	model: string;
	/** Pool name if this limit is pooled. */
	pool?: string;
	/** Declared limit type. */
	type: string;
	/** Dimension this limit applies to (requests or tokens). */
	dimension?: string;
	/** Declared limit value. */
	limit?: number;
	/** Counted usage in the current window; absent when df cannot count this dimension (e.g. neurons, credits). */
	used?: number;
	/** Remaining quota in the current window. */
	remaining?: number;
	/** Start of the current counting window (ms timestamp). */
	windowStart?: number;
	/** Timestamp when the window resets (ms). */
	resetAt?: number;
	/** Current quota state. */
	state: QuotaState;
	/** Where the number comes from: docs / community / observed for declared limits, header / body / rule for learned ones. */
	source: string;
	/** URL to the provider's documentation for this limit. */
	sourceUrl?: string;
	/** ISO timestamp when this item was last checked. */
	checkedAt?: string;
	/** Free-form note from the provider or rule. */
	note?: string;
	/** Whether admission control enforces this limit (usage and concurrency limits are shown, not enforced). */
	enforced: boolean;
	/** Whether this limit is declared by the provider or learned from usage. */
	origin: "declared" | "learned";
}

/** Everything df knows about one candidate's quota right now: its overall state, when it clears and every limit behind it. */
export interface CandidateQuota extends Candidate {
	/** Current quota state. */
	state: QuotaState;
	/** When the candidate is fully usable again (all blocking limits cleared). */
	until?: number;
	/** Reason for the current state. */
	reason?: string;
	/** All quota status items for this candidate. */
	items: QuotaStatusItem[];
}

/** Whether a request to a candidate may go out now, must wait for a limit to clear, or should skip to the next candidate. */
export interface AdmissionVerdict {
	/** Decision: admit, wait, or skip. */
	decision: "admit" | "wait" | "skip";
	/** Earliest time the candidate can be admitted (ms timestamp). */
	waitUntil?: number;
	/** Reason for the decision. */
	reason?: string;
	/** Blocking limits as ledger-shaped entries, so the supervisor's wait logic can treat them like learned cooldowns. */
	entries: LimitEntry[];
}

/** Options for the QuotaEngine. */
export interface QuotaEngineOptions {
	/** A blocked candidate whose limits clear within this time is "wait", otherwise "skip". */
	maxAdmitWaitMs?: number;
}

const DAY = 86_400_000;
const MAX_RETENTION = 32 * DAY;

/** "*" and globs like "*:free" or "gemini-3.*-flash" match model ids; an absent pattern matches every model. */
export function matchesModel(pattern: string | undefined, model: string): boolean {
	if (!pattern || pattern === "*") return true;
	const regex = new RegExp(`^${pattern.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/gu, "\\$&")).join(".*")}$`, "u");
	return regex.test(model);
}

function nextUtcMidnight(now: number): number {
	const date = new Date(now);
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
}

/** The counting window of a declared limit: fixed windows follow the provider's roll-over, rolling windows trail now. */
export function windowBounds(limit: DeclaredLimitConfig, policy: LimitPolicyConfig | undefined, now: number): {
	/** Start of the counting window (ms timestamp). */
	start: number;
	/** Timestamp when the window resets (ms). */
	resetAt?: number;
} {
	if (limit.reset !== "fixed") return { start: now - limit.windowMs };
	if (limit.type === "monthly" || limit.windowMs >= 28 * DAY) {
		const date = new Date(now);
		return { start: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1), resetAt: Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) };
	}
	if (limit.type === "daily" || limit.windowMs >= DAY) {
		const resetAt = policy?.dailyReset === "pacific-midnight" ? nextPacificMidnight(now) : nextUtcMidnight(now);
		return { start: resetAt - DAY, resetAt };
	}
	const start = Math.floor(now / limit.windowMs) * limit.windowMs;
	return { start, resetAt: start + limit.windowMs };
}

function enforced(limit: DeclaredLimitConfig): boolean {
	return limit.type !== "concurrency" && (limit.dimension ?? "requests") !== "usage" && limit.dimension !== "concurrency";
}

function tokens(event: UsageEvent): number {
	return (event.inputTokens ?? 0) + (event.outputTokens ?? 0);
}

function ledgerType(type: DeclaredLimitConfig["type"]): LimitType {
	return type === "concurrency" ? "rate" : type;
}

/** Engine that tracks and enforces quota limits for candidates. */
export class QuotaEngine {
	/** Path to the usage data file. */
	readonly path: string;
	/** Path to the file lock for usage data. */
	readonly lockPath: string;

	/** Create a new QuotaEngine.
	 * @param home Directory where usage data is stored.
	 * @param ledger Ledger for learned limits.
	 * @param providerConfigs Map of provider configurations.
	 * @param options Optional engine options.
	 */
	constructor(
		readonly home: string,
		readonly ledger: LimitLedger,
		readonly providerConfigs: ReadonlyMap<string, ProviderConfig>,
		readonly options: QuotaEngineOptions = {},
	) {
		this.path = join(home, "usage.json");
		this.lockPath = `${this.path}.lock`;
	}

	private retentionMs(): number {
		let longest = DAY;
		for (const config of this.providerConfigs.values()) for (const limit of config.limits?.declared ?? []) longest = Math.max(longest, limit.windowMs);
		return Math.min(longest, MAX_RETENTION);
	}

	private async events(): Promise<UsageEvent[]> {
		try {
			const raw = JSON.parse(await readFile(this.path, "utf8")) as UsageStoreFile;
			return raw.version === 1 && Array.isArray(raw.events) ? raw.events : [];
		} catch {
			return [];
		}
	}

	/** Record a model request event.
	 * @param event Event data without an id; id will be generated.
	 */
	async record(event: Omit<UsageEvent, "id">): Promise<void> {
		const full: UsageEvent = { id: crypto.randomUUID(), ...event };
		await withFileLock(this.lockPath, async () => {
			// Prune relative to the newest recorded time, never the wall clock: callers (and tests) may record past events.
			const existing = await this.events();
			const newest = existing.reduce((latest, item) => Math.max(latest, item.timestamp), event.timestamp);
			const cutoff = newest - this.retentionMs();
			const events = [...existing.filter((item) => item.timestamp > cutoff), full];
			await mkdir(dirname(this.path), { recursive: true });
			const temp = `${this.path}.${process.pid}.${crypto.randomUUID()}.tmp`;
			await writeFile(temp, `${JSON.stringify({ version: 1, events } satisfies UsageStoreFile)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
			await replaceFile(temp, this.path);
		});
	}

	/** Get declared limits that apply to a candidate's model.
	 * @param candidate The candidate to query.
	 * @returns Array of declared limit configurations.
	 */
	declaredLimits(candidate: Candidate): DeclaredLimitConfig[] {
		return (this.providerConfigs.get(candidate.provider)?.limits?.declared ?? []).filter((limit) => matchesModel(limit.model, candidate.model));
	}

	/** Usage events counted by a declared limit: same provider and account; a pooled limit counts every model it covers. */
	private counted(events: readonly UsageEvent[], candidate: Candidate, limit: DeclaredLimitConfig, start: number, now: number): UsageEvent[] {
		return events.filter((event) => event.provider === candidate.provider && event.account === candidate.account && event.timestamp > start && event.timestamp <= now &&
			(limit.pool ? matchesModel(limit.model, event.model) : event.model === candidate.model));
	}

	private evaluate(candidate: Candidate, limit: DeclaredLimitConfig, events: readonly UsageEvent[], now: number, needTokens: number): QuotaStatusItem & { blockedUntil?: number } {
		const config = this.providerConfigs.get(candidate.provider);
		const policy = config?.limits;
		const { start, resetAt } = windowBounds(limit, policy, now);
		const dimension = limit.dimension ?? "requests";
		const base: QuotaStatusItem = {
			...candidate, ...(limit.pool ? { pool: limit.pool } : {}), type: limit.type, dimension, limit: limit.limit,
			windowStart: start, ...(resetAt === undefined ? {} : { resetAt }),
			state: "available", source: limit.source ?? "docs", ...(limit.sourceUrl ? { sourceUrl: limit.sourceUrl } : {}),
			...(limit.checkedAt ? { checkedAt: limit.checkedAt } : {}), ...(limit.note ? { note: limit.note } : {}),
			enforced: enforced(limit), origin: "declared",
		};
		if (!base.enforced) return { ...base, state: "unknown" };
		const window = this.counted(events, candidate, limit, start, now).sort((a, b) => a.timestamp - b.timestamp);
		const reserve = (dimension === "tokens" ? policy?.reserve?.tokens : policy?.reserve?.requests) ?? 0;
		const capacity = limit.limit - reserve;
		const used = dimension === "tokens" ? window.reduce((sum, event) => sum + tokens(event), 0) : window.length;
		const need = dimension === "tokens" ? Math.max(1, needTokens) : 1;
		const remaining = Math.max(0, limit.limit - used);
		if (used + need <= capacity) return { ...base, used, remaining };
		let blockedUntil: number | undefined;
		if (resetAt !== undefined) blockedUntil = resetAt;
		else {
			// Rolling window: the moment enough of the oldest usage has left the window for this request to fit.
			let freed = 0;
			for (const event of window) {
				freed += dimension === "tokens" ? tokens(event) : 1;
				if (used - freed + need <= capacity) { blockedUntil = event.timestamp + limit.windowMs; break; }
			}
			// A single request larger than the whole window can never fit: blocked for a full window.
			blockedUntil ??= now + limit.windowMs;
		}
		return { ...base, used, remaining, resetAt: blockedUntil, state: this.stateFor(blockedUntil, now), blockedUntil };
	}

	private stateFor(until: number, now: number): QuotaState {
		return until - now <= (this.options.maxAdmitWaitMs ?? 5 * 60_000) ? "waiting" : "exhausted";
	}

	private learnedItem(entry: LimitEntry, now: number, reserve: { requests?: number; tokens?: number } | undefined): QuotaStatusItem & { blockedUntil?: number } {
		const threshold = entry.dimension === "requests" ? reserve?.requests ?? 0 : entry.dimension === "tokens" ? reserve?.tokens ?? 0 : 0;
		const blocking = entry.resetAt > now && (entry.remaining === undefined || entry.remaining <= threshold);
		return {
			provider: entry.provider, account: entry.account, model: entry.model, ...(entry.pool ? { pool: entry.pool } : {}),
			type: entry.type, ...(entry.dimension ? { dimension: entry.dimension } : {}), ...(entry.limit === undefined ? {} : { limit: entry.limit }),
			...(entry.remaining === undefined ? {} : { remaining: entry.remaining }), resetAt: entry.resetAt,
			state: blocking ? this.stateFor(entry.resetAt, now) : "available", source: entry.source,
			checkedAt: new Date(entry.observedAt).toISOString(), enforced: true, origin: "learned",
			...(blocking ? { blockedUntil: entry.resetAt } : {}),
		};
	}

	private async items(candidate: Candidate, now: number, needTokens: number): Promise<Array<QuotaStatusItem & { blockedUntil?: number }>> {
		const config = this.providerConfigs.get(candidate.provider);
		const events = await this.events();
		const declared = this.declaredLimits(candidate).map((limit) => this.evaluate(candidate, limit, events, now, needTokens));
		const pools = [...new Set((config?.limits?.defaults ?? []).flatMap((entry) => entry.pool ? [entry.pool.replace(":model", `:${candidate.model}`)] : []))];
		const learned = (await this.ledger.forCandidate(candidate, now, pools)).map((entry) => this.learnedItem(entry, now, config?.limits?.reserve));
		return [...declared, ...learned];
	}

	/** Retrieve quota status for a candidate without sending a request.
	 * @param candidate The candidate to check.
	 * @param now Optional current timestamp (defaults to now).
	 * @returns CandidateQuota describing the quota state.
	 */
	async status(candidate: Candidate, now = Date.now()): Promise<CandidateQuota> {
		const items = await this.items(candidate, now, 0);
		const blocked = items.filter((item) => item.blockedUntil !== undefined);
		const strip = ({ blockedUntil: _blockedUntil, ...item }: QuotaStatusItem & { blockedUntil?: number }): QuotaStatusItem => item;
		if (blocked.length > 0) {
			const until = Math.max(...blocked.map((item) => item.blockedUntil!));
			const last = blocked.find((item) => item.blockedUntil === until)!;
			return { ...candidate, state: this.stateFor(until, now), until, reason: `${last.origin} ${last.type}${last.dimension ? `:${last.dimension}` : ""} (${last.source})`, items: items.map(strip) };
		}
		const counted = items.some((item) => item.enforced);
		return { ...candidate, state: counted ? "available" : "unknown", ...(counted ? {} : { reason: "no declared or learned limits" }), items: items.map(strip) };
	}

	/** Decide whether a candidate can be admitted now, wait, or be skipped.
	 * @param candidate The candidate to evaluate.
	 * @param taskEstimate Optional estimate of token usage for the request.
	 * @param now Optional current timestamp.
	 * @returns AdmissionVerdict indicating decision and any blocking entries.
	 */
	async admit(candidate: Candidate, taskEstimate?: TaskEstimate, now = Date.now()): Promise<AdmissionVerdict> {
		await this.ledger.recover(now);
		const needTokens = taskEstimate ? taskEstimate.contextTokens + taskEstimate.expectedOutputTokens : 0;
		const blocked = (await this.items(candidate, now, needTokens)).filter((item) => item.blockedUntil !== undefined);
		if (blocked.length === 0) return { decision: "admit", entries: [] };
		// A candidate is usable only once ALL of its blocking limits have cleared.
		const waitUntil = Math.max(...blocked.map((item) => item.blockedUntil!));
		const last = blocked.find((item) => item.blockedUntil === waitUntil)!;
		const reason = `${last.origin} ${last.type}${last.dimension ? `:${last.dimension}` : ""} limit until ${new Date(waitUntil).toISOString()}`;
		const entries: LimitEntry[] = blocked.map((item) => ({
			...candidate, type: ledgerType(item.type as DeclaredLimitConfig["type"]), ...(item.dimension && item.dimension !== "concurrency" ? { dimension: item.dimension as LimitEntry["dimension"] } : {}),
			...(item.pool ? { pool: item.pool } : {}), observedAt: now, resetAt: item.blockedUntil!, source: item.origin === "declared" ? "declared" : (item.source as LimitEntry["source"]), remaining: 0,
			...(item.limit === undefined ? {} : { limit: item.limit }),
		}));
		return { decision: this.stateFor(waitUntil, now) === "waiting" ? "wait" : "skip", waitUntil, reason, entries };
	}
}
