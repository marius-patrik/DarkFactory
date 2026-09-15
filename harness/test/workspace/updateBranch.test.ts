import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createTempRepo, TEST_IDENTITY } from "./helpers.ts";
import { createWorktree } from "../../src/workspace/createWorktree.ts";
import { updateBranch } from "../../src/workspace/updateBranch.ts";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runGit } from "../../src/workspace/git.ts";

describe("updateBranch utility", () => {
  let repoInfo: ReturnType<typeof createTempRepo>;

  beforeAll(() => {
    repoInfo = createTempRepo();
  });

  afterAll(() => {
    repoInfo.cleanup();
  });

  it("returns clean when merge has no conflicts", async () => {
    const { worktreePath } = createWorktree({
      repo: repoInfo.repo,
      branch: "feature",
      base: "main",
      workRoot: repoInfo.workRoot,
    });

    const result = await updateBranch({ worktree: worktreePath, base: "main" });
    expect(result.status).toBe("clean");
  });

  it("detects merge conflicts and reports conflicted files", async () => {
    // Create a new worktree on a fresh branch.
    const { worktreePath } = createWorktree({
      repo: repoInfo.repo,
      branch: "conflict-branch",
      base: "main",
      workRoot: repoInfo.workRoot,
    });

    // Make a conflicting change in the worktree.
    writeFileSync(join(worktreePath, "README.md"), "Feature change\n");
    runGit(worktreePath, ["add", "README.md"]);
    runGit(worktreePath, ["commit", "-m", "feature edit"], { env: TEST_IDENTITY });

    // Make a conflicting change on the remote main branch.
    runGit(repoInfo.repo, ["checkout", "main"]);
    writeFileSync(join(repoInfo.repo, "README.md"), "Remote change\n");
    runGit(repoInfo.repo, ["add", "README.md"]);
    runGit(repoInfo.repo, ["commit", "-m", "remote edit"], { env: TEST_IDENTITY });
    runGit(repoInfo.repo, ["push", "origin", "main"]);

    // Now attempt to merge origin/main into the feature branch.
    const result = await updateBranch({ worktree: worktreePath, base: "main" });
    expect(result.status).toBe("conflict");
    if (result.status === "conflict") {
      expect(result.conflictedFiles).toContain("README.md");
    }
  });
});
