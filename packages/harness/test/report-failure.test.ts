import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import {
	closeDuplicateFailures,
	failureActionForConclusion,
	FAILURE_LABEL,
	failureBody,
	failureMarker,
	findOpenFailure,
	observeWorkflowCompletion,
	reportFailure,
	resolveFailure,
} from "../src/ci/report-failure";
import type { GitHubRepository } from "../src/github/repository";

interface FakeIssue {
	number: number;
	body?: string;
}

/** Minimal repository stand-in recording the issue operations the module performs. */
function fakeRepo(issues: FakeIssue[] = []) {
	const created: { title: string; body?: string; labels?: string[] }[] = [];
	const comments: { issue: number; body: string }[] = [];
	const closed: number[] = [];
	const repo = {
		async listIssues() {
			return issues
				.filter((issue) => !closed.includes(issue.number))
				.map((issue) => ({ number: issue.number, body: issue.body }));
		},
		async createIssue(input: { title: string; body?: string; labels?: string[] }) {
			created.push(input);
			const number = 100 + created.length;
			issues.push({ number, body: input.body });
			return { number, body: input.body };
		},
		async createComment(issue: number, body: string) {
			comments.push({ issue, body });
			return {};
		},
		async closeIssue(issue: number) {
			closed.push(issue);
			return {};
		},
	} as unknown as GitHubRepository;
	return { repo, created, comments, closed, issues };
}

const options = { workflow: "CI", runUrl: "https://run/1", runId: "1" };

describe("failure issue body", () => {
	test("carries the marker that identifies its workflow", () => {
		const body = failureBody("CI", "https://run/1", "1");
		expect(body).toContain(failureMarker("CI"));
		expect(body).toContain("https://run/1");
	});
	test("different workflows get different markers", () => {
		expect(failureMarker("CI")).not.toBe(failureMarker("Release"));
	});
});

describe("finding an open failure", () => {
	test("finds by marker rather than by title", async () => {
		const { repo } = fakeRepo([{ number: 7, body: "retitled by a human\n\n" + failureMarker("CI") }]);
		expect(await findOpenFailure(repo, "CI")).toBe(7);
	});
	test("ignores an issue for a different workflow", async () => {
		const { repo } = fakeRepo([{ number: 7, body: failureMarker("Release") }]);
		expect(await findOpenFailure(repo, "CI")).toBeNull();
	});
});

describe("reporting a failure", () => {
	test("opens a labelled issue when none is open", async () => {
		const { repo, created } = fakeRepo();
		const result = await reportFailure({ ...options, repo });
		expect(created[0]?.title).toBe("Pipeline failure: CI");
		expect(created[0]?.labels).toEqual([FAILURE_LABEL]);
		expect(result.number).toBe(101);
	});

	test("comments on the open issue instead of filing a second one", async () => {
		const { repo, created, comments } = fakeRepo([{ number: 7, body: failureMarker("CI") }]);
		const result = await reportFailure({ ...options, repo });
		expect(created).toEqual([]);
		expect(comments[0]).toEqual({ issue: 7, body: "Failed again: https://run/1" });
		expect(result.number).toBe(7);
	});

	test("closes a duplicate left by a race, keeping the lower number", async () => {
		// Two runs both saw nothing open and both filed; the higher number is the duplicate.
		const { repo, closed, comments } = fakeRepo([
			{ number: 4, body: failureMarker("CI") },
			{ number: 9, body: failureMarker("CI") },
		]);
		const closedBySweep = await closeDuplicateFailures(repo, "CI", 4);
		expect(closedBySweep).toEqual([9]);
		expect(closed).toEqual([9]);
		expect(comments[0]?.body).toContain("Duplicate of #4");
	});

	test("never closes the issue it is keeping", async () => {
		const { repo, closed } = fakeRepo([{ number: 4, body: failureMarker("CI") }]);
		await closeDuplicateFailures(repo, "CI", 4);
		expect(closed).toEqual([]);
	});

	test("leaves another workflow's issue alone while de-duplicating", async () => {
		const { repo, closed } = fakeRepo([{ number: 9, body: failureMarker("Release") }]);
		expect(await closeDuplicateFailures(repo, "CI", 4)).toEqual([]);
		expect(closed).toEqual([]);
	});
});

describe("resolving a failure", () => {
	test("closes the issue and says why", async () => {
		const { repo, closed, comments } = fakeRepo([{ number: 7, body: failureMarker("CI") }]);
		expect(await resolveFailure(repo, "CI")).toBe(7);
		expect(closed).toEqual([7]);
		expect(comments[0]?.body).toContain("succeeded again");
	});
	test("does nothing when no issue is open", async () => {
		const { repo, closed } = fakeRepo();
		expect(await resolveFailure(repo, "CI")).toBeNull();
		expect(closed).toEqual([]);
	});
});

describe("operational failure observer scope", () => {
	test("only default-branch workflow_run events may create repository-wide failure issues", () => {
		const workflow = Bun.YAML.parse(
			readFileSync(new URL("../../../.github/workflows/report-failure.yml", import.meta.url), "utf8"),
		) as { jobs: { report: { if: string } } };
		const guard = workflow.jobs.report.if;
		expect(guard).toContain("github.event_name != 'workflow_run'");
		expect(guard).toContain("github.event.workflow_run.event != 'pull_request'");
		expect(guard).toContain("github.event.workflow_run.head_branch == github.event.repository.default_branch");
		expect(guard).toContain("github.ref == format('refs/heads/{0}', github.event.repository.default_branch)");
		for (const key of ["workflow-name", "conclusion", "run-url", "run-id"])
			expect(guard).toContain(`inputs.${key} != ''`);
	});
});

describe("workflow conclusion classification", () => {
	test("only a confirmed success resolves a real incident", () => {
		const outcomes = new Map<string, ReturnType<typeof failureActionForConclusion>>([
			["failure", "report"],
			["success", "resolve"],
			["cancelled", "ignore"],
			["skipped", "ignore"],
			["neutral", "ignore"],
			["timed_out", "ignore"],
			["action_required", "ignore"],
			["stale", "ignore"],
			["", "ignore"],
		]);
		for (const [conclusion, action] of outcomes) expect(failureActionForConclusion(conclusion)).toBe(action);
		expect(failureActionForConclusion(null)).toBe("ignore");
		expect(failureActionForConclusion(undefined)).toBe("ignore");
	});

	test("reusable callers can explicitly supply the observed event fields", () => {
		const workflow = Bun.YAML.parse(
			readFileSync(new URL("../../../.github/workflows/report-failure.yml", import.meta.url), "utf8"),
		) as {
			on: { workflow_call: { inputs: Record<string, unknown> } };
			jobs: { report: { steps: { env?: Record<string, string> }[] } };
		};
		for (const key of ["workflow-name", "conclusion", "run-url", "run-id"])
			expect(workflow.on.workflow_call.inputs).toHaveProperty(key);
		const observed = workflow.jobs.report.steps.at(-1)?.env;
		expect(observed?.WORKFLOW_NAME).toContain("inputs.workflow-name || github.event.workflow_run.name");
		expect(observed?.CONCLUSION).toContain("inputs.conclusion || github.event.workflow_run.conclusion");
		expect(observed?.RUN_URL).toContain("inputs.run-url || github.event.workflow_run.html_url");
		expect(observed?.RUN_ID).toContain("inputs.run-id || github.event.workflow_run.id");
	});
});

describe("observed workflow result drives issue mutations", () => {
	test("failure files an incident and explicit success closes the same incident", async () => {
		const { repo, created, closed, comments } = fakeRepo();
		expect(await observeWorkflowCompletion({ ...options, repo, conclusion: "failure" })).toBe("report");
		expect(created).toHaveLength(1);
		expect(created[0]?.body).toContain(failureMarker("CI"));
		expect(await observeWorkflowCompletion({ ...options, repo, conclusion: "success" })).toBe("resolve");
		expect(closed).toEqual([101]);
		expect(comments.some((c) => c.body.includes("succeeded again"))).toBe(true);
	});

	test("non-recovery conclusions never query or mutate the repository", async () => {
		for (const conclusion of [
			"cancelled",
			"timed_out",
			"skipped",
			"neutral",
			"stale",
			"action_required",
			null,
			undefined,
		]) {
			const { repo, created, comments, closed } = fakeRepo([{ number: 7, body: failureMarker("CI") }]);
			let requested = 0;
			const proxy = new Proxy(repo, {
				get(target, property, receiver) {
					if (
						typeof property === "string" &&
						["listIssues", "createIssue", "createComment", "closeIssue"].includes(property)
					)
						return (...args: unknown[]) => {
							requested++;
							return (Reflect.get(target, property, receiver) as (...args: unknown[]) => unknown).apply(target, args);
						};
					return Reflect.get(target, property, receiver);
				},
			});
			expect(await observeWorkflowCompletion({ ...options, repo: proxy, conclusion })).toBe("ignore");
			expect(requested).toBe(0);
			expect(created).toEqual([]);
			expect(comments).toEqual([]);
			expect(closed).toEqual([]);
		}
	});
});
