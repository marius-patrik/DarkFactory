import { describe, expect, test } from "bun:test";
import type { Candidate } from "../src/failover.ts";
import { observeLimits } from "../src/limits/observe.ts";
import type { LimitObservation } from "../src/limits/types.ts";
import type { LimitPolicyConfig } from "../src/providers/schema.ts";

const candidateSingle: Candidate = { provider: "test", account: "a", model: "single" };
const candidateConsecutive: Candidate = { provider: "test", account: "a", model: "consecutive" };

const policy: LimitPolicyConfig = { observe: true };

function makeObs(status: number): LimitObservation {
	return { status };
}

describe("observeLimits repeated 422 handling", () => {
	test("single 422 does not emit model entry", () => {
		const now = Date.now();
		const result = observeLimits(candidateSingle, makeObs(422), policy, now);
		expect(result).toHaveLength(0);
	});

	test("second consecutive 422 emits model limit entry", () => {
		const now = Date.now();
		// first call
		observeLimits(candidateConsecutive, makeObs(422), policy, now);
		// second call
		const result = observeLimits(candidateConsecutive, makeObs(422), policy, now);
		expect(result).toHaveLength(1);
		const entry = result[0]!;
		expect(entry.type).toBe("model");
		expect(entry.remaining).toBe(0);
	});
});
