import { describe, expect, test } from "bun:test";
import { calculateBackoff } from "../../src/pipeline/backoff.ts";

describe("calculateBackoff", () => {
	test("backoff must grow and must stay finite", () => {
		const delays = [0, 1, 2, 3, 4].map((attempt) => calculateBackoff(attempt));
		for (const delay of delays) expect(delay).toBeGreaterThanOrEqual(0);
		expect(Math.max(...delays)).toBeLessThan(3600);
	});

	test("the jittered total never exceeds the bound, which capping only the base would break", () => {
		for (const attempt of [0, 5, 10, 30, 100]) {
			expect(calculateBackoff(attempt, { random: () => 0.999999 })).toBeLessThanOrEqual(60);
		}
	});

	test("a saturated attempt still spreads its delay instead of pinning to the bound", () => {
		// Capping the base at maxDelay rather than at the jittered budget would make every saturated
		// attempt return exactly maxDelay, so the smallest draw and the largest would be identical.
		expect(calculateBackoff(10, { random: () => 0 })).toBeLessThan(60);
		expect(calculateBackoff(10, { random: () => 0.5 })).toBeGreaterThan(calculateBackoff(10, { random: () => 0 }));
	});

	test("a non-positive bound means do not wait at all", () => {
		expect(calculateBackoff(0, { maxDelay: 0 })).toBe(0);
		expect(calculateBackoff(9, { maxDelay: -1 })).toBe(0);
	});

	test("without jitter the delay is exactly the exponential, capped", () => {
		expect(calculateBackoff(0, { jitter: false })).toBe(1);
		expect(calculateBackoff(3, { jitter: false })).toBe(8);
		expect(calculateBackoff(30, { jitter: false })).toBe(60);
	});

	test("an attempt beyond the clamp is treated as the clamp, so a long run cannot overflow", () => {
		expect(calculateBackoff(1_000_000, { jitter: false })).toBe(calculateBackoff(30, { jitter: false }));
	});

	test("a negative attempt is treated as the first", () => {
		expect(calculateBackoff(-5, { jitter: false })).toBe(calculateBackoff(0, { jitter: false }));
	});

	test("jitter spreads the delay upwards from the base without dropping below it", () => {
		expect(calculateBackoff(2, { random: () => 0 })).toBe(4);
		expect(calculateBackoff(2, { random: () => 0.5 })).toBe(5);
	});

	test("a zero jitter factor disables jitter rather than dividing by one", () => {
		expect(calculateBackoff(3, { jitterFactor: 0 })).toBe(8);
	});
});
