import type { Hook } from "./types.ts";

/** Built‑in hooks are registered here by other chunks. */
export const BUILTIN_HOOKS: readonly Hook[] = [] as const;

/** Find a builtin hook by its identifier. */
export function hookById(id: string): Hook | undefined {
  return BUILTIN_HOOKS.find((h) => h.id === id);
}
