/**
 * Workspace utility to check changed files against allowed patterns and required test files.
 *
 * The function reports three sets of paths relative to the given worktree:
 *   - `changed`: all files that are changed (staged, modified, or untracked).
 *   - `outside`: changed files that do not match any of the allowed glob patterns.
 *   - `untouchedTests`: required test files that were not changed.
 *
 * All paths use forward slashes and are sorted lexicographically.
 */
export interface ScopeCheckResult {
	/** Every changed path, repository‑relative with forward slashes, sorted. */
	changed: string[];
	/** Changed paths matching none of the allowed patterns, sorted. */
	outside: string[];
	/** Required test paths that were not changed, sorted. */
	untouchedTests: string[];
}

import { changedFiles } from "./changedFiles.ts";

/**
 * Evaluate a worktree's changed files against allowed glob patterns and required test files.
 *
 * @param worktree - Absolute path to the git worktree.
 * @param allowed - Glob patterns (Bun.Glob) that changed files are allowed to match.
 * @param requiredTests - Exact test file paths that must be present in the change set.
 * @returns A {@link ScopeCheckResult} describing the change analysis.
 */
export async function scopeCheck(
	worktree: string,
	allowed: readonly string[],
	requiredTests: readonly string[] = [],
): Promise<ScopeCheckResult> {
	// Gather changed files and normalise path separators.
	const rawChanged = await changedFiles(worktree);
	const changed = rawChanged.map((p) => p.replace(/\\/g, "/")).sort();

	// Helper to test if a path matches any allowed pattern using Bun.Glob.
	const matchesAllowed = (path: string): boolean => {
		for (const pattern of allowed) {
			// Bun.Glob works with forward‑slash patterns; paths are already normalised.
			if (new Bun.Glob(pattern).match(path)) return true;
		}
		return false;
	};

	const outside = changed.filter((p) => !matchesAllowed(p)).sort();

	const changedSet = new Set(changed);
	const untouchedTests = requiredTests
		.map((p) => p.replace(/\\/g, "/"))
		.filter((p) => !changedSet.has(p))
		.sort();

	return { changed, outside, untouchedTests };
}
