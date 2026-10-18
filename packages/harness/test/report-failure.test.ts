import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import {
	closeDuplicateFailures,
	failureActionForConclusion,
	FAILURE_LABEL,
	failureBody,
	failureMarker,
	findOpenFailure,
	incidentInvocationAllowed,
	incidentRunEventAllowed,
	type ObservedWorkflowRun,
	observeWorkflowCompletion,
	verifyWorkflowCompletion,
	reportFailure,
	resolveFailure,
} from "../src/ci/report-failure";
import type { GitHubRepository } from "../src/github/repository";

interface FakeIssue {
	number: number;
	body?: string;
	pull_request?: { url: string };
}

/** Minimal repository stand-in recording issue writes and authenticated Actions reads. */
function fakeRepo(
	issues: FakeIssue[] = [],
	overrides: Partial<ObservedWorkflowRun> = {},
	listedRuns?: ObservedWorkflowRun[],
) {
	const created: { title: string; body?: string; labels?: string[] }[] = [];
	const comments: { issue: number; body: string }[] = [];
	const closed: number[] = [];
	const apiReads: string[] = [];
	const run: ObservedWorkflowRun = {
		id: 1,
		workflow_id: 42,
		run_number: 1,
		name: "CI",
		html_url: "https://run/1",
		status: "completed",
		conclusion: "failure",
		event: "push",
		head_branch: "main",
		repository: { full_name: "owner/repo" },
		head_repository: { full_name: "owner/repo" },
		...overrides,
	};
	const repo = {
		owner: "owner",
		repo: "repo",
		slug: "owner/repo",
		client: {
			async rest(_method: string, path: string) {
				apiReads.push(path);
				if (path === "/repos/owner/repo") return { full_name: "owner/repo", default_branch: "main" };
				if (path === "/repos/owner/repo/actions/runs/1") return run;
				if (path.startsWith("/repos/owner/repo/actions/workflows/42/runs?"))
					return { workflow_runs: listedRuns ?? [run] };
				throw new Error(`Unexpected GitHub API path: ${path}`);
			},
		},

		async getIssue(number: number) {
			return issues.find((issue) => issue.number === number);
		},
		async listComments(number: number) {
			return comments.filter((comment) => comment.issue === number);
		},
		async listIssues() {
			return issues
				.filter((issue) => !closed.includes(issue.number))
				.map((issue) => ({ ...issue }));
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
	return { repo, created, comments, closed, issues, apiReads, run };
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
	test("excludes pull requests from incident issue lookup and mutation", async () => {
		const state = fakeRepo([
			{ number: 7, body: failureMarker("CI"), pull_request: { url: "https://api.github.com/repos/owner/repo/pulls/7" } },
			{ number: 8, body: failureMarker("CI") },
		]);
		expect(await findOpenFailure(state.repo, "CI")).toBe(8);
		expect(await closeDuplicateFailures(state.repo, "CI", 8)).toEqual([]);
		expect(await resolveFailure(state.repo, "CI")).toBe(8);
		expect(state.closed).toEqual([8]);
		const onlyPr = fakeRepo([
			{ number: 7, body: failureMarker("CI"), pull_request: { url: "https://api.github.com/repos/owner/repo/pulls/7" } },
		]);
		expect((await reportFailure({ ...options, repo: onlyPr.repo })).number).toBe(101);
		expect(onlyPr.closed).toEqual([]);
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
		expect(comments[0]?.body).toContain("Failed again: https://run/1");
		expect(comments[0]?.body).toContain("<!-- pipeline-failure-run: 1 -->");
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
	test("successful recovery closes every matching duplicate incident", async () => {
		const state = fakeRepo([
			{ number: 4, body: failureMarker("CI") },
			{ number: 9, body: failureMarker("CI") },
			{ number: 12, body: failureMarker("Release") },
		]);
		expect(await resolveFailure(state.repo, "CI")).toBe(4);
		expect(state.closed).toEqual([4, 9]);
		expect(state.comments).toHaveLength(2);
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
		expect(guard).toContain("github.event_name == 'workflow_run'");
		expect(guard).toContain("!startsWith(github.event.workflow_run.event, 'pull_request')");
		expect(guard).toContain("github.event.workflow_run.event == 'push'");
		expect(guard).toContain("github.event.workflow_run.head_branch == github.event.repository.default_branch");
		expect(guard).toContain("github.ref == format('refs/heads/{0}', github.event.repository.default_branch)");
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

	test("reusable callers derive incident identity only from the original GitHub event", () => {
		const workflow = Bun.YAML.parse(
			readFileSync(new URL("../../../.github/workflows/report-failure.yml", import.meta.url), "utf8"),
		) as {
			on: { workflow_call: { inputs: Record<string, unknown> } };
			jobs: { report: { steps: { env?: Record<string, string> }[] } };
		};
		for (const key of ["workflow-name", "conclusion", "run-url", "run-id"])
			expect(workflow.on.workflow_call.inputs).not.toHaveProperty(key);
		const observed = workflow.jobs.report.steps.at(-1)?.env;
		expect(observed?.WORKFLOW_NAME).toBe("${{ github.event.workflow_run.name }}");
		expect(observed?.CONCLUSION).toBe("${{ github.event.workflow_run.conclusion }}");
		expect(observed?.RUN_URL).toBe("${{ github.event.workflow_run.html_url }}");
		expect(observed?.RUN_ID).toBe("${{ github.event.workflow_run.id }}");
		expect(observed?.TRIGGER_RUN_ID).toBe(observed?.RUN_ID);
		expect(observed?.ACTIONS_READ_TOKEN).toBe("${{ github.token }}");
	});
});

const trustedInvocation = { eventName: "workflow_run", ref: "refs/heads/main", triggerRunId: "1" };

describe("incident event eligibility", () => {
	test("accepts only workflow_run observers tied to their triggering Actions run", () => {
		expect(incidentInvocationAllowed(trustedInvocation, "main")).toBe(true);
		for (const eventName of ["pull_request", "pull_request_target", "pull_request_review", "issue_comment", "push"]) {
			expect(incidentInvocationAllowed({ ...trustedInvocation, eventName }, "main")).toBe(false);
		}
		expect(incidentInvocationAllowed({ ...trustedInvocation, ref: "refs/heads/feature" }, "main")).toBe(false);
		expect(incidentInvocationAllowed({ ...trustedInvocation, triggerRunId: "0" }, "main")).toBe(false);
		for (const eventName of ["push", "schedule", "workflow_dispatch", "repository_dispatch", "issues"])
			expect(incidentRunEventAllowed(eventName)).toBe(true);
		for (const eventName of ["issue_comment", "pull_request", "pull_request_target", "workflow_run", "merge_group"])
			expect(incidentRunEventAllowed(eventName)).toBe(false);
	});
});

describe("observed workflow identity verification", () => {
	test("fetches repository and completed Actions run before writing issues", async () => {
		const { repo, apiReads } = fakeRepo();
		const observed = await verifyWorkflowCompletion({
			...options,
			repo,
			conclusion: "failure",
			invocation: trustedInvocation,
		});
		expect(observed.id).toBe(1);
		expect(apiReads).toEqual(["/repos/owner/repo", "/repos/owner/repo/actions/runs/1"]);
	});

	test("rejects mismatched run metadata and never mutates incidents", async () => {
		const invalid: Partial<ObservedWorkflowRun>[] = [
			{ id: 100 },
			{ workflow_id: 0 },
			{ run_number: 0 },
			{ name: "Release" },
			{ html_url: "https://run/100" },
			{ status: "in_progress" },
			{ conclusion: "success" },
			{ event: "pull_request" },
			{ event: "pull_request_target" },
			{ event: "merge_group" },
			{ event: "issue_comment" },
			{ head_branch: "feature" },
			{ repository: { full_name: "other/repo" } },
			{ head_repository: { full_name: "attacker/repo" } },
			{ repository: null },
			{ head_repository: null },
		];
		for (const overrides of invalid) {
			const { repo, created, comments, closed } = fakeRepo([], overrides);
			await expect(
				observeWorkflowCompletion({
					...options,
					repo,
					conclusion: "failure",
					invocation: trustedInvocation,
				}),
			).rejects.toThrow();
			expect(created).toEqual([]);
			expect(comments).toEqual([]);
			expect(closed).toEqual([]);
		}
	});

	test("rejects invalid caller event, incorrect conclusion, and incomplete run identity", async () => {
		for (const invocation of [
			{ eventName: "pull_request_target", ref: "refs/heads/main", triggerRunId: "1" },
			{ eventName: "pull_request_review_comment", ref: "refs/heads/main", triggerRunId: "1" },
			{ eventName: "workflow_call", ref: "refs/heads/pr", triggerRunId: "1" },
		]) {
			const { repo, created } = fakeRepo();
			await expect(
				observeWorkflowCompletion({ ...options, repo, conclusion: "failure", invocation }),
			).rejects.toThrow();
			expect(created).toEqual([]);
		}
		for (const conclusion of [null, undefined]) {
			const { repo, created, closed } = fakeRepo();
			await expect(
				observeWorkflowCompletion({
					...options,
					repo,
					conclusion,
					invocation: trustedInvocation,
				}),
			).rejects.toThrow();
			expect(created).toEqual([]);
			expect(closed).toEqual([]);
		}
		for (const entry of [
			{ runId: "xyz" },
			{ runId: "999" },
			{ runUrl: "https://run/2" },
			{ workflow: "Other" },
			{ conclusion: "success" },
		]) {
			const { repo, created } = fakeRepo();
			await expect(
				observeWorkflowCompletion({
					...options,
					...entry,
					repo,
					conclusion: entry.conclusion ?? "failure",
					invocation: trustedInvocation,
				}),
			).rejects.toThrow();
			expect(created).toEqual([]);
		}
	});
});

describe("observed workflow result drives issue mutations", () => {
	test("failure files an incident and explicit success closes the same incident", async () => {
		const { repo, created, closed, comments } = fakeRepo();
		expect(
			await observeWorkflowCompletion({ ...options, repo, conclusion: "failure", invocation: trustedInvocation }),
		).toBe("report");
		expect(created).toHaveLength(1);
		expect(created[0]?.body).toContain(failureMarker("CI"));
		// A legitimate subsequent completed success is verified through the Actions API.
		const successRepo = fakeRepo([{ number: 101, body: failureMarker("CI") }], { conclusion: "success" });
		expect(
			await observeWorkflowCompletion({
				...options,
				repo: successRepo.repo,
				conclusion: "success",
				invocation: trustedInvocation,
			}),
		).toBe("resolve");
		expect(successRepo.closed).toEqual([101]);
		expect(closed).toEqual([]);
		expect(comments).toEqual([]);
		expect(successRepo.comments.some((c) => c.body.includes("succeeded again"))).toBe(true);
	});

	test("non-recovery conclusions never query or mutate the repository", async () => {
		for (const conclusion of ["cancelled", "timed_out", "skipped", "neutral", "stale", "action_required"]) {
			const { repo, created, comments, closed } = fakeRepo([{ number: 7, body: failureMarker("CI") }], {
				conclusion,
			});
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
			expect(
				await observeWorkflowCompletion({ ...options, repo: proxy, conclusion, invocation: trustedInvocation }),
			).toBe("ignore");
			expect(requested).toBe(0);
			expect(created).toEqual([]);
			expect(comments).toEqual([]);
			expect(closed).toEqual([]);
		}
	});
});

describe("ordered incident observations", () => {
	test("a late old failure reconciles the newer successful run", async () => {
		const seed = fakeRepo();
		const newest = { ...seed.run, id: 2, run_number: 2, html_url: "https://run/2", conclusion: "success" };
		const target = fakeRepo([{ number: 7, body: failureMarker("CI") }], {}, [newest, seed.run]);
		expect(
			await observeWorkflowCompletion({
				...options,
				repo: target.repo,
				conclusion: "failure",
				invocation: trustedInvocation,
			}),
		).toBe("resolve");
		expect(target.closed).toEqual([7]);
		expect(target.created).toEqual([]);
	});
	test("a late old success reconciles the newer failure", async () => {
		const seed = fakeRepo();
		const newest = { ...seed.run, id: 2, run_number: 2, html_url: "https://run/2", conclusion: "failure" };
		const target = fakeRepo([], { conclusion: "success" }, [newest]);
		expect(
			await observeWorkflowCompletion({
				...options,
				repo: target.repo,
				conclusion: "success",
				invocation: trustedInvocation,
			}),
		).toBe("report");
		expect(target.created[0]?.body).toContain("https://run/2");
		expect(target.closed).toEqual([]);
	});
});

describe("eventual consistency of authenticated Actions listings", () => {
	test("retries an eventually consistent listing before filing the verified failure", async () => {
		const state = fakeRepo();
		const originalRest = state.repo.client.rest.bind(state.repo.client);
		let listingReads = 0;
		const reader = {
			async rest<T>(method: string, path: string): Promise<T> {
				if (path.startsWith("/repos/owner/repo/actions/workflows/42/runs?")) {
					listingReads++;
					return { workflow_runs: listingReads === 1 ? [] : [state.run] } as T;
				}
				return originalRest<T>(method, path);
			},
		};
		expect(
			await observeWorkflowCompletion({
				...options,
				repo: state.repo,
				reader,
				conclusion: "failure",
				invocation: trustedInvocation,
			}),
		).toBe("report");
		expect(listingReads).toBe(2);
		expect(state.created).toHaveLength(1);
	});

	test("missing actionable run evidence never silently drops a genuine failure", async () => {
		const state = fakeRepo([], {}, []);
		await expect(
			observeWorkflowCompletion({
				...options,
				repo: state.repo,
				conclusion: "failure",
				invocation: trustedInvocation,
			}),
		).rejects.toThrow("omitted");
		expect(state.created).toEqual([]);
		expect(state.closed).toEqual([]);
	});
});

describe("incident idempotence and deduplication", () => {
	test("replaying the same run leaves one issue and no extra comments", async () => {
		const state = fakeRepo();
		for (let attempt = 0; attempt < 3; attempt++) {
			expect(
				await observeWorkflowCompletion({
					...options,
					repo: state.repo,
					conclusion: "failure",
					invocation: trustedInvocation,
				}),
			).toBe("report");
		}
		expect(state.created).toHaveLength(1);
		expect(state.comments).toEqual([]);
	});
	test("two simultaneous reporters converge on one surviving incident", async () => {
		const state = fakeRepo();
		const listIssues = state.repo.listIssues.bind(state.repo);
		let initialReads = 0;
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const racingRepo = new Proxy(state.repo, {
			get(target, key, receiver) {
				if (key === "listIssues") {
					return async (args: Parameters<GitHubRepository["listIssues"]>[0]) => {
						if (initialReads < 2) {
							initialReads++;
							if (initialReads === 2) release();
							await gate;
							return [];
						}
						return listIssues(args);
					};
				}
				return Reflect.get(target, key, receiver);
			},
		});
		await Promise.all([
			reportFailure({ ...options, repo: racingRepo }),
			reportFailure({ ...options, repo: racingRepo }),
		]);
		const survivors = await listIssues({ state: "open", labels: [FAILURE_LABEL] });
		expect(state.created).toHaveLength(2);
		expect(survivors.map((issue) => issue.number)).toEqual([101]);
		expect(state.closed).toContain(102);
	});

	test("competing reporters always keep the lowest numbered incident", async () => {
		for (const keep of [4, 9]) {
			const state = fakeRepo([
				{ number: 4, body: failureMarker("CI") },
				{ number: 9, body: failureMarker("CI") },
			]);
			expect(await closeDuplicateFailures(state.repo, "CI", keep)).toEqual([9]);
			expect(state.closed).toEqual([9]);
		}
	});
});
