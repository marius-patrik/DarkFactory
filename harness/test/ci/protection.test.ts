import { describe, expect, it } from "bun:test";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository } from "../../src/github/repository.ts";
import { json, scripted } from "../github/helpers.ts";
import { computeRequiredChecks, verifyBranchProtection, applyBranchProtection } from "../../src/ci/protection.ts";
import type { CiConfig } from "../../src/ci/schema.ts";

describe("Branch protection & rulesets synchronizer", () => {
	const config: CiConfig = {
		checks: [
			{ name: "ci-pipeline", required: true, workflow: "ci.yml" },
			{ name: "verify-bound-issue", required: true, workflow: "verify-pr.yml" },
			{ name: "lint", required: false, workflow: "lint.yml" },
		],
	};

	it("computes required checks correctly", () => {
		const required = computeRequiredChecks(config);
		expect(required).toEqual(["ci-pipeline", "verify-bound-issue"]);
	});

	it("applies branch protection with dry-run without calling API", async () => {
		const { fetch, calls } = scripted([]);
		const client = new GitHubClient({ token: "fake-token", fetch });
		const repo = new GitHubRepository(client, "owner", "repo");

		const result = await applyBranchProtection(repo, ["ci-pipeline", "verify-bound-issue"], {
			dryRun: true,
			branch: "main",
		});

		expect(result.dryRun).toBe(true);
		expect(result.contexts).toEqual(["ci-pipeline", "verify-bound-issue"]);
		expect(calls.length).toBe(0);
	});

	it("applies classic branch protection required checks when rulesets not supported", async () => {
		const { fetch, calls } = scripted([
			// 1. Rulesets lookup returns 404
			json({ message: "Not Found" }, 404),
			// 2. Fallback PUT classic branch protection
			json({ strict: true, contexts: ["ci-pipeline", "verify-bound-issue"] }, 200),
		]);
		const client = new GitHubClient({ token: "fake-token", fetch });
		const repo = new GitHubRepository(client, "owner", "repo");

		const result = await applyBranchProtection(repo, ["ci-pipeline", "verify-bound-issue"], {
			branch: "main",
		});

		expect(result.success).toBe(true);
		expect(calls.length).toBe(2);
		expect(calls[1]!.url).toContain("/branches/main/protection/required_status_checks");
		expect(calls[1]!.init?.method).toBe("PUT");
		expect(JSON.parse(String(calls[1]!.init?.body))).toEqual({
			strict: true,
			contexts: ["ci-pipeline", "verify-bound-issue"],
		});
	});

	it("applies modern GitHub ruleset when rulesets API is supported", async () => {
		const { fetch, calls } = scripted([
			// 1. Rulesets lookup returns rulesets array without darkfactory-ci
			json([], 200),
			// 2. POST create ruleset
			json({ id: 99, name: "darkfactory-ci" }, 201),
		]);
		const client = new GitHubClient({ token: "fake-token", fetch });
		const repo = new GitHubRepository(client, "owner", "repo");

		const result = await applyBranchProtection(repo, ["ci-pipeline", "verify-bound-issue"], {
			branch: "main",
		});

		expect(result.success).toBe(true);
		expect(calls.length).toBe(2);
		expect(calls[1]!.url).toContain("/rulesets");
		expect(calls[1]!.init?.method).toBe("POST");
	});

	it("verifies branch protection against expected required checks", async () => {
		const { fetch } = scripted([
			// 1. Rulesets lookup returns 404
			json({ message: "Not Found" }, 404),
			// 2. GET classic branch protection required checks
			json({ strict: true, contexts: ["ci-pipeline", "verify-bound-issue"] }, 200),
		]);
		const client = new GitHubClient({ token: "fake-token", fetch });
		const repo = new GitHubRepository(client, "owner", "repo");

		const report = await verifyBranchProtection(repo, ["ci-pipeline", "verify-bound-issue"], "main");
		expect(report.valid).toBe(true);
		expect(report.matched).toEqual(["ci-pipeline", "verify-bound-issue"]);
		expect(report.missing).toEqual([]);
		expect(report.extra).toEqual([]);
		expect(report.strict).toBe(true);
	});

	it("detects mismatch in protection verification", async () => {
		const { fetch } = scripted([
			// 1. Rulesets lookup returns 404
			json({ message: "Not Found" }, 404),
			// 2. GET classic branch protection with missing and extra contexts
			json({ strict: false, contexts: ["ci-pipeline", "old-check"] }, 200),
		]);
		const client = new GitHubClient({ token: "fake-token", fetch });
		const repo = new GitHubRepository(client, "owner", "repo");

		const report = await verifyBranchProtection(repo, ["ci-pipeline", "verify-bound-issue"], "main");
		expect(report.valid).toBe(false);
		expect(report.missing).toEqual(["verify-bound-issue"]);
		expect(report.extra).toEqual(["old-check"]);
		expect(report.strict).toBe(false);
	});
});
