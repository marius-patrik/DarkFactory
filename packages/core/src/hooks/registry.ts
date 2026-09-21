import type { Hook } from "./types.ts";
import { capability } from "../../../../capabilities/hooks/capability.ts";

/** Built‑in hooks are registered here by other chunks. */
export const BUILTIN_HOOKS: readonly Hook[] = (capability.hooks ?? []).map((h) => ({
    id: h.id,
    events: h.events as any, // Relaxing type for integration
    run: async (ctx) => {
        const result = await h.execute(ctx as any);
        return {
            id: h.id,
            status: result.status,
            message: result.message
        };
    }
}));

/** Find a builtin hook by its identifier. */
export function hookById(id: string): Hook | undefined {
  return BUILTIN_HOOKS.find((h) => h.id === id);
}

/** Validates that a hook ID is registered. */
export function validateHookId(id: string): boolean {
  return hookById(id) !== undefined;
}
