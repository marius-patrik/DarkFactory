import type { Candidate } from "../failover.ts";
import type { LimitPolicyConfig, LimitBodyRuleConfig } from "../providers/schema.ts";
import type { LimitDimension, LimitEntry, LimitObservation } from "./types.ts";
import { nextPacificMidnight } from "../quota.ts";

/** Wording providers use for limits that roll over once a day. */
const DAILY_WORDING = /per[- ]?day|perday|\bdaily\b|day limit/iu;
const LIMIT_WORDING = /rate limit|quota|too many requests|limit exceeded|exhausted/iu;

/** The later of two resets: a short rule default must never shorten a reset the provider reported. */
export function mergeReset(rule: number | undefined, observed: number | undefined): number | undefined {
	if (rule === undefined) return observed;
	if (observed === undefined) return rule;
	return Math.max(rule, observed);
}

/** Next daily roll-over for a provider: UTC midnight unless its config says otherwise. */
export function nextDailyReset(now: number, policy?: Pick<LimitPolicyConfig, "dailyReset">): number {
	if (policy?.dailyReset === "pacific-midnight") return nextPacificMidnight(now);
	const date = new Date(now);
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
}

function nextMonthlyReset(now: number): number {
	const date = new Date(now);
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

/** Reset and capacity hints a provider copies into an error body (headers inside JSON, retry fields). */
function bodyHints(body: string, now: number): { resetAt?: number; limit?: number; remaining?: number } {
	const field = (names: string): string | undefined => body.match(new RegExp(`["']?(?:${names})["']?\\s*[:=]\\s*["']?([0-9]+(?:\\.[0-9]+)?(?:ms|[dhms])?)["']?`, "iu"))?.[1];
	const reset = field("x-ratelimit-reset(?:-requests|-tokens)?|retry[-_]after|resets?[-_]at");
	const limit = numeric(field("x-ratelimit-limit(?:-requests)?"));
	const remaining = numeric(field("x-ratelimit-remaining(?:-requests)?"));
	const resetAt = parseReset(reset, now);
	return { ...(resetAt === undefined ? {} : { resetAt }), ...(limit === undefined ? {} : { limit }), ...(remaining === undefined ? {} : { remaining }) };
}

function headerMap(headers: LimitObservation["headers"]): Map<string, string> {
	if (!headers) return new Map();
	const values = headers instanceof Headers ? [...headers.entries()] : Object.entries(headers);
	return new Map(values.map(([name, value]) => [name.toLowerCase(), String(value)]));
}

function numeric(value: string | undefined): number | undefined {
	if (value === undefined || value.trim() === "") return undefined;
	const result = Number(value);
	return Number.isFinite(result) && result >= 0 ? result : undefined;
}

export function parseDuration(value: string): number | undefined {
	const plain = Number(value);
	if (Number.isFinite(plain) && plain >= 0) return plain * 1_000;
	let total = 0;
	let found = false;
	for (const match of value.matchAll(/([0-9]+(?:\.[0-9]+)?)(ms|[dhms])/giu)) {
		found = true;
		const factor = match[2]!.toLowerCase() === "d" ? 86_400_000 : match[2]!.toLowerCase() === "h" ? 3_600_000 : match[2]!.toLowerCase() === "m" ? 60_000 : match[2]!.toLowerCase() === "s" ? 1_000 : 1;
		total += Number(match[1]) * factor;
	}
	return found ? total : undefined;
}

export function parseReset(value: string | undefined, now: number): number | undefined {
	if (!value) return undefined;
	const duration = parseDuration(value);
	if (/[a-z]/iu.test(value) && duration !== undefined) return now + duration;
	const number = numeric(value);
	if (number !== undefined) {
		if (number > 10_000_000_000) return number;
		if (number > 1_000_000_000) return number * 1_000;
		return now + number * 1_000;
	}
	const date = Date.parse(value);
	return Number.isFinite(date) ? date : undefined;
}

function text(value: unknown): string {
	if (typeof value === "string") return value;
	try { return JSON.stringify(value) ?? ""; } catch { return String(value ?? ""); }
}

function bodyEntry(candidate: Candidate, body: string, rule: LimitBodyRuleConfig, now: number, policy?: LimitPolicyConfig): LimitEntry | undefined {
	let pattern: RegExp;
	try { pattern = new RegExp(rule.regex, "iu"); } catch { return undefined; }
	if (!pattern.test(body)) return undefined;
	let resetAt: number | undefined;
	if (rule.durationRegex) {
		try {
			const match = body.match(new RegExp(rule.durationRegex, "iu"));
			const duration = match?.[1] ? parseDuration(match[1]) : undefined;
			if (duration !== undefined) resetAt = now + duration;
		} catch { /* malformed local config is ignored at this boundary */ }
	}
	if (resetAt === undefined) {
		const retry = body.match(/(?:"retryDelay"\s*:\s*"|Please retry in\s+)([0-9]+(?:\.[0-9]+)?s)/iu)?.[1];
		const duration = retry ? parseDuration(retry) : undefined;
		if (duration !== undefined) resetAt = now + Math.ceil(duration / 1_000) * 1_000;
	}
	if (resetAt === undefined) {
		const clock = body.match(/try again at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/iu);
		if (clock) {
			let hour = Number(clock[1]) % 12;
			if (clock[3]!.toUpperCase() === "PM") hour += 12;
			const target = new Date(now); target.setHours(hour, Number(clock[2]), 0, 0);
			if (target.getTime() <= now) target.setDate(target.getDate() + 1);
			resetAt = target.getTime();
		}
	}
	if (resetAt === undefined && rule.resetAfterMs !== undefined) resetAt = now + rule.resetAfterMs;
	// A daily or monthly quota never returns before its roll-over, whatever short retry hint the body carries
	// (Google sends "retryDelay": "4s" with PerDay violations).
	if (rule.type === "daily") resetAt = Math.max(resetAt ?? 0, nextDailyReset(now, policy));
	if (rule.type === "monthly") resetAt = Math.max(resetAt ?? 0, nextMonthlyReset(now));
	return { ...candidate, type: rule.type, ...(rule.dimension ? { dimension: rule.dimension } : {}), ...(rule.pool ? { pool: rule.pool.replace(":model", `:${candidate.model}`) } : {}), observedAt: now, resetAt: resetAt ?? now + 15 * 60_000, source: "body", remaining: 0 };
}

/** Normalizes remote limit signals only when enabled by provider configuration. */
export function observeLimits(candidate: Candidate, observation: LimitObservation, policy: LimitPolicyConfig | undefined, now = Date.now()): LimitEntry[] {
	if (!policy?.observe) return [];
	const result: LimitEntry[] = [];
	const headers = headerMap(observation.headers);
	if (policy.standardHeaders) {
		for (const dimension of ["requests", "tokens"] as const) {
			const prefixes = ["x-ratelimit", "anthropic-ratelimit"];
			for (const prefix of prefixes) {
				const limit = numeric(headers.get(`${prefix}-limit-${dimension}`) ?? headers.get(`${prefix}-${dimension}-limit`));
				const remaining = numeric(headers.get(`${prefix}-remaining-${dimension}`) ?? headers.get(`${prefix}-${dimension}-remaining`));
				if (limit === undefined && remaining === undefined) continue;
				const resetValue = headers.get(`${prefix}-reset-${dimension}`) ?? headers.get(`${prefix}-${dimension}-reset`) ?? headers.get("x-ratelimit-reset") ?? headers.get("retry-after");
				const configured = policy.defaults?.find((entry) => entry.type === "rate" && entry.dimension === dimension);
				result.push({ ...candidate, type: "rate", dimension, observedAt: now, resetAt: parseReset(resetValue, now) ?? now + (configured?.windowMs ?? 60_000), source: "header", ...(configured?.pool ? { pool: configured.pool.replace(":model", `:${candidate.model}`) } : {}), ...(remaining === undefined ? {} : { remaining }), ...(limit === undefined ? {} : { limit }) });
				break;
			}
		}
		const genericLimit = numeric(headers.get("x-ratelimit-limit"));
		const genericRemaining = numeric(headers.get("x-ratelimit-remaining"));
		if (genericLimit !== undefined || genericRemaining !== undefined) result.push({ ...candidate, type: "rate", dimension: "requests", observedAt: now, resetAt: parseReset(headers.get("x-ratelimit-reset") ?? headers.get("retry-after"), now) ?? now + 60_000, source: "header", ...(genericRemaining === undefined ? {} : { remaining: genericRemaining }), ...(genericLimit === undefined ? {} : { limit: genericLimit }) });
	}
	const body = text(observation.body);
	let ruled = false;
	for (const rule of policy.bodyRules ?? []) {
		const entry = bodyEntry(candidate, body, rule, now, policy);
		if (entry) { result.push(entry); ruled = true; }
	}
	// Without a matching rule, a limit error still carries its own reset and scope: use them rather
	// than a short default, or exhausted models look recovered minutes later and get retried.
	if (!ruled && observation.body !== undefined && (observation.status === 429 || LIMIT_WORDING.test(body))) {
		const hints = bodyHints(body, now);
		const daily = DAILY_WORDING.test(body);
		if (hints.resetAt !== undefined || daily) {
			result.push({ ...candidate, type: daily ? "daily" : "rate", dimension: "requests", observedAt: now, resetAt: hints.resetAt ?? nextDailyReset(now, policy), source: "body", remaining: hints.remaining ?? 0, ...(hints.limit === undefined ? {} : { limit: hints.limit }) });
		}
	}
	return result;
}

export function defaultLimit(candidate: Candidate, type: LimitEntry["type"], now: number, resetAt: number | undefined, dimension?: LimitDimension, pool?: string, policy?: LimitPolicyConfig): LimitEntry {
	// A daily or monthly limit without a reported reset lasts until its roll-over, not fifteen minutes.
	const fallback = type === "daily" ? nextDailyReset(now, policy) : type === "monthly" ? nextMonthlyReset(now) : now + 15 * 60_000;
	return { ...candidate, type, ...(dimension ? { dimension } : {}), ...(pool ? { pool } : {}), observedAt: now, resetAt: resetAt ?? fallback, source: resetAt === undefined ? (type === "daily" || type === "monthly" ? "rule" : "default") : "rule", remaining: 0 };
}
