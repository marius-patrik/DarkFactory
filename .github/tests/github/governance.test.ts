import { describe, expect, test } from "bun:test";
import { GitHubClient } from "../../../packages/github/src/client.ts";
import { GovernedPullRequests } from "../../../packages/github/src/governance.ts";
import { GitHubRepository } from "../../../packages/github/src/repository.ts";

const HEAD = "a".repeat(40);
const MERGED = "b".repeat(40);
const BASE = "c".repeat(40);
const endpoint = "https://api.github.com/repos/o/r";

function fixture() {
	const calls: Array<{ url: string; method: string; body: unknown; apiVersion: string | null }> = [];
	let merged = false;
	let downstack = false;
	let author = "darkfactory[bot]";
	let head = HEAD;
	let reviewSha = HEAD;
	let reviewState = "APPROVED";
	let reviewer = "maintainer";
	let reviewerType = "User";
	let approvedChecks = true;
	let protectionDenied = false;
	let compareStatus = "ahead";
	let mutationFailure = false;
	let pendingUuid = "630b9d5e-3f2a-4f7e-8b0c-2d5f9a8c1e42";

	const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
		const url = String(input);
		const method = init?.method ?? "GET";
		const body = init?.body ? JSON.parse(String(init.body)) : undefined;
		calls.push({ url, method, body, apiVersion: new Headers(init?.headers).get("X-GitHub-Api-Version") });
		const ok = (data: unknown, status = 200): Response =>
			new Response(JSON.stringify(data), {
				status,
				headers: { "content-type": "application/json" },
			});
		if (url === endpoint + "/pulls/7" && method === "GET") {
			return ok({
				number: 7,
				state: merged ? "closed" : "open",
				draft: false,
				merged,
				merged_at: merged ? "2026-10-31T00:00:00Z" : null,
				merge_commit_sha: merged ? MERGED : null,
				head: { sha: head, ref: "agent/7" },
				base: { ref: "main" },
				user: { login: author, type: author.endsWith("[bot]") ? "Bot" : "User" },
			});
		}
		if (url === endpoint + "/branches/main/protection") {
			if (protectionDenied) return ok({ message: "Forbidden" }, 403);
			return ok({
				required_pull_request_reviews: { required_approving_review_count: 1 },
				required_status_checks: { checks: [{ context: "test" }] },
			});
		}
		if (url === endpoint + "/pulls/7/reviews?per_page=100") {
			return ok([
				{
					id: 1,
					state: reviewState,
					commit_id: reviewSha,
					user: {
						login: reviewer,
						type: reviewerType,
					},
					author_association: "OWNER",
				},
			]);
		}
		if (url.includes("/pulls?")) {
			return ok(
				downstack
					? [
							{
								number: 5,
								id: 5,
								node_id: "PR_5",
								title: "parent",
								body: null,
								state: "open",
								draft: false,
								html_url: "https://github.com/o/r/pull/5",
								head: { ref: "main", sha: HEAD },
								base: { ref: "other" },
								user: { login: "darkfactory[bot]" },
								author_association: "MEMBER",
							},
						]
					: [],
			);
		}
		if (url === endpoint + "/commits/" + HEAD + "/check-runs?per_page=100")
			return ok({
				check_runs: [{ name: "test", status: "completed", conclusion: approvedChecks ? "success" : "failure" }],
			});
		if (url === endpoint + "/commits/" + HEAD + "/status") return ok({ statuses: [] });
		if (url === endpoint + "/pulls/7/merge-async" && method === "PUT") {
			if (mutationFailure) throw new Error("connection reset after server received PUT");
			expect(body).toEqual({
				sha: HEAD,
				merge_method: "merge",
				merge_action: "default",
				bypass_rules: false,
			});
			return ok({ status: "pending", details: { uuid: pendingUuid, expected_head_sha: HEAD } }, 202);
		}
		if (url === endpoint + "/pulls/7/merge-async/" + pendingUuid && method === "GET") return ok({ status: "enqueued" });
		if (url === endpoint + "/git/ref/heads/main") return ok({ object: { sha: BASE } });
		if (url === endpoint + "/compare/" + MERGED + "..." + BASE) return ok({ status: compareStatus });
		throw new Error("Unexpected GitHub request: " + method + " " + url);
	};
	const client = new GitHubClient({ token: "test-secret", fetch, maxRetries: 0 });
	const governance = new GovernedPullRequests(new GitHubRepository(client, "o", "r"));
	const request = { number: 7, approvedBy: "maintainer", reviewedHeadSha: HEAD, baseBranch: "main" };
	const writes = () => calls.filter((call) => call.method !== "GET");
	return {
		governance,
		request,
		calls,
		writes,
		setMerged: () => {
			merged = true;
		},
		setDownstack: () => {
			downstack = true;
		},
		setAuthor: (value: string) => {
			author = value;
		},
		setHead: (value: string) => {
			head = value;
		},
		setReviewSha: (value: string) => {
			reviewSha = value;
		},
		setReviewState: (value: string) => {
			reviewState = value;
		},
		setReviewer: (value: string) => {
			reviewer = value;
		},
		setReviewerType: (value: string) => {
			reviewerType = value;
		},
		setApprovedChecks: (value: boolean) => {
			approvedChecks = value;
		},
		setProtectionDenied: () => {
			protectionDenied = true;
		},
		setCompareStatus: (value: string) => {
			compareStatus = value;
		},
		setMutationFailure: () => {
			mutationFailure = true;
		},
	};
}

describe("GovernedPullRequests (API-only)", () => {
	test("bot PR + independent exact-SHA review + green protected checks enters queue only", async () => {
		const f = fixture();
		const result = await f.governance.requestMerge(f.request);
		expect(result).toEqual({
			number: 7,
			reviewedHeadSha: HEAD,
			merged: false,
			state: "enqueued",
		});
		expect(f.writes()).toHaveLength(1);
		expect(f.writes()[0]?.apiVersion).toBe("2026-03-10");
	});

	test("stale head rejects before any mutation", async () => {
		const f = fixture();
		f.setHead("f".repeat(40));
		await expect(f.governance.requestMerge(f.request)).rejects.toThrow("head changed");
		expect(f.writes()).toHaveLength(0);
	});

	test("a self-authored or human-authored PR cannot use a proxy human decision", async () => {
		const f = fixture();
		f.setAuthor("maintainer");
		await expect(f.governance.requestMerge(f.request)).rejects.toThrow("bot-authored");
		expect(f.writes()).toHaveLength(0);
	});

	test("stale review cannot authorize updated head", async () => {
		const f = fixture();
		f.setReviewSha("f".repeat(40));
		await expect(f.governance.requestMerge(f.request)).rejects.toThrow("current-head");
		expect(f.writes()).toHaveLength(0);
	});

	test("neither bot reviewers nor changes-requested count as human approval", async () => {
		const f = fixture();
		f.setReviewer("approval[bot]");
		f.setReviewerType("Bot");
		await expect(f.governance.requestMerge(f.request)).rejects.toThrow("human approval");
		expect(f.writes()).toHaveLength(0);
		const g = fixture();
		g.setReviewState("CHANGES_REQUESTED");
		await expect(g.governance.requestMerge(g.request)).rejects.toThrow("human approval");
		expect(g.writes()).toHaveLength(0);
	});

	test("a different authorized reviewer cannot impersonate the event actor", async () => {
		const f = fixture();
		f.setReviewer("other-maintainer");
		await expect(f.governance.requestMerge(f.request)).rejects.toThrow("human approval");
		expect(f.writes()).toHaveLength(0);
	});

	test("rejects absent required checks and unauthorized protected-branch scope", async () => {
		const f = fixture();
		f.setApprovedChecks(false);
		await expect(f.governance.requestMerge(f.request)).rejects.toThrow("not green");
		expect(f.writes()).toHaveLength(0);
		const g = fixture();
		g.setProtectionDenied();
		await expect(g.governance.requestMerge(g.request)).rejects.toThrow("Forbidden");
		expect(g.writes()).toHaveLength(0);
	});

	test("rejects a downstack side-effect even when the target itself is authorized", async () => {
		const f = fixture();
		f.setDownstack();
		await expect(f.governance.requestMerge(f.request)).rejects.toThrow("downstack");
		expect(f.writes()).toHaveLength(0);
	});

	test("a merged response requires verified protected-branch ancestry", async () => {
		const f = fixture();
		f.setMerged();
		f.setCompareStatus("diverged");
		await expect(f.governance.confirmMerged(f.request)).rejects.toThrow("not an ancestor");
		f.setCompareStatus("ahead");
		expect(await f.governance.confirmMerged(f.request)).toMatchObject({
			merged: true,
			state: "merged",
			mergeCommitSha: MERGED,
		});
		expect(f.writes()).toHaveLength(0);
	});

	test("ambiguous mutation completion is never retried; later readback can reconcile", async () => {
		const f = fixture();
		f.setMutationFailure();
		await expect(f.governance.requestMerge(f.request)).rejects.toThrow("connection reset");
		expect(f.writes()).toHaveLength(1);
		expect(f.writes()[0]?.url).toBe(endpoint + "/pulls/7/merge-async");
		f.setMerged();
		expect(await f.governance.confirmMerged(f.request)).toMatchObject({ merged: true });
		expect(f.writes()).toHaveLength(1);
	});
});

describe("GitHubClient mutation and cache safety", () => {
	test("never retries POST/PATCH/PUT/DELETE after ambiguous HTTP 503", async () => {
		for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
			let calls = 0;
			const client = new GitHubClient({
				token: "secret",
				fetch: async () => {
					calls++;
					return new Response(JSON.stringify({ message: "busy" }), { status: 503 });
				},
				sleep: async () => undefined,
			});
			await expect(client.rest(method, "/repos/o/r/issues", { body: "x" })).rejects.toThrow("busy");
			expect(calls).toBe(1);
		}
	});

	test("never retries a POST after transport failure", async () => {
		let calls = 0;
		const client = new GitHubClient({
			token: "secret",
			fetch: async () => {
				calls++;
				throw new Error("ambiguous network timeout");
			},
			sleep: async () => undefined,
		});
		await expect(client.rest("POST", "/repos/o/r/issues", {})).rejects.toThrow("ambiguous network timeout");
		expect(calls).toBe(1);
	});

	test("fail closed on orphaned HTTP 304", async () => {
		const client = new GitHubClient({
			token: "secret",
			fetch: async () => new Response(null, { status: 304 }),
		});
		await expect(client.rest("GET", "/repos/o/r")).rejects.toThrow("unexpected 304");
	});
});
