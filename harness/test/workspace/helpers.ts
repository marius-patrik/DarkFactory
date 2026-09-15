import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGit } from "../../src/workspace/git.ts";

/** A throwaway repository with a bare `origin`, created under the OS temp directory. */
export interface TempRepo {
	/** Temp directory holding everything below; removed by {@link TempRepo.cleanup}. */
	root: string;
	/** Bare repository used as `origin`. */
	remote: string;
	/** Clone of `remote` with one commit on `main`, pushed. */
	repo: string;
	/** Directory for worktrees created by the test. */
	workRoot: string;
	/** Deletes the whole temp directory. */
	cleanup(): void;
}

const IDENTITY = { GIT_AUTHOR_NAME: "test", GIT_AUTHOR_EMAIL: "test@users.noreply.example", GIT_COMMITTER_NAME: "test", GIT_COMMITTER_EMAIL: "test@users.noreply.example" };

/**
 * Creates a bare remote and a clone with an initial commit on `main`, all inside a new temp directory.
 * Tests for workspace operations must use this and never the repository they run in.
 */
export function createTempRepo(): TempRepo {
	const root = mkdtempSync(join(tmpdir(), "df-workspace-"));
	const remote = join(root, "remote.git");
	const repo = join(root, "repo");
	const workRoot = join(root, "worktrees");
	runGit(root, ["init", "--bare", "--initial-branch=main", remote]);
	runGit(root, ["clone", remote, repo]);
	runGit(repo, ["checkout", "-B", "main"]);
	writeFileSync(join(repo, "README.md"), "# temp\n");
	runGit(repo, ["add", "README.md"]);
	runGit(repo, ["commit", "-m", "init"], { env: IDENTITY });
	runGit(repo, ["push", "origin", "main"]);
	return { root, remote, repo, workRoot, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** Commit identity for test commits made with {@link runGit}. */
export const TEST_IDENTITY = IDENTITY;
