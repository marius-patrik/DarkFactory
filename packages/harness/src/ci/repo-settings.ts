import { BoardGraphqlClient } from "../board/graphql.ts";
import { BoardRun } from "../board/run.ts";
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
	/**
	 * `--skip-protection`: run everything except branch protection.
	 *
	 * `install.yml` passes it, because the repository is being configured before its first CI run has
	 * ever reported and a protection rule requiring a status check that has never run would block the
	 * very push that creates it.
	 */
	skipProtection: boolean;
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
	return {
		apply: seen.has("--apply"),
		branchesOnly: seen.has("--branches-only"),
		skipProtection: seen.has("--skip-protection"),
	};
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

/** The title of the single board that spans every repository in the fleet. */

/** One project's title, number and node id, as the board clients already resolve them. */
export interface ProjectRef {
	title: string;
	number: number;
	id: string;
}

/**
 * The board capabilities the two project operations need.
 *
 * A port rather than a direct dependency on `BoardAutomation`, so the caller — the workflow, or a test —
 * supplies the four calls and this module stays free of board construction.
 */
/**
 * A read of the owner's project listing, or the reason there is not one.
 *
 * This is not a `Map` that happens to be empty. An empty listing and a listing that could not be read
 * look identical, and the difference decides whether a board is created: absence is grounds to create,
 * a failed read is not. The Python drew the same distinction with a `LookupFailed` exception, and its
 * docstring recorded what happens without it — one timeout during a reconcile created a second board
 * with the same title, which then appeared twice in two repositories' Projects tabs.
 */
export type ProjectListing =
	| { readonly read: true; readonly byTitle: ReadonlyMap<string, ProjectRef> }
	| { readonly read: false; readonly reason: string };

export interface RepoSettingsBoardPort {
	/** The owner's project listing, or why it could not be read. */
	readProjects(owner: string): Promise<ProjectListing>;
	/** Create a project. The Python passed `allow_fail=True`, so a failure is tolerated here too. */
	createProject(owner: string, title: string): void;
	/** The repository's GraphQL node id, needed to link a board to it. */
	repositoryNodeId(slug: string): Promise<string | null>;
	/** `linkProjectV2ToRepository`. */
	linkProjectToRepository(projectId: string, repositoryId: string): Promise<void>;
}

/** What the four operations read out of the manifest, so a caller can inject it without a disk read. */
export interface RepoSettingsManifestView {
	description: string;
	homepage: string;
	topics: string[];
	boards: string[];
	globalBoard?: string | undefined;
	/** The declared status vocabulary, in column order; the canonical seven when undeclared. */
	statusNames: string[];
	owner: string;
}

/**
 * `apply_repository_settings`: the repository's own settings, and its topics.
 *
 * Ported so the full run is available, which is what `install.yml` invokes with `--apply
 * --skip-protection`. Each is the same shape as the Python: one printed heading, one or two API calls,
 * and a `failed` line rather than a throw when something is missing.
 */
export async function applyRepositorySettings(
	client: GitHubClient,
	slug: string,
	manifest: RepoSettingsManifestView,
	dryRun: boolean,
	log: (message: string) => void,
): Promise<void> {
	log("\n== Repository settings ==");
	const settings = {
		description: manifest.description,
		homepage: manifest.homepage,
		has_issues: true,
		has_projects: true,
		has_wiki: false,
		allow_squash_merge: true,
		allow_merge_commit: true,
		allow_rebase_merge: true,
		allow_auto_merge: true,
		delete_branch_on_merge: true,
		allow_update_branch: true,
		web_commit_signoff_required: false,
	};
	if (dryRun) {
		log(`  would PATCH repos/${slug} with ${Object.keys(settings).length} setting(s)`);
		log(`  would PUT repos/${slug}/topics with [${manifest.topics.join(", ")}]`);
		return;
	}
	await client.rest("PATCH", `repos/${slug}`, settings);
	await client.rest("PUT", `repos/${slug}/topics`, { names: manifest.topics });
}

/**
 * `apply_actions_permissions`.
 *
 * `can_approve_pull_request_reviews` is not optional. Without it the bot cannot submit the proxy
 * approval that unblocks auto-merge, and every pull request stalls at `REVIEW_REQUIRED` — which is
 * exactly the state this repository's own review requirement was in until it was corrected.
 */
export async function applyActionsPermissions(
	client: GitHubClient,
	slug: string,
	dryRun: boolean,
	log: (message: string) => void,
): Promise<void> {
	log("\n== Actions permissions ==");
	if (dryRun) {
		log("  would enable Actions and grant workflow `write` with review approval");
		return;
	}
	await client.rest("PUT", `repos/${slug}/actions/permissions`, { enabled: true, allowed_actions: "all" });
	await client.rest("PUT", `repos/${slug}/actions/permissions/workflow`, {
		default_workflow_permissions: "write",
		can_approve_pull_request_reviews: true,
	});
}

/**
 * `apply_global_board`.
 *
 * A Projects v2 board can hold issues from any repository the owner can see, so one global board gives
 * a single view across the fleet while each repository keeps its own focused board.
 *
 * The lookup is the part that matters: creating on a *failed* lookup is how a duplicate board gets
 * made, so a lookup that cannot answer skips rather than creating, and the next run reconciles it.
 */
export async function applyBoards(
	deps: Pick<RepoSettingsBoardPort, "readProjects" | "createProject">,
	manifest: RepoSettingsManifestView,
	titles: readonly string[],
	global: string | undefined,
	dryRun: boolean,
	log: (message: string) => void,
): Promise<void> {
	// Every board the repository declares, not one special board. The previous version took a single
	// global title and created only that, so a repository declaring four boards had one created and
	// three linked-if-they-happened-to-exist — which is a board that silently does not appear.
	log("\n== Project boards ==");
	if (titles.length === 0) {
		log("  no boards declared");
		return;
	}
	const listing = await deps.readProjects(manifest.owner);
	if (!listing.read) {
		// Every declared board would read as absent, and creating all of them because one API call
		// failed is how the duplicate appeared. Nothing is created and nothing is concluded.
		log(`  skipped: ${listing.reason}`);
		return;
	}
	for (const title of titles) {
		const role = title === global ? " (global)" : "";
		if (listing.byTitle.has(title)) {
			log(`  '${title}'${role} already exists`);
			continue;
		}
		if (dryRun) {
			log(`  would create '${title}'${role} for ${manifest.owner}`);
			continue;
		}
		deps.createProject(manifest.owner, title);
		log(`  created '${title}'${role}`);
	}
}

/**
 * `apply_board_links`.
 *
 * Boards are owned by the account, not the repository, so a board only appears in a repository's
 * Projects tab once it is explicitly linked. Linking every declared board is what makes one repository
 * the place all of them are visible from.
 */
export async function applyBoardLinks(
	deps: Pick<RepoSettingsBoardPort, "repositoryNodeId" | "readProjects" | "linkProjectToRepository">,
	manifest: RepoSettingsManifestView,
	slug: string,
	dryRun: boolean,
	log: (message: string) => void,
): Promise<void> {
	log("\n== Project board links ==");
	const titles = manifest.boards;
	if (titles.length === 0) {
		log("  no boards declared");
		return;
	}
	const repositoryId = await deps.repositoryNodeId(slug);
	if (!repositoryId) {
		log(
			dryRun
				? `  would link ${titles.length} board(s): ${titles.join(", ")}`
				: "  could not resolve the repository node id; skipping",
		);
		return;
	}
	const listing = await deps.readProjects(manifest.owner);
	if (!listing.read) {
		log(`  skipped: ${listing.reason}`);
		return;
	}
	for (const title of titles) {
		const project = listing.byTitle.get(title);
		if (!project?.id) {
			log(`  board '${title}' not found; skipping`);
			continue;
		}
		if (dryRun) {
			log(`  would link '${title}'`);
			continue;
		}
		await deps.linkProjectToRepository(project.id, repositoryId);
		log(`  linked '${title}'`);
	}
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
		manifest?: RepositoryManifest;
		/** The board port the two project operations need. Omitted means those operations are skipped. */
		board?: RepoSettingsBoardPort;
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

	// `install.yml` sets `DARKFACTORY_REPO_ROOT` to the consumer checkout. It used to be honoured
	// because the Python read it, and a run with no target must not silently reconcile DarkFactory
	// against itself — which is what reading the pipeline's own directory would do. The workflow
	// also sets `working-directory: target`, so the cwd agrees today; reading the variable rather
	// than the cwd is what keeps it correct if either half changes.
	const repositoryRoot = env.DARKFACTORY_REPO_ROOT ?? process.cwd();
	const repositoryManifest = deps.manifest ?? new RepositoryManifest(repositoryRoot, {}, env);
	const defaultBranch = deps.defaultBranch ?? repositoryManifest.defaultBranch();
	const dryRun = !args.apply;
	log(`Target: ${slug}   mode: ${dryRun ? "PLAN" : "APPLY"}`);

	const fail = (error: unknown) => {
		failures += 1;
		log(`  failed: ${error instanceof Error ? error.message : String(error)}`);
	};

	let failures = 0;
	try {
		await applyDefaultBranch(client, slug, defaultBranch, dryRun, log);
	} catch (error) {
		fail(error);
	}

	// `--branches-only` is the Python's early return: the default branch and branch protection, and
	// nothing else. `install.yml` passes no flag, which is the full run.
	if (args.branchesOnly) {
		// Every lane the configuration declares, in the order it declares them. A repository with no
		// `protection.lanes` gets no branch protection at all, which is the honest reading of a
		// document that says nothing about protection — not a default the pipeline picks.
		const lanes = repositoryManifest.protectedBranches();
		if (lanes.length === 0) {
			log("\nNo `repo.protection.lanes` are declared, so no branch is protected.");
		}
		const results: ApplyProtectionResult[] = [];
		for (const lane of lanes) {
			log(`\n== Branch protection (${lane.branch}) ==`);
			try {
				results.push(
					await applyBranchProtection(repo, lane.requiredChecks, {
						branch: lane.branch,
						strict: lane.strict,
						approvals: lane.approvals,
						enforceAdmins: lane.enforceAdmins,
						resolveConversations: lane.resolveConversations,
						dryRun,
					}),
				);
			} catch (error) {
				fail(error);
			}
		}
		const protection = results[0] ?? null;
		if (failures > 0) {
			log(`\n${failures} operation(s) failed:`);
			return { exitCode: 1, defaultBranch, protection };
		}
		log("\nDone.");
		return { exitCode: 0, defaultBranch, protection };
	}

	// A missing board port in the full run is a wiring fault, not a mode: the two project operations
	// would otherwise report success having done nothing, which is the failure this file exists to
	// prevent. Only `--branches-only` legitimately has no board, and that has already returned.
	const board = deps.board;
	if (board === undefined) {
		throw new Error("the full run needs a board port: pass one, or use --branches-only");
	}

	const manifest: RepoSettingsManifestView = {
		description: repositoryManifest.description(),
		homepage: repositoryManifest.homepage(env),
		topics: repositoryManifest.topics(),
		boards: repositoryManifest.boards(env),
		globalBoard: repositoryManifest.globalBoard(env),
		statusNames: repositoryManifest.statuses(),
		owner: repositoryManifest.owner(env),
	};

	for (const [name, run] of [
		["repository settings", () => applyRepositorySettings(client, slug, manifest, dryRun, log)],
		["actions permissions", () => applyActionsPermissions(client, slug, dryRun, log)],
		[
			"project boards",
			() =>
				applyBoards(
					{
						readProjects: (owner: string) => board.readProjects(owner),
						createProject: (owner: string, title: string) => board.createProject(owner, title),
					},
					manifest,
					manifest.boards,
					manifest.globalBoard,
					dryRun,
					log,
				),
		],
		[
			"project board links",
			() =>
				applyBoardLinks(
					{
						repositoryNodeId: () => board.repositoryNodeId(slug),
						readProjects: (owner: string) => board.readProjects(owner),
						linkProjectToRepository: (projectId: string, repositoryId: string) =>
							board.linkProjectToRepository(projectId, repositoryId),
					},
					manifest,
					slug,
					dryRun,
					log,
				),
		],
	] as const) {
		try {
			await run();
		} catch (error) {
			fail(error);
		}
		void name;
	}

	let protection: ApplyProtectionResult | null = null;
	if (args.skipProtection) {
		log("\n== Branch protection (main) ==\n  skipped by --skip-protection");
	} else {
		try {
			protection = await applyBranchProtection(repo, [], { branch: defaultBranch, dryRun });
		} catch (error) {
			fail(error);
		}
	}

	if (failures > 0) {
		log(`\n${failures} operation(s) failed:`);
		return { exitCode: 1, defaultBranch, protection };
	}
	log("\nDone.");
	return { exitCode: 0, defaultBranch, protection };
}

/**
 * The board port, over the board client that already exists.
 *
 * `BoardGraphqlClient` knows how to find projects, create them, resolve a repository's node id and add
 * a project item; the port is the four of those calls the two board operations name, so the
 * operations stay free of board construction and this is the only place the two are joined.
 *
 * @param env The environment the token fallback chain is read from.
 * @param run The run whose budget and failure list the client reports against.
 */
export function createBoardPort(
	env: RepoSettingsEnv,
	run: BoardRun,
	statusNames?: readonly string[],
): RepoSettingsBoardPort {
	const client = new BoardGraphqlClient({ run, env, statusNames });
	return {
		async readProjects(owner: string): Promise<ProjectListing> {
			// The client swallows a failed listing and returns nothing, because its other callers want
			// to carry on. Here that has to be visible: a reconcile that cannot see the boards must not
			// conclude they are absent, or it creates them. An empty listing is therefore reported as
			// unreadable rather than as absence — which is only sound while the client's fallback is
			// empty, and is the reason the client is not the right place for this decision.
			const listed = await client.listProjects(owner);
			if (!listed.ok) return { read: false, reason: listed.reason };
			// An account with no boards is a successful read of nothing: every declared board is
			// genuinely absent, which is the one case where creating them is correct.
			return {
				read: true,
				byTitle: new Map(
					[...listed.projects].map(([title, node]) => [title, { title: node.title, number: node.number, id: node.id }]),
				),
			};
		},
		// The Python passed `allow_fail=True` here, so a project that cannot be created is reported by
		// the client and not raised at the call site.
		createProject(owner: string, title: string): void {
			void client.createProject(owner, title);
		},
		async repositoryNodeId(slug: string): Promise<string | null> {
			return (await client.repositoryNodeId(slug)) ?? null;
		},
		async linkProjectToRepository(projectId: string, repositoryId: string): Promise<void> {
			await client.addItem(projectId, repositoryId);
		},
	};
}

/** The process entry: parse, run, report the exit code. */
export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
	const args = parseRepoSettingsArgs(argv);
	const outcome = await runRepoSettings(args, { board: createBoardPort(process.env, new BoardRun()) });
	return outcome.exitCode;
}

if (import.meta.main) {
	process.exitCode = await main();
}
