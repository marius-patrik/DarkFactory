import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { runGit } from "../../src/workspace/git.ts";
import { createTempRepo, TEST_IDENTITY } from "./helpers.ts";
import { createWorktree } from "../../src/workspace/createWorktree.ts";

let temp: ReturnType<typeof createTempRepo>;

beforeAll(() => {
  temp = createTempRepo();
});

afterAll(() => {
  temp.cleanup();
});

describe("createWorktree", () => {
  test("creates a new worktree and is idempotent", () => {
    const branch = "feature/foo";
    const base = "main";
    const result1 = createWorktree({ repo: temp.repo, branch, base, workRoot: temp.workRoot });
    // The directory should now exist.
    expect(existsSync(result1.worktreePath)).toBeTrue();
    // HEAD should be the new branch.
    const head = runGit(result1.worktreePath, ["rev-parse", "--abbrev-ref", "HEAD"]);
    expect(head).toBe(branch);

    // Second call returns same path.
    const result2 = createWorktree({ repo: temp.repo, branch, base, workRoot: temp.workRoot });
    expect(result2.worktreePath).toBe(result1.worktreePath);
    expect(result2.worktreeBranch).toBe(result1.worktreeBranch);
  });
});
