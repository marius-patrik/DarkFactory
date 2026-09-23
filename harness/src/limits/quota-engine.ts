import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Candidate } from "../failover.ts";
import type { DeclaredLimitConfig, LimitPolicyConfig, ProviderConfig } from "../providers/schema.ts";
import { nextPacificMidnight } from "../quota.ts";
import { withFileLock } from "../storage/file-lock.ts";
import { replaceFile } from "../storage/replace-file.ts";
import type { LimitLedger } from "./ledger.ts";
import type { TaskEstimate } from "./routing.ts";
import type { LimitEntry, LimitType } from "./types.ts";

/** One model request df sent, counted against declared limits. */
export interface UsageEvent {
	id: string;
	provider: string;
	account: string;
	model: string;
	timestamp: number;
	inputTokens: number;
	outputTokens: number;
	success: boolean;
}

export interface UsageStoreFile {
	version: 1;
	events: UsageEvent[];
}

/**
 * Availability of a limit, candidate or provider. `unavailable` is learned unavailability (billing, access or model
 * limits): the candidate cannot be used until the limit recovers, however soon that is.
 */
export type QuotaState = "available" | "waiting" | "exhausted" | "unavailable" | "unknown";

/** Learned limit types that make a candidate unavailable rather than temporarily exhausted. */
export const UNAVAILABLE_LIMIT_TYPES: ReadonlySet<LimitType> = new Set<LimitType>(["billing", "access", "model"]);

/** One limit as df knows it right now: what the provider declares, what df counted, what it learned. */
export interface QuotaStatusItem {
	provider: string;
	account: string;
	model: string;
	pool?: string;
	type: string;
	dimension?: string;
	limit?: number;
	/** Counted usage in the current window; absent when df cannot count this dimension (e.g. neurons, credits). */
	used?: number;
	remaining?: number;
	windowStart?: number;
	resetAt?: number;
	state: QuotaState;
	/** Where the number comes from: docs / community / observed for declared limits, header / body / rule for learned ones. */
	source: string;
	sourceUrl?: string;
	checkedAt?: string;
	note?: string;
	/** Whether admission control enforces this limit (usage and concurrency limits are shown, not enforced). */
	enforced: boolean;
	origin: "declared" | "learned";
}

export interface CandidateQuota extends Candidate {
	state: QuotaState;
	/** When the candidate is fully usable again (all blocking limits cleared). */
	until?: number;
	reason?: string;
	items: QuotaStatusItem[];
}

export interface AdmissionVerdict {
	decision: "admit" | "wait" | "skip";
	waitUntil?: number;
	reason?: string;
	/** Blocking limits as ledger-shaped entries, so the supervisor's wait logic can treat them like learned cooldowns. */
	entries: LimitEntry[];
}

export interface QuotaEngineOptions {
	/** A blocked candidate whose limits clear within this time is "wait", otherwise "skip". */
	maxAdmitWaitMs?: number;
}

const DAY = 86_400_000;
const MAX_RETENTION = 32 * DAY;

/** "*" and globs like "*:free" or "gemini-3.*-flash" match model ids; an absent pattern matches every model. */
export function matchesModel(pattern: string | undefined, model: string): boolean {
	if (!pattern || pattern === "*") return true;
	const regex = new RegExp(
		`^${pattern
			.split("*")
			.map((part) => part.replace(/[.+?^${}()|[\]\\]/gu, "\\$&"))
			.join(".*")}$`,
		"u",
	);
	return regex.test(model);
}

function nextUtcMidnight(now: number): number {
	const date = new Date(now);
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
}

/** The counting window of a declared limit: fixed windows follow the provider's roll-over, rolling windows trail now. */
export function windowBounds(
	limit: DeclaredLimitConfig,
	policy: LimitPolicyConfig | undefined,
	now: number,
): { start: number; resetAt?: number } {
	if (limit.reset !== "fixed") return { start: now - limit.windowMs };
	if (limit.type === "monthly" || limit.windowMs >= 28 * DAY) {
		const date = new Date(now);
		return {
			start: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
			resetAt: Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
		};
	}
	if (limit.type === "daily" || limit.windowMs >= DAY) {
		const resetAt = policy?.dailyReset === "pacific-midnight" ? nextPacificMidnight(now) : nextUtcMidnight(now);
		return { start: resetAt - DAY, resetAt };
	}
	const start = Math.floor(now / limit.windowMs) * limit.windowMs;
	return { start, resetAt: start + limit.windowMs };
}

function enforced(limit: DeclaredLimitConfig): boolean {
	return (
		limit.type !== "concurrency" && (limit.dimension ?? "requests") !== "usage" && limit.dimension !== "concurrency"
	);
}

function tokens(event: UsageEvent): number {
	return (event.inputTokens ?? 0) + (event.outputTokens ?? 0);
}

function ledgerType(type: DeclaredLimitConfig["type"] | LimitType): LimitType {
	return type === "concurrency" ? "rate" : type;
}

export class QuotaEngine {
	readonly path: string;
	readonly lockPath: string;

	constructor(
		readonly home: string,
		readonly ledger: LimitLedger,
		readonly providerConfigs: ReadonlyMap<string, ProviderConfig>,
		readonly options: QuotaEngineOptions = {},
	) {
		this.path = join(home, "usage.df");
		this.lockPath = `${this.path}.lock.df`;
	}

	private retentionMs(): number {
		let longest = DAY;
		for (const config of this.providerConfigs.values())
			for (const limit of config.limits?.declared ?? []) longest = Math.max(longest, limit.windowMs);
		return Math.min(longest, MAX_RETENTION);
	}

	private async events(): Promise<UsageEvent[]> {
		let raw: unknown;
		try {
			raw = JSON.parse(await readFile(this.path, "utf8")) as unknown;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
			if (error instanceof SyntaxError) throw new Error("Invalid usage file JSON");
			throw error;
		}
		if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid usage file");
		const file = raw as { version?: unknown; events?: unknown };
		if (file.version !== 1 || !Array.isArray(file.events)) throw new Error("Invalid usage file");
		for (const value of file.events) {
			if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid usage event");
			const event = value as Record<string, unknown>;
			if (
				typeof event.id !== "string" ||
				typeof event.provider !== "string" ||
				typeof event.account !== "string" ||
				typeof event.model !== "string" ||
				typeof event.timestamp !== "number" ||
				!Number.isFinite(event.timestamp) ||
				typeof event.inputTokens !== "number" ||
				!Number.isFinite(event.inputTokens) ||
				typeof event.outputTokens !== "number" ||
				!Number.isFinite(event.outputTokens) ||
				typeof event.success !== "boolean"
			)
				throw new Error("Invalid usage event");
		}
		return file.events as UsageEvent[];
	}

	/** Records one model request; safe across concurrent df processes and prunes events older than the longest window. */
	async record(event: Omit<UsageEvent, "id">): Promise<void> {
		const full: UsageEvent = { id: crypto.randomUUID(), ...event };
		await withFileLock(this.lockPath, async () => {
			// Prune relative to the newest recorded time, never the wall clock: callers (and tests) may record past events.
			const existing = await this.events();
			const newest = existing.reduce((latest, item) => Math.max(latest, item.timestamp), event.timestamp);
			const cutoff = newest - this.retentionMs();
			const events = [...existing.filter((item) => item.timestamp > cutoff), full];
			await mkdir(dirname(this.path), { recursive: true });
			const temp = `${this.path}.${process.pid}.${crypto.randomUUID()}.tmp.df`;
			await writeFile(temp, `${JSON.stringify({ version: 1, events } satisfies UsageStoreFile)}\n`, {
				encoding: "utf8",
				mode: 0o600,
				flag: "wx",
			});
			await replaceFile(temp, this.path);
		});
	}

	/** Declared limits that apply to a candidate's model. */
	declaredLimits(candidate: Candidate): DeclaredLimitConfig[] {
		return (this.providerConfigs.get(candidate.provider)?.limits?.declared ?? []).filter((limit) =>
			matchesModel(limit.model, candidate.model),
		);
	}

	/** Usage events counted by a declared limit: same provider and account; a pooled limit counts every model it covers. */
	private counted(
		events: readonly UsageEvent[],
		candidate: Candidate,
		limit: DeclaredLimitConfig,
		start: number,
		now: number,
	): UsageEvent[] {
		return events.filter(
			(event) =>
				event.provider === candidate.provider &&
				event.account === candidate.account &&
				event.timestamp > start &&
				event.timestamp <= now &&
				(limit.pool ? matchesModel(limit.model, event.model) : event.model === candidate.model),
		);
	}

	private evaluate(
		candidate: Candidate,
		limit: DeclaredLimitConfig,
		events: readonly UsageEvent[],
		now: number,
		needTokens: number,
	): QuotaStatusItem & { blockedUntil?: number } {
		const config = this.providerConfigs.get(candidate.provider);
		const policy = config?.limits;
		const { start, resetAt } = windowBounds(limit, policy, now);
		const dimension = limit.dimension ?? "requests";
		const base: QuotaStatusItem = {
			...candidate,
			...(limit.pool ? { pool: limit.pool } : {}),
			type: limit.type,
			dimension,
			limit: limit.limit,
			windowStart: start,
			...(resetAt === undefined ? {} : { resetAt }),
			state: "available",
			source: limit.source ?? "docs",
			...(limit.sourceUrl ? { sourceUrl: limit.sourceUrl } : {}),
			...(limit.checkedAt ? { checkedAt: limit.checkedAt } : {}),
			...(limit.note ? { note: limit.note } : {}),
			enforced: enforced(limit),
			origin: "declared",
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
				if (used - freed + need <= capacity) {
					blockedUntil = event.timestamp + limit.windowMs;
					break;
				}
			}
			// A single request larger than the whole window can never fit: blocked for a full window.
			blockedUntil ??= now + limit.windowMs;
		}
		return { ...base, used, remaining, resetAt: blockedUntil, state: this.stateFor(blockedUntil, now), blockedUntil };
	}

	private stateFor(until: number, now: number): QuotaState {
		return until - now <= (this.options.maxAdmitWaitMs ?? 5 * 60_000) ? "waiting" : "exhausted";
	}

	private learnedItem(
		entry: LimitEntry,
		now: number,
		reserve: { requests?: number; tokens?: number } | undefined,
	): QuotaStatusItem & { blockedUntil?: number } {
		const threshold =
			entry.dimension === "requests"
				? (reserve?.requests ?? 0)
				: entry.dimension === "tokens"
					? (reserve?.tokens ?? 0)
					: 0;
		const blocking = entry.resetAt > now && (entry.remaining === undefined || entry.remaining <= threshold);
		return {
			provider: entry.provider,
			account: entry.account,
			model: entry.model,
			...(entry.pool ? { pool: entry.pool } : {}),
			type: entry.type,
			...(entry.dimension ? { dimension: entry.dimension } : {}),
			...(entry.limit === undefined ? {} : { limit: entry.limit }),
			...(entry.remaining === undefined ? {} : { remaining: entry.remaining }),
			resetAt: entry.resetAt,
			state: blocking
				? UNAVAILABLE_LIMIT_TYPES.has(entry.type)
					? "unavailable"
					: this.stateFor(entry.resetAt, now)
				: "available",
			source: entry.source,
			checkedAt: new Date(entry.observedAt).toISOString(),
			enforced: true,
			origin: "learned",
			...(blocking ? { blockedUntil: entry.resetAt } : {}),
		};
	}

	private async items(
		candidate: Candidate,
		now: number,
		needTokens: number,
	): Promise<Array<QuotaStatusItem & { blockedUntil?: number }>> {
		const config = this.providerConfigs.get(candidate.provider);
		const events = await this.events();
		const declared = this.declaredLimits(candidate).map((limit) =>
			this.evaluate(candidate, limit, events, now, needTokens),
		);
		const pools = [
			...new Set(
				(config?.limits?.defaults ?? []).flatMap((entry) =>
					entry.pool ? [entry.pool.replace(":model", `:${candidate.model}`)] : [],
				),
			),
		];
		const learned = (await this.ledger.forCandidate(candidate, now, pools)).map((entry) =>
			this.learnedItem(entry, now, config?.limits?.reserve),
		);
		return [...declared, ...learned];
	}

	/** Everything df knows about a candidate's quota, without sending any request. */
	async status(candidate: Candidate, now = Date.now()): Promise<CandidateQuota> {
		const items = await this.items(candidate, now, 0);
		const blocked = items.filter((item) => item.blockedUntil !== undefined);
		const strip = ({
			blockedUntil: _blockedUntil,
			...item
		}: QuotaStatusItem & { blockedUntil?: number }): QuotaStatusItem => item;
		const unavailable = blocked.filter((item) => item.state === "unavailable");
		if (unavailable.length > 0) {
			const until = Math.max(...unavailable.map((item) => item.blockedUntil!));
			const last = unavailable.find((item) => item.blockedUntil === until)!;
			return {
				...candidate,
				state: "unavailable",
				until,
				reason: `${last.origin} ${last.type} (${last.source})`,
				items: items.map(strip),
			};
		}
		if (blocked.length > 0) {
			const until = Math.max(...blocked.map((item) => item.blockedUntil!));
			const last = blocked.find((item) => item.blockedUntil === until)!;
			return {
				...candidate,
				state: this.stateFor(until, now),
				until,
				reason: `${last.origin} ${last.type}${last.dimension ? `:${last.dimension}` : ""} (${last.source})`,
				items: items.map(strip),
			};
		}
		const counted = items.some((item) => item.enforced);
		return {
			...candidate,
			state: counted ? "available" : "unknown",
			...(counted ? {} : { reason: "no declared or learned limits" }),
			items: items.map(strip),
		};
	}

	/**
	 * Decides before a model call: admit now, wait until every blocking limit has cleared (when that is soon),
	 * or skip the candidate. Never sends a request.
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
			...candidate,
			type: ledgerType(item.type as DeclaredLimitConfig["type"] | LimitType),
			...(item.dimension && item.dimension !== "concurrency"
				? { dimension: item.dimension as LimitEntry["dimension"] }
				: {}),
			...(item.pool ? { pool: item.pool } : {}),
			observedAt: now,
			resetAt: item.blockedUntil!,
			source: item.origin === "declared" ? "declared" : (item.source as LimitEntry["source"]),
			remaining: 0,
			...(item.limit === undefined ? {} : { limit: item.limit }),
		}));
		// Unavailability (billing, access, model) is never waited out inside a request, however soon it may recover.
		const unavailable = blocked.some((item) => item.state === "unavailable");
		return {
			decision: unavailable || this.stateFor(waitUntil, now) === "exhausted" ? "skip" : "wait",
			waitUntil,
			reason,
			entries,
		};
	}
}
