import { describe, expect, test } from "bun:test";
import type { LimitType } from "../src/limits/types.ts";
import { observeLimits } from "../src/limits/observe.ts";
import type { Candidate } from "../src/failover.ts";
import type { LimitObservation } from "../src/limits/types.ts";
import type { LimitPolicyConfig } from "../src/providers/schema.ts";


describe("new limit types exported", () => {
  test("includes billing, access, model", () => {
    const types: LimitType[] = ["billing", "access", "model"] as const;
    expect(types).toEqual(["billing", "access", "model"]);
  });
});


describe("observeLimits learns unavailability types", () => {
  test("classifies 402 as billing via bodyEntry", () => {
    const candidate: Candidate = { provider: "test", account: "test", model: "test-model" };
    const observation: LimitObservation = { body: "billing error", status: 402, headers: {} };
    const policy: LimitPolicyConfig = { observe: true, bodyRules: [{ type: "billing", regex: ".*", status: 402 }] };
    const now = Date.now();
    const result = observeLimits(candidate, observation, policy, now);
    const entry = result[0]!;
    expect(result).toHaveLength(1);
    expect(entry.type).toBe("billing");
    expect(entry.source).toBe("body");
  });

  test("classifies 401 as access via bodyEntry", () => {
    const candidate: Candidate = { provider: "test", account: "test", model: "test-model" };
    const observation: LimitObservation = { body: "unauthorized", status: 401, headers: {} };
    const policy: LimitPolicyConfig = { observe: true, bodyRules: [{ type: "access", regex: ".*", status: 401 }] };
    const now = Date.now();
    const result = observeLimits(candidate, observation, policy, now);
    const entry = result[0]!;
    expect(result).toHaveLength(1);
    expect(entry.type).toBe("access");
  });

  test("classifies 403 as access via bodyEntry", () => {
    const candidate: Candidate = { provider: "test", account: "test", model: "test-model" };
    const observation: LimitObservation = { body: "forbidden", status: 403, headers: {} };
    const policy: LimitPolicyConfig = { observe: true, bodyRules: [{ type: "access", regex: ".*", status: 403 }] };
    const now = Date.now();
    const result = observeLimits(candidate, observation, policy, now);
    const entry = result[0]!;
    expect(result).toHaveLength(1);
    expect(entry.type).toBe("access");
  });

  test("classifies 404 as model via bodyEntry", () => {
    const candidate: Candidate = { provider: "test", account: "test", model: "test-model" };
    const observation: LimitObservation = { body: "model not found", status: 404, headers: {} };
    const policy: LimitPolicyConfig = { observe: true, bodyRules: [{ type: "model", regex: ".*", status: 404 }] };
    const now = Date.now();
    const result = observeLimits(candidate, observation, policy, now);
    const entry = result[0]!;
    expect(result).toHaveLength(1);
    expect(entry.type).toBe("model");
    expect(entry.source).toBe("body");
  });

  test("status filter prevents bodyEntry when status differs", () => {
    const candidate: Candidate = { provider: "test", account: "test", model: "test-model" };
    const observation: LimitObservation = { body: "billing error", status: 404, headers: {} };
    const policy: LimitPolicyConfig = { observe: true, bodyRules: [{ type: "billing", regex: ".*", status: 402 }] };
    const now = Date.now();
    const result = observeLimits(candidate, observation, policy, now);
    const entry = result[0]!;
    expect(result).toHaveLength(1);
    expect(entry.type).toBe("model");
    expect(entry.source).toBe("default");
  });

  test("fallback handles 404 when rule status filter does not match", () => {
    const candidate: Candidate = { provider: "test", account: "test", model: "test-model" };
    const observation: LimitObservation = { body: "some text", status: 404, headers: {} };
    const policy: LimitPolicyConfig = { observe: true, bodyRules: [{ type: "billing", regex: ".*", status: 402 }] };
    const now = Date.now();
    const result = observeLimits(candidate, observation, policy, now);
    const entry = result[0]!;
    expect(result).toHaveLength(1);
    expect(entry.type).toBe("model");
    expect(entry.source).toBe("default");
    expect(entry.resetAt).toBe(now + 6 * 60 * 60_000);
  });
});
