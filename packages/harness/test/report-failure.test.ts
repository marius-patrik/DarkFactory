import { describe, expect, test } from "bun:test";
import {
	closeDuplicateFailures,
	FAILURE_LABEL,
	failureBody,
	failureMarker,
	findOpenFailure,
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
