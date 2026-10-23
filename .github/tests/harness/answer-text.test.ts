import { describe, expect, test } from "bun:test";
import type { Candidate } from "../src/failover.ts";
import { observeLimits } from "../src/limits/observe.ts";
import type { LimitObservation } from "../src/limits/types.ts";
import type { LimitPolicyConfig } from "../src/providers/schema.ts";

const candidate: Candidate = { provider: "test", account: "a", model: "m" };

const policy: LimitPolicyConfig = {
	observe: true,
	bodyRules: [
		{
			type: "rate",
			regex: "quota exhausted",
			answerText: true,
		},
	],
};

function makeObs(status: number, outputTokens: number, answer: string): LimitObservation {
	return {
		status,
		body: {
			usage: { outputTokens },
			answerText: answer,
		},
	};
}

describe("observeLimits answerText body rule", () => {
	test("matches against answerText when status is 2xx and outputTokens is 0", () => {
		const now = Date.now();
		const observation = makeObs(200, 0, "your quota exhausted");
		const result = observeLimits(candidate, observation, policy, now);
		const entry = result[0]!;
		expect(result).toHaveLength(1);
		expect(entry.type).toBe("rate");
		expect(entry.source).toBe("body");
		expect(entry.remaining).toBe(0);
		expect(entry.resetAt).toBeGreaterThan(now);
	});

	test("does not trigger the rule when outputTokens is greater than 0", () => {
		const observation = makeObs(200, 5, "your quota exhausted");
		const result = observeLimits(candidate, observation, policy);
		expect(result).toHaveLength(0);
	});

	test("does not trigger the rule when status is not 2xx", () => {
		const observation = makeObs(500, 0, "your quota exhausted");
		const result = observeLimits(candidate, observation, policy);
		expect(result).toHaveLength(0);
	});
});
