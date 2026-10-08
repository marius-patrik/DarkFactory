/**
 * Reports what the sweep decided, as a `matrix=` value for `install-sweep.yml`.
 *
 * This is the boundary between deciding and acting. `planSweep` computes the targets; this resolves the
 * credentials it needs, calls it, and writes the result out. It does **not** install anything — the
 * workflow calls the now-callable `install.yml` once per target, so there is one code path that writes
 * to a consumer repository whether a person dispatched it or the sweep found it.
 *
 * Credentials, because the two endpoints want different ones and the difference is invisible in the
 * failure otherwise: `GET /app/installations` rejects anything but an App **JWT** ("you must use a JWT
 * to access this endpoint"), and `GET /installation/repositories` rejects anything but an installation
 * **token**. Swapping them produces a 403 that reads like a permissions problem.
 */

import { appendFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { GitHubClient } from "../github/client.ts";
import { AppInstallationTokenProvider, appIdentityFromManifest } from "../../../keychain/src/index.ts";
import { MANIFEST_PATH } from "./manifest.ts";
import { planSweep } from "./sweep.ts";

/** Everything this entry point reads, so a test can supply it without a process environment. */
interface SweepEnvironment {
	[key: string]: string | undefined;
	/** Root of the pipeline checkout, where `repo.dfconfig` lives. */
	PIPELINE_ROOT?: string;
	/** App private key, PEM. Absent means the sweep cannot run and says so. */
	DARKFACTORY_APP_PRIVATE_KEY?: string;
	/** `owner/name` of the pipeline, never a target. */
	PIPELINE_REPO?: string;
	/** GitHub token, used only to read repository contents. */
	GH_TOKEN?: string;
	GITHUB_OUTPUT?: string;
}

/**
 * Configuration-document names an installation may have selected.
 *
 * Mirrors the candidates `resolveManifestPath` accepts. Probing only the default would report a
 * repository using an alias as uninstalled and re-install it every tick; the list lives here beside
 * the reader rather than in `sweep.ts`, which takes the predicate as a parameter for exactly this
 * reason.
 */
const CONFIG_DOCUMENT_NAMES = [MANIFEST_PATH, "config.dfconfig", ".dfconfig"];

/**
 * Whether a repository already holds an installation.
 *
 * Two probes, because either alone is wrong. A caller (`agent.yml` carrying a `uses:` to the
 * pipeline) means the installation is in place even if the manifest is missing; the manifest alone
 * means a repository configured by hand is done even with no caller. Requiring both would re-install
 * every hand-configured repository on every tick.
 *
 * @param client Read-only client for the repository.
 * @param slug `owner/name`.
 * @returns True when a manifest or a caller is present.
 */
async function alreadyInstalled(client: GitHubClient, slug: string): Promise<boolean> {
	const path = (file: string) => `/repos/${slug}/contents/${file}?ref=main`;
	const exists = async (file: string): Promise<boolean> => {
		try {
			await client.rest("GET", path(file));
			return true;
		} catch {
			return false;
		}
	};

	// `some` short-circuits, so a repository with both costs one request rather than three.
	for (const name of CONFIG_DOCUMENT_NAMES) if (await exists(name)) return true;
	return exists(".github/workflows/agent.yml");
}

/**
 * Writes the sweep's decision to `$GITHUB_OUTPUT` as `matrix=`, `has-targets=` and `report=`.
 *
 * Reports rather than only targeting: a sweep that found the App, installed nothing and said nothing
 * is indistinguishable from a broken one. Skips are summarised by reason with one example each, which
 * is enough to act on and short enough to stay readable in a run log.
 *
 * @param env The workflow's environment, or a stand-in for it.
 * @returns What was written, for the caller to log.
 */
export async function runSweep(
	env: SweepEnvironment,
): Promise<{ targets: number; installations: number; report: string }> {
	const root = env.PIPELINE_ROOT ?? ".";
	const privateKey = env.DARKFACTORY_APP_PRIVATE_KEY;

	if (!privateKey) {
		// Not an error: a repository without the App key is the normal state for a fork, and failing
		// the whole workflow would make every schedule red for a configuration question.
		const report = "no DARKFACTORY_APP_PRIVATE_KEY: the App is not configured here, so there is nothing to sweep";
		write(env, { matrix: [], hasTargets: false, report });
		return { targets: 0, installations: 0, report };
	}

	const pipelineRepo = env.PIPELINE_REPO ?? "marius-patrik/DarkFactory";
	const document = JSON.parse(await readFile(join(root, MANIFEST_PATH), "utf8")) as { repo: unknown };

	// One provider for the whole sweep. It mints an installation token, caches it for an hour, and
	// re-mints on a 401 - so a fan-out over twenty repositories costs one mint rather than twenty.
	const app = new AppInstallationTokenProvider(
		await appIdentityFromManifest(document, pipelineRepo, () => privateKey),
		{ fetch: globalThis.fetch },
	);

	// Reading repository contents needs no App scope, so a person's token is used when there is one and
	// the App's otherwise. `GH_TOKEN` first, matching every other workflow in this repository.
	const readToken = env.GH_TOKEN ?? env.GITHUB_TOKEN;
	const readClient = new GitHubClient({ token: readToken ?? (() => app.getToken()), fetch: globalThis.fetch });

	const plan = await planSweep({
		jwtClient: new GitHubClient({ token: () => app.getToken(), fetch: globalThis.fetch }),
		// A JWT and an installation token are both minted by the same provider, because signing one from
		// the other is what the provider already does; the endpoints differ in what they accept, not in
		// where the credential comes from.
		clientForInstallation: async () => new GitHubClient({ token: () => app.getToken(), fetch: globalThis.fetch }),
		isInstalled: async (slug) => alreadyInstalled(readClient, slug),
		pipelineSlug: pipelineRepo,
	});

	const matrix = plan.targets.map((target) => ({ repository: target.slug }));
	const report = renderReport(
		plan.installations,
		plan.targets.map((t) => t.slug),
		plan.skips,
	);
	write(env, { matrix, hasTargets: matrix.length > 0, report });
	return { targets: matrix.length, installations: plan.installations, report };
}

/**
 * Summarises a sweep for a run log.
 *
 * @param installations Installations seen.
 * @param targets Repository slugs chosen for installation.
 * @param skips Everything passed over, with its reason.
 * @returns One line per fact, ending in a reason tally.
 */
export function renderReport(
	installations: number,
	targets: string[],
	skips: Array<{ slug: string; reason: string; detail?: string }>,
): string {
	const byReason = new Map<string, string[]>();
	for (const skip of skips) {
		const list = byReason.get(skip.reason) ?? [];
		// One example per reason: the full list is in the plan, and a log listing six hundred archived
		// repositories helps nobody.
		if (list.length < 3) list.push(skip.slug);
		byReason.set(skip.reason, list);
	}

	const lines = [
		`${installations} installation(s), ${targets.length} target(s)`,
		targets.length > 0 ? `targets: ${targets.join(", ")}` : "targets: none",
		...Array.from(byReason.entries()).map(
			([reason, examples]) =>
				`skipped ${reason}: ${examples.join(", ")}${skips.filter((s) => s.reason === reason).length > examples.length ? ", …" : ""}`,
		),
	];
	return lines.join("\n");
}

/**
 * Writes the three outputs.
 *
 * `matrix` uses the heredoc form because a repository name may contain a character the single-line
 * form cannot carry safely, and `install-sweep.yml` reads it back as JSON either way.
 */
function write(env: SweepEnvironment, values: { matrix: unknown[]; hasTargets: boolean; report: string }): void {
	if (!env.GITHUB_OUTPUT) return;
	const delimiter = "DARKFACTORY_SWEEP_MATRIX";
	appendFileSync(
		env.GITHUB_OUTPUT,
		`matrix<<${delimiter}\n${JSON.stringify(values.matrix)}\n${delimiter}\n` +
			`has-targets=${values.hasTargets}\n` +
			`report<<${delimiter}\n${values.report}\n${delimiter}\n`,
		"utf8",
	);
}

if (import.meta.main) {
	try {
		const result = await runSweep(process.env);
		console.log(result.report);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
