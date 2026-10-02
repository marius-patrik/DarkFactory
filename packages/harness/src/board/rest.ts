import type { CanonicalStatus } from "../../../protocol/src/workflow.ts";
import { FetchTransport, type GitHubFetch } from "../github/transport.ts";
import { BoardRequestError, type BoardRun, describeFailure, isRateLimited } from "./run.ts";
import type { LabelSource } from "./status.ts";
import { isStatusLabel } from "./taxonomy.ts";

/**
 * Repository work: listings, labels and closures.
 *
 * Authenticated with the GitHub App installation token, so it draws on the App's dedicated 5,000
 * req/hr rather than the user's. Only Projects v2 needs a person's token, because GitHub scopes
 * project permissions to organizations and these boards are user-owned.
 */

const REST_BASE_URL = "https://api.github.com";

/** The REST rate limit below which this run stops writing. */
const REST_RATE_LIMIT_FLOOR = 20;

/** How a label is written: a bare name, or the REST object carrying one. */
type LabelPayload = string | { readonly name?: string | null };

/** One issue or pull request as REST returns it. */
export interface RestIssue extends Record<string, unknown> {
	readonly number?: number;
	readonly node_id?: string;
	readonly html_url?: string;
	readonly labels?: readonly LabelPayload[];
}

/** How a REST client authenticates and reaches the API. */
interface BoardRestOptions {
	/** Explicit token. Defaults to the App token, then the project token, then `GITHUB_TOKEN`. */
	readonly token?: string | undefined;
	/** The environment the token fallback chain is read from. */
	readonly env?: Readonly<Record<string, string | undefined>>;
	/** The run whose budget and failure list this client reports against. */
	readonly run: BoardRun;
	/** The HTTP implementation, so a test can answer without a network. */
	readonly fetch?: GitHubFetch;
}

/** The label names on a REST label list, skipping the ones that carry none. */
function labelName(label: LabelPayload): string | null {
	return typeof label === "string" ? label : (label?.name ?? null);
}

/** Repository issues, pull requests, labels and closures over the GitHub REST API. */
export class BoardRestClient {
	readonly #token: string;
	readonly #run: BoardRun;
	readonly #transport: FetchTransport;
	/** GraphQL node ids, keyed by repository and number, so one listing resolves many items. */
	readonly #nodeIds = new Map<string, string>();

	constructor(options: BoardRestOptions) {
		const env = options.env ?? process.env;
		this.#token = options.token || env.GH_TOKEN || env.GH_PROJECT_TOKEN || env.GITHUB_TOKEN || "";
		this.#run = options.run;
		this.#transport = new FetchTransport({ fetch: options.fetch });
	}

	/**
	 * Sends one request and parses the body.
	 *
	 * A 403 or 429, or any body naming a rate limit, marks the run rate-limited before the error is
	 * raised, so the failure that follows is a consequence of the budget rather than a second
	 * surprise.
	 */
	async request(
		method: string,
		path: string,
		body?: unknown,
		params?: Record<string, string | number>,
	): Promise<unknown> {
		const query = params ? new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : "";
		const url = `${REST_BASE_URL}${path}${query ? `?${query}` : ""}`;
		const headers: Record<string, string> = {
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			"User-Agent": "DarkFactory-ProjectAutomation/1.0",
		};
		if (this.#token) headers.Authorization = `Bearer ${this.#token}`;
		if (body !== undefined) headers["Content-Type"] = "application/json";

		const response = await this.#transport.request(url, {
			method,
			headers,
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		});
		const text = await response.text();
		if (!response.ok) {
			if (response.status === 403 || response.status === 429 || text.toLowerCase().includes("rate limit")) {
				this.#run.markRateLimited(`GitHub REST API rate limit on ${method} ${path}`);
			}
			throw new BoardRequestError(response.status, text, `${method} ${path}`);
		}

		const remaining = response.headers.get("x-ratelimit-remaining");
		if (remaining !== null) {
			const parsed = Number.parseInt(remaining, 10);
			if (Number.isNaN(parsed)) this.#run.markRateLimited("Malformed GitHub REST rate-limit header");
			else if (parsed <= REST_RATE_LIMIT_FLOOR) this.#run.markRateLimited();
		}
		return text ? (JSON.parse(text) as unknown) : {};
	}

	/** Fetches one issue or pull request, remembering its node id. */
	async getIssue(repo: string, number: number): Promise<RestIssue> {
		const issue = (await this.request("GET", `/repos/${repo}/issues/${number}`)) as RestIssue;
		if (issue.node_id) this.#nodeIds.set(`${repo}#${number}`, issue.node_id);
		return issue;
	}

	/** The GraphQL node id of an issue or pull request, or null when it cannot be resolved. */
	async getNodeId(repo: string, number: number): Promise<string | null> {
		const cached = this.#nodeIds.get(`${repo}#${number}`);
		if (cached) return cached;
		try {
			return (await this.getIssue(repo, number)).node_id ?? null;
		} catch {
			return null;
		}
	}

	/** Remembers a node id discovered by a board listing, so one listing resolves many items. */
	rememberNodeId(repo: string, number: number, nodeId: string): void {
		this.#nodeIds.set(`${repo}#${number}`, nodeId);
	}

	/**
	 * Every issue and pull request in a repository, paginated.
	 *
	 * A listing that fails is recorded and the pages gathered so far are returned, rather than
	 * aborting the sweep: a partial listing still reconciles most of the board, and the failure list
	 * is what makes the run exit non-zero.
	 */
	async listIssuesAndPrs(repo: string, state = "all", limit = 500): Promise<RestIssue[]> {
		const results: RestIssue[] = [];
		const perPage = 100;
		let page = 1;
		while (results.length < limit) {
			let batch: unknown;
			try {
				batch = await this.request("GET", `/repos/${repo}/issues`, undefined, {
					state,
					per_page: perPage,
					page,
				});
			} catch (error) {
				if (isRateLimited(error)) this.#run.markRateLimited();
				this.#run.fail(`could not list issues in ${repo}: ${describeFailure(error)}`);
				break;
			}
			if (!Array.isArray(batch) || batch.length === 0) break;
			for (const entry of batch as RestIssue[]) {
				if (entry.node_id && entry.number) this.#nodeIds.set(`${repo}#${entry.number}`, entry.node_id);
				results.push(entry);
			}
			if (batch.length < perPage) break;
			page += 1;
		}
		return results.slice(0, limit);
	}

	/**
	 * Applies a status label exclusively, preserving every other label on the item.
	 *
	 * The label set is never replaced. A PUT built from a label list read earlier - usually the
	 * event payload - wipes every label another writer added in between: on #227 the agent's type and
	 * area labels were removed nine seconds after it applied them. Adding the status by POST and
	 * deleting only the *other status* labels touches nothing else, and the delete list comes from
	 * the POST response, which is the label set as it is after this write rather than as it was when
	 * the event fired.
	 *
	 * The `existingLabels` the caller may already hold is therefore not consulted. It is still
	 * accepted so a caller can pass what it has, and is ignored on purpose.
	 */
	async setStatusLabel(
		repo: string,
		issueNumber: number,
		statusName: CanonicalStatus | string,
		existingLabels?: readonly LabelSource[],
	): Promise<void> {
		void existingLabels;
		const path = `/repos/${repo}/issues/${issueNumber}/labels`;
		let current: unknown;
		try {
			current = await this.request("POST", path, { labels: [statusName] });
		} catch (error) {
			this.#run.notice(`issue #${issueNumber} status label: ${describeFailure(error)}`);
			return;
		}
		for (const label of Array.isArray(current) ? (current as LabelPayload[]) : []) {
			const name = labelName(label);
			if (name === null || !isStatusLabel(name) || name === statusName) continue;
			try {
				await this.request("DELETE", `${path}/${encodeURIComponent(name)}`);
			} catch (error) {
				this.#run.notice(`removing status label "${name}" from #${issueNumber}: ${describeFailure(error)}`);
			}
		}
	}

	/** Adds one non-status label, leaving every other label alone. */
	async addIssueLabel(repo: string, issueNumber: number, label: string): Promise<void> {
		try {
			await this.request("POST", `/repos/${repo}/issues/${issueNumber}/labels`, { labels: [label] });
		} catch (error) {
			this.#run.notice(`adding label to issue #${issueNumber}: ${describeFailure(error)}`);
		}
	}

	/** Closes an issue, recording why. */
	async closeIssue(
		repo: string,
		issueNumber: number,
		reason: "completed" | "not_planned" = "completed",
	): Promise<void> {
		try {
			await this.request("PATCH", `/repos/${repo}/issues/${issueNumber}`, {
				state: "closed",
				state_reason: reason,
			});
		} catch (error) {
			this.#run.notice(`issue #${issueNumber} close attempt: ${describeFailure(error)}`);
		}
	}
}
