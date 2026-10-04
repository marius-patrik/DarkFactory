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
		// The whole policy goes in one call to the full endpoint. It used to be split, starting with
		// `.../protection/required_status_checks`, which answers `Not Found` until protection has been
		// enabled once — so the very first run against an unprotected branch failed.
		expect(calls[1]?.url).toContain("/branches/develop/protection");
		expect(calls[1]?.url).not.toContain("required_status_checks");
		expect(JSON.parse(String(calls[1]?.init?.body))).toMatchObject({
			required_status_checks: { strict: true, contexts: ["quality", "verify-bound-issue"] },
		});
	});

	it("sends the declared strictness, not a hardcoded one", async () => {
		const { fetch, calls } = scripted([
			json({ message: "Not Found" }, 404),
			json({ strict: false, contexts: ["main-source"] }, 200),
		]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		await applyBranchProtection(repo, ["main-source"], { branch: "main", strict: false });
		expect(JSON.parse(String(calls[1]?.init?.body)).required_status_checks.strict).toBe(false);
	});

	it("requests the declared number of approvals on the classic path", async () => {
		// Approvals are part of the single full-policy PUT now. They used to be a separate
		// `POST .../protection/required_pull_request_reviews`, which only works once protection is
		// enabled — so the split ordering was wrong as well as redundant.
		const { fetch, calls } = scripted([
			json({ message: "Not Found" }, 404),
			json({ strict: true, contexts: ["quality"] }, 200),
			json({}, 200),
			json({}, 200),
		]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		await applyBranchProtection(repo, ["quality"], {
			branch: "develop",
			strict: true,
			approvals: 1,
			enforceAdmins: false,
		});
		expect(JSON.parse(String(calls[1]?.init?.body)).required_pull_request_reviews).toMatchObject({
			required_approving_review_count: 1,
		});
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

	// Found by reproducing the reconcile failure against a scratch repository rather than by reading
	// the code: `GET /rulesets` returns `[]`, so the module POSTs a new ruleset, GitHub rejects it,
	// the empty `catch {}` swallows that, and the classic path then 404s on a branch whose
	// protection was never enabled. Two unrelated failures, reported as one `Not Found`.
	it("sends a fully qualified ref to the ruleset API: a bare branch name is rejected", async () => {
		const { fetch, calls } = scripted([json([], 200), json({ id: 7, name: "darkfactory-ci" }, 201)]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		await applyBranchProtection(repo, ["quality"], { branch: "main" });
		const body = JSON.parse(String(calls[1]?.init?.body));
		expect(body.conditions.ref_name.include).toEqual(["refs/heads/main"]);
	});

	it("sends the pull_request rule with no parameters: this plan rejects every parameter", async () => {
		// Verified by creating rulesets on a scratch repository. `{ type: "pull_request" }` is
		// accepted and defaults to `required_approving_review_count: 0`. Adding *any* parameter —
		// including the documented `required_approving_review_count` and
		// `dismiss_stale_reviews_on_push` — fails with
		// `Invalid property /rules/N: data matches no possible input`.
		const { fetch, calls } = scripted([json([], 200), json({ id: 8, name: "darkfactory-ci" }, 201)]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		await applyBranchProtection(repo, ["quality"], { branch: "main", approvals: 1 });
		const rules = JSON.parse(String(calls[1]?.init?.body)).rules;
		const review = rules.find((r: { type: string }) => r.type === "pull_request");
		expect(review, "a lane that asks for review must still request review").toBeDefined();
		expect(review.parameters, "no parameters: the approval count travels on the classic path").toBeUndefined();
	});

	it("says why it fell back instead of swallowing the ruleset failure", async () => {
		const { fetch } = scripted([json({ message: "Upgrade to GitHub Pro" }, 403), json({}, 200)]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		const log: string[] = [];
		await applyBranchProtection(repo, ["quality"], { branch: "main", log: (m) => log.push(m) });
		expect(log.join("\n")).toContain("Upgrade to GitHub Pro");
		expect(log.join("\n")).toContain("classic protection");
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
