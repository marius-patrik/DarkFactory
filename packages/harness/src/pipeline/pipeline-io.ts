/**
 * The GitHub I/O the pipeline's handlers perform, gathered behind one port.
 *
 * Ported from the `run_gh`/`try_gh` pair in `.github/scripts/agent_runner.py`. The Python reaches
 * GitHub by shelling out to the `gh` CLI; this port reaches it through the repository's own
 * {@link GitHubClient}, so a ported handler opens no second HTTP path and inherits the client's
 * retries, rate-limit accounting and error classification rather than reimplementing them.
 *
 * The shape of the port follows the `gh` subcommands the Python actually invokes, not a generalised
 * resource API. `gh pr comment` and `gh issue comment` are the same REST call - a pull request's
 * conversation comment *is* an issue comment - so they are one method here, named
 * {@link PipelineIo.addComment}.
 */

import type { GitHubClient } from "../github/client.ts";
import type { AgentDispatchPayload, LabelLike } from "./dispatch.ts";

/** The issue fields a handler can ask for, mirroring `gh issue view --json`. */
export type IssueField = "title" | "body" | "labels" | "comments" | "parent";

/** A comment as the handlers read it. */
export interface IssueCommentRow {
	/** GitHub's comment id, which is assigned in creation order and is what the claim election compares. */
	id: number;
	/** The comment body. */
	body: string;
}

/** The subset of an issue a handler reads. */
export interface IssueView {
	/** The issue title. */
	title: string;
	/** The issue body. */
	body: string;
	/** The issue's labels, when asked for. */
	labels: LabelLike[];
	/** The issue's comment bodies, oldest first, when asked for. */
	comments: string[];
	/**
	 * The parent issue of a sub-issue, when asked for.
	 *
	 * GitHub exposes the parent relationship only through GraphQL, so asking for it costs a
	 * different request than the REST issue read; that cost is the caller's to choose, exactly as
	 * `comments` is.
	 */
	parentIssue?: number | undefined;
}

/** The pull request fields a handler can ask for, mirroring `gh pr view --json`. */
export type PrField = "body" | "comments" | "closingIssues";

/** An issue a pull request closes, as the plan resolver reads it. */
export interface ClosingIssue {
	/** The issue number. */
	number: number;
	/** The issue's labels. */
	labels: LabelLike[];
	/** The issue title. */
	title: string;
}

/** The subset of a pull request a handler reads. */
export interface PrView {
	/** The pull request body. */
	body: string;
	/** The pull request's comment bodies, oldest first, when asked for. */
	comments: string[];
	/** The issues the pull request closes, when asked for. */
	closingIssues: ClosingIssue[];
}

/** A label to add to, or remove from, an issue or pull request. */
export interface LabelChange {
	/** The labels, in the order the Python passed them to one `--add-label`/`--remove-label`. */
	labels: readonly string[];
}

/** The inputs a pull request is opened with. */
export interface PrCreateInput {
	/** The branch carrying the work. */
	head: string;
	/** The branch the work merges into. */
	base: string;
	/** The pull request title. */
	title: string;
	/** The pull request body. */
	body: string;
	/** Whether the pull request opens as a draft. */
	draft: boolean;
}

/**
 * Everything the pipeline's handlers read from and write to GitHub.
 *
 * Every method throws on failure. The Python distinguished `run_gh`, which raises and ends the run,
 * from `try_gh`, which reports and carries on; that distinction is preserved at the call site by
 * wrapping a call in {@link bestEffort} rather than by having two methods per operation.
 */
export interface PipelineIo {
	/**
	 * Read fields off an issue.
	 *
	 * @param repo - Repository slug, `owner/name`.
	 * @param issue - The issue number.
	 * @param fields - The fields to read; `comments` is the only one costing a second request.
	 * @returns The requested fields, with unread ones as empty.
	 */
	issueView(repo: string, issue: number, fields: readonly IssueField[]): Promise<IssueView>;

	/**
	 * List an issue's comments, oldest first, with their ids.
	 *
	 * @param repo - Repository slug, `owner/name`.
	 * @param issue - The issue number.
	 * @returns The comments, or an empty list.
	 */
	issueComments(repo: string, issue: number): Promise<IssueCommentRow[]>;

	/**
	 * Post a comment on an issue or a pull request.
	 *
	 * @param repo - Repository slug, `owner/name`.
	 * @param number - The issue or pull request number.
	 * @param body - The comment body.
	 */
	addComment(repo: string, number: number, body: string): Promise<void>;

	/**
	 * Add or remove labels on an issue or a pull request.
	 *
	 * @param repo - Repository slug, `owner/name`.
	 * @param number - The issue or pull request number.
	 * @param change - The labels, and `add` whether to add or remove them.
	 */
	changeLabels(repo: string, number: number, change: LabelChange & { add: boolean }): Promise<void>;

	/**
	 * Read fields off a pull request.
	 *
	 * Separate from {@link PipelineIo.issueView} because a pull request's conversation comment is
	 * an issue comment, but its *closing references* are not: they are a GraphQL-only relationship
	 * that a pull request is what has, and the plan resolver needs them.
	 *
	 * @param repo - Repository slug, `owner/name`.
	 * @param pr - The pull request number.
	 * @param fields - The fields to read; `comments` and `closingIssues` each cost a second request.
	 * @returns The requested fields, with unread ones as empty.
	 */
	prView(repo: string, pr: number, fields: readonly PrField[]): Promise<PrView>;

	/**
	 * Read a pull request's unified diff.
	 *
	 * @param repo - Repository slug, `owner/name`.
	 * @param pr - The pull request number.
	 * @returns The diff text.
	 */
	prDiff(repo: string, pr: number): Promise<string>;

	/**
	 * Mark a draft pull request ready for review.
	 *
	 * @param repo - Repository slug, `owner/name`.
	 * @param pr - The pull request number.
	 */
	prReady(repo: string, pr: number): Promise<void>;

	/**
	 * The open pull requests a branch has, in the order GitHub returns them.
	 *
	 * @param repo - Repository slug, `owner/name`.
	 * @param head - The branch carrying the work, without an owner prefix.
	 * @param base - The branch the work merges into.
	 * @returns The pull request numbers, possibly empty.
	 */
	prNumbersForBranch(repo: string, head: string, base: string): Promise<number[]>;

	/**
	 * Open a pull request.
	 *
	 * @param repo - Repository slug, `owner/name`.
	 * @param input - The pull request's head, base, title, body and draft state.
	 */
	prCreate(repo: string, input: PrCreateInput): Promise<void>;

	/**
	 * Dispatch a repository workflow with string inputs.
	 *
	 * GitHub's dispatch endpoint requires a ref, where `gh workflow run` defaults it to the
	 * repository's default branch. The caller can pass that ref; this resolves it when it is absent.
	 *
	 * @param repo - Repository slug, `owner/name`.
	 * @param workflow - The workflow file name, e.g. `open-pr.yml`.
	 * @param inputs - The workflow's string inputs.
	 * @param ref - The branch to run the workflow on; the repository's default branch when absent.
	 */
	runWorkflow(repo: string, workflow: string, inputs: Readonly<Record<string, string>>, ref?: string): Promise<void>;

	/**
	 * Dispatch a `repository_dispatch` event, the way the pipeline hands a stage to itself.
	 *
	 * @param repo - Repository slug, `owner/name`.
	 * @param clientPayload - The stage's payload.
	 */
	dispatchAgentStage(repo: string, clientPayload: AgentDispatchPayload): Promise<void>;
}

/** The media type that makes a pull request read as its diff rather than as its metadata. */
const DIFF_ACCEPT = "application/vnd.github.v3.diff";

/** The event type every agent-dispatch stage arrives under. */
const AGENT_DISPATCH_EVENT_TYPE = "agent-dispatch";

/**
 * The sub-issue parent of an issue.
 *
 * GitHub exposes this relationship only through GraphQL, so the REST issue read cannot answer it
 * and asking for it is a second request. The Python asked `gh` for `body,parent,comments` in one
 * command, which hid that cost.
 */
const PARENT_ISSUE_QUERY = `query ($owner: String!, $name: String!, $number: Int!) {
	repository(owner: $owner, name: $name) {
		issue(number: $number) {
			parent { number }
		}
	}
}`;

/** The body, comments and closing references of a pull request. */
const PR_VIEW_QUERY = `query ($owner: String!, $name: String!, $number: Int!) {
	repository(owner: $owner, name: $name) {
		pullRequest(number: $number) {
			body
			comments(first: 100) { nodes { body } }
			closingIssuesReferences(first: 50) {
				nodes { number title labels(first: 50) { nodes { name } } }
			}
		}
	}
}`;

/** Split a repository slug into its owner and name, the way both GraphQL queries want them. */
function splitRepo(repo: string): { owner: string; name: string } {
	const slash = repo.indexOf("/");
	if (slash < 0) return { owner: repo, name: "" };
	return { owner: repo.slice(0, slash), name: repo.slice(slash + 1) };
}

/** Pull the bodies out of a GraphQL `comments` connection. */
function commentBodies(nodes: unknown): string[] {
	if (!Array.isArray(nodes)) return [];
	return nodes.map((node) => String((node as { body?: unknown } | null)?.body ?? ""));
}

/** Pull the issues out of a GraphQL `closingIssuesReferences` connection. */
function closingIssues(nodes: unknown): ClosingIssue[] {
	if (!Array.isArray(nodes)) return [];
	const issues: ClosingIssue[] = [];
	for (const node of nodes) {
		const issue = node as { number?: unknown; title?: unknown; labels?: { nodes?: unknown } } | null;
		if (typeof issue?.number !== "number") continue;
		issues.push({
			number: issue.number,
			title: String(issue.title ?? ""),
			labels: Array.isArray(issue.labels?.nodes)
				? issue.labels.nodes.map((label) => String((label as { name?: unknown } | null)?.name ?? ""))
				: [],
		});
	}
	return issues;
}

/**
 * The `PipelineIo` backed by {@link GitHubClient}.
 *
 * The client's ETag cache is per-URL and invalidated on every write, which is the right shape here:
 * a handler reads an issue, then writes to it, and must not see its own write served from cache.
 *
 * @param client - The GitHub client every request goes through.
 * @returns The port.
 */
export function githubPipelineIo(client: GitHubClient): PipelineIo {
	const defaultBranches = new Map<string, Promise<string>>();

	/**
	 * Resolve a repository's default branch, once. `gh workflow run` resolves it the same way when
	 * no `--ref` is given, and the dispatch endpoint will not accept the request without one.
	 */
	const defaultBranch = (repo: string): Promise<string> => {
		let known = defaultBranches.get(repo);
		if (!known) {
			known = client.rest<{ default_branch?: string }>("GET", `/repos/${repo}`).then(
				(body) => body.default_branch ?? "main",
				// A repository whose default branch cannot be read still names one on GitHub, and
				// the Python let `gh` fall back the same way rather than failing the run.
				() => "main",
			);
			defaultBranches.set(repo, known);
		}
		return known;
	};

	/** List an issue's comments; shared by `issueComments` and by `issueView`'s `comments` field. */
	const listComments = async (repo: string, issue: number): Promise<IssueCommentRow[]> => {
		const rows = await client.collectRest<{ id?: number; body?: string }>(`/repos/${repo}/issues/${issue}/comments`);
		return rows.map((row, index) => ({ id: row.id ?? index, body: row.body ?? "" }));
	};

	/**
	 * Read an issue's sub-issue parent, or `undefined` when it has none.
	 *
	 * A repository that has not enabled sub-issues answers `null` here, which is not an error: the
	 * plan resolver falls through to the body and the comments.
	 */
	const readParentIssue = async (repo: string, issue: number): Promise<number | undefined> => {
		const { owner, name } = splitRepo(repo);
		if (!owner || !name) return undefined;
		const data = await client.graphql<{
			repository?: { issue?: { parent?: { number?: number } | null } | null } | null;
		}>(PARENT_ISSUE_QUERY, { owner, name, number: issue });
		const number = data.repository?.issue?.parent?.number;
		return typeof number === "number" ? number : undefined;
	};

	/** Read a pull request's body, comments and closing references in one GraphQL round trip. */
	const readPrView = async (repo: string, pr: number, fields: readonly PrField[]): Promise<PrView> => {
		const view: PrView = { body: "", comments: [], closingIssues: [] };
		if (fields.length === 0) return view;
		const { owner, name } = splitRepo(repo);
		if (!owner || !name) return view;
		const data = await client.graphql<{
			repository?: {
				pullRequest?: {
					body?: string | null;
					comments?: { nodes?: unknown };
					closingIssuesReferences?: { nodes?: unknown };
				} | null;
			} | null;
		}>(PR_VIEW_QUERY, { owner, name, number: pr });
		const pull = data.repository?.pullRequest;
		if (!pull) return view;
		view.body = pull.body ?? "";
		if (fields.includes("comments")) view.comments = commentBodies(pull.comments?.nodes);
		if (fields.includes("closingIssues")) view.closingIssues = closingIssues(pull.closingIssuesReferences?.nodes);
		return view;
	};

	return {
		async issueView(repo, issue, fields) {
			const body = await client.rest<{
				title?: string;
				body?: string;
				labels?: Array<{ name?: string } | string>;
			}>("GET", `/repos/${repo}/issues/${issue}`);
			const view: IssueView = {
				title: body.title ?? "",
				body: body.body ?? "",
				labels: fields.includes("labels") ? (body.labels ?? []) : [],
				comments: [],
			};
			// `gh issue view --json comments` returns comment bodies, but the issue endpoint returns
			// only a count of them, so asking for comments costs a second request here where the CLI
			// made one. Asking is the caller's choice, which keeps that cost off the paths that only
			// want a title and a body.
			if (fields.includes("comments")) {
				view.comments = (await listComments(repo, Number(issue))).map((row) => row.body);
			}
			// The parent of a sub-issue is GraphQL-only, so it is a third request rather than a field
			// of the first. See {@link PARENT_ISSUE_QUERY}.
			if (fields.includes("parent")) {
				view.parentIssue = await readParentIssue(repo, issue);
			}
			return view;
		},

		issueComments: listComments,

		async addComment(repo, number, body) {
			await client.rest("POST", `/repos/${repo}/issues/${number}/comments`, { body });
		},

		async changeLabels(repo, number, change) {
			const issuePath = `/repos/${repo}/issues/${number}`;
			if (change.add) {
				await client.rest("POST", `${issuePath}/labels`, { labels: [...change.labels] });
				return;
			}
			// A pull request's labels are issue labels, so `gh pr edit --remove-label` and
			// `gh issue edit --remove-label` are one call.
			for (const label of change.labels) {
				await client.rest("DELETE", `${issuePath}/labels/${encodeURIComponent(label)}`);
			}
		},

		async prView(repo, pr, fields) {
			return readPrView(repo, pr, fields);
		},

		async prDiff(repo, pr) {
			return client.rest<string>("GET", `/repos/${repo}/pulls/${pr}`, undefined, DIFF_ACCEPT);
		},

		async prReady(repo, pr) {
			await client.rest("PATCH", `/repos/${repo}/pulls/${pr}`, { draft: false });
		},

		async prNumbersForBranch(repo, head, base) {
			const owner = repo.includes("/") ? (repo.split("/")[0] as string) : "";
			const query = new URLSearchParams({ head: `${owner}:${head}`, base, state: "open" });
			const pulls = await client.rest<Array<{ number?: number }>>("GET", `/repos/${repo}/pulls?${query}`);
			return (pulls ?? []).map((pull) => pull.number).filter((number): number is number => typeof number === "number");
		},

		async prCreate(repo, input) {
			await client.rest("POST", `/repos/${repo}/pulls`, {
				head: input.head,
				base: input.base,
				title: input.title,
				body: input.body,
				draft: input.draft,
			});
		},

		async runWorkflow(repo, workflow, inputs, ref) {
			await client.rest("POST", `/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
				ref: ref ?? (await defaultBranch(repo)),
				inputs: { ...inputs },
			});
		},

		async dispatchAgentStage(repo, clientPayload) {
			await client.rest("POST", `/repos/${repo}/dispatches`, {
				event_type: AGENT_DISPATCH_EVENT_TYPE,
				client_payload: clientPayload,
			});
		},
	};
}

/**
 * Run a GitHub call whose failure must not end the run.
 *
 * Ported from `try_gh`. The clearest case is classification: an agent that cannot apply a label has
 * still read the issue, can still interpret it, and can still be useful. Aborting there threw the
 * whole run away and filed a pipeline-failure issue whose only content was a traceback.
 *
 * @param doing - What was being attempted, for the report; the Python defaulted this to the first
 *   two words of the command.
 * @param operation - The call to make.
 * @param report - Where the failure is written; defaults to stderr.
 * @returns The call's result, or `undefined` when it failed.
 */
export async function bestEffort<T>(
	doing: string,
	operation: () => Promise<T>,
	report: (message: string) => void = (message) => console.error(message),
): Promise<T | undefined> {
	try {
		return await operation();
	} catch (error) {
		report(`Could not ${doing}: ${errorMessage(error)}`);
		return undefined;
	}
}

/**
 * The message of a thrown value.
 *
 * @param error - The thrown value.
 * @returns Its message, or its string form when it carries none.
 */
export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
