import { FetchTransport, type GitHubFetch } from "../github/transport.ts";
import { BoardRequestError, type BoardRun, describeFailure, GraphqlError, isRateLimited } from "./run.ts";
import type { FieldValueConnection } from "./status.ts";
import { CANONICAL_STATUS_OPTIONS } from "./taxonomy.ts";

/**
 * Projects v2 reads and writes.
 *
 * Authenticated with the user's project token. Status field and option ids are resolved from the API
 * at runtime and cached for the lifetime of the run, because a board rebuilt in the UI gets new ids
 * and a hardcoded one would silently write nowhere.
 */

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

/** One project as the discovery query returns it. */
export interface ProjectNode {
	readonly id: string;
	readonly number: number;
	readonly title: string;
}

/** One single-select option on a project's field. */
export interface StatusOptionNode {
	readonly id: string;
	readonly name: string;
	readonly color?: string;
	readonly description?: string;
}

/** One single-select field on a project. */
export interface ProjectFieldNode {
	readonly id: string;
	readonly name: string;
	readonly options?: readonly StatusOptionNode[];
}

/** The issue or pull request a board item points at. */
export interface BoardItemContent {
	readonly id?: string;
	readonly number?: number;
	readonly url?: string;
	readonly title?: string;
	readonly state?: string;
	readonly stateReason?: string;
	readonly merged?: boolean;
	readonly labels?: { readonly nodes?: readonly { readonly name?: string | null }[] | null } | null;
}

/** One item on a project board. */
export interface BoardItemNode {
	readonly id?: string;
	readonly content?: BoardItemContent | null;
	readonly fieldValues?: FieldValueConnection | null;
}

/** How a GraphQL client authenticates and reaches the API. */
export interface BoardGraphqlOptions {
	/** Explicit token. Defaults to the project token, then the App token, then `GITHUB_TOKEN`. */
	readonly token?: string | undefined;
	/** The environment the token fallback chain is read from. */
	readonly env?: Readonly<Record<string, string | undefined>>;
	/** The run whose budget and failure list this client reports against. */
	readonly run: BoardRun;
	/** The HTTP implementation, so a test can answer without a network. */
	readonly fetch?: GitHubFetch;
}

const GET_PROJECTS = `
        query GetProjects($login: String!) {
          user(login: $login) {
            projectsV2(first: 20) {
              nodes {
                id
                number
                title
              }
            }
          }
        }
        `;

const GET_PROJECT_FIELDS = `
        query GetProjectFields($projectId: ID!) {
          node(id: $projectId) {
            ... on ProjectV2 {
              fields(first: 20) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                      color
                      description
                    }
                  }
                }
              }
            }
          }
        }
        `;

const GET_BOARD_ITEMS = `
        query GetBoardItems($projectId: ID!, $cursor: String) {
          node(id: $projectId) {
            ... on ProjectV2 {
              items(first: 50, after: $cursor) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  fieldValues(first: 8) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        optionId
                        field {
                          ... on ProjectV2SingleSelectField {
                            name
                          }
                        }
                      }
                    }
                  }
                  content {
                    __typename
                    ... on Issue {
                      id
                      number
                      url
                      title
                      state
                      stateReason
                      labels(first: 10) {
                        nodes {
                          name
                        }
                      }
                    }
                    ... on PullRequest {
                      id
                      number
                      url
                      title
                      state
                      merged
                      labels(first: 10) {
                        nodes {
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        `;

const ADD_ITEM = `
        mutation AddItem($projectId: ID!, $contentId: ID!) {
          addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
            item {
              id
            }
          }
        }
        `;

const ITEM_FOR_CONTENT = `
        query ItemForContent($contentId: ID!) {
          node(id: $contentId) {
            ... on Issue { projectItems(first: 50) { nodes { id project { id } } } }
            ... on PullRequest { projectItems(first: 50) { nodes { id project { id } } } }
          }
        }
        `;

const UPDATE_STATUS = `
        mutation UpdateStatus($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
          updateProjectV2ItemFieldValue(
            input: {
              projectId: $projectId
              itemId: $itemId
              fieldId: $fieldId
              value: {
                singleSelectOptionId: $optionId
              }
            }
          ) {
            projectV2Item {
              id
            }
          }
        }
        `;

const CREATE_PROJECT = `
        mutation CreateProject($ownerId: ID!, $title: String!) {
          createProjectV2(input: { ownerId: $ownerId, title: $title }) {
            projectV2 {
              id
              title
              number
            }
          }
        }
        `;

const USER_ID = `
        query UserId($login: String!) {
          user(login: $login) {
            id
          }
        }
        `;

const REPOSITORY_ID = `
        query RepositoryId($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            id
          }
        }
        `;

const ENFORCE_TAXONOMY = `
        mutation EnforceTaxonomy($input: UpdateProjectV2FieldInput!) {
          updateProjectV2Field(input: $input) {
            projectV2Field {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
        `;

/** A record read out of a GraphQL response, with every field optional. */
type Node = Record<string, unknown>;

/** Projects v2 over the GitHub GraphQL API. */
export class BoardGraphqlClient {
	readonly #token: string;
	readonly #run: BoardRun;
	readonly #transport: FetchTransport;
	#projects: Map<string, ProjectNode> | null = null;

	constructor(options: BoardGraphqlOptions) {
		const env = options.env ?? process.env;
		this.#token = options.token || env.GH_PROJECT_TOKEN || env.GH_TOKEN || env.GITHUB_TOKEN || "";
		this.#run = options.run;
		this.#transport = new FetchTransport({ fetch: options.fetch });
	}

	/**
	 * Runs one query or mutation and returns its `data`.
	 *
	 * The rate-limit header is read on every call because it is the only thing that knows how much
	 * budget is left. An unparseable value pauses mutations rather than being read as "quota
	 * unknown, therefore unlimited": with no mutation-count cap left, this reserve is the only write
	 * gate, so a header this client cannot understand is a reason to stop, not a reason to continue.
	 */
	async execute(query: string, variables: Record<string, unknown> = {}): Promise<Node> {
		const headers: Record<string, string> = {
			"User-Agent": "DarkFactory-ProjectAutomation/1.0",
			"Content-Type": "application/json",
		};
		if (this.#token) headers.Authorization = `Bearer ${this.#token}`;

		const response = await this.#transport.request(GRAPHQL_ENDPOINT, {
			method: "POST",
			headers,
			body: JSON.stringify({ query, variables }),
		});
		const text = await response.text();
		if (!response.ok) {
			if (response.status === 403 || response.status === 429 || text.toLowerCase().includes("rate limit")) {
				this.#run.markRateLimited("GitHub GraphQL rate limit encountered");
			}
			throw new BoardRequestError(response.status, text, "GraphQL request");
		}

		const remaining = response.headers.get("x-ratelimit-remaining");
		if (remaining !== null) {
			const parsed = Number.parseInt(remaining, 10);
			if (Number.isNaN(parsed)) {
				this.#run.fail(`malformed GraphQL rate-limit header: ${remaining}`);
				this.#run.markRateLimited("Malformed GraphQL rate-limit header");
			} else {
				this.#run.graphqlRemaining = parsed;
				if (parsed <= this.#run.quotaMinimum)
					this.#run.markRateLimited(`GraphQL quota exhausted (${parsed} remaining)`);
			}
		}

		const parsed = (text ? JSON.parse(text) : {}) as { data?: Node; errors?: { message?: string }[] };
		const errors = parsed.errors ?? [];
		if (errors.length > 0) {
			const message = errors.map((error) => error.message ?? JSON.stringify(error)).join("; ");
			if (errors.some((error) => JSON.stringify(error).toLowerCase().includes("rate limit"))) {
				this.#run.markRateLimited("GitHub GraphQL rate limit in errors");
			}
			throw new GraphqlError(`GraphQL error: ${message}`, errors);
		}
		return parsed.data ?? {};
	}

	/**
	 * Every project the owner can see, by title, discovered once per run.
	 *
	 * A discovery failure returns nothing rather than throwing: the caller falls back to the `gh`
	 * CLI, and a board it cannot find is reported as a failure with the name of the board that is
	 * missing rather than as an unhandled error.
	 */
	async resolveProjects(owner: string): Promise<Map<string, ProjectNode>> {
		if (this.#projects) return this.#projects;
		try {
			const data = await this.execute(GET_PROJECTS, { login: owner });
			const nodes = ((data.user as Node | undefined)?.projectsV2 as Node | undefined)?.nodes;
			this.#projects = new Map(
				(Array.isArray(nodes) ? (nodes as ProjectNode[]) : [])
					.filter((node) => typeof node?.title === "string")
					.map((node) => [node.title, node]),
			);
		} catch (error) {
			if (isRateLimited(error)) this.#run.markRateLimited();
			this.#run.notice(`resolving projects for ${owner}: ${describeFailure(error)}`);
		}
		return this.#projects ?? new Map();
	}

	/**
	 * The listing, or the failure that prevented one.
	 *
	 * `resolveProjects` returns an empty map when the listing cannot be read, because its callers treat
	 * a board they cannot see as one they will simply not use. That is wrong for a caller deciding
	 * whether to create a board: absence is grounds to create, an unreadable listing is not, and the two
	 * are the same empty map. An account that genuinely has no boards is *not* a failure — that is
	 * absence, and it is reported here as a successful read of nothing.
	 */
	async listProjects(
		owner: string,
	): Promise<{ ok: true; projects: Map<string, ProjectNode> } | { ok: false; reason: string }> {
		if (this.#projects) return { ok: true, projects: this.#projects };
		try {
			const data = await this.execute(GET_PROJECTS, { login: owner });
			const nodes = ((data.user as Node | undefined)?.projectsV2 as Node | undefined)?.nodes;
			this.#projects = new Map(
				(Array.isArray(nodes) ? (nodes as ProjectNode[]) : [])
					.filter((node) => typeof node?.title === "string")
					.map((node) => [node.title, node]),
			);
			return { ok: true, projects: this.#projects };
		} catch (error) {
			if (isRateLimited(error)) this.#run.markRateLimited();
			const reason = `could not list projects for ${owner}: ${describeFailure(error)}`;
			this.#run.notice(reason);
			return { ok: false, reason };
		}
	}

	/**
	 * The owner's user ID, which `createProjectV2` needs in place of a login.
	 *
	 * A project cannot be created without it, so a failure here is reported rather than swallowed:
	 * the caller falls back to the `gh` CLI, and a board it cannot create is a failure naming the
	 * board, not an unhandled error.
	 */
	async resolveUserId(owner: string): Promise<string | undefined> {
		try {
			const data = await this.execute(USER_ID, { login: owner });
			const id = (data.user as Node | undefined)?.id;
			return typeof id === "string" ? id : undefined;
		} catch (error) {
			if (isRateLimited(error)) this.#run.markRateLimited();
			this.#run.notice(`resolving the user id for ${owner}: ${describeFailure(error)}`);
			return undefined;
		}
	}

	/**
	 * Creates a project and returns its node, or nothing when it cannot be created.
	 *
	 * The created project is added to the discovery cache under its title so the caller does not have
	 * to re-query to find what it just made.
	 */
	async createProject(owner: string, title: string): Promise<ProjectNode | undefined> {
		const ownerId = await this.resolveUserId(owner);
		if (ownerId === undefined) return undefined;
		try {
			const data = await this.execute(CREATE_PROJECT, { ownerId, title });
			const project = (data.createProjectV2 as Node | undefined)?.projectV2 as Node | undefined;
			if (project?.id === undefined) return undefined;
			if (typeof project.number !== "number") return undefined;
			const node: ProjectNode = {
				id: String(project.id),
				title: String((project.title as string | undefined) ?? title),
				number: project.number,
			};
			if (this.#projects) this.#projects.set(node.title, node);
			return node;
		} catch (error) {
			if (isRateLimited(error)) this.#run.markRateLimited();
			this.#run.notice(`creating the project ${title}: ${describeFailure(error)}`);
			return undefined;
		}
	}

	/** The GraphQL node ID of a repository, which a project item is added against. */
	async repositoryNodeId(slug: string): Promise<string | undefined> {
		const separator = slug.indexOf("/");
		if (separator < 0) return undefined;
		try {
			const data = await this.execute(REPOSITORY_ID, {
				owner: slug.slice(0, separator),
				name: slug.slice(separator + 1),
			});
			const id = (data.repository as Node | undefined)?.id;
			return typeof id === "string" ? id : undefined;
		} catch (error) {
			if (isRateLimited(error)) this.#run.markRateLimited();
			this.#run.notice(`resolving the node id for ${slug}: ${describeFailure(error)}`);
			return undefined;
		}
	}

	/** The single-select fields on a project, or nothing when they cannot be read. */
	async getProjectFields(projectId: string): Promise<ProjectFieldNode[]> {
		try {
			const data = await this.execute(GET_PROJECT_FIELDS, { projectId });
			const fields = ((data.node as Node | undefined)?.fields ?? {}) as Node;
			const nodes = fields.nodes;
			return (Array.isArray(nodes) ? (nodes as ProjectFieldNode[]) : []).filter(
				(field): field is ProjectFieldNode => typeof field?.name === "string",
			);
		} catch (error) {
			if (isRateLimited(error)) this.#run.markRateLimited();
			this.#run.notice(`fetching project fields for ${projectId}: ${describeFailure(error)}`);
			return [];
		}
	}

	/** Every item on a board, paginated, with lean projections to keep the complexity cost down. */
	async fetchBoardItems(projectId: string, limit = 1000): Promise<BoardItemNode[]> {
		const items: BoardItemNode[] = [];
		let cursor: string | null = null;
		while (items.length < limit) {
			let data: Node;
			try {
				data = await this.execute(GET_BOARD_ITEMS, { projectId, cursor });
			} catch (error) {
				if (isRateLimited(error)) this.#run.markRateLimited();
				this.#run.notice(`fetching board items: ${describeFailure(error)}`);
				break;
			}
			const page = ((data.node as Node | undefined)?.items ?? {}) as Node;
			const nodes = Array.isArray(page.nodes) ? (page.nodes as BoardItemNode[]) : [];
			items.push(...nodes);
			const pageInfo = (page.pageInfo ?? {}) as { hasNextPage?: boolean; endCursor?: string };
			if (!pageInfo.hasNextPage) break;
			cursor = pageInfo.endCursor ?? null;
		}
		return items.slice(0, limit);
	}

	/**
	 * Adds an issue or pull request to a project, returning the new item's id.
	 *
	 * Two runs for the same issue race to add it, and the loser is told the item already exists. That
	 * is the state it wanted, so the existing item is found and returned rather than the race being
	 * reported as a failure - a reported failure files a failure issue, and that issue's own events
	 * start the next race.
	 */
	async addItem(projectId: string, contentId: string): Promise<string | null> {
		try {
			const data = await this.execute(ADD_ITEM, { projectId, contentId });
			const item = (data.addProjectV2ItemById as Node | undefined)?.item as Node | undefined;
			return (item?.id as string | undefined) ?? null;
		} catch (error) {
			if (isRateLimited(error)) this.#run.markRateLimited();
			if (describeFailure(error).includes("already exists in this project")) {
				const existing = await this.findItemForContent(projectId, contentId);
				if (existing) return existing;
			}
			this.#run.fail(`adding content ${contentId} to project ${projectId}: ${describeFailure(error)}`);
			return null;
		}
	}

	/** The item that already holds this content on this project, or null. */
	async findItemForContent(projectId: string, contentId: string): Promise<string | null> {
		let data: Node;
		try {
			data = await this.execute(ITEM_FOR_CONTENT, { contentId });
		} catch (error) {
			if (isRateLimited(error)) this.#run.markRateLimited();
			return null;
		}
		const nodes = ((data.node as Node | undefined)?.projectItems as Node | undefined)?.nodes;
		for (const node of Array.isArray(nodes) ? (nodes as Node[]) : []) {
			if (((node.project as Node | undefined)?.id as string | undefined) === projectId) {
				return (node.id as string | undefined) ?? null;
			}
		}
		return null;
	}

	/** Sets a board item's single-select Status value. */
	async updateItemStatus(projectId: string, itemId: string, fieldId: string, optionId: string): Promise<boolean> {
		try {
			await this.execute(UPDATE_STATUS, { projectId, itemId, fieldId, optionId });
			return true;
		} catch (error) {
			if (isRateLimited(error)) this.#run.markRateLimited();
			this.#run.notice(`updating item ${itemId} status: ${describeFailure(error)}`);
			return false;
		}
	}

	/**
	 * Puts the canonical seven options on the Status field, so no linked board drifts.
	 *
	 * Existing option ids are not submitted: GitHub matches options by name, and sending an id for an
	 * option that is already there would be a create rather than a keep, orphaning the items sitting
	 * in that column. New options are created without an id so GitHub generates a valid one.
	 */
	async enforceBoardTaxonomy(
		fieldId: string,
		existingOptions: readonly StatusOptionNode[],
	): Promise<Record<string, string>> {
		const optionsInput = CANONICAL_STATUS_OPTIONS.map((option) => ({
			name: option.name,
			color: option.color,
			description: option.description,
		}));
		try {
			const data = await this.execute(ENFORCE_TAXONOMY, {
				input: { fieldId, name: "Status", singleSelectOptions: optionsInput },
			});
			const field = (data.updateProjectV2Field as Node | undefined)?.projectV2Field as Node | undefined;
			const options = (field?.options ?? []) as StatusOptionNode[];
			this.#run.say(`Successfully enforced canonical status taxonomy on field ${fieldId}.`);
			return Object.fromEntries(
				options.flatMap((option) => (option.name && option.id ? [[option.name, option.id]] : [])),
			);
		} catch (error) {
			this.#run.notice(`could not enforce taxonomy on field ${fieldId}: ${describeFailure(error)}`);
			return Object.fromEntries(
				existingOptions.flatMap((option) => (option.name && option.id ? [[option.name, option.id]] : [])),
			);
		}
	}
}
