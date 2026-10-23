import { expect, test } from "bun:test";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository } from "../../src/github/repository.ts";
import { json, scripted } from "./helpers.ts";

test("PR approval requires APPROVED plus an authorized association", async () => {
	const mock = scripted([
		json([
			{
				id: 1,
				state: "CHANGES_REQUESTED",
				body: "do not merge; not approved",
				user: { login: "owner" },
				author_association: "OWNER",
			},
			{ id: 2, state: "APPROVED", body: "ok", user: { login: "outsider" }, author_association: "CONTRIBUTOR" },
			{ id: 3, state: "APPROVED", body: "ok", user: { login: "maintainer" }, author_association: "MEMBER" },
		]),
	]);
	const repo = new GitHubRepository(new GitHubClient({ token: "t", fetch: mock.fetch }), "o", "r");
	expect(await repo.hasApprovedReview(2)).toBeTrue();
});

test("creates/edits PRs, enables auto-merge, merges, checks status, and finds closing issues", async () => {
	const mock = scripted([
		json({
			number: 2,
			id: 20,
			node_id: "PR",
			title: "T",
			body: "Closes #4",
			state: "open",
			draft: true,
			html_url: "u",
			head: { ref: "h" },
			base: { ref: "b" },
			user: { login: "bot[bot]" },
			author_association: "NONE",
		}),
		json({
			number: 2,
			id: 20,
			node_id: "PR",
			title: "T2",
			body: "Closes #4",
			state: "open",
			draft: false,
			html_url: "u",
			head: { ref: "h" },
			base: { ref: "b" },
			user: { login: "bot[bot]" },
			author_association: "NONE",
		}),
		json({
			data: {
				enablePullRequestAutoMerge: { pullRequest: { number: 2 } },
				rateLimit: { cost: 1, remaining: 20, resetAt: "2030-01-01T00:00:00Z" },
			},
		}),
		json({ merged: true, message: "ok", sha: "abc" }),
		json({ check_runs: [{ name: "ci", status: "completed", conclusion: "success" }] }),
		json({ statuses: [{ context: "legacy", state: "success" }] }),
		json({
			data: {
				repository: {
					pullRequest: {
						closingIssuesReferences: { nodes: [{ number: 4 }], pageInfo: { hasNextPage: false, endCursor: null } },
					},
				},
				rateLimit: { cost: 1, remaining: 19, resetAt: "2030-01-01T00:00:00Z" },
			},
		}),
	]);
	const repo = new GitHubRepository(new GitHubClient({ token: "t", fetch: mock.fetch }), "o", "r");
	expect(
		(await repo.createPullRequest({ title: "T", head: "h", base: "b", body: "Closes #4", draft: true })).number,
	).toBe(2);
	await repo.updatePullRequest(2, { title: "T2", draft: false });
	await repo.enableAutoMerge("PR");
	expect((await repo.mergePullRequest(2)).merged).toBeTrue();
	expect(await repo.requiredCheckStatus("abc", ["ci", "legacy"])).toEqual({
		state: "success",
		missing: [],
		failing: [],
	});
	expect(await repo.linkedClosingIssues(2)).toEqual([4]);
});

test("caps pull request diffs by bytes", async () => {
	const mock = scripted([new Response("abcdef", { headers: { "content-type": "application/vnd.github.v3.diff" } })]);
	const repo = new GitHubRepository(new GitHubClient({ token: "t", fetch: mock.fetch }), "o", "r");
	expect(await repo.getPullRequestDiff(2, 4)).toEqual({ text: "abcd", truncated: true, bytes: 6 });
});
