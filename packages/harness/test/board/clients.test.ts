import { describe, expect, test } from "bun:test";
import type { CanonicalStatus } from "@darkfactory/protocol/workflow";
import { BoardGroup, ProjectClient } from "../../src/board/client.ts";
import { ghEnvironment } from "../../src/board/gh.ts";
import { BoardGraphqlClient } from "../../src/board/graphql.ts";
import { BoardRestClient } from "../../src/board/rest.ts";
import { BoardRun } from "../../src/board/run.ts";
import { CANONICAL_STATUS_OPTIONS, STATUS_NAMES } from "../../src/board/taxonomy.ts";
import { type FakeAnswer, fakeTransport, type RecordedRequest, routedTransport } from "./fakes.ts";

/**
 * The board clients: what the automation asks GitHub to do, and what it does with the answer.
 *
 * Every test here drives a real client over a fake transport, so the assertions are about requests
 * rather than about the client's internals. That is the level at which the load-bearing decisions
 * live: a PUT instead of a POST wipes labels, a hardcoded field id writes nowhere, and an add that
 * loses a race files an issue about the race.
 */

/** A run that reports nowhere. */
function quietRun(): BoardRun {
	return new BoardRun({ stdout: () => {}, stderr: () => {} });
}

/** The name of the GraphQL operation a request carries. */
function operationOf(request: RecordedRequest): string {
	return ((request.body as { query: string }).query.match(/(?:query|mutation) (\w+)/) ?? [])[1] ?? "";
}

/** A REST client over a transport that answers every request with an empty object. */
function quietRest(run: BoardRun): BoardRestClient {
	return new BoardRestClient({ run, token: "test-token", fetch: async () => new Response("{}") });
}

/** A GraphQL client answering project discovery and the Status field, as a healthy board would. */
function boardApi(
	run: BoardRun,
	options: readonly { id: string; name: string }[],
): { client: BoardGraphqlClient; transport: ReturnType<typeof fakeTransport> } {
	return graphqlClient(run, (request) => {
		const operation = operationOf(request);
		if (operation === "GetProjects") {
			return graphql({ user: { projectsV2: { nodes: [{ id: "PVT_10", number: 10, title: "Scoped" }] } } });
		}
		if (operation === "EnforceTaxonomy") {
			return graphql({
				updateProjectV2Field: {
					projectV2Field: { options: STATUS_NAMES.map((name) => ({ id: `opt-${name}`, name })) },
				},
			});
		}
		return graphql({ node: { fields: { nodes: [{ id: "F1", name: "Status", options }] } } });
	});
}

/** The Status field as a healthy board declares it. */
const STATUS_FIELD = {
	id: "F1",
	name: "Status",
	options: STATUS_NAMES.map((name, index) => ({ id: `opt-${index}`, name })),
};

/** A GraphQL answer carrying a Projects v2 payload. */
function graphql(data: unknown): FakeAnswer {
	return { body: { data } };
}

/** A GraphQL answer carrying errors, as GitHub returns a refused mutation. */
function graphqlError(message: string): FakeAnswer {
	return { body: { errors: [{ message }] } };
}

/** A REST client over a scripted transport. */
function restClient(
	run: BoardRun,
	handler: (request: RecordedRequest) => FakeAnswer | undefined,
): {
	client: BoardRestClient;
	transport: ReturnType<typeof fakeTransport>;
} {
	const transport = fakeTransport(handler);
	return { client: new BoardRestClient({ run, token: "test-token", fetch: transport.fetch }), transport };
}

/** A GraphQL client over a scripted transport. */
function graphqlClient(
	run: BoardRun,
	handler: (request: RecordedRequest) => FakeAnswer | undefined,
): {
	client: BoardGraphqlClient;
	transport: ReturnType<typeof fakeTransport>;
} {
	const transport = fakeTransport(handler);
	return { client: new BoardGraphqlClient({ run, token: "test-token", fetch: transport.fetch }), transport };
}

describe("applying a status label", () => {
	test("the status is added and only the other status labels are removed", async () => {
		const run = quietRun();
		const { client, transport } = restClient(run, (request) =>
			request.method === "POST"
				? { body: [{ name: "bug" }, { name: "area:governance" }, { name: "In Progress" }, { name: "Done" }] }
				: { body: {} },
		);

		await client.setStatusLabel("o/r", 42, "Done");

		expect(transport.requests[0]).toMatchObject({
			method: "POST",
			path: "/repos/o/r/issues/42/labels",
			body: { labels: ["Done"] },
		});
		expect(transport.requests.map((request) => `${request.method} ${request.path}`)).toEqual([
			"POST /repos/o/r/issues/42/labels",
			"DELETE /repos/o/r/issues/42/labels/In%20Progress",
		]);
	});

	test("the label set is never replaced, because a replacement races every other writer", async () => {
		// #227: the agent's type and area labels were wiped nine seconds after it applied them,
		// because a PUT built from the event payload's label list replaced the whole set.
		const run = quietRun();
		const { client, transport } = restClient(run, (request) =>
			request.method === "POST"
				? { body: [{ name: "bug" }, { name: "area:ci" }, { name: "In Progress" }, { name: "Done" }] }
				: { body: {} },
		);

		await client.setStatusLabel("o/r", 42, "Done");

		expect(transport.requests.some((request) => request.method === "PUT")).toBe(false);
		expect(transport.requests.map((request) => request.path)).not.toContain("/repos/o/r/issues/42/labels/bug");
		expect(transport.requests.map((request) => request.path)).not.toContain("/repos/o/r/issues/42/labels/area%3Aci");
	});

	test("labels another writer added after the event are never removed", async () => {
		const run = quietRun();
		const { client, transport } = restClient(run, (request) =>
			request.method === "POST"
				? { body: [{ name: "Request" }, { name: "ci" }, { name: "area:ci" }, { name: "ToDo" }] }
				: { body: {} },
		);

		// The caller still holds the event payload's labels, and they are deliberately not consulted:
		// the POST response is the label set as it is after this write.
		await client.setStatusLabel("o/r", 227, "ToDo", [{ name: "Request" }]);

		expect(transport.requests.filter((request) => request.method === "DELETE")).toEqual([]);
		expect(transport.requests.some((request) => request.method === "PUT")).toBe(false);
	});

	test("the status just applied is not deleted back off the issue", async () => {
		const run = quietRun();
		const { client, transport } = restClient(run, (request) =>
			request.method === "POST" ? { body: [{ name: "Done" }] } : { body: {} },
		);
		await client.setStatusLabel("o/r", 1, "Done");
		expect(transport.requests.filter((request) => request.method === "DELETE")).toEqual([]);
	});

	test("a failed add is reported and stops the removal pass", async () => {
		const run = quietRun();
		const { client, transport } = restClient(run, () => ({ status: 500, body: { message: "boom" } }));
		await client.setStatusLabel("o/r", 42, "Done");
		expect(transport.requests).toHaveLength(1);
	});

	test("a non-status label is added without touching the status labels", async () => {
		const run = quietRun();
		const { client, transport } = restClient(run, () => ({ body: [] }));
		await client.addIssueLabel("o/r", 10, "area:ci");
		expect(transport.requests).toHaveLength(1);
		expect(transport.requests[0]).toMatchObject({ method: "POST", body: { labels: ["area:ci"] } });
	});

	test("closing an issue records why, because the reason is what the board reads back", async () => {
		const run = quietRun();
		const { client, transport } = restClient(run, () => ({ body: {} }));
		await client.closeIssue("o/r", 7, "not_planned");
		expect(transport.requests[0]).toMatchObject({
			method: "PATCH",
			path: "/repos/o/r/issues/7",
			body: { state: "closed", state_reason: "not_planned" },
		});
	});
});

describe("a board client routes a status label exclusively", () => {
	test("adding a status label goes through the exclusive setter, not the plain add", async () => {
		// A status label added like any other would leave the issue carrying two statuses.
		const run = quietRun();
		const { client: rest } = restClient(run, () => ({ body: [] }));
		const { client: api } = graphqlClient(run, () => graphql({}));
		const client = new ProjectClient({ owner: "o", projectNumber: 1, rest, graphql: api, run, cli: null });

		const written: string[] = [];
		client.setStatusLabel = async (repo, number, status) => {
			written.push(`${repo}#${number}=${status}`);
		};

		await client.addIssueLabel("o/r", 10, "In Progress");
		await client.addIssueLabel("o/r", 10, "area:ci");

		expect(written).toEqual(["o/r#10=In Progress"]);
	});
});

describe("board field and option discovery", () => {
	test("the Status field and its options come from the API, not from a constant", async () => {
		const run = quietRun();
		const { client } = graphqlClient(run, () => graphql({ node: { fields: { nodes: [STATUS_FIELD] } } }));
		expect(await client.getProjectFields("PVT_1")).toEqual([STATUS_FIELD]);
	});

	test("the taxonomy is enforced when a board is missing a column, and left alone when it is not", async () => {
		// A board rebuilt in the UI without `Superseded` would otherwise map every superseded issue
		// onto whatever column remained, silently losing the distinction.
		const run = quietRun();
		const enforced: string[] = [];
		const answering = (options: { id: string; name: string }[]) =>
			graphqlClient(run, (request) => {
				const operation = operationOf(request);
				if (operation === "GetProjects") {
					return graphql({ user: { projectsV2: { nodes: [{ id: "PVT_1", number: 1, title: "Scoped" }] } } });
				}
				if (operation === "GetProjectFields") {
					return graphql({ node: { fields: { nodes: [{ ...STATUS_FIELD, options }] } } });
				}
				enforced.push(operation);
				return graphql({
					updateProjectV2Field: {
						projectV2Field: { options: STATUS_NAMES.map((name) => ({ id: `opt-${name}`, name })) },
					},
				});
			});

		const intact = new ProjectClient({
			owner: "o",
			projectNumber: 1,
			rest: quietRest(run),
			graphql: answering(STATUS_FIELD.options).client,
			run,
			cli: null,
		});
		expect(await intact.statusOptionId("Backlog")).toBe("opt-0");
		expect(enforced).toEqual([]);

		const repaired = new ProjectClient({
			owner: "o",
			projectNumber: 1,
			rest: quietRest(run),
			graphql: answering([{ id: "o1", name: "ToDo" }]).client,
			run,
			cli: null,
		});
		expect(await repaired.statusOptionId("Superseded")).toBe("opt-Superseded");
		expect(enforced).toHaveLength(1);
	});

	test("enforcing the taxonomy submits all seven options without ids", async () => {
		// GitHub matches options by name; submitting an id for an option that already exists would
		// create a second one and orphan everything sitting in the old column.
		const run = quietRun();
		const { client, transport } = graphqlClient(run, () =>
			graphql({
				updateProjectV2Field: {
					projectV2Field: {
						options: CANONICAL_STATUS_OPTIONS.map((option) => ({ id: `opt-${option.name}`, name: option.name })),
					},
				},
			}),
		);

		const result = await client.enforceBoardTaxonomy("F_123", [{ id: "opt-old", name: "Backlog" }]);

		expect(transport.requests).toHaveLength(1);
		const submitted = transport.requests[0] as RecordedRequest;
		expect((submitted.body as { query: string }).query).toContain("mutation EnforceTaxonomy");
		const options = (
			submitted.body as {
				variables: {
					input: { singleSelectOptions: { name: string; color: string; description: string; id?: string }[] };
				};
			}
		).variables.input.singleSelectOptions;
		expect(options).toHaveLength(7);
		for (const option of options) {
			expect(option.id).toBeUndefined();
			expect(option.name).toBeDefined();
			expect(option.color).toBeDefined();
			expect(option.description).toBeDefined();
			expect(STATUS_NAMES).toContain(option.name as CanonicalStatus);
		}
		for (const name of STATUS_NAMES) expect(result[name]).toBe(`opt-${name}`);
	});

	test("a taxonomy that cannot be enforced falls back to the options already on the board", async () => {
		const run = quietRun();
		const { client } = graphqlClient(run, () => graphqlError("Resource not accessible"));
		const result = await client.enforceBoardTaxonomy("F_123", [{ id: "opt-old", name: "Backlog" }]);
		expect(result).toEqual({ Backlog: "opt-old" });
	});

	test("field discovery runs once per client, not once per mutation", async () => {
		// Re-discovering per mutation would spend the quota reserve on reads.
		const run = quietRun();
		const { client, transport } = boardApi(run, STATUS_FIELD.options);
		const board = new ProjectClient({
			owner: "o",
			projectNumber: 10,
			rest: quietRest(run),
			graphql: client,
			run,
			cli: null,
		});

		expect(await board.statusOptionId("ToDo")).toBe("opt-1");
		expect(await board.statusOptionId("Done")).toBe("opt-4");
		expect(await board.statusFieldId()).toBe("F1");
		expect(transport.requests.filter((request) => operationOf(request) === "GetProjectFields")).toHaveLength(1);
	});

	test("a column created in the UI as `To Do` is repaired and the ToDo status still lands", async () => {
		// A column created by hand can carry either spelling, and refusing to write because of a
		// space would leave the item where it was. The taxonomy enforcement renames it on the way.
		const run = quietRun();
		const spelled = STATUS_NAMES.map((name, index) => ({
			id: `opt-${index}`,
			name: name === "ToDo" ? "To Do" : name,
		}));
		const { client, transport } = boardApi(run, spelled);
		const board = new ProjectClient({
			owner: "o",
			projectNumber: 10,
			rest: quietRest(run),
			graphql: client,
			run,
			cli: null,
		});

		expect(await board.statusOptionId("ToDo")).toBe("opt-ToDo");
		expect(transport.requests.filter((request) => operationOf(request) === "EnforceTaxonomy")).toHaveLength(1);
	});
});

describe("adding an item that another run already added", () => {
	test("the race is resolved to the existing item rather than reported as a failure", async () => {
		// A reported failure files a failure issue, and that issue's own events start the next race.
		const run = quietRun();
		const { client, transport } = graphqlClient(run, (request) => {
			const query = (request.body as { query: string }).query;
			if (query.includes("addProjectV2ItemById")) return graphqlError("Content already exists in this project");
			return graphql({
				node: {
					projectItems: {
						nodes: [
							{ id: "PVTI_other", project: { id: "PVT_other" } },
							{ id: "PVTI_mine", project: { id: "PVT_1" } },
						],
					},
				},
			});
		});

		expect(await client.addItem("PVT_1", "I_1")).toBe("PVTI_mine");
		expect(run.failures).toEqual([]);
		expect(transport.requests).toHaveLength(2);
	});

	test("any other add failure is recorded", async () => {
		const run = quietRun();
		const { client } = graphqlClient(run, () => graphqlError("Resource not accessible by integration"));
		expect(await client.addItem("PVT_1", "I_1")).toBeNull();
		expect(run.failures[0]).toContain("Resource not accessible");
	});
});

describe("the GraphQL rate-limit header is the only write gate", () => {
	test("a remaining-points header updates the run's budget", async () => {
		const run = quietRun();
		const { client } = graphqlClient(run, () => ({
			body: { data: {} },
			headers: { "x-ratelimit-remaining": "4210" },
		}));
		await client.execute("query { viewer { login } }");
		expect(run.graphqlRemaining).toBe(4210);
		expect(run.canMutate()).toBe(true);
	});

	test("a remaining-points header at the reserve pauses every write", async () => {
		const run = quietRun();
		const { client } = graphqlClient(run, () => ({
			body: { data: {} },
			headers: { "x-ratelimit-remaining": "12" },
		}));
		await client.execute("query { viewer { login } }");
		expect(run.canMutate()).toBe(false);
	});

	test("an unparseable header pauses mutations rather than reading as unlimited quota", async () => {
		// With no mutation-count cap left, the reserve is the only write gate, so a header this
		// client cannot understand is a reason to stop, not a reason to continue.
		const run = quietRun();
		const { client } = graphqlClient(run, () => ({
			body: { data: {} },
			headers: { "x-ratelimit-remaining": "not-a-number" },
		}));
		await client.execute("query { viewer { login } }");
		expect(run.graphqlRemaining).toBeNull();
		expect(run.rateLimited).toBe(true);
		expect(run.failures).toHaveLength(1);
		expect(run.canMutate()).toBe(false);
	});

	test("a refused mutation naming a rate limit stops the run", async () => {
		const run = quietRun();
		const { client } = graphqlClient(run, () => graphqlError("API rate limit exceeded"));
		await expect(client.execute("mutation { x }")).rejects.toThrow("API rate limit exceeded");
		expect(run.rateLimited).toBe(true);
	});

	test("an HTTP 403 marks the run rate-limited before the error is raised", async () => {
		const run = quietRun();
		const { client } = graphqlClient(run, () => ({ status: 403, body: { message: "forbidden" } }));
		await expect(client.execute("query { x }")).rejects.toThrow("HTTP 403");
		expect(run.rateLimited).toBe(true);
	});
});

describe("the REST rate-limit header", () => {
	test("a remaining-points header at the floor stops the run writing", async () => {
		const run = quietRun();
		const { client } = restClient(run, () => ({
			body: {},
			headers: { "x-ratelimit-remaining": "9" },
		}));
		await client.getIssue("o/r", 1);
		expect(run.rateLimited).toBe(true);
	});

	test("a body naming a rate limit marks the run even on a 404", async () => {
		const run = quietRun();
		const { client } = restClient(run, () => ({ status: 404, body: { message: "API rate limit exceeded" } }));
		await expect(client.getIssue("o/r", 1)).rejects.toThrow("HTTP 404");
		expect(run.rateLimited).toBe(true);
	});
});

describe("listing a repository's issues", () => {
	test("every page is collected and node ids are remembered for the board pass", async () => {
		const run = quietRun();
		const page = (index: number) => ({
			body: Array.from({ length: 100 }, (_unused, offset) => {
				const number = (index - 1) * 100 + offset + 1;
				return { number, node_id: `N${number}` };
			}),
		});
		const { client, transport } = restClient(run, (request) => {
			const index = Number.parseInt(request.query.get("page") ?? "1", 10);
			// Only a short page ends the walk, so only the last page is short.
			return index < 3 ? page(index) : { body: [{ number: 201, node_id: "N201" }] };
		});

		const issues = await client.listIssuesAndPrs("o/r", "all", 500);

		expect(issues).toHaveLength(201);
		expect(issues[0]?.number).toBe(1);
		expect(issues[200]?.number).toBe(201);
		expect(transport.requests).toHaveLength(3);
		// One listing resolved every node id, so the board pass costs no extra repository reads.
		expect(await client.getNodeId("o/r", 200)).toBe("N200");
	});

	test("a failed listing is recorded rather than swallowed, and the pages so far are kept", async () => {
		// A silent failure here leaves a board incomplete and says nothing.
		const run = quietRun();
		let page = 0;
		const { client } = restClient(run, (_request) => {
			page += 1;
			return page === 1
				? { body: Array.from({ length: 100 }, (_unused, index) => ({ number: index + 1, node_id: `N${index}` })) }
				: { status: 500, body: { message: "boom" } };
		});

		const issues = await client.listIssuesAndPrs("o/r", "all", 500);

		expect(issues).toHaveLength(100);
		expect(run.failures[0]).toContain("could not list issues in o/r");
	});
});

/** A board client whose GraphQL answers and writes the fixture controls. */
function boardFixture(
	run: BoardRun,
	options: {
		items?: Record<string, { itemId: string; status: string | null }>;
		projectId?: string;
		optionId?: string | null;
	} = {},
): {
	client: ProjectClient;
	writes: { itemId: string; optionId: string }[];
	added: [string, string][];
	loadings: () => number;
} {
	const graphql = new BoardGraphqlClient({ run, token: "t", fetch: async () => new Response("{}") });
	const writes: { itemId: string; optionId: string }[] = [];
	const added: [string, string][] = [];
	let loadings = 0;

	graphql.resolveProjects = async () =>
		new Map([["Scoped", { id: options.projectId ?? "PVT_123", number: 10, title: "Scoped" }]]);
	graphql.addItem = async (projectId, contentId) => {
		added.push([projectId, contentId]);
		return "item-new";
	};
	graphql.updateItemStatus = async (_projectId, itemId, _fieldId, optionId) => {
		writes.push({ itemId, optionId });
		return true;
	};
	graphql.fetchBoardItems = async () => {
		loadings += 1;
		return [];
	};

	const client = new ProjectClient({
		owner: "o",
		projectNumber: 10,
		rest: quietRest(run),
		graphql,
		run,
		cli: null,
		statusFieldId: "F1",
	});
	if (options.optionId !== undefined) client.statusOptionId = async () => options.optionId ?? null;
	for (const [url, record] of Object.entries(options.items ?? {})) client.items.set(url, record);
	return { client, writes, added, loadings: () => loadings };
}

describe("tracking an item onto a board", () => {
	test("an item already at that status costs no write at all", async () => {
		const run = quietRun();
		const { client, writes, loadings } = boardFixture(run, {
			items: { "https://github.com/o/r/issues/1": { itemId: "item-1", status: "Done" } },
		});

		await client.track("https://github.com/o/r/issues/1", "Done");

		expect(writes).toEqual([]);
		expect(loadings()).toBe(0);
	});

	test("an item present at a different status is edited, never re-added", async () => {
		const run = quietRun();
		const { client, writes, added } = boardFixture(run, {
			items: { "https://github.com/o/r/issues/1": { itemId: "item-1", status: "ToDo" } },
			optionId: "opt-progress",
		});

		await client.track("https://github.com/o/r/issues/1", "In Progress");

		expect(writes).toEqual([{ itemId: "item-1", optionId: "opt-progress" }]);
		expect(added).toEqual([]);
		expect(client.items.get("https://github.com/o/r/issues/1")).toEqual({
			itemId: "item-1",
			status: "In Progress",
		});
	});

	test("a fast-path event with a node id skips the board listing entirely", async () => {
		// A webhook already knows the node id, so reading every board item to find out whether it is
		// there is a query it does not need to make.
		const run = quietRun();
		const { client, writes, added, loadings } = boardFixture(run, { optionId: "opt-1" });

		await client.track("https://github.com/o/r/issues/10", "ToDo", { contentId: "NODE_456", fastPath: true });

		expect(added).toEqual([["PVT_123", "NODE_456"]]);
		expect(writes).toEqual([{ itemId: "item-new", optionId: "opt-1" }]);
		expect(loadings()).toBe(0);
	});

	test("a slow-path track diffs in memory and writes only what differs", async () => {
		const run = quietRun();
		const { client, writes, loadings } = boardFixture(run, {
			items: {
				"https://github.com/o/r/issues/1": { itemId: "item-1", status: "Done" },
				"https://github.com/o/r/issues/2": { itemId: "item-2", status: "Backlog" },
			},
			optionId: "opt-done",
		});

		await client.track("https://github.com/o/r/issues/1", "Done", { contentId: "N1", fastPath: false });
		expect(writes).toEqual([]);

		await client.track("https://github.com/o/r/issues/2", "Done", { contentId: "N2", fastPath: false });
		expect(writes).toEqual([{ itemId: "item-2", optionId: "opt-done" }]);
		expect(loadings()).toBe(0);
	});

	test("below the reserve the item is deferred rather than written", async () => {
		const run = quietRun();
		run.graphqlRemaining = run.quotaMinimum;
		const { client, writes, added } = boardFixture(run, { optionId: "opt-1" });

		await client.track("https://github.com/o/r/issues/1", "ToDo", { contentId: "N1", fastPath: true });

		expect(added).toEqual([]);
		expect(writes).toEqual([]);
		expect(client.items.size).toBe(0);
		expect(run.canMutate()).toBe(false);
	});

	test("a run with quota writes every item it is given, not a fixed number of them", async () => {
		// A fixed per-run budget truncated a long run and left the board half-updated.
		const run = quietRun();
		run.graphqlRemaining = 5_000;
		const { client, added, writes } = boardFixture(run, { optionId: "opt-1" });

		for (let index = 0; index < 40; index += 1) {
			await client.track(`https://github.com/o/r/issues/${index}`, "ToDo", {
				contentId: `N${index}`,
				fastPath: true,
			});
		}

		expect(added).toHaveLength(40);
		expect(writes).toHaveLength(40);
	});
});

describe("a group of boards", () => {
	test("an item reaches every declared board", async () => {
		const run = quietRun();
		const { client: rest } = restClient(run, () => ({ body: [] }));
		const { client: api } = graphqlClient(run, () => graphql({}));
		const boards = [1, 2].map(
			(number) => new ProjectClient({ owner: "o", projectNumber: number, rest, graphql: api, run, cli: null }),
		);
		const tracked: string[] = [];
		for (const board of boards) {
			board.track = async (url) => {
				tracked.push(`${board.projectNumber}:${url}`);
			};
		}

		await new BoardGroup(boards).track("https://github.com/o/r/issues/1", "In Progress");

		expect(tracked).toEqual(["1:https://github.com/o/r/issues/1", "2:https://github.com/o/r/issues/1"]);
	});

	test("a label and a closure happen once, not once per board", async () => {
		// A label belongs to the issue, not to a board. Applying it per board makes the second write
		// race the first one's own delete of the previous status label.
		const run = quietRun();
		const { client: rest } = restClient(run, () => ({ body: [] }));
		const { client: api } = graphqlClient(run, () => graphql({}));
		const boards = [1, 2].map(
			(number) => new ProjectClient({ owner: "o", projectNumber: number, rest, graphql: api, run, cli: null }),
		);
		const applied: string[] = [];
		for (const board of boards) {
			board.setStatusLabel = async (repo, number, status) => {
				applied.push(`${board.projectNumber}:${repo}#${number}=${status}`);
			};
			board.closeIssue = async (repo, number) => {
				applied.push(`${board.projectNumber}:${repo}#${number} closed`);
			};
		}
		const group = new BoardGroup(boards);

		await group.setStatusLabel("o/r", 7, "Done");
		await group.closeIssue("o/r", 7);

		expect(applied).toEqual(["1:o/r#7=Done", "1:o/r#7 closed"]);
	});

	test("an empty group is not an error", async () => {
		const group = new BoardGroup([]);
		await expect(group.track("https://github.com/o/r/issues/1", "ToDo")).resolves.toBeUndefined();
		await expect(group.setStatusLabel("o/r", 1, "Done")).resolves.toBeUndefined();
		expect(group.projectNumber).toBe(0);
		expect(await group.projectId()).toBeNull();
	});
});

describe("which identity the gh CLI runs with", () => {
	test("project subcommands take the project token", async () => {
		// Projects v2 permissions are org-scoped, so a user-owned board needs the user's token.
		const env = { GH_TOKEN: "app", GH_PROJECT_TOKEN: "user" };
		expect(ghEnvironment(["project", "item-list"], env).GH_TOKEN).toBe("user");
	});

	test.each([
		["issue", "edit"],
		["api", "repos/o/r"],
		["pr", "view"],
	])("%s %s keeps the App token", (command: string, subcommand: string) => {
		// The quota that starved the automation was spent on exactly these calls.
		const env = { GH_TOKEN: "app", GH_PROJECT_TOKEN: "user" };
		expect(ghEnvironment([command, subcommand], env).GH_TOKEN).toBe("app");
	});

	test("a repository that never configured a project token is unaffected", () => {
		expect(ghEnvironment(["project", "item-list"], { GH_TOKEN: "only" }).GH_TOKEN).toBe("only");
	});
});

describe("the transport the clients share", () => {
	test("a request carries the API version, the user agent and the bearer token", async () => {
		const run = quietRun();
		const seen: (RequestInit | undefined)[] = [];
		const transport = routedTransport({ "GET /repos/o/r/issues/1": { body: { number: 1 } } });
		const client = new BoardRestClient({
			run,
			token: "test-token",
			fetch: (input, init) => {
				seen.push(init);
				return transport.fetch(input, init);
			},
		});

		await client.getIssue("o/r", 1);

		const headers = seen[0]?.headers as Record<string, string>;
		expect(headers.Authorization).toBe("Bearer test-token");
		expect(headers["X-GitHub-Api-Version"]).toBe("2022-11-28");
		expect(headers["User-Agent"]).toBe("DarkFactory-ProjectAutomation/1.0");
	});
});
