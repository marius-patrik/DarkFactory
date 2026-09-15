import { expect, test } from "bun:test";
import { observeLimits } from "../src/limits/observe.ts";
import type { LimitPolicyConfig } from "../src/providers/schema.ts";

const candidate = { provider: "test", account: "default", model: "m" } as const;
const policy: LimitPolicyConfig = { observe: true };

test("detects billing from body text on 402", () => {
  const now = Date.now();
  const entries = observeLimits(candidate, { status: 402, body: "insufficient credit" }, policy, now);
  expect(entries).toHaveLength(1);
  const entry = entries[0]!;
  expect(entry.type).toBe("billing");
  expect(entry.source).toBe("default");
});

test("does not emit billing entry without keywords", () => {
  const now = Date.now();
  const entries = observeLimits(candidate, { status: 402, body: "something else" }, policy, now);
  expect(entries).toHaveLength(0);
});
