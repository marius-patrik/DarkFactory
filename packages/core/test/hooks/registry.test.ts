import { describe, expect, test } from "bun:test";
import { BUILTIN_HOOKS, hookById } from "../../src/hooks/registry.ts";
import { runHooks } from "../../src/hooks/engine.ts";

describe("hook registry and builtins", () => {
  test("contains expected capability hooks", () => {
    const testsTouchedHook = hookById("tests-touched");
    expect(testsTouchedHook).toBeDefined();
    expect(testsTouchedHook?.events).toContain("pre-commit");

    const commitHook = hookById("conventional-commit");
    expect(commitHook).toBeDefined();
    expect(commitHook?.events).toContain("pre-commit");

    const branchHook = hookById("branch-name");
    expect(branchHook).toBeDefined();
    expect(branchHook?.events).toContain("pre-push");
  });

  test("tests-touched hook enforces test updates", async () => {
    const hook = hookById("tests-touched")!;
    const ctx = {
      repoDir: ".",
      changedFiles: ["src/index.ts"],
      sourceFiles: ["src/index.ts"],
      testFiles: [],
      async readFile() { return ""; }
    };
    const results = await runHooks("pre-commit", ctx, [hook]);
    expect(results[0].status).toBe("fail");
  });

  test("conventional-commit hook validates messages", async () => {
    const hook = hookById("conventional-commit")!;
    const ctxValid = {
      repoDir: ".",
      changedFiles: ["src/index.ts"],
      commitMessage: "feat(core): add hooks support",
      async readFile() { return ""; }
    };
    const resValid = await runHooks("pre-commit", ctxValid, [hook]);
    expect(resValid[0].status).toBe("pass");

    const ctxInvalid = {
      repoDir: ".",
      changedFiles: ["src/index.ts"],
      commitMessage: "bad commit message",
      async readFile() { return ""; }
    };
    const resInvalid = await runHooks("pre-commit", ctxInvalid, [hook]);
    expect(resInvalid[0].status).toBe("fail");
  });

  test("branch-name hook validates branch format", async () => {
    const hook = hookById("branch-name")!;
    const ctxValid = {
      repoDir: ".",
      changedFiles: [],
      branch: "feat/hooks-support",
      async readFile() { return ""; }
    };
    const resValid = await runHooks("pre-push", ctxValid, [hook]);
    expect(resValid[0].status).toBe("pass");

    const ctxInvalid = {
      repoDir: ".",
      changedFiles: [],
      branch: "invalid_branch_name",
      async readFile() { return ""; }
    };
    const resInvalid = await runHooks("pre-push", ctxInvalid, [hook]);
    expect(resInvalid[0].status).toBe("fail");
  });
});
