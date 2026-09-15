import { describe, expect, test } from "bun:test";
import { runHooks, hookFailures } from "../../src/hooks/engine.ts";
import { hookById } from "../../src/hooks/registry.ts";
import type { Hook, HookContext, HookResult } from "../../src/hooks/types.ts";

// Helper to create a fake context; only readFile is needed for type completeness.
const fakeCtx: HookContext = {
  repoDir: "/repo",
  changedFiles: [],
  async readFile() {
    return "";
  },
};

describe("hook engine", () => {
  test("only hooks for the event run in order", async () => {
    const hookA: Hook = {
      id: "a",
      events: ["pre-tool" as const],
      async run() {
        return { id: "a", status: "pass" } as HookResult;
      },
    };
    const hookB: Hook = {
      id: "b",
      events: ["post-edit" as const],
      async run() {
        return { id: "b", status: "pass" } as HookResult;
      },
    };
    const hookC: Hook = {
      id: "c",
      events: ["pre-tool" as const, "post-edit" as const],
      async run() {
        return { id: "c", status: "pass" } as HookResult;
      },
    };
    const results = await runHooks("pre-tool", fakeCtx, [hookA, hookB, hookC]);
    expect(results.map((r) => r.id)).toEqual(["a", "c"]);
  });

  test("throwing hook yields fail result with message", async () => {
    const badHook: Hook = {
      id: "bad",
      events: ["pre-tool" as const],
      async run() {
        throw new Error("boom");
      },
    };
    const results = await runHooks("pre-tool", fakeCtx, [badHook]);
    expect(results).toEqual([
      { id: "bad", status: "fail", message: "boom" } as HookResult,
    ]);
  });

  test("hookFailures filters only fails", async () => {
    const passHook: Hook = {
      id: "p",
      events: ["pre-tool" as const],
      async run() {
        return { id: "p", status: "pass" } as HookResult;
      },
    };
    const failHook: Hook = {
      id: "f",
      events: ["pre-tool" as const],
      async run() {
        throw new Error("bad");
      },
    };
    const all = await runHooks("pre-tool", fakeCtx, [passHook, failHook]);
    const fails = hookFailures(all);
    expect(fails).toEqual([
      { id: "f", status: "fail", message: "bad" } as HookResult,
    ]);
  });

  test("hookById returns undefined for empty registry", () => {
    expect(hookById("any")).toBeUndefined();
  });
});
