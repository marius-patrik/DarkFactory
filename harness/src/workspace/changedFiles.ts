import { runGit } from "./git.ts";

/** Engine scratch paths that never belong to a chunk: task files and df's own temporary files. */
function isScratch(path: string): boolean {
	return path.startsWith(".df-task/") || path.startsWith(".df-");
}

/**
 * Lists the files a worktree changed: staged, modified, deleted and untracked (every file inside a new directory, not
 * the directory), excluding engine scratch files (`.df-task/`, `.df-*`).
 *
 * Uses NUL-separated porcelain output, so paths with spaces or non-ASCII characters come back unquoted, and a rename
 * reports its new path.
 *
 * @param worktree - Path to the git worktree.
 * @returns Repository-relative paths with forward slashes, in git's order.
 */
export async function changedFiles(worktree: string): Promise<string[]> {
	const stdout = runGit(worktree, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
	const entries = stdout.split("\0");
	const changed: string[] = [];
	for (let index = 0; index < entries.length; index++) {
		const entry = entries[index] ?? "";
		if (entry.length < 4) continue;
		const status = entry.slice(0, 2);
		const path = entry.slice(3);
		// In -z output a rename or copy is followed by its original path as a separate entry.
		if (status.includes("R") || status.includes("C")) index++;
		if (!isScratch(path)) changed.push(path);
	}
	return changed;
}
