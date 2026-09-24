import { z } from "zod";
import type { GitHubClient } from "./client.ts";
import { sealSecret } from "./secrets.ts";
import {
	type AuthorAssociation,
	commentSchema,
	type GitHubComment,
	type GitHubIssue,
	type GitHubPullRequest,
	type GitHubReview,
	type GitHubVariable,
	issueSchema,
	pullRequestSchema,
	reviewSchema,
	variableSchema,
} from "./types.ts";

type AuthorizedAssociation = Extract<AuthorAssociation, "OWNER" | "MEMBER" | "COLLABORATOR">;
const AUTHORIZED: ReadonlySet<string> = new Set<AuthorizedAssociation>(["OWNER", "MEMBER", "COLLABORATOR"]);
/** Narrows an untrusted GitHub association value to one authorized to advance governed transitions. */
export function isAuthorizedAssociation(value: unknown): value is AuthorizedAssociation {
	return typeof value === "string" && AUTHORIZED.has(value);
}
/** Tests whether a login string ends with "[bot]", identifying a GitHub bot account. */
export function isBotLogin(login: string): boolean {
	return /\[bot\]$/i.test(login);
}

/** Options for creating a new GitHub issue. */
export interface CreateIssueInput {
	title: string;
	body?: string;
	labels?: string[];
	assignees?: string[];
}
/** Options for updating an existing GitHub issue. */
export interface UpdateIssueInput {
	title?: string;
	body?: string;
	state?: "open" | "closed";
	state_reason?: "completed" | "not_planned" | "reopened";
}
/** Options for creating a new GitHub pull request. */
export interface CreatePullRequestInput {
	title: string;
	head: string;
	base: string;
	body?: string;
	draft?: boolean;
}
/** Options for updating an existing GitHub pull request. */
export interface UpdatePullRequestInput {
	title?: string;
	body?: string;
	state?: "open" | "closed";
	base?: string;
	draft?: boolean;
}
export interface CreateCheckRunInput {
	name: string;
	head_sha: string;
	status: "queued" | "in_progress" | "completed";
	conclusion?: "success" | "failure" | "neutral" | "cancelled" | "timed_out" | "action_required";
	output: { title: string; summary: string; text?: string };
	completed_at?: string;
}

/** Provides access to GitHub repository operations such as issues, pull requests, comments, and secrets. */
export class GitHubRepository {
	readonly #client: GitHubClient;
	readonly #owner: string;
	readonly #repo: string;
	constructor(client: GitHubClient, owner: string, repo: string) {
		this.#client = client;
		this.#owner = owner;
		this.#repo = repo;
	}
	get slug(): string {
		return `${this.#owner}/${this.#repo}`;
	}
	get owner(): string {
		return this.#owner;
	}
	get repo(): string {
		return this.#repo;
	}
	get client(): GitHubClient {
		return this.#client;
	}
	#path(suffix = ""): string {
		return `/repos/${encodeURIComponent(this.#owner)}/${encodeURIComponent(this.#repo)}${suffix}`;
	}

	async getIssue(number: number): Promise<GitHubIssue> {
		return parse(issueSchema, await this.#client.rest("GET", this.#path(`/issues/${number}`)), "issue");
	}
	async createIssue(input: CreateIssueInput): Promise<GitHubIssue> {
		return parse(issueSchema, await this.#client.rest("POST", this.#path("/issues"), input), "issue");
	}
	async updateIssue(number: number, input: UpdateIssueInput): Promise<GitHubIssue> {
		return parse(issueSchema, await this.#client.rest("PATCH", this.#path(`/issues/${number}`), input), "issue");
	}
	closeIssue(number: number, reason: "completed" | "not_planned" = "completed"): Promise<GitHubIssue> {
		return this.updateIssue(number, { state: "closed", state_reason: reason });
	}
	addLabels(number: number, labels: string[]): Promise<unknown> {
		return this.#client.rest("POST", this.#path(`/issues/${number}/labels`), { labels });
	}
	removeLabel(number: number, label: string): Promise<unknown> {
		return this.#client.rest("DELETE", this.#path(`/issues/${number}/labels/${encodeURIComponent(label)}`));
	}
	async listComments(number: number): Promise<GitHubComment[]> {
		return parseArray(
			commentSchema,
			await this.#client.collectRest(this.#path(`/issues/${number}/comments?per_page=100`)),
			"comment",
		);
	}
	async createComment(number: number, body: string): Promise<GitHubComment> {
		return parse(
			commentSchema,
			await this.#client.rest("POST", this.#path(`/issues/${number}/comments`), { body }),
			"comment",
		);
	}
	async editComment(commentId: number, body: string): Promise<GitHubComment> {
		return parse(
			commentSchema,
			await this.#client.rest("PATCH", this.#path(`/issues/comments/${commentId}`), { body }),
			"comment",
		);
	}
	addSubIssue(parentNumber: number, childIssueId: number): Promise<unknown> {
		return this.#client.rest("POST", this.#path(`/issues/${parentNumber}/sub_issues`), { sub_issue_id: childIssueId });
	}

	async createPullRequest(input: CreatePullRequestInput): Promise<GitHubPullRequest> {
		return parse(pullRequestSchema, await this.#client.rest("POST", this.#path("/pulls"), input), "pull request");
	}
	async updatePullRequest(number: number, input: UpdatePullRequestInput): Promise<GitHubPullRequest> {
		const { draft, ...rest } = input;
		const pr = parse(
			pullRequestSchema,
			await this.#client.rest("PATCH", this.#path(`/pulls/${number}`), rest),
			"pull request",
		);
		if (draft === false && pr.draft) await this.markReady(pr.node_id);
		return pr;
	}
	async listPullRequests(
		options: { head?: string; base?: string; state?: "open" | "closed" | "all" } = {},
	): Promise<GitHubPullRequest[]> {
		const q = new URLSearchParams({ per_page: "100" });
		if (options.head) q.set("head", options.head.includes(":") ? options.head : `${this.#owner}:${options.head}`);
		if (options.base) q.set("base", options.base);
		if (options.state) q.set("state", options.state);
		return parseArray(pullRequestSchema, await this.#client.collectRest(this.#path(`/pulls?${q}`)), "pull request");
	}
	async listReviews(number: number): Promise<GitHubReview[]> {
		return parseArray(
			reviewSchema,
			await this.#client.collectRest(this.#path(`/pulls/${number}/reviews?per_page=100`)),
			"review",
		);
	}
	async hasApprovedReview(number: number): Promise<boolean> {
		return (await this.listReviews(number)).some(
			(review) => review.state === "APPROVED" && isAuthorizedAssociation(review.author_association),
		);
	}
	async createReview(
		number: number,
		body: string,
		event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
	): Promise<GitHubReview> {
		return parse(
			reviewSchema,
			await this.#client.rest("POST", this.#path(`/pulls/${number}/reviews`), { body, event }),
			"review",
		);
	}
	async getPullRequestDiff(
		number: number,
		maxBytes = 60_000,
	): Promise<{ text: string; truncated: boolean; bytes: number }> {
		const text = await this.#client.rest<string>(
			"GET",
			this.#path(`/pulls/${number}`),
			undefined,
			"application/vnd.github.v3.diff",
		);
		const encoded = new TextEncoder().encode(text);
		if (encoded.length <= maxBytes) return { text, truncated: false, bytes: encoded.length };
		return { text: new TextDecoder().decode(encoded.slice(0, maxBytes)), truncated: true, bytes: encoded.length };
	}
	mergePullRequest(
		number: number,
		options: { commitTitle?: string; commitMessage?: string; method?: "merge" | "squash" | "rebase" } = {},
	): Promise<{ merged: boolean; message: string; sha?: string }> {
		return this.#client.rest("PUT", this.#path(`/pulls/${number}/merge`), {
			commit_title: options.commitTitle,
			commit_message: options.commitMessage,
			merge_method: options.method ?? "merge",
		});
	}
	async markReady(pullRequestId: string): Promise<void> {
		await this.#client.graphql(
			"mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{number}} rateLimit{cost remaining resetAt}}",
			{ id: pullRequestId },
		);
	}
	async enableAutoMerge(pullRequestId: string, method: "MERGE" | "SQUASH" | "REBASE" = "MERGE"): Promise<void> {
		await this.#client.graphql(
			"mutation($id:ID!,$method:PullRequestMergeMethod!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:$method}){pullRequest{number}} rateLimit{cost remaining resetAt}}",
			{ id: pullRequestId, method },
		);
	}
	async checkStates(ref: string): Promise<Map<string, "success" | "pending" | "failure">> {
		const runs = await this.#client.rest<{
			check_runs?: Array<{ name: string; status: string; conclusion: string | null }>;
		}>("GET", this.#path(`/commits/${encodeURIComponent(ref)}/check-runs?per_page=100`));
		const statuses = await this.#client.rest<{ statuses?: Array<{ context: string; state: string }> }>(
			"GET",
			this.#path(`/commits/${encodeURIComponent(ref)}/status`),
		);
		const values = new Map<string, "success" | "pending" | "failure">();
		for (const run of runs.check_runs ?? [])
			values.set(
				run.name,
				run.status !== "completed" ? "pending" : run.conclusion === "success" ? "success" : "failure",
			);
		for (const status of statuses.statuses ?? [])
			if (!values.has(status.context))
				values.set(
					status.context,
					status.state === "success" ? "success" : status.state === "pending" ? "pending" : "failure",
				);
		return values;
	}
	async requiredCheckStatus(
		ref: string,
		required: string[],
	): Promise<{ state: "success" | "pending" | "failure"; missing: string[]; failing: string[] }> {
		const values = await this.checkStates(ref);
		const missing = required.filter((name) => !values.has(name));
		const failing = required.filter((name) => values.get(name) === "failure");
		const pending = required.some((name) => values.get(name) === "pending");
		return { state: failing.length ? "failure" : missing.length || pending ? "pending" : "success", missing, failing };
	}
	async linkedClosingIssues(number: number): Promise<number[]> {
		const query =
			"query($owner:String!,$repo:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$repo){pullRequest(number:$number){closingIssuesReferences(first:100,after:$cursor){nodes{number} pageInfo{hasNextPage endCursor}}}} rateLimit{cost remaining resetAt}}";
		const nodes = await this.#client.collectGraphQL<{ number: number }>(
			query,
			{ owner: this.#owner, repo: this.#repo, number },
			(data) => (data as any).repository.pullRequest.closingIssuesReferences,
		);
		return [...new Set(nodes.map((node) => node.number))].sort((a, b) => a - b);
	}

	async getDefaultBranchHeadSha(): Promise<string> {
		const repoInfo = await this.#client.rest<{ default_branch?: string }>("GET", this.#path(""));
		const defaultBranch = repoInfo.default_branch;
		if (!defaultBranch) throw new Error(`GitHub repository response did not declare a default branch for ${this.slug}`);
		const refInfo = await this.#client.rest<{ object?: { sha?: string } }>(
			"GET",
			this.#path(`/git/ref/heads/${encodeURIComponent(defaultBranch)}`),
		);
		const sha = refInfo.object?.sha;
		if (!sha) throw new Error(`Could not resolve default branch HEAD for ${defaultBranch}`);
		return sha;
	}
	async createCheckRun(input: CreateCheckRunInput): Promise<unknown> {
		return this.#client.rest("POST", this.#path("/check-runs"), input);
	}

	async setRepositorySecret(name: string, plaintext: string): Promise<void> {
		const key = await this.#publicKey(this.#path("/actions/secrets/public-key"));
		const encrypted_value = await sealSecret(key.key, plaintext);
		await this.#client.rest("PUT", this.#path(`/actions/secrets/${encodeURIComponent(name)}`), {
			encrypted_value,
			key_id: key.key_id,
		});
	}
	async setEnvironmentSecret(environment: string, name: string, plaintext: string): Promise<void> {
		const base = this.#path(`/environments/${encodeURIComponent(environment)}/secrets`);
		const key = await this.#publicKey(`${base}/public-key`);
		const encrypted_value = await sealSecret(key.key, plaintext);
		await this.#client.rest("PUT", `${base}/${encodeURIComponent(name)}`, { encrypted_value, key_id: key.key_id });
	}
	async #publicKey(path: string): Promise<{ key_id: string; key: string }> {
		return z.object({ key_id: z.string(), key: z.string() }).parse(await this.#client.rest("GET", path));
	}

	async listVariables(): Promise<GitHubVariable[]> {
		const data = await this.#client.rest<{ variables?: unknown[] }>(
			"GET",
			this.#path("/actions/variables?per_page=100"),
		);
		return parseArray(variableSchema, data.variables ?? [], "variable");
	}
	async getVariable(name: string): Promise<GitHubVariable> {
		return parse(
			variableSchema,
			await this.#client.rest("GET", this.#path(`/actions/variables/${encodeURIComponent(name)}`)),
			"variable",
		);
	}
	async createVariable(name: string, value: string): Promise<void> {
		await this.#client.rest("POST", this.#path("/actions/variables"), { name, value });
	}
	async updateVariable(name: string, value: string): Promise<void> {
		await this.#client.rest("PATCH", this.#path(`/actions/variables/${encodeURIComponent(name)}`), { name, value });
	}
	async deleteVariable(name: string): Promise<void> {
		await this.#client.rest("DELETE", this.#path(`/actions/variables/${encodeURIComponent(name)}`));
	}
}

function parse<T>(schema: z.ZodType<T>, value: unknown, noun: string): T {
	const result = schema.safeParse(value);
	if (!result.success)
		throw new Error(`invalid GitHub ${noun} response: ${result.error.issues[0]?.message ?? "schema mismatch"}`);
	return result.data;
}
function parseArray<T>(schema: z.ZodType<T>, value: unknown, noun: string): T[] {
	if (!Array.isArray(value)) throw new Error(`invalid GitHub ${noun} response: expected array`);
	return value.map((item) => parse(schema, item, noun));
}
