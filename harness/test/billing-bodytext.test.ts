import { expect, test } from "bun:test";
import { observeLimits } from "../src/limits/observe.ts";
import type { LimitPolicyConfig } from "../src/providers/schema.ts";

const candidate = { provider: "test", account: "default", model: "m" } as const;
const policy: LimitPolicyConfig = { observe: true };
const now = 1_800_000_000_000;

test("402 Payment Required is billing, with or without wording", () => {
	for (const body of ["insufficient credit", "something else"]) {
		const entries = observeLimits(candidate, { status: 402, body }, policy, now);
		expect(entries.map((entry) => [entry.type, entry.source])).toEqual([["billing", "default"]]);
	}
});

test("balance, credit and budget wording is billing under any status", () => {
	for (const [status, body] of [[400, "Insufficient balance"], [429, "Your credit balance is too low"], [0, "The API key used for this request has reached its budget"]] as const) {
		expect(observeLimits(candidate, { status, body }, policy, now).map((entry) => entry.type)).toEqual(["billing"]);
	}
});

test("limit wording is a quota, not a rejected credential, even on 403 or without a status", () => {
	const forbidden = observeLimits(candidate, { status: 403, body: "Quota exceeded for requests per day" }, policy, now);
	expect(forbidden.map((entry) => entry.type)).toEqual(["daily"]);
	const unknown = observeLimits(candidate, { status: 0, body: "rate limit exceeded; retry-after: 30" }, policy, now);
	expect(unknown).toMatchObject([{ type: "rate", resetAt: now + 30_000 }]);
	expect(observeLimits(candidate, { status: 403, body: "Forbidden" }, policy, now).map((entry) => entry.type)).toEqual(["access"]);
});
