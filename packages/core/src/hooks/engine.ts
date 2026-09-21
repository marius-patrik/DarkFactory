import type { Hook, HookContext, HookEvent, HookResult } from "./types.ts";

/**
 * Run all hooks that are registered for the given event.
 * Hooks are executed sequentially in the order provided.
 * If a hook throws, the result is captured as a failure with the error message.
 */
export async function runHooks(
  event: HookEvent,
  ctx: HookContext,
  hooks: readonly Hook[],
): Promise<HookResult[]> {
  const results: HookResult[] = [];
  for (const hook of hooks) {
    if (!hook.events.includes(event)) continue;
    try {
      const result = await hook.run(ctx);
      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ id: hook.id, status: "fail", message });
    }
  }
  return results;
}

/** Return only the failed hook results. */
export function hookFailures(results: readonly HookResult[]): HookResult[] {
  return results.filter((r) => r.status === "fail");
}
