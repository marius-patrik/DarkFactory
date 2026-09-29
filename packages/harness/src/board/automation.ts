import { BoardGroup, ProjectClient, type ReconcilableBoard } from "./client.ts";
import { type BoardDeclaration, boardDeclarationOrNull } from "./declaration.ts";
import {
	type BoardEventContext,
	handleIssueEvent,
	handlePullRequestEvent,
	handlePushEvent,
	type WebhookPayload,
} from "./events.ts";
import { type GhRunner, runGh } from "./gh.ts";
import { BoardGraphqlClient } from "./graphql.ts";
import {
	type ReconcileDeps,
	type ReconcileSummary,
	reconcile,
	reconcileMembership,
	reconcileStatuses,
} from "./reconcile.ts";
import { BoardRestClient } from "./rest.ts";
import { type BoardRun, describeFailure, isRateLimited, BoardRun as Run } from "./run.ts";

/**
 * The board automation: one event, one sweep, or one reconciliation pass.
 *
 * This is the object the workflow invokes. It owns the run's budget, the two API clients and the
 * board declaration, and it resolves which boards to write to from the declaration rather than from
 * an environment variable - so a repository that declares no boards fails loudly instead of pointing
 * every item at project 1.
 */

/** How an automation run is wired. */
export interface BoardAutomationOptions {
	/** The run whose budget and failure list this automation reports against. */
	readonly run?: BoardRun;
	/** The environment the owner, the project fallback and the reconcile state are read from. */
	readonly env?: Readonly<Record<string, string | undefined>>;
	/** The repository root the board declaration is read from. Defaults to the working directory. */
	readonly root?: string;
	/** The board declaration, when the caller has already read it. */
	readonly declaration?: BoardDeclaration | null;
	/** A REST client, so a caller can substitute one. */
	readonly rest?: BoardRestClient;
	/** A GraphQL client, so a caller can substitute one. */
	readonly graphql?: BoardGraphqlClient;
	/** The `gh` CLI fallback, or null to disable the fallback. */
	readonly cli?: GhRunner | null;
}

/** Which boards a resolution should include. */
interface ResolveBoardsOptions {
	/** Include this repository's own scoped board. */
	readonly includeScoped?: boolean;
	/** Include the board aggregating every repository. */
	readonly includeGlobal?: boolean;
}

/** The fallback project number, used only when the declaration names no boards. */
function projectNumberFrom(env: Readonly<Record<string, string | undefined>>): number {
	const parsed = Number.parseInt(env.PROJECT_NUMBER ?? "1", 10);
	return Number.isNaN(parsed) ? 1 : parsed;
}

/** The login that owns the boards, defaulting to the repository owner. */
function ownerFrom(env: Readonly<Record<string, string | undefined>>): string {
	return env.PROJECT_OWNER || env.GITHUB_REPOSITORY_OWNER || "marius-patrik";
}

export class BoardAutomation {
	readonly run: BoardRun;
	readonly rest: BoardRestClient;
	readonly graphql: BoardGraphqlClient;
	readonly cli: GhRunner | null;
	readonly declaration: BoardDeclaration | null;
	readonly owner: string;
	/** Fallback project number, used only when the declaration names no boards. */
	readonly projectNumber: number;

	readonly #env: Readonly<Record<string, string | undefined>>;

	constructor(options: BoardAutomationOptions = {}) {
		this.#env = options.env ?? process.env;
		this.run = options.run ?? new Run({ env: this.#env });
		this.rest = options.rest ?? new BoardRestClient({ run: this.run, env: this.#env });
		this.graphql = options.graphql ?? new BoardGraphqlClient({ run: this.run, env: this.#env });
		this.cli = options.cli === undefined ? runGh : options.cli;
		this.declaration =
			options.declaration !== undefined ? options.declaration : boardDeclarationOrNull(options.root ?? process.cwd());
		this.owner = this.declaration?.owner || ownerFrom(this.#env);
		this.projectNumber = projectNumberFrom(this.#env);
	}

	/** One board client. */
	projectClient(projectNumber: number): ProjectClient {
		return new ProjectClient({
			owner: this.owner,
			projectNumber,
			rest: this.rest,
			graphql: this.graphql,
			run: this.run,
			cli: this.cli,
			statusFieldId: this.#env.PROJECT_STATUS_FIELD_ID,
		});
	}

	/** Several boards addressed as one. */
	boardGroup(projectNumbers: readonly number[]): BoardGroup {
		return new BoardGroup(projectNumbers.map((number) => this.projectClient(number)));
	}

	/**
	 * The project numbers of every board this repository is linked to, in declaration order.
	 *
	 * A declared board that does not exist is a failure, not a skip: silence here is what let every
	 * board write fail unnoticed for days. A declaration that cannot be read falls back to the
	 * project number, which is the one case where that fallback is right.
	 */
	async resolveBoards(options: ResolveBoardsOptions = {}): Promise<number[]> {
		const includeScoped = options.includeScoped !== false;
		const includeGlobal = options.includeGlobal !== false;
		const titles: string[] = [];
		if (includeScoped && this.declaration) titles.push(this.declaration.projectTitle);
		if (includeGlobal && this.declaration?.globalBoardTitle && !titles.includes(this.declaration.globalBoardTitle)) {
			titles.push(this.declaration.globalBoardTitle);
		}

		if (titles.length === 0) {
			this.run.say(`No boards declared; falling back to project ${this.projectNumber}.`);
			return [this.projectNumber];
		}

		let byTitle = await this.graphql.resolveProjects(this.owner);
		if (byTitle.size === 0 && this.cli) {
			try {
				const output = this.cli(["project", "list", "--owner", this.owner, "--limit", "100", "--format", "json"]);
				const projects = (JSON.parse(output) as { projects?: { title: string; number: number }[] }).projects ?? [];
				byTitle = new Map(
					projects.map((project) => [project.title, project as { id: string; title: string; number: number }]),
				);
			} catch (error) {
				if (isRateLimited(error)) {
					this.run.markRateLimited(`Project board rate limit reached resolving boards for ${this.owner}`);
					return [];
				}
				this.run.fail(`could not list projects for ${this.owner}: ${describeFailure(error)}`);
				return [];
			}
		}

		const numbers: number[] = [];
		for (const title of titles) {
			const project = byTitle.get(title);
			if (!project) {
				this.run.fail(`no project board titled "${title}" for ${this.owner}`);
				continue;
			}
			if (!numbers.includes(project.number)) numbers.push(project.number);
		}
		return numbers;
	}

	/** The context every lifecycle handler needs. */
	get eventContext(): BoardEventContext {
		return {
			run: this.run,
			defaultBranch: this.declaration?.defaultBranch ?? "main",
			developmentBranch: this.declaration?.developmentBranch ?? "main",
			sweep: async (target) => {
				await this.sweep({ target });
			},
		};
	}

	/**
	 * The full reconciliation pass over the declared boards and repositories.
	 *
	 * Every parameter narrows what the pass touches; none of them widens it. That is deliberate: a
	 * reconciliation pass writes to real issues, so a caller that means one board or one repository
	 * must say so rather than get everything.
	 */
	async sweep(
		options: {
			readonly target?: ReconcilableBoard;
			readonly boardNumbers?: readonly number[] | null;
			readonly repoSlugs?: readonly string[] | null;
			readonly dryRun?: boolean;
			readonly state?: string;
		} = {},
	): Promise<ReconcileSummary> {
		const deps = await this.sweepDeps(options.repoSlugs ? { repoSlugs: options.repoSlugs } : {});
		return reconcile(
			{
				target: options.target ?? (options.boardNumbers ? undefined : await this.everyDeclaredBoard()),
				owner: this.owner,
				boardNumbers: options.boardNumbers ?? null,
				dryRun: options.dryRun === true,
				state: options.state,
			},
			deps,
		);
	}

	/** Every declared board, plus every board linked to this repository, addressed as one. */
	async everyDeclaredBoard(): Promise<BoardGroup> {
		const numbers = await this.resolveBoards();
		const byTitle = await this.graphql.resolveProjects(this.owner);
		for (const title of this.declaration?.linkedBoards ?? []) {
			const project = byTitle.get(title);
			if (project && !numbers.includes(project.number)) numbers.push(project.number);
		}
		return this.boardGroup(numbers);
	}

	/** The repositories this run may reconcile: this one, then every other it is installed on. */
	repositoriesToScan(): string[] {
		const current = this.#env.GITHUB_REPOSITORY ?? "";
		const repos = current ? [current] : [];
		for (const repo of this.declaration?.installedOn ?? []) {
			if (repo && !repos.includes(repo)) repos.push(repo);
		}
		return repos;
	}

	/**
	 * The board titles by project number, resolved only when a credential is present.
	 *
	 * Titles decide which repositories a board carries, and asking GitHub costs quota and needs a
	 * token. A run with no token skips the question and every board is treated as scoped to the
	 * repository it was resolved for, which is the safe direction: a board that carries too little
	 * is repaired, a board that carries another repository's items is not.
	 */
	async boardTitles(): Promise<Map<number, string>> {
		if (this.#env.GH_PROJECT_TOKEN || this.#env.GH_TOKEN) {
			try {
				const byTitle = await this.graphql.resolveProjects(this.owner);
				return new Map([...byTitle].map(([title, project]) => [project.number, title]));
			} catch {
				return new Map();
			}
		}
		return new Map();
	}

	/**
	 * The membership sweep for one repository, through the boards that can carry it.
	 *
	 * A method rather than an inline call so the routing above is the only thing that decides which
	 * boards a repository reaches, and so a caller can observe the pass without reimplementing it.
	 */
	async reconcileMembershipFor(target: ReconcilableBoard, repo: string): Promise<number> {
		return reconcileMembership(target, repo, await this.sweepDeps({ repoSlugs: [repo] }));
	}

	/** The correction pass for one repository, through the boards that can carry it. */
	async reconcileFor(target: ReconcilableBoard, repoSlugs: readonly string[]): Promise<ReconcileSummary> {
		return reconcile({ target, owner: this.owner }, await this.sweepDeps({ repoSlugs }));
	}

	/** The board-wide status pass, run last because it is the one that can see a just-written item. */
	async reconcileStatusesFor(target: ReconcilableBoard): Promise<void> {
		await reconcileStatuses(target, await this.sweepDeps());
	}

	/**
	 * Handles one webhook, or reconciles everything when the trigger is a schedule.
	 *
	 * The schedule path routes each repository through the boards that can carry it: this repository
	 * through its own board and the global one, every other repository through the global board alone.
	 * A scoped board that aggregated another repository's items would put unrelated work on this
	 * repository's board, so the routing is the point rather than an optimisation.
	 */
	async processEvent(eventName: string, payload: WebhookPayload, target?: ReconcilableBoard): Promise<void> {
		if (eventName === "issues") {
			await handleIssueEvent(payload, target ?? (await this.everyDeclaredBoard()), this.eventContext);
			return;
		}
		if (eventName === "pull_request") {
			await handlePullRequestEvent(payload, target ?? (await this.everyDeclaredBoard()), this.eventContext);
			return;
		}
		if (eventName === "push") {
			await handlePushEvent(payload, target ?? (await this.everyDeclaredBoard()), this.eventContext);
			return;
		}
		if (eventName !== "workflow_dispatch" && eventName !== "schedule") return;

		if (!this.run.canReconcile()) {
			this.run.notice("Quota reserve preserved; skipping scheduled bulk reconciliation.");
			return;
		}

		const current = this.#env.GITHUB_REPOSITORY ?? "";
		let globalClient: BoardGroup | null = null;
		const own = target ?? (await this.everyDeclaredBoard());

		for (const repo of this.repositoriesToScan()) {
			if (!this.run.canReconcile()) break;
			if (!repo) continue;
			let repoClient: ReconcilableBoard = own;
			if (repo !== current) {
				// Resolved once and reused: every other repository is carried by the same global board.
				globalClient ??= this.boardGroup(await this.resolveBoards({ includeScoped: false }));
				repoClient = globalClient;
			}
			// Membership first (other repositories reach only the global board), then the same
			// corrections the real-time handlers apply.
			await this.reconcileMembershipFor(repoClient, repo);
			if (this.run.canReconcile()) await this.reconcileFor(repoClient, [repo]);
		}
		if (this.run.canReconcile()) await this.reconcileStatusesFor(own);
	}

	/** The dependencies every reconciliation pass needs, narrowed by the caller where it can. */
	async sweepDeps(overrides: Partial<ReconcileDeps> = {}): Promise<ReconcileDeps> {
		return {
			run: this.run,
			rest: this.rest,
			graphql: this.graphql,
			repoSlugs: this.repositoriesToScan(),
			titleByNumber: await this.boardTitles(),
			state: this.#env.PROJECT_RECONCILE_STATE ?? "all",
			globalTitle: this.declaration?.globalBoardTitle ?? "Global",
			...overrides,
		};
	}
}
