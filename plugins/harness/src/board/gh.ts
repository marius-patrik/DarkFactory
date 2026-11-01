import { spawnSync } from "node:child_process";
import { CommandFailure } from "./run.ts";

/**
 * The `gh` CLI, used only where the GraphQL API has no answer.
 *
 * Discovery of a project node id, of the Status field, and of the option ids are all GraphQL calls
 * that can come back empty - a token without project scope, a board that was just created. When they
 * do, the CLI is the fallback, and it needs its own identity: Projects v2 permissions are
 * org-scoped, so a user-owned board needs the user's token, while repository work must keep the
 * App's. Reaching for `gh` without choosing means picking the wrong one of the two.
 */

/** Runs one `gh` invocation and returns its standard output. */
export type GhRunner = (args: readonly string[]) => string;

/**
 * The environment one `gh` invocation runs with.
 *
 * `project` subcommands take the project token, because only a person's token can read a
 * user-owned board; everything else keeps whatever `GH_TOKEN` the run already has, which is the App's
 * installation token. A repository that never configured a project token is unaffected.
 */
export function ghEnvironment(
	args: readonly string[],
	env: Readonly<Record<string, string | undefined>> = process.env,
): Record<string, string | undefined> {
	if (args[0] === "project" && env.GH_PROJECT_TOKEN) {
		return { ...env, GH_TOKEN: env.GH_PROJECT_TOKEN };
	}
	return { ...env };
}

/** Runs `gh` with the token its subcommand needs, raising on a non-zero exit. */
export const runGh: GhRunner = (args) => {
	const result = spawnSync("gh", [...args], { encoding: "buffer", env: ghEnvironment(args) });
	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new CommandFailure(`gh ${args.join(" ")} exited with status ${result.status}`, result.stderr, result.stdout);
	}
	return result.stdout.toString("utf8").trim();
};
