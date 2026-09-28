import { branchName } from "./branch-name.ts";
import { conventionalCommit } from "./conventional-commit.ts";
import { testsTouched } from "./tests-touched.ts";
import type { Hook } from "./types.ts";

/** Built-in hooks, in the order they run for an event. */
export const BUILTIN_HOOKS: readonly Hook[] = [testsTouched, conventionalCommit, branchName];

/**
 * Finds a built-in hook by its identifier.
 *
 * @param id - Hook id, e.g. `tests-touched`.
 * @returns The hook, or undefined when no built-in hook has that id.
 */
export function hookById(id: string): Hook | undefined {
	return BUILTIN_HOOKS.find((hook) => hook.id === id);
}
