import type { Candidate } from "../failover.ts";
import type { LimitPolicyConfig, LimitBodyRuleConfig } from "../providers/schema.ts";
import type { LimitDimension, LimitEntry, LimitObservation } from "./types.ts";

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

function bodyEntry(candidate: Candidate, body: string, rule: LimitBodyRuleConfig, now: number): LimitEntry | undefined {
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
	for (const rule of policy.bodyRules ?? []) {
		const entry = bodyEntry(candidate, body, rule, now);
		if (entry) result.push(entry);
	}
	return result;
}

export function defaultLimit(candidate: Candidate, type: LimitEntry["type"], now: number, resetAt: number | undefined, dimension?: LimitDimension, pool?: string): LimitEntry {
	return { ...candidate, type, ...(dimension ? { dimension } : {}), ...(pool ? { pool } : {}), observedAt: now, resetAt: resetAt ?? now + 15 * 60_000, source: resetAt === undefined ? "default" : "rule", remaining: 0 };
}
