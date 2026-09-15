import { runGit } from "./git.ts";

/**
 * List files in a worktree that have uncommitted changes (staged, modified, or untracked).
 * Engine scratch files (paths starting with `.df-task/` or `.df-`) are excluded.
 *
 * @param worktree - Absolute path to the git worktree.
 * @returns A promise that resolves to an array of changed file paths relative to the worktree.
 */
export async function changedFiles(worktree: string): Promise<string[]> {
  // Get porcelain status; each line begins with two‑character status followed by a space and the path.
  const stdout = runGit(worktree, ["status", "--porcelain=v1"]);
  if (!stdout) return [];
  const lines = stdout.split(/\r?\n/).filter(Boolean);
  const changed: string[] = [];
  for (const line of lines) {
    // The format is "XY <path>" where XY are status chars.
    // Path starts at column 4 (index 3).
    const rawPath = line.length > 3 ? line.slice(3) : "";
    // For renames (e.g., "R  old -> new") take the new path after " -> ".
    const path = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop()!.trim() : rawPath.trim();
    if (!path) continue;
    // Exclude engine scratch patterns.
    if (path.startsWith('.df-task/') || path.startsWith('.df-')) continue;
    changed.push(path);
  }
  return changed;
}
