import { describe, it, expect, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { createTempRepo, TEST_IDENTITY } from "./helpers.ts";
import { runGit } from "../../src/workspace/git.ts";
import { commitChunk } from "../../src/workspace/commitChunk.ts";

describe("commitChunk utility", () => {
  let repoInfo: ReturnType<typeof createTempRepo>;

  afterEach(() => {
    repoInfo.cleanup();
  });

  it("commits changed files and returns the SHA", async () => {
    repoInfo = createTempRepo();

    // Create a tracked file in the repo.
    const srcDir = join(repoInfo.repo, "src");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, "foo.ts"), "export const x = 1;\n");
    runGit(repoInfo.repo, ["add", "src/foo.ts"]);
    runGit(repoInfo.repo, ["commit", "-m", "add foo.ts"], { env: TEST_IDENTITY });

    // Create a scratch file that must not be staged.
    mkdirSync(join(repoInfo.repo, ".df-task"), { recursive: true });
    writeFileSync(join(repoInfo.repo, ".df-task", "notes.md"), "scratch\n");

    // Modify the tracked file so changedFiles picks it up.
    writeFileSync(join(srcDir, "foo.ts"), "export const x = 2;\n");

    const sha = await commitChunk({
      worktree: repoInfo.repo,
      message: "chunk",
      identity: { name: "Chunk Bot", email: "chunk-bot@users.noreply.example" },
    });

    expect(sha).not.toBeNull();
    expect(typeof sha).toBe("string");

    // Verify the commit lists src/foo.ts only (not .df-task/notes.md).
    const showOutput = runGit(repoInfo.repo, ["show", "--name-only", "--format=", sha!]);
    expect(showOutput.trim()).toBe("src/foo.ts");

    // Verify the identity in the commit.
    const authorOutput = runGit(repoInfo.repo, ["log", "-1", "--format=%an <%ae>"]);
    expect(authorOutput).toBe("Chunk Bot <chunk-bot@users.noreply.example>");

    // Verify the scratch file/directory is still untracked.
    const statusOutput = runGit(repoInfo.repo, ["status", "--porcelain=v1"]);
    expect(statusOutput).toContain("?? .df-task/");
  });

  it("returns null and does not change HEAD when there are no changes", async () => {
    repoInfo = createTempRepo();

    // Ensure the repo has no uncommitted changes.
    const headBefore = runGit(repoInfo.repo, ["rev-parse", "HEAD"]);

    const result = await commitChunk({
      worktree: repoInfo.repo,
      message: "should not commit",
      identity: { name: "Chunk Bot", email: "chunk-bot@users.noreply.example" },
    });

    expect(result).toBeNull();

    const headAfter = runGit(repoInfo.repo, ["rev-parse", "HEAD"]);
    expect(headAfter).toBe(headBefore);
  });

  it("commits file deletions", async () => {
    repoInfo = createTempRepo();

    // Create a tracked file, then delete it.
    const srcDir = join(repoInfo.repo, "src");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, "toBeDeleted.ts"), "export const x = 1;\n");
    runGit(repoInfo.repo, ["add", "src/toBeDeleted.ts"]);
    runGit(repoInfo.repo, ["commit", "-m", "add toBeDeleted.ts"], { env: TEST_IDENTITY });

    // Delete the file.
    rmSync(join(srcDir, "toBeDeleted.ts"));

    const sha = await commitChunk({
      worktree: repoInfo.repo,
      message: "delete file",
      identity: { name: "Chunk Bot", email: "chunk-bot@users.noreply.example" },
    });

    expect(sha).not.toBeNull();

    // Verify the deletion is in the commit.
    const showOutput = runGit(repoInfo.repo, ["show", "--name-only", "--format=", sha!]);
    expect(showOutput.trim()).toBe("src/toBeDeleted.ts");

    // Verify the file no longer exists.
    expect(existsSync(join(srcDir, "toBeDeleted.ts"))).toBe(false);
  });
});
