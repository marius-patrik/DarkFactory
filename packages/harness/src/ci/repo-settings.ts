import { GitHubClient } from "../github/client.ts";
import { GitHubRepository } from "../github/repository.ts";
import { RepositoryManifest } from "../install/manifest.ts";
import { type ApplyProtectionResult, applyBranchProtection } from "./protection.ts";

/**
 * The `--branches-only` half of `repo_settings.py`, as a command.
 *
 * The Python entry did this:
 *
 * ```python
 * run = Runner(apply=args.apply)             # apply=False prints the commands instead of running them
 * print(f"Target: {SLUG}   mode: {'APPLY' if args.apply else 'PLAN'}")
 * apply_default_branch(run)                  # PATCH repos/{slug} {"default_branch": ...}
 * if args.branches_only:
 *     apply_branch_protection(run)
 *     if run.failures: ...; sys.exit(1)
 *     print("\nDone.")
 *     return
 * ```
 *
 * So the mode is the whole of `Runner(apply=...)`: apply the changes, or print what would be done and
 * change nothing. `--branches-only` selects the default-branch and branch-protection pair and stops
 * before repository settings, labels, the board and Pages.
 *
 * ## What is not here, and why
 *
 * The other eight operations `--branches-only` skips are **not ported**. `apply_repository_settings`,
 * `apply_actions_permissions`, `apply_global_board` and `apply_board_links` have no TypeScript
 * counterpart at all, and `apply_labels`, `apply_project_board` and `apply_pages` are spread across
 * modules that were written for a different caller. This command therefore accepts `--branches-only` and
 * nothing else, and **rejects** the other flags rather than accepting and ignoring them. A flag that
 * parses and then does nothing is how a workflow ends up believing it applied protection it never
 * touched.
 *
 * `install.yml`'s `--apply --skip-protection` needs the other eight, so that invocation is not converted
 * by this command and its workflow still runs the Python.
 */

/** The four flags `repo_settings.py` declares. All are `store_true`; none take a value. */
export const REPO_SETTINGS_FLAGS = ["--apply", "--plan", "--skip-protection", "--branches-only"] as const;

export interface RepoSettingsArgs {
	/** Execute the changes. Without it, print them and change nothing. */
	apply: boolean;
	/** Reconcile only the default branch and branch protection. */
	branchesOnly: boolean;
}

/** A flag this command understands, whether or not it acts on it. */
export type RepoSettingsFlag = (typeof REPO_SETTINGS_FLAGS)[number];

/** The outcome of one run, and the exit code the Python produced for it. */
export interface RepoSettingsOutcome {
	exitCode: number;
	/** The default branch the manifest declares, which is what the repository is reconciled to. */
	defaultBranch: string;
	protection: ApplyProtectionResult | null;
	/** The flag that was accepted but has no operation behind it yet. */
	unimplemented?: RepoSettingsFlag;
}

/**
 * Parse the Python's four flags.
 *
 * Unknown flags are rejected rather than skipped. The Python's `argparse` exits 2 on an unrecognised
 * argument, and a wrapper that quietly drops one would diverge from the behaviour it replaces in the
 * direction that hides a mistake.
 */
export function parseRepoSettingsArgs(argv: readonly string[]): RepoSettingsArgs {
	const seen = new Set<string>();
	for (const argument of argv) {
		if (!argument.startsWith("-")) {
			throw new Error(`unexpected argument: ${argument}`);
		}
		if (!REPO_SETTINGS_FLAGS.includes(argument as RepoSettingsFlag)) {
			throw new Error(`unknown flag: ${argument} (repo_settings.py declares ${REPO_SETTINGS_FLAGS.join(", ")})`);
		}
		seen.add(argument);
	}
	return { apply: seen.has("--apply"), branchesOnly: seen.has("--branches-only") };
}

/** The environment the run reads, injectable so a test need not mutate `process.env`. */
export type RepoSettingsEnv = Readonly<Record<string, string | undefined>>;

/** The slug the run targets, the way the Python resolved it. */
function targetSlug(env: RepoSettingsEnv): string {
	const explicit = env.GITHUB_REPOSITORY ?? env.DF_REPO;
	if (explicit?.includes("/")) return explicit;
	// The Python fell back to the manifest, and a run with no target must not silently reconcile
	// DarkFactory against itself.
	throw new Error("no target repository: set GITHUB_REPOSITORY");
}

/**
 * `apply_default_branch`: make the manifest's stable branch the repository's GitHub default.
 *
 * `GitHubRepository` has no method for this — the default branch is repository metadata rather than an
 * issue, a pull request or a comment, so no ported method covers it. The call goes through the client's
 * generic `rest`, which is the same `PATCH repos/{slug} {"default_branch": …}` the Python issued.
 */
async function applyDefaultBranch(
	client: GitHubClient,
	slug: string,
	defaultBranch: string,
	dryRun: boolean,
	log: (message: string) => void,
): Promise<boolean> {
	if (dryRun) {
		log(`Would PATCH repos/${slug} {"default_branch": "${defaultBranch}"}`);
		return true;
	}
	await client.rest("PATCH", `repos/${slug}`, { default_branch: defaultBranch });
	return true;
}

/**
 * Run the `--branches-only` reconciliation.
 *
 * Exit codes follow the Python: 1 when an operation failed, 0 otherwise. There is no mode that exits 2
 * here — a usage error throws before any work starts, which is the `argparse` behaviour the caller sees
 * as a crash rather than a silent no-op.
 */
export async function runRepoSettings(
	args: RepoSettingsArgs,
	deps: {
		repo?: GitHubRepository;
		client?: GitHubClient;
		defaultBranch?: string;
		log?: (message: string) => void;
		env?: RepoSettingsEnv;
	} = {},
): Promise<RepoSettingsOutcome> {
	const log = deps.log ?? console.log;
	const env = deps.env ?? process.env;
	const slug = targetSlug(env);
	const [owner, name] = slug.split("/") as [string, string];
	const token = env.GH_TOKEN ?? env.GITHUB_TOKEN;
	if (!deps.repo && !token) throw new Error("no token: set GH_TOKEN or GITHUB_TOKEN");
	const client = deps.client ?? new GitHubClient({ token: token as string });
	const repo = deps.repo ?? new GitHubRepository(client, owner, name);

	const defaultBranch = deps.defaultBranch ?? new RepositoryManifest(process.cwd(), {}, env).defaultBranch();
	const dryRun = !args.apply;
	log(`Target: ${slug}   mode: ${dryRun ? "PLAN" : "APPLY"}`);

	let failures = 0;
	try {
		await applyDefaultBranch(client, slug, defaultBranch, dryRun, log);
	} catch (error) {
		failures += 1;
		log(`  failed: ${error instanceof Error ? error.message : String(error)}`);
	}

	let protection: ApplyProtectionResult | null = null;
	try {
		protection = await applyBranchProtection(repo, [], { branch: defaultBranch, dryRun });
	} catch (error) {
		failures += 1;
		log(`  failed: ${error instanceof Error ? error.message : String(error)}`);
	}

	if (failures > 0) {
		log(`\n${failures} operation(s) failed:`);
		return { exitCode: 1, defaultBranch, protection };
	}
	log("\nDone.");
	return { exitCode: 0, defaultBranch, protection };
}

/** The process entry: parse, run, report the exit code. */
export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
	const args = parseRepoSettingsArgs(argv);
	if (!args.branchesOnly) {
		throw new Error("--branches-only is required: the other operations repo_settings.py performs are not ported yet");
	}
	const outcome = await runRepoSettings(args);
	return outcome.exitCode;
}

if (import.meta.main) {
	process.exitCode = await main();
}
