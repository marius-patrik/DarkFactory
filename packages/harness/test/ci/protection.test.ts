import { describe, expect, it } from "bun:test";
import { applyBranchProtection, computeRequiredChecks, verifyBranchProtection } from "../../src/ci/protection.ts";
import type { ResolvedCheck } from "../../src/ci/schema.ts";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository } from "../../src/github/repository.ts";
import { json, scripted } from "../github/helpers.ts";

describe("Branch protection & rulesets synchronizer", () => {
	const checks: ResolvedCheck[] = [
		{ name: "quality", required: true, workflow: "ci.yml", job: "quality" },
		{ name: "verify-bound-issue", required: true, workflow: "verify-bound-issue.yml", job: "verify-bound-issue" },
		{ name: "preview", required: false, workflow: "preview.yml", job: "preview" },
	];

	it("computes detector-derived required checks", () => {
		expect(computeRequiredChecks(checks)).toEqual(["quality", "verify-bound-issue"]);
	});

	it("applies branch protection with dry-run without calling API", async () => {
		const { fetch, calls } = scripted([]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		const result = await applyBranchProtection(repo, ["quality", "verify-bound-issue"], {
			dryRun: true,
			branch: "main",
		});
		expect(result.dryRun).toBe(true);
		expect(result.contexts).toEqual(["quality", "verify-bound-issue"]);
		expect(calls.length).toBe(0);
	});

	it("applies classic branch protection when rulesets are unavailable", async () => {
		const { fetch, calls } = scripted([
			json({ message: "Not Found" }, 404),
			json({ strict: true, contexts: ["quality", "verify-bound-issue"] }, 200),
		]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		// `strict` used to be hardcoded to true in this payload. It is declared now, so the test
		// declares it — and the assertion below is that the declared value is what is sent.
		const result = await applyBranchProtection(repo, ["quality", "verify-bound-issue"], {
			branch: "develop",
			strict: true,
		});
		expect(result.success).toBe(true);
		expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
			strict: true,
			contexts: ["quality", "verify-bound-issue"],
		});
	});

	it("sends the declared strictness, not a hardcoded one", async () => {
		const { fetch, calls } = scripted([
			json({ message: "Not Found" }, 404),
			json({ strict: false, contexts: ["main-source"] }, 200),
		]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		await applyBranchProtection(repo, ["main-source"], { branch: "main", strict: false });
		expect(JSON.parse(String(calls[1]?.init?.body)).strict).toBe(false);
	});

	it("requests the declared number of approvals on the classic path", async () => {
		// The classic API splits protection across endpoints, so a lane that requires review needs its
		// own call. Before the policy was declared this module had no approvals field at all.
		const { fetch, calls } = scripted([
			json({ message: "Not Found" }, 404),
			json({ strict: true, contexts: ["quality"] }, 200),
			json({}, 200),
		]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		await applyBranchProtection(repo, ["quality"], {
			branch: "develop",
			strict: true,
			approvals: 1,
			enforceAdmins: false,
		});
		const review = calls.find((call) => call.url.includes("required_pull_request_reviews"));
		expect(review?.url).toContain("/branches/develop/protection/");
		expect(JSON.parse(String(review?.init?.body)).required_approving_review_count).toBe(1);
	});

	it("does not ask for a review on a lane that declares none", async () => {
		// `approvals: 0` must not become a call that turns review off on a branch whose lane simply
		// does not ask for it.
		const { fetch, calls } = scripted([
			json({ message: "Not Found" }, 404),
			json({ strict: false, contexts: ["main-source"] }, 200),
		]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		await applyBranchProtection(repo, ["main-source"], { branch: "main", strict: false, approvals: 0 });
		expect(calls.some((call) => call.url.includes("required_pull_request_reviews"))).toBe(false);
	});

	it("applies a modern GitHub ruleset when supported", async () => {
		const { fetch, calls } = scripted([json([], 200), json({ id: 99, name: "darkfactory-ci" }, 201)]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		const result = await applyBranchProtection(repo, ["quality", "verify-bound-issue"], { branch: "main" });
		expect(result.success).toBe(true);
		expect(calls[1]?.url).toContain("/rulesets");
		expect(calls[1]?.init?.method).toBe("POST");
	});

	it("verifies branch protection against expected required checks", async () => {
		const { fetch } = scripted([
			json({ message: "Not Found" }, 404),
			json({ strict: true, contexts: ["quality", "verify-bound-issue"] }, 200),
		]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		const report = await verifyBranchProtection(repo, ["quality", "verify-bound-issue"], "main");
		expect(report.valid).toBe(true);
		expect(report.matched).toEqual(["quality", "verify-bound-issue"]);
	});

	it("detects protection mismatch", async () => {
		const { fetch } = scripted([
			json({ message: "Not Found" }, 404),
			json({ strict: false, contexts: ["quality", "old-check"] }, 200),
		]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		const report = await verifyBranchProtection(repo, ["quality", "verify-bound-issue"], "main");
		expect(report.valid).toBe(false);
		expect(report.missing).toEqual(["verify-bound-issue"]);
		expect(report.extra).toEqual(["old-check"]);
		expect(report.strict).toBe(false);
	});
});
