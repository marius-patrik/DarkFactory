/** @packageDocumentation
 * Which credential one `gh` invocation should authenticate with.
 *
 * The GitHub App this pipeline installs holds no `administration` permission: repository settings,
 * topics, Actions permissions, branch protection and `/pages` all 403 as the installation. Listing
 * secrets needs `secrets`, and Projects v2 is scoped to organisations. What is left for the App is
 * label work, which is most of the API calls by count and all of the GraphQL ones - and GraphQL is
 * where a person's quota actually runs out.
 *
 * The capability list is written as what the App *can* do rather than as what it cannot, and that
 * direction is the whole point. Enumerating the exceptions meant every new call silently defaulted to
 * the App and 403'd; enumerating the capability means a new call defaults to the token that works,
 * and widening the App's reach becomes a decision somebody has to write down.
 */

/** The `gh` subcommands the installation token can serve on its own. */
const APP_CAPABLE_OPERATIONS: readonly string[] = ["label", "issue"];

/** API path fragments the installation token can serve on its own, matched as substrings. */
export const APP_CAPABLE_PATHS: readonly string[] = ["/labels", "/issues"];

/** The environment variable holding the personal token that can reach the rest. */
const PROJECT_TOKEN_VARIABLE = "GH_PROJECT_TOKEN";

/**
 * Whether one `gh` invocation can be served by the installation token.
 *
 * @param args Arguments following the `gh` executable.
 * @returns `true` when the App's own credential suffices for this call.
 */
export function appCanAuthenticate(args: readonly string[]): boolean {
	if (args.length === 0) return false;
	if (APP_CAPABLE_OPERATIONS.includes(args[0] ?? "")) return true;
	return args.some((arg) => APP_CAPABLE_PATHS.some((path) => arg.includes(path)));
}

/**
 * The environment one `gh` invocation should run in.
 *
 * A call the App cannot serve is given the personal token, because leaving it on the App produces a
 * `Resource not accessible by integration` that reads like a missing permission rather than like the
 * wrong credential. With no personal token configured the environment is returned untouched, so the
 * call falls through to whatever `gh` would otherwise use.
 *
 * @param args Arguments following the `gh` executable.
 * @param env The environment to start from, defaulting to this process's own.
 * @returns The environment to run the call in.
 */
export function ghEnvironment(
	args: readonly string[],
	env: Readonly<Record<string, string | undefined>> = process.env,
): NodeJS.ProcessEnv {
	const next: NodeJS.ProcessEnv = { ...env };
	const userToken = next[PROJECT_TOKEN_VARIABLE];
	if (!userToken) return next;
	if (!appCanAuthenticate(args)) next.GH_TOKEN = userToken;
	return next;
}
