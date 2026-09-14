import { describe, expect, it } from "bun:test";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository } from "../../src/github/repository.ts";
import { json, scripted } from "../github/helpers.ts";
import {
	getCheckStatus,
	getWorkflowRuns,
	getRunLogs,
	rerunWorkflowRun,
	extractFailureExcerpt,
} from "../../src/ci/status.ts";
import type { CiConfig } from "../../src/ci/schema.ts";

describe("CI status surface & log extractor", () => {
	const config: CiConfig = {
		checks: [
			{ name: "ci-pipeline", required: true, workflow: "ci.yml" },
			{ name: "verify-bound-issue", required: true, workflow: "verify-pr.yml" },
		],
	};

	it("gets check status for ref and correlates with config", async () => {
		const { fetch } = scripted([
			// GET /commits/head-sha/check-runs
			json({
				total_count: 2,
				check_runs: [
					{ name: "ci-pipeline", status: "completed", conclusion: "success" },
					{ name: "verify-bound-issue", status: "in_progress", conclusion: null },
					{ name: "optional-step", status: "completed", conclusion: "success" },
				],
			}),
			// GET /commits/head-sha/status
			json({ statuses: [] }),
		]);
		const client = new GitHubClient({ token: "fake-token", fetch });
		const repo = new GitHubRepository(client, "owner", "repo");

		const status = await getCheckStatus(repo, "head-sha", config);
		expect(status.state).toBe("pending");
		expect(status.checks.length).toBe(3);
		expect(status.checks.find((c) => c.name === "ci-pipeline")?.required).toBe(true);
		expect(status.checks.find((c) => c.name === "optional-step")?.required).toBe(false);
	});

	it("lists workflow runs", async () => {
		const { fetch } = scripted([
			// GET /actions/runs
			json({
				total_count: 1,
				workflow_runs: [
					{
						id: 1234,
						name: "CI",
						head_branch: "main",
						head_sha: "abcdef123456",
						event: "push",
						status: "completed",
						conclusion: "success",
						actor: { login: "marius-patrik" },
						created_at: "2026-09-14T08:00:00Z",
					},
				],
			}),
		]);
		const client = new GitHubClient({ token: "fake-token", fetch });
		const repo = new GitHubRepository(client, "owner", "repo");

		const runs = await getWorkflowRuns(repo, { limit: 10 });
		expect(runs.length).toBe(1);
		expect(runs[0]!.id).toBe(1234);
		expect(runs[0]!.actor).toBe("marius-patrik");
	});

	it("fetches run logs and extracts failure excerpt", async () => {
		const rawLog = [
			"\x1b[32m[INFO] Starting build...\x1b[0m",
			"[INFO] Step 1 passed",
			"\x1b[31m[ERROR] Tests failed with exit code 1:\x1b[0m",
			"AssertionError: expected true to be false",
			"    at test/foo.test.ts:42",
		].join("\n");

		const { fetch } = scripted([
			// 1. GET /actions/runs/123/jobs
			json({
				jobs: [
					{
						id: 456,
						name: "pipeline",
						status: "completed",
						conclusion: "failure",
					},
				],
			}),
			// 2. GET /actions/jobs/456/logs (raw text response)
			new Response(rawLog, { status: 200, headers: { "content-type": "text/plain" } }),
		]);
		const client = new GitHubClient({ token: "fake-token", fetch });
		const repo = new GitHubRepository(client, "owner", "repo");

		const logs = await getRunLogs(repo, 123, { failedOnly: true });
		expect(logs.jobs.length).toBe(1);
		expect(logs.jobs[0]!.name).toBe("pipeline");
		expect(logs.jobs[0]!.excerpt).toContain("AssertionError: expected true to be false");
		// ANSI codes should be stripped
		expect(logs.jobs[0]!.excerpt).not.toContain("\x1b[31m");
	});

	it("truncates oversized logs into head/tail excerpt", () => {
		const longLog = "HEAD_LINE_START\n" + "A".repeat(50_000) + "\nTAIL_LINE_END";
		const excerpt = extractFailureExcerpt(longLog, 10_000);
		expect(excerpt.length).toBeLessThanOrEqual(10_200);
		expect(excerpt).toContain("HEAD_LINE_START");
		expect(excerpt).toContain("TAIL_LINE_END");
		expect(excerpt).toContain("[... truncated");
	});

	it("reruns failed jobs or entire run", async () => {
		const { fetch, calls } = scripted([
			// POST /actions/runs/123/rerun-failed-jobs
			json({}, 201),
			// POST /actions/runs/123/rerun
			json({}, 201),
		]);
		const client = new GitHubClient({ token: "fake-token", fetch });
		const repo = new GitHubRepository(client, "owner", "repo");

		await rerunWorkflowRun(repo, 123, { failedOnly: true });
		expect(calls[0]!.url).toContain("/actions/runs/123/rerun-failed-jobs");

		await rerunWorkflowRun(repo, 123, { failedOnly: false });
		expect(calls[1]!.url).toContain("/actions/runs/123/rerun");
	});
});
