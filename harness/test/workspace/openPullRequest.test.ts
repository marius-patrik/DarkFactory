import { describe, test, expect } from "bun:test";
import { openPullRequest } from "../../src/workspace/openPullRequest.ts";
import type { GitHubPullRequest } from "../../src/github/types.ts";

describe("openPullRequest", () => {
	const mockPr: GitHubPullRequest = {
		number: 123,
		id: 123,
		node_id: "MDExOlB1bGxSZXF1ZXN0MQ==",
		html_url: "https://github.com/owner/repo/pull/123",
		state: "open",
		title: "Test PR",
		body: "Test Body",
		head: { ref: "feature", sha: "abc1234" },
		base: { ref: "main", sha: "def5678" },
		draft: false,
		user: { login: "testuser" },
		author_association: "OWNER",
	};

	test("creates a pull request when no open PR exists", async () => {
		const calls: { method: string; args: any[] }[] = [];
		const fakeRepo = {
			async listPullRequests(options: any) {
				calls.push({ method: "listPullRequests", args: [options] });
				return [];
			},
			async createPullRequest(input: any) {
				calls.push({ method: "createPullRequest", args: [input] });
				return mockPr;
			},
		};

		const result = await openPullRequest({
			repo: fakeRepo,
			head: "feature",
			base: "main",
			title: "Test PR",
			body: "Test Body",
			draft: false,
		});

		expect(result).toEqual(mockPr);
		expect(calls).toEqual([
			{
				method: "listPullRequests",
				args: [{ head: "feature", base: "main", state: "open" }],
			},
			{
				method: "createPullRequest",
				args: [{ head: "feature", base: "main", title: "Test PR", body: "Test Body", draft: false }],
			},
		]);
	});

	test("returns existing open pull request without calling createPullRequest when one exists", async () => {
		const calls: { method: string; args: any[] }[] = [];
		const fakeRepo = {
			async listPullRequests(options: any) {
				calls.push({ method: "listPullRequests", args: [options] });
				return [mockPr];
			},
			async createPullRequest(input: any) {
				calls.push({ method: "createPullRequest", args: [input] });
				return mockPr;
			},
		};

		const result = await openPullRequest({
			repo: fakeRepo,
			head: "feature",
			base: "main",
			title: "Test PR",
			body: "Test Body",
			draft: false,
		});

		expect(result).toEqual(mockPr);
		expect(calls).toEqual([
			{
				method: "listPullRequests",
				args: [{ head: "feature", base: "main", state: "open" }],
			},
		]);
	});
});
