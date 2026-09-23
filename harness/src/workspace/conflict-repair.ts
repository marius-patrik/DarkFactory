import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { type CommitIdentity, commitChunk } from "./commitChunk.ts";
import { createWorktree } from "./createWorktree.ts";
import { runGit } from "./git.ts";
import { hasConflicts, resolveDefaultBranch } from "./gitWorkspace.ts";
import { pushBranch } from "./pushBranch.ts";
import { type DetectedVerificationResult, runDetectedVerification } from "./runVerify.ts";
import { updateBranch } from "./updateBranch.ts";

/** Options for repairing branch conflicts. */
export interface ConflictRepairOptions {
	/** Root directory of the repository. */
	repoDir: string;
	/** Branch that is conflicting with the base branch. */
	branch: string;
	/** Optional explicit default branch; resolved dynamically via repo.df if omitted. */
	defaultBranch?: string;
	/** Optional directory for worktrees. */
	worktreesDir?: string;
	/** Git commit author/committer identity. */
	identity?: CommitIdentity;
	/**
	 * Callback to invoke model conflict resolution on a conflicted file.
	 * Receives the file path and content containing git conflict markers.
	 * Must return the resolved file content without conflict markers.
	 */
	resolveConflict?: (params: { file: string; content: string }) => Promise<string> | string;
	/** Verification timeout in milliseconds. */
	verifyTimeoutMs?: number;
}

/** Result of a branch conflict repair operation. */
export type ConflictRepairResult =
	| {
			status: "clean";
			defaultBranch: string;
			updated: true;
	  }
	| {
			status: "repaired";
			defaultBranch: string;
			conflictedFiles: string[];
			commitSha: string | null;
			pushed: boolean;
			verification: DetectedVerificationResult[];
	  }
	| {
			status: "failed";
			defaultBranch: string;
			conflictedFiles?: string[];
			error: string;
	  };

const DEFAULT_BOT_IDENTITY: CommitIdentity = {
	name: "darkfactory-pipeline[bot]",
	email: "69584331+darkfactory-pipeline[bot]@users.noreply.github.com",
};

/**
 * Resolves repository base branch dynamically and performs deterministic update
 * or model-guided conflict repair.
 *
 * 1. Resolves canonical default branch from repo.df.
 * 2. Attempts deterministic git merge first.
 * 3. Invokes model conflict resolution only when real conflicts require judgement.
 * 4. Reruns detected verification on the repaired worktree.
 * 5. Commits and pushes deterministically, then prepares graph re-entry.
 *
 * @param options - Conflict repair options.
 * @returns {@link ConflictRepairResult}.
 */
export async function repairBranchConflicts(options: ConflictRepairOptions): Promise<ConflictRepairResult> {
	const repoDir = resolve(options.repoDir);
	const worktreesDir = options.worktreesDir ? resolve(options.worktreesDir) : join(repoDir, ".worktrees");
	const identity = options.identity ?? DEFAULT_BOT_IDENTITY;

	// 1. Resolve the canonical base dynamically and fail closed if repository identity is unavailable.
	const defaultBranch = options.defaultBranch ?? (await resolveDefaultBranch(repoDir));

	// 2. Obtain or create worktree for the branch
	const { worktreePath } = createWorktree({
		repo: repoDir,
		branch: options.branch,
		base: defaultBranch,
		workRoot: worktreesDir,
	});

	// 3. Attempt deterministic git update first
	let conflictedFiles: string[] = [];
	try {
		const updateResult = await updateBranch({
			worktree: worktreePath,
			base: defaultBranch,
			identity,
		});

		if (updateResult.status === "clean") {
			return {
				status: "clean",
				defaultBranch,
				updated: true,
			};
		}

		conflictedFiles = updateResult.conflictedFiles;
	} catch (error) {
		return {
			status: "failed",
			defaultBranch,
			error: `Deterministic update failed before merge: ${(error as Error).message}`,
		};
	}

	// 4. If conflicts exist, invoke model conflict resolution only if resolver provided
	if (!options.resolveConflict) {
		// Abort in-progress merge
		try {
			runGit(worktreePath, ["merge", "--abort"]);
		} catch {
			// Ignore
		}
		return {
			status: "failed",
			defaultBranch,
			conflictedFiles,
			error: `Conflicts detected in ${conflictedFiles.join(", ")}, but no conflict resolver was provided.`,
		};
	}

	// Resolve each conflicted file
	for (const file of conflictedFiles) {
		const filePath = join(worktreePath, file);
		let content: string;
		try {
			content = readFileSync(filePath, "utf8");
		} catch (readErr) {
			try {
				runGit(worktreePath, ["merge", "--abort"]);
			} catch {
				// Ignore
			}
			return {
				status: "failed",
				defaultBranch,
				conflictedFiles,
				error: `Could not read conflicted file ${file}: ${(readErr as Error).message}`,
			};
		}

		try {
			const resolvedContent = await options.resolveConflict({ file, content });
			writeFileSync(filePath, resolvedContent, "utf8");
			runGit(worktreePath, ["add", "--", file]);
		} catch (resolveErr) {
			try {
				runGit(worktreePath, ["merge", "--abort"]);
			} catch {
				// Ignore
			}
			return {
				status: "failed",
				defaultBranch,
				conflictedFiles,
				error: `Model conflict resolution failed on ${file}: ${(resolveErr as Error).message}`,
			};
		}
	}

	// 5. Verify that all conflict markers are removed from content and index
	let markersRemain = false;
	for (const file of conflictedFiles) {
		const text = readFileSync(join(worktreePath, file), "utf8");
		if (/^(?:<{7}|={7}|>{7})(?:$|\s)/mu.test(text)) {
			markersRemain = true;
			break;
		}
	}
	if (markersRemain || hasConflicts(worktreePath)) {
		try {
			runGit(worktreePath, ["merge", "--abort"]);
		} catch {
			// Ignore
		}
		return {
			status: "failed",
			defaultBranch,
			conflictedFiles,
			error: "Unresolved conflict markers remain after repair attempt.",
		};
	}

	// 6. Rerun detected verification after repair
	const verification = await runDetectedVerification({
		repoDir: worktreePath,
		changedFiles: conflictedFiles,
		timeoutMs: options.verifyTimeoutMs,
	});

	const failedActions = verification.filter((v) => v.result && (v.result.exitCode !== 0 || v.result.timedOut));
	if (failedActions.length > 0) {
		try {
			runGit(worktreePath, ["merge", "--abort"]);
		} catch {
			// Ignore
		}
		const errors = failedActions
			.map(
				(f) =>
					`${f.action.command ?? f.action.kind}: exit ${f.result?.exitCode}${f.result?.timedOut ? " (timed out)" : ""}`,
			)
			.join("; ");
		return {
			status: "failed",
			defaultBranch,
			conflictedFiles,
			error: `Verification failed after conflict repair: ${errors}`,
		};
	}

	// 7. Commit and push deterministically. Either observed effect failing makes the repair nonterminal.
	let commitSha: string | null;
	try {
		commitSha = await commitChunk({
			worktree: worktreePath,
			message: `fix(conflict): resolve merge conflicts with ${defaultBranch}`,
			identity,
		});
	} catch (error) {
		return {
			status: "failed",
			defaultBranch,
			conflictedFiles,
			error: `Failed to commit repaired conflicts: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
	if (!commitSha) {
		return {
			status: "failed",
			defaultBranch,
			conflictedFiles,
			error: "Conflict repair produced no commit evidence.",
		};
	}

	try {
		pushBranch({
			worktree: worktreePath,
			remote: "origin",
			branch: options.branch,
		});
	} catch (error) {
		return {
			status: "failed",
			defaultBranch,
			conflictedFiles,
			error: `Failed to push repaired branch: ${error instanceof Error ? error.message : String(error)}`,
		};
	}

	return {
		status: "repaired",
		defaultBranch,
		conflictedFiles,
		commitSha,
		pushed: true,
		verification,
	};
}
