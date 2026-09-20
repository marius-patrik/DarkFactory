import { describe, expect, it } from "bun:test";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository } from "../../src/github/repository.ts";
import { json, scripted } from "../github/helpers.ts";
import {
	extractFailureExcerpt,
	getCheckStatus,
	getRunLogs,
	getWorkflowRuns,
	rerunWorkflowRun,
} from "../../src/ci/status.ts";
import type { ResolvedCheck } from "../../src/ci/schema.ts";

describe("CI status surface & log extractor", () => {
	const checks: ResolvedCheck[] = [
		{ name: "quality", required: true, workflow: "ci.yml", job: "quality" },
		{ name: "verify-bound-issue", required: true, workflow: "verify-bound-issue.yml", job: "verify-bound-issue" },
	];

	it("gets check status for ref and correlates with detector-derived checks", async () => {
		const { fetch } = scripted([
			json({
				total_count: 3,
				check_runs: [
					{ name: "quality", status: "completed", conclusion: "success" },
					{ name: "verify-bound-issue", status: "in_progress", conclusion: null },
					{ name: "optional-step", status: "completed", conclusion: "success" },
				],
			}),
			json({ statuses: [] }),
		]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		const status = await getCheckStatus(repo, "head-sha", checks);
		expect(status.state).toBe("pending");
		expect(status.checks.length).toBe(3);
		expect(status.checks.find((check) => check.name === "quality")?.required).toBe(true);
		expect(status.checks.find((check) => check.name === "optional-step")?.required).toBe(false);
	});

	it("lists workflow runs", async () => {
		const { fetch } = scripted([
			json({
				total_count: 1,
				workflow_runs: [{
					id: 1234,
					name: "CI",
					head_branch: "darkfactory",
					head_sha: "abcdef123456",
					event: "push",
					status: "completed",
					conclusion: "success",
					actor: { login: "marius-patrik" },
					created_at: "2026-09-14T08:00:00Z",
				}],
			}),
		]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		const runs = await getWorkflowRuns(repo, { limit: 10 });
		expect(runs).toHaveLength(1);
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
			json({ jobs: [{ id: 456, name: "quality", status: "completed", conclusion: "failure" }] }),
			new Response(rawLog, { status: 200, headers: { "content-type": "text/plain" } }),
		]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		const logs = await getRunLogs(repo, 123, { failedOnly: true });
		expect(logs.jobs).toHaveLength(1);
		expect(logs.jobs[0]!.excerpt).toContain("AssertionError: expected true to be false");
		expect(logs.jobs[0]!.excerpt).not.toContain("\x1b[31m");
	});

	it("truncates oversized logs into head/tail excerpt", () => {
		const excerpt = extractFailureExcerpt("HEAD_LINE_START\n" + "A".repeat(50_000) + "\nTAIL_LINE_END", 10_000);
		expect(excerpt.length).toBeLessThanOrEqual(10_200);
		expect(excerpt).toContain("HEAD_LINE_START");
		expect(excerpt).toContain("TAIL_LINE_END");
		expect(excerpt).toContain("[... truncated");
	});

	it("reruns failed jobs or the entire run", async () => {
		const { fetch, calls } = scripted([json({}, 201), json({}, 201)]);
		const repo = new GitHubRepository(new GitHubClient({ token: "fake-token", fetch }), "owner", "repo");
		await rerunWorkflowRun(repo, 123, { failedOnly: true });
		expect(calls[0]!.url).toContain("/actions/runs/123/rerun-failed-jobs");
		await rerunWorkflowRun(repo, 123, { failedOnly: false });
		expect(calls[1]!.url).toContain("/actions/runs/123/rerun");
	});
});
