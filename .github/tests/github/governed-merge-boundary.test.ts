import { describe, expect, test } from "bun:test";
import { GitHubClient } from "../../../packages/github/src/client.ts";
import { createGovernedGitHubMergeBoundary } from "../../../packages/github/src/governed-merge-boundary.ts";
import { GitHubRepository } from "../../../packages/github/src/repository.ts";

const head = "a".repeat(40);
const merge = "b".repeat(40);
const base = "c".repeat(40);
const api = "https://api.github.com/repos/o/r";

function fixture() {
	let merged = false;
	let changedHead = false;
	let changedBase = false;
	let approved = true;
	let authorizedReview = true;
	let mutationLost = false;
	let mutationStatus: number | undefined;
	let missingPullRequest = false;
	let divergent = false;
	let writes = 0;
	const response = (body: unknown, status = 200) =>
		new Response(JSON.stringify(body), {
			status,
			headers: { "content-type": "application/json" },
		});
	const fetch = async (input: string | URL | Request, init?: RequestInit) => {
		const url = String(input);
		const method = init?.method ?? "GET";
		if (url === api + "/pulls/7" && method === "GET") {
			if (missingPullRequest) return response({ message: "Not Found" }, 404);
			return response({
				number: 7,
				state: merged ? "closed" : "open",
				draft: false,
				merged,
				merged_at: merged ? "2026-11-01T10:00:00Z" : null,
				merge_commit_sha: merged ? merge : null,
				head: { ref: "agent/7", sha: changedHead ? "d".repeat(40) : head },
				base: { ref: changedBase ? "untrusted" : "main" },
				user: { login: "darkfactory[bot]", type: "Bot" },
			});
		}
		if (url === api + "/branches/main/protection") {
			return response({
				required_pull_request_reviews: { required_approving_review_count: 1 },
				required_status_checks: { checks: [{ context: "quality" }] },
			});
		}
		if (url === api + "/pulls/7/reviews?per_page=100") {
			return response([
				{
					id: 1,
					state: approved ? "APPROVED" : "DISMISSED",
					commit_id: head,
					author_association: authorizedReview ? "OWNER" : "NONE",
					user: { login: "maintainer", type: "User" },
				},
			]);
		}
		if (url.startsWith(api + "/pulls?")) return response([]);
		if (url === api + "/commits/" + head + "/check-runs?per_page=100") {
			return response({ check_runs: [{ name: "quality", status: "completed", conclusion: "success" }] });
		}
		if (url === api + "/commits/" + head + "/status") return response({ statuses: [] });
		if (url === api + "/pulls/7/merge-async" && method === "PUT") {
			writes++;
			if (mutationLost) throw new Error("connection lost after merge request");
			if (mutationStatus) return response({ message: "GitHub rejected merge attempt" }, mutationStatus);
			return response({ status: "enqueued" }, 202);
		}
		if (url === api + "/git/ref/heads/main") return response({ object: { sha: base } });
		if (url === api + "/compare/" + merge + "..." + base) {
			return response({ status: divergent ? "diverged" : "ahead" });
		}
		throw new Error("Unexpected GitHub API call " + method + " " + url);
	};
	const repo = new GitHubRepository(new GitHubClient({ token: "test", fetch, maxRetries: 0 }), "o", "r");
	return {
		boundary: createGovernedGitHubMergeBoundary(repo),
		setMerged: () => {
			merged = true;
		},
		setChangedHead: () => {
			changedHead = true;
		},
		setChangedBase: () => {
			changedBase = true;
		},
		setApproved: () => {
			approved = false;
		},
		setUnauthorizedReview: () => {
			authorizedReview = false;
		},
		setMutationLost: () => {
			mutationLost = true;
		},
		setMutationStatus: (status: number) => {
			mutationStatus = status;
		},
		setMissingPullRequest: () => {
			missingPullRequest = true;
		},
		setDivergent: () => {
			divergent = true;
		},
		writes: () => writes,
	};
}

describe("production governed GitHub merge adapter", () => {
	test("pending/queued is not completion; confirmed merge requires protected-target ancestry", async () => {
		const f = fixture();
		const accepted = await f.boundary.mergeIfHead(7, head, { approvedBy: "maintainer", baseBranch: "main" });
		expect(accepted.merged).toBe(false);
		expect(f.writes()).toBe(1);
		expect(await f.boundary.read(7, head, "main")).toMatchObject({ merged: false });
		f.setMerged();
		expect(await f.boundary.read(7, head, "main")).toMatchObject({ merged: true, mergeSha: merge });
		f.setDivergent();
		await expect(f.boundary.read(7, head, "main")).rejects.toThrow("not an ancestor");
	});

	test("head/base changes and stale or unauthorized approval never mutate", async () => {
		const g = fixture();
		g.setChangedHead();
		await expect(g.boundary.mergeIfHead(7, head, { approvedBy: "maintainer", baseBranch: "main" })).rejects.toThrow(
			"head changed",
		);
		expect(g.writes()).toBe(0);
		const h = fixture();
		h.setChangedBase();
		await expect(h.boundary.mergeIfHead(7, head, { approvedBy: "maintainer", baseBranch: "main" })).rejects.toThrow(
			"base changed",
		);
		expect(h.writes()).toBe(0);
		const i = fixture();
		i.setApproved();
		await expect(i.boundary.mergeIfHead(7, head, { approvedBy: "maintainer", baseBranch: "main" })).rejects.toThrow(
			"human approval",
		);
		expect(i.writes()).toBe(0);
		const j = fixture();
		j.setUnauthorizedReview();
		await expect(j.boundary.mergeIfHead(7, head, { approvedBy: "maintainer", baseBranch: "main" })).rejects.toThrow(
			"human approval",
		);
		expect(j.writes()).toBe(0);
	});

	test("HTTP 403/409/422/429/503 on conditional mutation never causes an implicit replay", async () => {
		for (const status of [403, 409, 422, 429, 503]) {
			const f = fixture();
			f.setMutationStatus(status);
			await expect(f.boundary.mergeIfHead(7, head, { approvedBy: "maintainer", baseBranch: "main" })).rejects.toThrow();
			expect(f.writes()).toBe(1);
			expect(await f.boundary.read(7, head, "main")).toMatchObject({ merged: false });
			expect(f.writes()).toBe(1);
		}
	});

	test("HTTP 404 missing PR denies merge without any mutation", async () => {
		const f = fixture();
		f.setMissingPullRequest();
		await expect(f.boundary.mergeIfHead(7, head, { approvedBy: "maintainer", baseBranch: "main" })).rejects.toThrow();
		expect(f.writes()).toBe(0);
	});

	test("ambiguous mutation cannot be retried by adapter; readback is separately reconciled", async () => {
		const f = fixture();
		f.setMutationLost();
		await expect(f.boundary.mergeIfHead(7, head, { approvedBy: "maintainer", baseBranch: "main" })).rejects.toThrow(
			"connection lost",
		);
		expect(f.writes()).toBe(1);
		f.setMerged();
		expect(await f.boundary.read(7, head, "main")).toMatchObject({ merged: true, mergeSha: merge });
		expect(f.writes()).toBe(1);
	});
});
