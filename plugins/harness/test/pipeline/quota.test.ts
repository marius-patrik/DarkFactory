import { describe, expect, test } from "bun:test";
import { nextQuotaReset } from "../../src/pipeline/quota.ts";
import {
	isAuthFailure,
	isPrintTimeout,
	isQuotaExhausted,
	isQuotaExhaustionNotice,
	QUOTA_EXHAUSTED_NOTICE,
	SHORT_REPORT_LIMIT,
} from "../../src/pipeline/signals.ts";

/** 2026-09-15T12:00:00Z, which is 05:00 in Los Angeles. */
const NOW = 1789473600;

describe("isQuotaExhausted", () => {
	test.each([
		"Error: 429 Too Many Requests",
		"RESOURCE_EXHAUSTED: quota exceeded for this model",
		"You have hit your rate limit",
		"quota exhausted",
		"Antigravity: daily limit reached",
		"Your weekly limit has been reached",
		"usage limit for this account",
		"You are out of credits",
		"insufficient credits remaining",
		"Please upgrade your plan to continue",
		"the model is overloaded",
	])("recognises %j however it is phrased", (message: string) => {
		expect(isQuotaExhausted(message)).toBe(true);
	});

	test.each([
		"TypeError: cannot read property of undefined",
		"fatal: not a git repository",
		"the diff exceeded the review limit of lines we display",
		"compilation failed: expected `;`",
		"test failure in tests/test_codec.py",
		"",
	])("does not mistake %j for a limit", (message: string) => {
		// Escalating on a real bug would hide it behind a second harness failing the same way.
		expect(isQuotaExhausted(message)).toBe(false);
	});
});

describe("isAuthFailure", () => {
	test.each([
		"Error 401: invalid api key",
		"claude: 401 Unauthorized",
		"HTTP 403 forbidden",
		"invalid api key provided",
		"unauthorized: no valid credential",
		"OAuth token expired token, please re-login",
		"invalid_grant: refresh token expired",
		"Invalid API key for model opus",
	])("recognises %j as a rejected credential", (message: string) => {
		expect(isAuthFailure(message)).toBe(true);
	});

	test.each([
		"compilation failed: expected `;`",
		"rate limit exceeded, retry later",
		"quota exhausted for this model",
		"TypeError: cannot read property of undefined",
		"",
	])("does not mistake %j for a rejected credential", (message: string) => {
		// Quota wording is quota and build failures are bugs; neither is an auth failure.
		expect(isAuthFailure(message)).toBe(false);
	});

	test("the patterns read the rejection before the credential, not after", () => {
		// Preserved as-is from the runner: every pattern puts the verdict word first, so a provider
		// that phrases it the other way round is not recognised. Recorded as a finding, not fixed.
		expect(isAuthFailure("Your API key is invalid")).toBe(false);
		expect(isAuthFailure("invalid api key")).toBe(true);
	});
});

describe("isQuotaExhaustionNotice", () => {
	test("only the runner's own notice counts, never quota wording in an answer", () => {
		// A Request about quota handling always discusses quotas; reading that answer as exhaustion
		// drops it without a comment, so the run stays green and the issue waits forever.
		expect(isQuotaExhaustionNotice(QUOTA_EXHAUSTED_NOTICE)).toBe(true);
		expect(isQuotaExhaustionNotice("The quota fallback picks the wrong model")).toBe(false);
		// This text *is* quota-exhaustion wording, and it is still an answer: reading it as the
		// notice would drop a real reply without a comment.
		expect(isQuotaExhausted("quota exhausted for this model")).toBe(true);
		expect(isQuotaExhaustionNotice("quota exhausted for this model")).toBe(false);
		expect(isQuotaExhaustionNotice("")).toBe(false);
	});
});

describe("isPrintTimeout", () => {
	test.each([
		"agy: print-timeout 5m0s",
		"print timeout after 300s",
		"the request timed out waiting for output",
		"print timed out",
	])("treats %j as a failed attempt", (text: string) => {
		expect(isPrintTimeout(text)).toBe(true);
	});

	test.each(["The answer discusses timeouts and print output", "", "all good"])(
		"does not mistake %j for a truncation",
		(text: string) => {
			expect(isPrintTimeout(text)).toBe(false);
		},
	);
});

describe("nextQuotaReset", () => {
	test("an ISO timestamp in the error wins", () => {
		expect(nextQuotaReset("429 quota exhausted; resets at 2026-09-15T14:30:00Z", NOW)).toBe(NOW + 2.5 * 3600);
	});

	test("a timestamp with no offset is read as UTC, not as the runner's own zone", () => {
		expect(nextQuotaReset("quota exhausted; resets at 2026-09-15T14:30:00", NOW)).toBe(NOW + 2.5 * 3600);
	});

	test("a resetAt epoch is read as milliseconds", () => {
		expect(nextQuotaReset('{"resetAt": 1789542000000}', NOW)).toBe(1789542000);
	});

	test("a retry delay is added to now", () => {
		expect(nextQuotaReset("Please retry in 33s.", NOW)).toBe(NOW + 33);
		expect(nextQuotaReset('{"retryDelay": 33}', NOW)).toBe(NOW + 33);
	});

	test("with nothing to read it falls back to the next Pacific midnight", () => {
		// 2026-09-16T07:00Z, which is the daily free-tier reset.
		expect(nextQuotaReset("quota exhausted", NOW)).toBe(1789542000);
	});
});

test("the short-report limit is a CLI error report, not an agent answer", () => {
	expect(SHORT_REPORT_LIMIT).toBe(300);
});
