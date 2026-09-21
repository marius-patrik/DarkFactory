/**
 * Hook system types.
 */
export type HookEvent = "pre-tool" | "post-edit" | "pre-commit" | "pre-push" | "pr-open" | "ci";

export interface HookContext {
  /** Repository or worktree root */
  repoDir: string;
  /** Repository-relative, forward slashes */
  changedFiles: string[];
  /** Classified source files among changedFiles */
  sourceFiles?: string[];
  /** Classified test files among changedFiles */
  testFiles?: string[];
  commitMessage?: string;
  branch?: string;
  prBody?: string;
  toolCall?: { name: string; input: Record<string, unknown> };
  /** Reads a changed file's current text (injected so hooks stay testable). */
  readFile(path: string): Promise<string>;
}

export interface HookResult {
  id: string;
  status: "pass" | "fix" | "fail";
  message?: string;
}

export interface Hook {
  id: string;
  /** Events this hook runs on */
  events: readonly HookEvent[];
  run(ctx: HookContext): Promise<HookResult>;
}
