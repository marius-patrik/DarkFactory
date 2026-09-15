import { z } from "zod";
import { GitHubClient } from "./client.ts";
import { sealSecret } from "./secrets.ts";
import { commentSchema, issueSchema, pullRequestSchema, reviewSchema, variableSchema, type AuthorAssociation, type GitHubComment, type GitHubIssue, type GitHubPullRequest, type GitHubReview, type GitHubVariable } from "./types.ts";

const AUTHORIZED = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
/** Checks whether a GitHub association value is one of the authorized types (OWNER, MEMBER, COLLABORATOR). */
export function isAuthorizedAssociation(value: AuthorAssociation): boolean { return AUTHORIZED.has(value); }
/** Tests whether a login string ends with "[bot]", identifying a GitHub bot account. */
export function isBotLogin(login: string): boolean { return /\[bot\]$/i.test(login); }

/** Options for creating a new GitHub issue. */
export interface CreateIssueInput {
  /** The title of the issue. */
  title: string;
  /** The body/content of the issue. */
  body?: string;
  /** Array of label names to apply to the issue. */
  labels?: string[];
  /** Array of GitHub usernames to assign to the issue. */
  assignees?: string[];
}
/** Options for updating an existing GitHub issue. */
export interface UpdateIssueInput {
  /** Updated title of the issue. */
  title?: string;
  /** Updated body/content of the issue. */
  body?: string;
  /** New state of the issue. */
  state?: "open" | "closed";
  /** Reason for the state change. */
  state_reason?: "completed" | "not_planned" | "reopened";
}
/** Options for creating a new GitHub pull request. */
export interface CreatePullRequestInput {
  /** Title of the pull request. */
  title: string;
  /** The branch containing the changes. */
  head: string;
  /** The branch to merge into. */
  base: string;
  /** Description of the pull request. */
  body?: string;
  /** Whether to create the pull request as a draft. */
  draft?: boolean;
}
/** Options for updating an existing GitHub pull request. */
export interface UpdatePullRequestInput {
  /** Updated title of the pull request. */
  title?: string;
  /** Updated description of the pull request. */
  body?: string;
  /** Updated state of the pull request. */
  state?: "open" | "closed";
  /** Updated base branch. */
  base?: string;
  /** Whether the pull request should be a draft. */
  draft?: boolean;
}

/** Provides access to GitHub repository operations such as issues, pull requests, comments, and secrets. */
export class GitHubRepository {
  readonly #client: GitHubClient;
  readonly #owner: string;
  readonly #repo: string;
  constructor(client: GitHubClient, owner: string, repo: string) { this.#client = client; this.#owner = owner; this.#repo = repo; }
  /** The full repository identifier in `owner/repo` format. */
  get slug(): string { return `${this.#owner}/${this.#repo}`; }
  /** The GitHub organization or user name that owns the repository. */
  get owner(): string { return this.#owner; }
  /** The repository name. */
  get repo(): string { return this.#repo; }
  /** The underlying GitHub HTTP client used for API calls. */
  get client(): GitHubClient { return this.#client; }
  #path(suffix = ""): string { return `/repos/${encodeURIComponent(this.#owner)}/${encodeURIComponent(this.#repo)}${suffix}`; }

  /** Retrieves a single issue by its number. @param number - The issue number to fetch. @returns A promise resolving to the issue data. */
  async getIssue(number: number): Promise<GitHubIssue> { return parse(issueSchema, await this.#client.rest("GET", this.#path(`/issues/${number}`)), "issue"); }
  /** Creates a new issue in the repository. @param input - The issue creation options. @returns A promise resolving to the created issue data. */
  async createIssue(input: CreateIssueInput): Promise<GitHubIssue> { return parse(issueSchema, await this.#client.rest("POST", this.#path("/issues"), input), "issue"); }
  /** Updates an existing issue. @param number - The issue number to update. @param input - The update options. @returns A promise resolving to the updated issue data. */
  async updateIssue(number: number, input: UpdateIssueInput): Promise<GitHubIssue> { return parse(issueSchema, await this.#client.rest("PATCH", this.#path(`/issues/${number}`), input), "issue"); }
  /** Closes an issue with an optional reason. @param number - The issue number to close. @param reason - The reason for closing (defaults to "completed"). @returns A promise resolving to the closed issue data. */
  closeIssue(number: number, reason: "completed" | "not_planned" = "completed"): Promise<GitHubIssue> { return this.updateIssue(number, { state: "closed", state_reason: reason }); }
  /** Adds labels to an issue. @param number - The issue number. @param labels - Array of label names to add. @returns A promise resolving to the API response. */
  addLabels(number: number, labels: string[]): Promise<unknown> { return this.#client.rest("POST", this.#path(`/issues/${number}/labels`), { labels }); }
  /** Removes a label from an issue. @param number - The issue number. @param label - The label name to remove. @returns A promise resolving to the API response. */
  removeLabel(number: number, label: string): Promise<unknown> { return this.#client.rest("DELETE", this.#path(`/issues/${number}/labels/${encodeURIComponent(label)}`)); }
  /** Lists comments on an issue. @param number - The issue number. @returns A promise resolving to an array of comments. */
  async listComments(number: number): Promise<GitHubComment[]> { return parseArray(commentSchema, await this.#client.collectRest(this.#path(`/issues/${number}/comments?per_page=100`)), "comment"); }
  /** Creates a comment on an issue. @param number - The issue number. @param body - The comment text. @returns A promise resolving to the created comment. */
  async createComment(number: number, body: string): Promise<GitHubComment> { return parse(commentSchema, await this.#client.rest("POST", this.#path(`/issues/${number}/comments`), { body }), "comment"); }
  /** Edits an existing comment. @param commentId - The comment ID to edit. @param body - The new comment text. @returns A promise resolving to the edited comment. */
  async editComment(commentId: number, body: string): Promise<GitHubComment> { return parse(commentSchema, await this.#client.rest("PATCH", this.#path(`/issues/comments/${commentId}`), { body }), "comment"); }
  /** Adds a sub-issue to a parent issue. @param parentNumber - The parent issue number. @param childIssueId - The sub-issue ID to add. @returns A promise resolving to the API response. */
  addSubIssue(parentNumber: number, childIssueId: number): Promise<unknown> { return this.#client.rest("POST", this.#path(`/issues/${parentNumber}/sub_issues`), { sub_issue_id: childIssueId }); }

  /** Creates a new pull request. @param input - The pull request creation options. @returns A promise resolving to the created pull request data. */
  async createPullRequest(input: CreatePullRequestInput): Promise<GitHubPullRequest> { return parse(pullRequestSchema, await this.#client.rest("POST", this.#path("/pulls"), input), "pull request"); }
  /** Updates an existing pull request. @param number - The pull request number. @param input - The update options. @returns A promise resolving to the updated pull request data. */
  async updatePullRequest(number: number, input: UpdatePullRequestInput): Promise<GitHubPullRequest> {
    const { draft, ...rest } = input;
    const pr = parse(pullRequestSchema, await this.#client.rest("PATCH", this.#path(`/pulls/${number}`), rest), "pull request");
    if (draft === false && pr.draft) await this.markReady(pr.node_id);
    return pr;
  }
  /** Lists pull requests in the repository. @param options - Optional filters for head branch, base branch, and state. @returns A promise resolving to an array of pull requests. */
  async listPullRequests(options: { head?: string; base?: string; state?: "open" | "closed" | "all" } = {}): Promise<GitHubPullRequest[]> { const q = new URLSearchParams({ per_page: "100" }); if (options.head) q.set("head", options.head.includes(":") ? options.head : `${this.#owner}:${options.head}`); if (options.base) q.set("base", options.base); if (options.state) q.set("state", options.state); return parseArray(pullRequestSchema, await this.#client.collectRest(this.#path(`/pulls?${q}`)), "pull request"); }
  /** Lists reviews on a pull request. @param number - The pull request number. @returns A promise resolving to an array of reviews. */
  async listReviews(number: number): Promise<GitHubReview[]> { return parseArray(reviewSchema, await this.#client.collectRest(this.#path(`/pulls/${number}/reviews?per_page=100`)), "review"); }
  /** Checks whether the pull request has an approved review from an authorized association. @param number - The pull request number. @returns A promise resolving to true if an approved review exists. */
  async hasApprovedReview(number: number): Promise<boolean> { return (await this.listReviews(number)).some(review => review.state === "APPROVED" && isAuthorizedAssociation(review.author_association)); }
  /** Creates a review on a pull request. @param number - The pull request number. @param body - The review body text. @param event - The review event type (APPROVE, REQUEST_CHANGES, or COMMENT). @returns A promise resolving to the created review. */
  async createReview(number: number, body: string, event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT"): Promise<GitHubReview> { return parse(reviewSchema, await this.#client.rest("POST", this.#path(`/pulls/${number}/reviews`), { body, event }), "review"); }
  /** Retrieves the diff of a pull request. @param number - The pull request number. @param maxBytes - Maximum size of the diff in bytes (default 60000). @returns A promise resolving to an object containing the diff text, whether it was truncated, and the byte count. */
  async getPullRequestDiff(number: number, maxBytes = 60_000): Promise<{
    /** The diff text content. */
    text: string;
    /** Whether the diff was truncated. */
    truncated: boolean;
    /** Size of the diff in bytes. */
    bytes: number;
  }> {
    const text = await this.#client.rest<string>("GET", this.#path(`/pulls/${number}`), undefined, "application/vnd.github.v3.diff");
    const encoded = new TextEncoder().encode(text);
    if (encoded.length <= maxBytes) return { text, truncated: false, bytes: encoded.length };
    return { text: new TextDecoder().decode(encoded.slice(0, maxBytes)), truncated: true, bytes: encoded.length };
  }
  /** Merges a pull request. @param number - The pull request number. @param options - Optional merge configuration (commit title, message, method). @returns A promise resolving to an object indicating whether the merge succeeded, the commit message, and the commit SHA. */
  mergePullRequest(number: number, options: { commitTitle?: string; commitMessage?: string; method?: "merge" | "squash" | "rebase" } = {}): Promise<{
    /** Whether the merge was successful. */
    merged: boolean;
    /** The merge commit message. */
    message: string;
    /** The merge commit SHA (present if the merge succeeded). */
    sha?: string;
  }> { return this.#client.rest("PUT", this.#path(`/pulls/${number}/merge`), { commit_title: options.commitTitle, commit_message: options.commitMessage, merge_method: options.method ?? "merge" }); }
  /** Marks a pull request as ready for review. @param pullRequestId - The GraphQL node ID of the pull request. @returns A promise that resolves when the PR is marked ready. */
  async markReady(pullRequestId: string): Promise<void> { await this.#client.graphql("mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{number}} rateLimit{cost remaining resetAt}}", { id: pullRequestId }); }
  /** Enables auto-merge on a pull request. @param pullRequestId - The GraphQL node ID of the pull request. @param method - The merge method to use (default MERGE). @returns A promise that resolves when auto-merge is enabled. */
  async enableAutoMerge(pullRequestId: string, method: "MERGE" | "SQUASH" | "REBASE" = "MERGE"): Promise<void> { await this.#client.graphql("mutation($id:ID!,$method:PullRequestMergeMethod!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:$method}){pullRequest{number}} rateLimit{cost remaining resetAt}}", { id: pullRequestId, method }); }
  /** Checks the commit statuses for a ref. @param ref - The git ref (branch or SHA) to check. @returns A promise resolving to a map of status context names to their state. */
  async checkStates(ref: string): Promise<Map<string, "success" | "pending" | "failure">> {
    const runs = await this.#client.rest<{ check_runs?: Array<{ name: string; status: string; conclusion: string | null }> }>("GET", this.#path(`/commits/${encodeURIComponent(ref)}/check-runs?per_page=100`));
    const statuses = await this.#client.rest<{ statuses?: Array<{ context: string; state: string }> }>("GET", this.#path(`/commits/${encodeURIComponent(ref)}/status`));
    const values = new Map<string, "success" | "pending" | "failure">();
    for (const run of runs.check_runs ?? []) values.set(run.name, run.status !== "completed" ? "pending" : run.conclusion === "success" || run.conclusion === "neutral" || run.conclusion === "skipped" ? "success" : "failure");
    for (const status of statuses.statuses ?? []) if (!values.has(status.context)) values.set(status.context, status.state === "success" ? "success" : status.state === "pending" ? "pending" : "failure");
    return values;
  }
  /** Checks whether required status checks have passed for a ref. @param ref - The git ref to check. @param required - Array of required check names. @returns A promise resolving to an object with the overall state, missing check names, and failing check names. */
  async requiredCheckStatus(ref: string, required: string[]): Promise<{
    /** The overall state of required checks. */
    state: "success" | "pending" | "failure";
    /** Names of required checks that are missing entirely. */
    missing: string[];
    /** Names of required checks that are currently failing. */
    failing: string[];
  }> {
    const values = await this.checkStates(ref);
    const missing = required.filter(name => !values.has(name)); const failing = required.filter(name => values.get(name) === "failure"); const pending = required.some(name => values.get(name) === "pending");
    return { state: failing.length ? "failure" : missing.length || pending ? "pending" : "success", missing, failing };
  }
  /** Retrieves issues that are linked by closing references on a pull request. @param number - The pull request number. @returns A promise resolving to an array of issue numbers sorted ascending. */
  async linkedClosingIssues(number: number): Promise<number[]> {
    const query = "query($owner:String!,$repo:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$repo){pullRequest(number:$number){closingIssuesReferences(first:100,after:$cursor){nodes{number} pageInfo{hasNextPage endCursor}}}} rateLimit{cost remaining resetAt}}";
    const nodes = await this.#client.collectGraphQL<{ number: number }>(query, { owner: this.#owner, repo: this.#repo, number }, data => (data as any).repository.pullRequest.closingIssuesReferences);
    return [...new Set(nodes.map(node => node.number))].sort((a, b) => a - b);
  }

  /** Sets a repository secret. @param name - The name of the secret. @param plaintext - The plaintext value to encrypt and store. @returns A promise that resolves when the secret is set. */
  async setRepositorySecret(name: string, plaintext: string): Promise<void> { const key = await this.#publicKey(this.#path("/actions/secrets/public-key")); const encrypted_value = await sealSecret(key.key, plaintext); await this.#client.rest("PUT", this.#path(`/actions/secrets/${encodeURIComponent(name)}`), { encrypted_value, key_id: key.key_id }); }
  /** Sets an environment-scoped secret. @param environment - The environment name. @param name - The name of the secret. @param plaintext - The plaintext value to encrypt and store. @returns A promise that resolves when the secret is set. */
  async setEnvironmentSecret(environment: string, name: string, plaintext: string): Promise<void> { const base = this.#path(`/environments/${encodeURIComponent(environment)}/secrets`); const key = await this.#publicKey(`${base}/public-key`); const encrypted_value = await sealSecret(key.key, plaintext); await this.#client.rest("PUT", `${base}/${encodeURIComponent(name)}`, { encrypted_value, key_id: key.key_id }); }
  async #publicKey(path: string): Promise<{ key_id: string; key: string }> { return z.object({ key_id: z.string(), key: z.string() }).parse(await this.#client.rest("GET", path)); }

  /** Lists all GitHub variables for the repository. @returns A promise resolving to an array of variables. */
  async listVariables(): Promise<GitHubVariable[]> { const data = await this.#client.rest<{ variables?: unknown[] }>("GET", this.#path("/actions/variables?per_page=100")); return parseArray(variableSchema, data.variables ?? [], "variable"); }
  /** Gets a single GitHub variable by name. @param name - The variable name. @returns A promise resolving to the variable data. */
  async getVariable(name: string): Promise<GitHubVariable> { return parse(variableSchema, await this.#client.rest("GET", this.#path(`/actions/variables/${encodeURIComponent(name)}`)), "variable"); }
  /** Creates a new GitHub variable. @param name - The variable name. @param value - The variable value. @returns A promise that resolves when the variable is created. */
  async createVariable(name: string, value: string): Promise<void> { await this.#client.rest("POST", this.#path("/actions/variables"), { name, value }); }
  /** Updates an existing GitHub variable. @param name - The variable name. @param value - The new variable value. @returns A promise that resolves when the variable is updated. */
  async updateVariable(name: string, value: string): Promise<void> { await this.#client.rest("PATCH", this.#path(`/actions/variables/${encodeURIComponent(name)}`), { name, value }); }
  /** Deletes a GitHub variable by name. @param name - The variable name to delete. @returns A promise that resolves when the variable is deleted. */
  async deleteVariable(name: string): Promise<void> { await this.#client.rest("DELETE", this.#path(`/actions/variables/${encodeURIComponent(name)}`)); }
}

function parse<T>(schema: z.ZodType<T>, value: unknown, noun: string): T { const result = schema.safeParse(value); if (!result.success) throw new Error(`invalid GitHub ${noun} response: ${result.error.issues[0]?.message ?? "schema mismatch"}`); return result.data; }
function parseArray<T>(schema: z.ZodType<T>, value: unknown, noun: string): T[] { if (!Array.isArray(value)) throw new Error(`invalid GitHub ${noun} response: expected array`); return value.map(item => parse(schema, item, noun)); }
