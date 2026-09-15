import type { AssistantMessage, ProviderResponse } from "@earendil-works/pi-ai";
import type { FailureRuleConfig } from "./providers/schema.ts";

export type FailureKind = "quota_exhausted" | "rate_limited" | "auth" | "transient" | "fatal";

export interface FailureInput {
	error?: unknown;
	message?: AssistantMessage;
	response?: ProviderResponse;
	now?: number;
}

export interface FailurePolicy { rules: readonly FailureRuleConfig[]; model?: string }

export interface FailureClassification {
	kind: FailureKind;
	errorClass?: string;
	status?: number;
	resetAt?: number;
	pool?: string;
}

interface ErrorDetails {
	name?: string;
	message: string;
	status?: number;
	headers?: Headers | Record<string, string>;
	code?: string;
}

// pi contract references (clone commit 71dca87):
// - streamed failures become AssistantMessage stopReason/errorMessage:
//   packages/ai/src/types.ts:324-337,428-443 and providers/faux.ts:307-318.
// - ModelsError exposes auth/oauth via code: packages/ai/src/auth/resolve.ts:16-33.
// - provider retries use status/x-should-retry/retry-after:
//   packages/ai/src/utils/provider-retry.ts:14-35,51-66,97-124.
// - pi's outer classifier treats quota/billing as non-retryable and transient text as retryable:
//   packages/ai/src/utils/retry.ts:7-24,26-90,235-240.

const QUOTA = /insufficient[_ ]quota|quota (?:exceeded|exhausted)|usage limit|monthly limit|freeusagelimiterror|gousagelimiterror|out of (?:budget|credits?)|billing|credit balance/i;
const PROVIDER_QUOTA_WORDINGS: readonly RegExp[] = [
	/\baccess[\s_-]+terminated[\s_-]+error\b/i,
	/\breach(?:ed|es)?\b.{0,24}\busage[\s_-]+limit\b/i,
	/\busage[\s_-]+limit\b.{0,32}\bbilling[\s_-]+cycle\b/i,
	/\bcredits?[\s_-]*error\b/i,
	/\bno[\s_-]+payment[\s_-]+method\b/i,
	/\badd[\s_-]+a[\s_-]+payment[\s_-]+method\b/i,
];
const RATE = /rate.?limit|too many requests|resourceexhausted|throttl/i;
const AUTH = /unauthori[sz]ed|forbidden|invalid[_ ](?:api[_ ]key|token|grant)|authentication|credential|oauth/i;
const TRANSIENT = /overloaded|service.?unavailable|server.?error|internal.?error|network.?error|connection|fetch failed|getaddrinfo|enotfound|eai_again|timed? out|timeout|socket|stream ended|retry your request|retry delay|unavailable|high demand/i;

function details(error: unknown): ErrorDetails {
	if (!(error instanceof Error)) return { message: error === undefined ? "" : String(error) };
	const item = error as Error & { status?: unknown; headers?: unknown; code?: unknown };
	return {
		name: error.name,
		message: error.message,
		status: typeof item.status === "number" ? item.status : undefined,
		headers: item.headers instanceof Headers || (item.headers && typeof item.headers === "object")
			? item.headers as Headers | Record<string, string>
			: undefined,
		code: typeof item.code === "string" ? item.code : undefined,
	};
}

function header(headers: Headers | Record<string, string> | undefined, name: string): string | undefined {
	if (!headers) return undefined;
	if (headers instanceof Headers) return headers.get(name) ?? undefined;
	const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
	return entry?.[1];
}

function parseResetAt(headers: Headers | Record<string, string> | undefined, now: number): number | undefined {
	const retryMs = Number.parseFloat(header(headers, "retry-after-ms") ?? "");
	if (Number.isFinite(retryMs) && retryMs >= 0) return now + retryMs;
	const retry = header(headers, "retry-after");
	if (retry) {
		const seconds = Number.parseFloat(retry);
		if (Number.isFinite(seconds) && seconds >= 0) return now + seconds * 1000;
		const date = Date.parse(retry);
		if (Number.isFinite(date)) return date;
	}
	for (const name of ["x-ratelimit-reset", "ratelimit-reset", "x-quota-reset"]) {
		const value = Number.parseFloat(header(headers, name) ?? "");
		if (!Number.isFinite(value) || value < 0) continue;
		if (value > 10_000_000_000) return value;
		if (value > 1_000_000_000) return value * 1000;
		return now + value * 1000;
	}
	return undefined;
}

function googleErrorFacts(message: string, now: number): { status?: string; resetAt?: number; pool?: string } {
	const status = message.match(/"status"\s*:\s*"([A-Z_]+)"/i)?.[1]?.toUpperCase();
	const retrySeconds = Number(message.match(/"retryDelay"\s*:\s*"([0-9]+(?:\.[0-9]+)?)s"/i)?.[1]);
	const retryInSeconds = Number(message.match(/Please retry in ([0-9]+(?:\.[0-9]+)?)s/i)?.[1]);
	const fromTextRetry = !Number.isFinite(retrySeconds) && Number.isFinite(retryInSeconds);
	const effectiveRetry = Number.isFinite(retrySeconds) ? retrySeconds : Number.isFinite(retryInSeconds) ? retryInSeconds : NaN;
	const ceilRetry = Number.isFinite(effectiveRetry) ? Math.ceil(effectiveRetry) : NaN;
	const textJitter = fromTextRetry ? 1000 : 0;
	const resetText = message.match(/"(?:resetTime|resetAt)"\s*:\s*"([^"]+)"/i)?.[1];
	const resetParsed = resetText ? Date.parse(resetText) : NaN;
	const resetAt = Number.isFinite(ceilRetry) ? now + ceilRetry * 1000 + textJitter : Number.isFinite(resetParsed) ? resetParsed : undefined;
	const explicit = message.match(/"(?:pool|quotaId|quotaMetric|modelId)"\s*:\s*"([A-Za-z0-9_.:/-]+)"/i)?.[1];
	const lower = `${explicit ?? ""} ${message}`.toLowerCase();
	const family = lower.includes("gemini") ? "gemini" : /claude|gpt|oss/.test(lower) ? "claude-gpt" : undefined;
	const window = /weekly|7[- ]?day/.test(lower) ? "weekly" : /five[- ]?hour|5[- ]?hour|5h/.test(lower) ? "five-hour" : undefined;
	const pool = family && window ? `${family}:${window}` : explicit;
	return { ...(status ? { status } : {}), ...(resetAt !== undefined ? { resetAt } : {}), ...(pool ? { pool } : {}) };
}

function jsonBody(message: string): unknown {
	for (let index = message.indexOf("{"); index >= 0; index = message.indexOf("{", index + 1)) {
		let depth = 0;
		let quoted = false;
		let escaped = false;
		for (let end = index; end < message.length; end++) {
			const character = message[end]!;
			if (quoted) {
				if (escaped) escaped = false;
				else if (character === "\\") escaped = true;
				else if (character === '"') quoted = false;
				continue;
			}
			if (character === '"') quoted = true;
			else if (character === "{") depth++;
			else if (character === "}" && --depth === 0) {
				try { return JSON.parse(message.slice(index, end + 1)) as unknown; } catch { break; }
			}
		}
	}
	return undefined;
}

export function unwrapNestedJson(value: unknown, maxDepth = 5): unknown {
	let current = value;
	for (let depth = 0; depth < maxDepth; depth++) {
		if (typeof current === "string") {
			const parsed = jsonBody(current);
			if (parsed !== undefined) {
				current = parsed;
				continue;
			}
			break;
		}
		if (current && typeof current === "object") {
			const obj = current as Record<string, unknown>;
			const errorObj = obj.error && typeof obj.error === "object" ? obj.error as Record<string, unknown> : undefined;
			const nestedString =
				(typeof errorObj?.message === "string" ? errorObj.message : undefined) ??
				(typeof obj.message === "string" ? obj.message : undefined) ??
				(typeof obj.error === "string" ? obj.error : undefined);
			if (nestedString) {
				const parsed = jsonBody(nestedString);
				if (parsed !== undefined && typeof parsed === "object") {
					current = parsed;
					continue;
				}
			}
		}
		break;
	}
	return current;
}

function extractErrorMessage(body: unknown, fallback: string): string {
	if (body && typeof body === "object") {
		const obj = body as Record<string, unknown>;
		const errorObj = obj.error && typeof obj.error === "object" ? obj.error as Record<string, unknown> : undefined;
		if (typeof errorObj?.message === "string") return errorObj.message;
		if (typeof obj.message === "string") return obj.message;
	}
	return fallback;
}

function valuesAt(value: unknown, path: string): unknown[] {
	let values = [value];
	for (const part of path.split(".").filter(Boolean)) {
		const next: unknown[] = [];
		for (const current of values) {
			if (part === "*" && Array.isArray(current)) next.push(...current);
			else if (part === "*" && current && typeof current === "object") next.push(...Object.values(current as Record<string, unknown>));
			else if (part.includes("|")) {
				for (const key of part.split("|")) {
					if (current && typeof current === "object" && key in current) {
						next.push((current as Record<string, unknown>)[key]);
					}
				}
			}
			else if (current && typeof current === "object" && part in current) next.push((current as Record<string, unknown>)[part]);
		}
		values = next;
	}
	return values;
}

function pacificOffset(at: number): number {
	const part = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "shortOffset" }).formatToParts(new Date(at)).find((entry) => entry.type === "timeZoneName")?.value ?? "GMT-8";
	const match = part.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/u);
	if (!match) return -8 * 60 * 60 * 1000;
	const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
	return (match[1] === "+" ? 1 : -1) * minutes * 60 * 1000;
}

export function nextPacificMidnight(now: number): number {
	const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now)).map((entry) => [entry.type, entry.value]));
	const localTomorrow = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1);
	return localTomorrow - pacificOffset(localTomorrow + 12 * 60 * 60 * 1000);
}

function configuredReset(rule: FailureRuleConfig, body: unknown, headers: Headers | Record<string, string> | undefined, now: number, message?: string): number | undefined {
	for (const source of rule.reset ?? []) {
		if (source.kind === "header" && source.header) {
			const parsed = parseResetAt(headers ? { [source.header]: header(headers, source.header) ?? "" } : undefined, now);
			if (parsed !== undefined) return parsed;
		}
		if (source.kind === "retry_info") {
			let seconds: number | undefined;
			if (source.path) {
				for (const value of valuesAt(body, source.path)) {
					const match = typeof value === "string" ? value.match(/^([0-9]+(?:\.[0-9]+)?)s$/u) : undefined;
					if (match) { seconds = Number(match[1]); break; }
				}
			}
			if (seconds === undefined) {
				for (const value of valuesAt(body, "error.details.*.retryDelay")) {
					const match = typeof value === "string" ? value.match(/^([0-9]+(?:\.[0-9]+)?)s$/u) : undefined;
					if (match) { seconds = Number(match[1]); break; }
				}
			}
			if (seconds === undefined && message) {
				const retryInMatch = message.match(/Please retry in ([0-9]+(?:\.[0-9]+)?)s/iu);
				if (retryInMatch) seconds = Math.ceil(Number(retryInMatch[1]));
			}
			if (seconds !== undefined) {
				const jitter = source.jitterMs ?? 0;
				return now + seconds * 1000 + jitter;
			}
		}
		if (source.kind === "cooldown") {
			const seconds = source.seconds ?? 30;
			return now + seconds * 1000;
		}
		if (source.kind === "next_pacific_midnight") return nextPacificMidnight(now);
	}
	return undefined;
}

function configuredClassification(policy: FailurePolicy | undefined, status: number | undefined, message: string, headers: Headers | Record<string, string> | undefined, now: number, body: unknown): FailureClassification | undefined {
	if (!policy) return undefined;
	const unwrappedMessage = extractErrorMessage(body, message);
	for (const rule of policy.rules) {
		if (rule.statuses && status !== undefined && !rule.statuses.includes(status)) continue;
		let candidates = rule.jsonPath ? valuesAt(body, rule.jsonPath).map(String) : [message, unwrappedMessage];
		if (rule.jsonPath && candidates.length === 0) {
			candidates = [message, unwrappedMessage];
		}
		if (rule.equals !== undefined && !candidates.includes(rule.equals)) continue;
		if (rule.regex !== undefined) {
			let pattern: RegExp; try { pattern = new RegExp(rule.regex, "iu"); } catch { continue; }
			if (!candidates.some((value) => pattern.test(value))) continue;
		}
		const resetAt = configuredReset(rule, body, headers, now, unwrappedMessage !== message ? `${message} ${unwrappedMessage}` : message);
		return {
			kind: rule.kind,
			...(status === undefined ? {} : { status }),
			...(resetAt === undefined ? {} : { resetAt }),
			...(rule.pool ? { pool: rule.pool.replace(":model", policy.model ? `:${policy.model}` : "") } : {}),
		};
	}
	return undefined;
}

/** Ported from dsh-stack: distinguishes exhausted plans from bad credentials. */
export function isExhaustedQuota(detail: string | undefined): boolean {
	return detail !== undefined && (QUOTA.test(detail) || PROVIDER_QUOTA_WORDINGS.some((pattern) => pattern.test(detail)));
}

export function classifyFailure(input: FailureInput, policy?: FailurePolicy): FailureClassification {
	const raw = details(input.error);
	const message = [raw.message, input.message?.errorMessage ?? ""].filter(Boolean).join(" ");
	const body = unwrapNestedJson(jsonBody(message));
	const unwrappedMessage = extractErrorMessage(body, message);
	const fullMessage = unwrappedMessage !== message ? `${message} ${unwrappedMessage}` : message;

	let status = input.response?.status ?? raw.status;
	if (status === undefined && body && typeof body === "object") {
		const obj = body as Record<string, unknown>;
		const errorObj = obj.error && typeof obj.error === "object" ? obj.error as Record<string, unknown> : undefined;
		const code = errorObj?.code ?? obj.code;
		if (typeof code === "number") status = code;
		else {
			const statusText = (errorObj?.status ?? obj.status);
			if (typeof statusText === "string") {
				const upper = statusText.toUpperCase();
				if (upper === "UNAVAILABLE") status = 503;
				else if (upper === "RESOURCE_EXHAUSTED") status = 429;
			}
		}
	}
	if (status === undefined) {
		if (/got status:\s*UNAVAILABLE/i.test(message) || /status.*UNAVAILABLE/i.test(message)) status = 503;
		else if (/got status:\s*RESOURCE_EXHAUSTED/i.test(message)) status = 429;
		else {
			// SDK errors without a response object still name the status: "402 status code (no body)".
			const named = /\b([45]\d\d) status code\b/.exec(message);
			if (named) status = Number(named[1]);
		}
	}

	const headers = input.response?.headers ?? raw.headers;
	const now = input.now ?? Date.now();
	const google = googleErrorFacts(fullMessage, now);
	const resetAt = parseResetAt(headers, now) ?? google.resetAt;
	const configured = configuredClassification(policy, status, message, headers, now, body);
	if (configured) return { ...(raw.name ? { errorClass: raw.name } : {}), ...configured };
	const base = {
		...(raw.name ? { errorClass: raw.name } : input.message?.stopReason === "error" ? { errorClass: "AssistantMessageError" } : {}),
		...(status === undefined ? {} : { status }),
		...(resetAt === undefined ? {} : { resetAt }),
		...(google.pool === undefined ? {} : { pool: google.pool }),
	};

	if (raw.code === "auth" || raw.code === "oauth") {
		return { kind: "auth", ...base };
	}
	if (google.status === "SUBSCRIPTION_REQUIRED") return { kind: "fatal", ...base };
	if ((status === 401 || status === 403) && isExhaustedQuota(fullMessage)) {
		return { kind: "quota_exhausted", ...base };
	}
	if (status === 402 || isExhaustedQuota(fullMessage)) {
		return { kind: "quota_exhausted", ...base };
	}
	if (status === 401 || status === 403 || AUTH.test(fullMessage)) return { kind: "auth", ...base };
	if (status === 429 || RATE.test(fullMessage)) return { kind: "rate_limited", ...base };
	if (status === 408 || status === 409 || (status !== undefined && status >= 500) ||
		raw.name === "TypeError" || TRANSIENT.test(fullMessage)) {
		return { kind: "transient", ...base };
	}
	return { kind: "fatal", ...base };
}
