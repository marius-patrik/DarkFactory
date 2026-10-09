import { describe, expect, test } from "bun:test";
import type { CanonicalStatus } from "../../../protocol/src/workflow.ts";
import { BoardAutomation, type BoardAutomationOptions } from "../../src/board/automation.ts";
import { BoardGroup, ProjectClient, type ReconcilableBoard } from "../../src/board/client.ts";
import type { BoardDeclaration } from "../../src/board/declaration.ts";
import { BoardGraphqlClient } from "../../src/board/graphql.ts";
import { type ReconcileDeps, reconcile, reconcileMembership, reconcileStatuses } from "../../src/board/reconcile.ts";
import { BoardRestClient, type RestIssue } from "../../src/board/rest.ts";
import { BoardRun } from "../../src/board/run.ts";
import { expectedStatus } from "../../src/board/status.ts";
import { isStatusLabel } from "../../src/board/taxonomy.ts";
import { type FakeAnswer, fakeTransport, type RecordedRequest } from "./fakes.ts";

/**
 * Self-healing: the passes that bring a board back into agreement with the repository.
 *
 * A board is never wrong, only quietly incomplete, so these passes are the repair path. The
 * assertions are about what a pass *changes* - which counter moved, which label the issue ended up
 * carrying - because that is what a nightly run is judged on.
 */

/** The repository these fixtures name. */
const REPO = "marius-patrik/DarkFactory";

/** A pass that changed nothing, for the routing tests that only care which boards were addressed. */
const NO_CORRECTIONS = {
	missing_from_board: 0,
	status_updated: 0,
	closed_not_terminal: 0,
	open_terminal: 0,
	board_status_mismatch: 0,
	labels_corrected: 0,
	no_status_label: 0,
	label_mismatch: 0,
	multiple_status_labels: 0,
};

/** A run that reports nowhere, with a full budget. */
function quietRun(): BoardRun {
	const run = new BoardRun({ stdout: () => {}, stderr: () => {} });
	run.graphqlRemaining = 5_000;
	return run;
}

/** The board declaration this repository ships. */
function declaration(overrides: Partial<BoardDeclaration> = {}): BoardDeclaration {
	return {
		owner: "marius-patrik",
		repo: "DarkFactory",
		projectTitle: "DarkFactory",
		globalBoardTitle: "Global",
		linkedBoards: ["Global", "DarkFactory"],
		defaultBranch: "main",
		developmentBranch: "develop",
		installedOn: [REPO],
		// No App block, so the fleet lookup cannot ask GitHub and falls back to `installedOn` -
		// which is what the repository-scan tests below rely on.
		app: {},
		...overrides,
	};
}

/** A REST client whose listing the fixture controls. */
function restFor(run: BoardRun, issues: RestIssue[]): { rest: BoardRestClient; requests: RecordedRequest[] } {
	const transport = fakeTransport((request) => (request.path.endsWith("/issues") ? { body: issues } : { body: {} }));
	return { rest: new BoardRestClient({ run, token: "t", fetch: transport.fetch }), requests: transport.requests };
}

/** A GraphQL client whose board listing the fixture controls. */
function graphqlFor(
	run: BoardRun,
	items: readonly unknown[] = [],
	projects: { id: string; number: number; title: string }[] = [{ id: "PVT_1", number: 1, title: "DarkFactory" }],
): BoardGraphqlClient {
	const transport = fakeTransport((request) => {
		const operation = ((request.body as { query: string } | undefined)?.query ?? "").match(
			/(?:query|mutation) (\w+)/,
		)?.[1];
		if (operation === "GetProjects") return { body: { data: { user: { projectsV2: { nodes: projects } } } } };
		if (operation === "GetBoardItems") {
			return {
				body: {
					data: {
						node: {
							items: {
								pageInfo: { hasNextPage: false, endCursor: null },
								nodes: items,
							},
						},
					},
				},
			};
		}
		return { body: { data: { node: { fields: { nodes: [] } } } } };
	});
	return new BoardGraphqlClient({ run, token: "t", fetch: transport.fetch });
}

/** The dependencies a pass needs, with the pieces the fixture controls. */
function deps(
	run: BoardRun,
	options: { issues?: RestIssue[]; items?: readonly unknown[]; titleByNumber?: Map<number, string> } = {},
): { deps: ReconcileDeps; rest: BoardRestClient; graphql: BoardGraphqlClient } {
	const rest = restFor(run, options.issues ?? []).rest;
	const graphql = graphqlFor(run, options.items ?? []);
	return {
		rest,
		graphql,
		deps: {
			run,
			rest,
			graphql,
			repoSlugs: [REPO],
			titleByNumber: options.titleByNumber ?? new Map([[1, "DarkFactory"]]),
			globalTitle: "Global",
			state: "all",
		},
	};
}

/** A board whose items and writes the fixture controls. */
function board(run: BoardRun, graphql: BoardGraphqlClient, rest: BoardRestClient, number = 1): ProjectClient {
	const client = new ProjectClient({ owner: "marius-patrik", projectNumber: number, rest, graphql, run, cli: null });
	client.statusOptionId = async () => "opt-1";
	client.statusFieldId = async () => "F1";
	return client;
}

describe("the membership sweep", () => {
	test("every open item reaches the boards, and a pull request is work in flight", async () => {
		const run = quietRun();
		const {
			deps: pass,
			rest,
			graphql,
		} = deps(run, {
			issues: [
				{ number: 1, html_url: "https://x/issues/1", node_id: "N1", labels: [{ name: "Backlog" }] },
				{ number: 2, html_url: "https://x/pull/2", node_id: "N2", labels: [], pull_request: { url: "u" } },
			],
		});
		const client = board(run, graphql, rest);
		const tracked: [string, string][] = [];
		client.track = async (url, status) => {
			tracked.push([url, status]);
		};
		const labelled: [number, string][] = [];
		client.setStatusLabel = async (_repo, number, status) => {
			labelled.push([number, status]);
		};

		const count = await reconcileMembership(client, "o/r", pass);

		expect(count).toBe(2);
		expect(tracked).toContainEqual(["https://x/issues/1", "Backlog"]);
		// Whatever its labels say, an open pull request is not merely ToDo.
		expect(tracked).toContainEqual(["https://x/pull/2", "In Progress"]);
		expect(labelled).toContainEqual([1, "Backlog"]);
	});

	test("a repository with nothing open costs a listing and no writes", async () => {
		const run = quietRun();
		const { deps: pass, rest, graphql } = deps(run, { issues: [] });
		const client = board(run, graphql, rest);
		let tracked = 0;
		client.track = async () => {
			tracked += 1;
		};

		expect(await reconcileMembership(client, "o/r", pass)).toBe(0);
		expect(tracked).toBe(0);
	});

	test("a pull request is recognised as a pull request, not an issue", async () => {
		// Without the `pull_request` marker REST's listing has no way to tell them apart, and a
		// pull request projected as an issue lands in the ready queue.
		const run = quietRun();
		const {
			deps: pass,
			rest,
			graphql,
		} = deps(run, {
			issues: [{ number: 2, html_url: "https://x/pull/2", node_id: "N2", labels: [], pull_request: { url: "u" } }],
		});
		const client = board(run, graphql, rest);
		const tracked: string[] = [];
		client.track = async (_url, status) => {
			tracked.push(status);
		};

		await reconcileMembership(client, "o/r", pass);

		expect(tracked).toEqual(["In Progress"]);
	});

	test("historical closed items reconcile to their settled statuses", async () => {
		const run = quietRun();
		const {
			deps: pass,
			rest,
			graphql,
		} = deps(run, {
			issues: [
				{
					number: 1,
					html_url: "https://x/issues/1",
					state: "CLOSED",
					state_reason: "COMPLETED",
					labels: [{ name: "Done" }],
				},
				{ number: 2, html_url: "https://x/issues/2", state: "CLOSED", state_reason: "NOT_PLANNED", labels: [] },
				{ number: 3, html_url: "https://x/issues/3", state: "OPEN", labels: [{ name: "Backlog" }] },
				{
					number: 4,
					html_url: "https://x/pull/4",
					state: "MERGED",
					merged_at: "2026-01-01T00:00:00Z",
					labels: [],
					pull_request: { url: "u" },
				},
				{ number: 5, html_url: "https://x/pull/5", state: "CLOSED", labels: [], pull_request: { url: "u" } },
			],
		});
		const client = board(run, graphql, rest);
		const tracked: [string, string][] = [];
		client.track = async (url, status) => {
			tracked.push([url, status]);
		};

		expect(await reconcileMembership(client, "o/r", pass)).toBe(5);
		expect(tracked).toContainEqual(["https://x/issues/1", "Done"]);
		expect(tracked).toContainEqual(["https://x/issues/2", "Dropped"]);
		expect(tracked).toContainEqual(["https://x/issues/3", "Backlog"]);
		expect(tracked).toContainEqual(["https://x/pull/4", "Done"]);
		expect(tracked).toContainEqual(["https://x/pull/5", "Dropped"]);
	});

	test("a listing that fails is recorded rather than swallowed", async () => {
		const run = quietRun();
		const transport = fakeTransport((): FakeAnswer => ({ status: 500, body: { message: "boom" } }));
		const rest = new BoardRestClient({ run, token: "t", fetch: transport.fetch });
		const graphql = graphqlFor(run);
		const client = board(run, graphql, rest);

		expect(await reconcileMembership(client, "o/r", { ...deps(run).deps, rest })).toBe(0);
		expect(run.failures.some((failure) => failure.includes("could not list issues in o/r"))).toBe(true);
	});

	test("the sweep is deferred when the quota is below the reconciliation reserve", async () => {
		const run = quietRun();
		run.graphqlRemaining = 850;
		const {
			deps: pass,
			rest,
			graphql,
		} = deps(run, {
			issues: [{ number: 1, html_url: "https://x/issues/1", labels: [] }],
		});
		const client = board(run, graphql, rest);
		let tracked = 0;
		client.track = async () => {
			tracked += 1;
		};

		expect(await reconcileMembership(client, "o/r", pass)).toBe(0);
		expect(tracked).toBe(0);
	});
});

describe("the status reconciliation pass", () => {
	test("an open item with a stale terminal status is corrected from its labels", async () => {
		// Self-healing must not promote backlog items into the ready queue, and a closed item's
		// status is a fact the board must agree with rather than a judgement to preserve.
		const run = quietRun();
		const {
			deps: pass,
			rest,
			graphql,
		} = deps(run, {
			items: [
				{
					id: "i1",
					content: {
						__typename: "Issue",
						number: 1,
						url: "https://x/1",
						state: "OPEN",
						labels: { nodes: [{ name: "Backlog" }] },
					},
				},
				{
					id: "i2",
					content: {
						__typename: "Issue",
						number: 2,
						url: "https://x/2",
						state: "OPEN",
						labels: { nodes: [{ name: "bug" }] },
					},
				},
				{
					id: "i3",
					content: { __typename: "Issue", number: 3, url: "https://x/3", state: "OPEN", labels: { nodes: [] } },
					fieldValues: { nodes: [{ name: "Done", field: { name: "Status" } }] },
				},
				{
					id: "i4",
					content: { __typename: "Issue", number: 4, url: "https://x/4", state: "CLOSED", labels: { nodes: [] } },
				},
			],
		});
		const client = board(run, graphql, rest);
		const writes: [string, string][] = [];
		client.editStatus = async (itemId, status) => {
			writes.push([itemId, status]);
			return true;
		};
		client.setStatusLabel = async () => {};

		await reconcileStatuses(client, pass);

		expect(writes).toEqual([
			["i1", "Backlog"],
			["i2", "ToDo"],
			["i3", "ToDo"],
			["i4", "Dropped"],
		]);
	});

	test("a closed item labelled Done wins over a stale In Progress board status", async () => {
		const run = quietRun();
		const {
			deps: pass,
			rest,
			graphql,
		} = deps(run, {
			items: [
				{
					id: "item-96",
					content: {
						__typename: "Issue",
						number: 96,
						url: "https://x/96",
						state: "CLOSED",
						labels: { nodes: [{ name: "Request" }, { name: "Done" }] },
					},
					fieldValues: { nodes: [{ name: "In Progress", field: { name: "Status" } }] },
				},
			],
		});
		const client = board(run, graphql, rest);
		const writes: [string, string][] = [];
		client.editStatus = async (itemId, status) => {
			writes.push([itemId, status]);
			return true;
		};
		client.setStatusLabel = async () => {};

		await reconcileStatuses(client, pass);

		expect(writes).toEqual([["item-96", "Done"]]);
	});

	test("an open item carrying a Done label loses it and leaves the Done column", async () => {
		const run = quietRun();
		const {
			deps: pass,
			rest,
			graphql,
		} = deps(run, {
			items: [
				{
					id: "item-open",
					content: {
						__typename: "Issue",
						number: 50,
						url: "https://github.com/o/r/issues/50",
						state: "OPEN",
						labels: { nodes: [{ name: "Request" }, { name: "Done" }] },
					},
					fieldValues: { nodes: [{ name: "Done", field: { name: "Status" } }] },
				},
				{
					id: "item-active",
					content: {
						__typename: "Issue",
						number: 51,
						url: "https://github.com/o/r/issues/51",
						state: "OPEN",
						labels: { nodes: [{ name: "Request" }, { name: "Done" }, { name: "In Progress" }] },
					},
					fieldValues: { nodes: [{ name: "In Progress", field: { name: "Status" } }] },
				},
			],
		});
		const client = board(run, graphql, rest);
		const writes: [string, string][] = [];
		const labels: [string, number, string][] = [];
		client.editStatus = async (itemId, status) => {
			writes.push([itemId, status]);
			return true;
		};
		client.setStatusLabel = async (repo, number, status) => {
			labels.push([repo, number, status]);
		};

		await reconcileStatuses(client, pass);

		expect(writes).toContainEqual(["item-open", "ToDo"]);
		expect(writes).not.toContainEqual(["item-active", "Done"]);
		expect(labels).toContainEqual(["o/r", 50, "ToDo"]);
		expect(labels).toContainEqual(["o/r", 51, "In Progress"]);
	});

	test("every board in a group is reconciled, and an empty group is not an error", async () => {
		const run = quietRun();
		const { deps: base, rest } = deps(run);
		// Both boards answer the discovery query, so each resolves its own project node id.
		const grouped = graphqlFor(
			run,
			[
				{
					id: "i1",
					content: {
						__typename: "Issue",
						number: 1,
						url: "https://x/1",
						state: "OPEN",
						labels: { nodes: [{ name: "Backlog" }] },
					},
				},
			],
			[
				{ id: "PVT_1", number: 1, title: "DarkFactory" },
				{ id: "PVT_2", number: 2, title: "Global" },
			],
		);
		const first = board(run, grouped, rest, 1);
		const second = board(run, grouped, rest, 2);
		const writes: [string, [string, string][]][] = [];
		for (const client of [first, second]) {
			const collected: [string, string][] = [];
			client.editStatus = async (itemId, status) => {
				collected.push([itemId, status]);
				return true;
			};
			client.setStatusLabel = async () => {};
			writes.push([String(client.projectNumber), collected]);
		}

		await reconcileStatuses(new BoardGroup([first, second]), { ...base, graphql: grouped });

		expect(writes).toEqual([
			["1", [["i1", "Backlog"]]],
			["2", [["i1", "Backlog"]]],
		]);
		await expect(reconcileStatuses(new BoardGroup([]), { ...base, graphql: grouped })).resolves.toBeUndefined();
	});
});

describe("the correction pass", () => {
	/** A client whose board contents and repository labels the fixture mutates as a pass writes. */
	function auditedClient(
		run: BoardRun,
		rest: BoardRestClient,
		graphql: BoardGraphqlClient,
		issues: RestIssue[],
		boardItems: Record<string, { itemId: string; status: string | null }>,
	): ProjectClient & { boardItems: Record<string, { itemId: string; status: string | null }> } {
		const client = board(run, graphql, rest, 16) as ProjectClient & {
			boardItems: Record<string, { itemId: string; status: string | null }>;
		};
		client.boardItems = { ...boardItems };
		for (const [url, record] of Object.entries(boardItems)) client.items.set(url, record);
		client.addItem = async (url) => {
			const itemId = `item-${Object.keys(client.boardItems).length + 100}`;
			client.boardItems[url] = { itemId, status: null };
			return itemId;
		};
		client.editStatus = async (itemId, status) => {
			for (const [url, record] of Object.entries(client.boardItems)) {
				if (record.itemId === itemId) client.boardItems[url] = { itemId, status };
			}
			return true;
		};
		client.setStatusLabel = async (_repo, number, status) => {
			const issue = issues.find((entry) => entry.number === number);
			if (!issue) return;
			const kept = (issue.labels ?? []).filter((label) => {
				const name = typeof label === "string" ? label : label.name;
				return name !== null && name !== undefined && !isStatusLabel(name);
			});
			Object.assign(issue, { labels: [...kept, { name: String(status) }] });
		};
		return client;
	}

	/** The five faults an audit found: no label, a label mismatch, an open terminal, a missing member and two labels. */
	const repoIssues: RestIssue[] = [
		{
			number: 101,
			html_url: `https://github.com/${REPO}/issues/101`,
			node_id: "N101",
			labels: [{ name: "bug" }],
			state: "open",
		},
		{
			number: 102,
			html_url: `https://github.com/${REPO}/issues/102`,
			node_id: "N102",
			labels: [{ name: "In Progress" }],
			state: "closed",
			state_reason: "COMPLETED",
		},
		{
			number: 103,
			html_url: `https://github.com/${REPO}/issues/103`,
			node_id: "N103",
			labels: [{ name: "ToDo" }],
			state: "open",
		},
		{
			number: 104,
			html_url: `https://github.com/${REPO}/issues/104`,
			node_id: "N104",
			labels: [{ name: "Backlog" }],
			state: "open",
		},
		{
			number: 105,
			html_url: `https://github.com/${REPO}/issues/105`,
			node_id: "N105",
			labels: [{ name: "ToDo" }, { name: "In Progress" }],
			state: "open",
		},
	];

	const existingItems: Record<string, { itemId: string; status: string | null }> = {
		[`https://github.com/${REPO}/issues/101`]: { itemId: "item-101", status: "ToDo" },
		[`https://github.com/${REPO}/issues/102`]: { itemId: "item-102", status: "ToDo" },
		[`https://github.com/${REPO}/issues/103`]: { itemId: "item-103", status: "Done" },
		[`https://github.com/${REPO}/issues/105`]: { itemId: "item-105", status: "In Progress" },
	};

	test("every audited fault is repaired, and a dry run afterwards finds nothing", async () => {
		const run = quietRun();
		const issues = structuredClone(repoIssues);
		const { rest, graphql } = deps(run, { issues });
		const client = auditedClient(run, rest, graphql, issues, existingItems);
		const pass: ReconcileDeps = {
			run,
			rest,
			graphql,
			repoSlugs: [REPO],
			titleByNumber: new Map([[16, "DarkFactory"]]),
			globalTitle: "Global",
			state: "all",
		};

		const result = await reconcile({ target: client, owner: "marius-patrik" }, pass);
		const corrections = result.corrections;

		expect(result.itemsScanned).toBe(5);
		expect(corrections.missing_from_board).toBe(1);
		expect(corrections.closed_not_terminal).toBe(1);
		expect(corrections.open_terminal).toBe(1);
		expect(corrections.no_status_label).toBe(1);
		expect(corrections.label_mismatch).toBe(1);
		expect(corrections.multiple_status_labels).toBe(1);

		for (const issue of issues) {
			const record = client.boardItems[String(issue.html_url)];
			expect(record, `#${String(issue.number)} is on the board`).toBeDefined();
			expect(record?.status).toBe(expectedStatus(issue));
			const statusLabels = new Set(
				(issue.labels ?? [])
					.map((label) => (typeof label === "string" ? label : label.name))
					.filter((name) => name !== null && name !== undefined && isStatusLabel(name)),
			);
			expect(statusLabels).toEqual(new Set([expectedStatus(issue)]));
		}

		// A second pass is a no-op: the board already agrees with the repository, so there is
		// nothing left to correct and a nightly run costs nothing.
		const second = await reconcile({ target: client, owner: "marius-patrik", dryRun: true }, pass);
		for (const [kind, count] of Object.entries(second.corrections)) {
			expect(count, `${kind} on the second pass`).toBe(0);
		}
	});

	test("a dry run reports what it would change without writing", async () => {
		const run = quietRun();
		const issues = structuredClone(repoIssues);
		const { rest, graphql } = deps(run, { issues });
		const client = auditedClient(run, rest, graphql, issues, existingItems);
		const pass: ReconcileDeps = {
			run,
			rest,
			graphql,
			repoSlugs: [REPO],
			titleByNumber: new Map([[16, "DarkFactory"]]),
			globalTitle: "Global",
			state: "all",
		};

		const result = await reconcile({ target: client, owner: "marius-patrik", dryRun: true }, pass);

		expect(result.dryRun).toBe(true);
		expect(result.corrections.missing_from_board).toBe(1);
		expect(Object.keys(client.boardItems)).toHaveLength(4);
		expect(issues[0]?.labels).toEqual([{ name: "bug" }]);
	});

	test("a scoped board never carries another repository's items", async () => {
		// Only the global board aggregates. A scoped board that took another repository's items would
		// put unrelated work on this repository's board.
		const run = quietRun();
		const { rest, graphql } = deps(run, { issues: [{ number: 1, html_url: "https://x/1", labels: [] }] });
		const scoped = board(run, graphql, rest, 16);
		const pass: ReconcileDeps = {
			run,
			rest,
			graphql,
			repoSlugs: [REPO, "o/other"],
			titleByNumber: new Map([
				[16, "DarkFactory"],
				[17, "Global"],
			]),
			globalTitle: "Global",
			state: "all",
		};

		expect((await reconcile({ target: scoped, owner: "marius-patrik" }, pass)).itemsScanned).toBe(1);
	});

	test("the pass is skipped entirely when the reserve would be spent on it", async () => {
		const run = quietRun();
		run.graphqlRemaining = 10;
		const { deps: pass, rest, graphql } = deps(run, { issues: repoIssues });
		const client = board(run, graphql, rest, 16);

		const result = await reconcile({ target: client, owner: "marius-patrik" }, pass);

		expect(result.skipped).toBe(true);
		expect(result.itemsScanned).toBe(0);
	});
});

describe("which boards a run writes to", () => {
	/** An automation over scripted transports, so board resolution can be exercised offline. */
	function automation(options: {
		projects?: { id: string; number: number; title: string }[];
		cliProjects?: unknown;
		env?: Record<string, string | undefined>;
		declared?: BoardDeclaration | null;
		cli?: (args: readonly string[]) => string;
	}): BoardAutomation {
		const run = quietRun();
		const transport = fakeTransport((request) => {
			const operation = ((request.body as { query: string } | undefined)?.query ?? "").match(
				/(?:query|mutation) (\w+)/,
			)?.[1];
			if (operation === "GetProjects") {
				return { body: { data: { user: { projectsV2: { nodes: options.projects ?? [] } } } } };
			}
			return { body: { data: {} } };
		});
		const configuration: BoardAutomationOptions = {
			run,
			rest: new BoardRestClient({ run, token: "t", fetch: async () => new Response("[]") }),
			graphql: new BoardGraphqlClient({ run, token: "t", fetch: transport.fetch }),
			// `in`, not `??`: an explicit null is the "no declaration readable" case under test.
			declaration: "declared" in options ? options.declared : declaration(),
			env: options.env ?? {},
			cli: options.cli ?? (() => JSON.stringify({ projects: options.cliProjects ?? [] })),
		};
		return new BoardAutomation(configuration);
	}

	test("boards come from the declaration, in declaration order", async () => {
		const boards = automation({
			projects: [
				{ id: "P1", number: 11, title: "DarkFactory" },
				{ id: "P2", number: 17, title: "Global" },
			],
		});
		expect(await boards.resolveBoards()).toEqual([11, 17]);
	});

	test("each board group can be resolved on its own, for cross-repository routing", async () => {
		const boards = automation({
			projects: [
				{ id: "P1", number: 11, title: "DarkFactory" },
				{ id: "P2", number: 17, title: "Global" },
			],
		});
		expect(await boards.resolveBoards({ includeScoped: false })).toEqual([17]);
		expect(await boards.resolveBoards({ includeGlobal: false })).toEqual([11]);
	});

	test("a declared board that does not exist is a failure, not a skip", async () => {
		// Silence here is what let every write fail unnoticed for days.
		const boards = automation({ projects: [{ id: "P2", number: 17, title: "Global" }] });
		expect(await boards.resolveBoards()).toEqual([17]);
		expect(boards.run.failures.some((failure) => failure.includes("DarkFactory"))).toBe(true);
	});

	test("discovery falls back to the CLI when the API answers with nothing", async () => {
		const boards = automation({
			projects: [],
			cliProjects: [
				{ title: "DarkFactory", number: 11 },
				{ title: "Global", number: 17 },
			],
		});
		expect(await boards.resolveBoards()).toEqual([11, 17]);
	});

	test("a rate limit while resolving boards pauses instead of reporting a failure", async () => {
		const boards = automation({
			projects: [],
			cli: () => {
				throw new Error("gh project list exited with status 1 (unknown owner type)");
			},
		});
		expect(await boards.resolveBoards()).toEqual([]);
		expect(boards.run.rateLimited).toBe(true);
		expect(boards.run.failures).toEqual([]);
	});

	test("a repository whose declaration cannot be read falls back to the project number", async () => {
		// The one case where the project number is the right answer. Falling back is reported, so a
		// misconfiguration is visible rather than silently pointing every item at project 1.
		const boards = automation({ declared: null });
		expect(await boards.resolveBoards()).toEqual([boards.projectNumber]);
		expect(boards.run.failures).toEqual([]);
	});

	test("the schedule routes this repository through both boards and the others through the global one", async () => {
		// The routing table is the point, not an optimisation: another repository's items on a
		// scoped board is how unrelated work ends up on this repository's board.
		const reconciled: [string, number[]][] = [];
		const corrected: [string[], number[]][] = [];
		const boards = automation({
			projects: [
				{ id: "P1", number: 11, title: "Scoped" },
				{ id: "P2", number: 17, title: "Global" },
			],
			declared: declaration({
				projectTitle: "Scoped",
				linkedBoards: ["Scoped", "Global"],
				installedOn: ["o/current", "o/other"],
				app: {},
			}),
			env: { GITHUB_REPOSITORY: "o/current" },
		});
		const record = (target: ReconcilableBoard | undefined) => {
			const group = target as BoardGroup;
			return group.clients.map((client) => client.projectNumber);
		};
		boards.reconcileMembershipFor = async (target, repo) => {
			reconciled.push([repo, record(target)]);
			return 0;
		};
		boards.reconcileFor = async (target, repoSlugs) => {
			corrected.push([[...repoSlugs], record(target)]);
			return { itemsScanned: 0, corrections: NO_CORRECTIONS, dryRun: false };
		};
		boards.reconcileStatusesFor = async () => {};

		await boards.processEvent("schedule", {});

		expect(reconciled).toEqual([
			["o/current", [11, 17]],
			["o/other", [17]],
		]);
		expect(corrected).toEqual([
			[["o/current"], [11, 17]],
			[["o/other"], [17]],
		]);
	});

	test("the global-only client is resolved once and reused for every other repository", async () => {
		const resolutions: (readonly (boolean | undefined)[])[] = [];
		const reconciled: [string, number[]][] = [];
		const boards = automation({
			projects: [
				{ id: "P1", number: 11, title: "Scoped" },
				{ id: "P2", number: 17, title: "Global" },
			],
			declared: declaration({
				projectTitle: "Scoped",
				linkedBoards: ["Scoped", "Global"],
				installedOn: ["o/current", "o/other-a", "o/other-b"],
				app: {},
			}),
			env: { GITHUB_REPOSITORY: "o/current" },
		});
		const resolveBoards = boards.resolveBoards.bind(boards);
		boards.resolveBoards = async (options) => {
			resolutions.push([options?.includeScoped]);
			return resolveBoards(options);
		};
		boards.reconcileMembershipFor = async (target, repo) => {
			reconciled.push([repo, (target as BoardGroup).clients.map((client) => client.projectNumber)]);
			return 0;
		};
		boards.reconcileFor = async () => ({ itemsScanned: 0, corrections: NO_CORRECTIONS, dryRun: false });
		boards.reconcileStatusesFor = async () => {};

		await boards.processEvent("schedule", {});

		expect(reconciled).toEqual([
			["o/current", [11, 17]],
			["o/other-a", [17]],
			["o/other-b", [17]],
		]);
		// Exactly one scoped-out resolution, reused for both other repositories.
		expect(resolutions.filter((entry) => entry.includes(false))).toHaveLength(1);
	});

	test("a schedule run below the reserve reconciles nothing and says so", async () => {
		const boards = automation({ projects: [] });
		boards.run.graphqlRemaining = 10;
		let swept = 0;
		boards.reconcileStatusesFor = async () => {
			swept += 1;
		};

		await boards.processEvent("schedule", {});

		expect(swept).toBe(0);
	});
});

describe("the status a run writes for a board item", () => {
	test("a board listing's content is projected exactly as a webhook's payload is", async () => {
		// Both sources reach `expectedStatus`, so an item cannot read one way in a webhook and
		// another way on the nightly scan.
		const fromWebhook = expectedStatus({
			kind: "Issue",
			is_pr: false,
			state: "closed",
			state_reason: "completed",
			labels: [{ name: "In Progress" }],
		});
		const fromListing = expectedStatus({
			__typename: "Issue",
			state: "CLOSED",
			stateReason: "COMPLETED",
			labels: { nodes: [{ name: "In Progress" }] },
		});
		expect(fromListing).toBe(fromWebhook);
	});

	test("a GraphQL pull request is recognised by its typename", async () => {
		const status: CanonicalStatus = expectedStatus({ __typename: "PullRequest", state: "OPEN", merged: false });
		expect(status).toBe("In Progress");
	});
});
