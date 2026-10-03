import { describe, expect, test } from "bun:test";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository, isAuthorizedAssociation, isBotLogin } from "../../src/github/repository.ts";
import { json, scripted } from "./helpers.ts";

test("issues/comments/labels/sub-issues are typed and encoded", async () => {
	const issue = {
		number: 4,
		id: 40,
		node_id: "I",
		title: "T",
		body: null,
		state: "open",
		labels: [],
		user: { login: "u" },
		author_association: "MEMBER",
		html_url: "u",
	};
	const mock = scripted([
		json(issue),
		json([{ id: 1, body: "a", user: { login: "u" }, author_association: "MEMBER" }], 200, {
			link: '<https://api.github.com/repos/o/r/issues/4/comments?page=2>; rel="next"',
		}),
		json([{ id: 2, body: "b", user: { login: "bot[bot]" }, author_association: "NONE" }]),
		json({ id: 3, body: "c", user: { login: "u" }, author_association: "OWNER" }),
		json({}),
		json({ ...issue, state: "closed" }),
		json({}),
	]);
	const repo = new GitHubRepository(new GitHubClient({ token: "t", fetch: mock.fetch }), "o", "r");
	expect((await repo.getIssue(4)).number).toBe(4);
	expect((await repo.listComments(4)).map((c) => c.id)).toEqual([1, 2]);
	await repo.createComment(4, "c");
	await repo.addLabels(4, ["In Progress"]);
	await repo.closeIssue(4, "completed");
	await repo.addSubIssue(4, 9);
	expect(isAuthorizedAssociation("COLLABORATOR")).toBeTrue();
	expect(isAuthorizedAssociation("CONTRIBUTOR")).toBeFalse();
	expect(isBotLogin("darkfactory-pipeline[bot]")).toBeTrue();
	expect(isBotLogin("robotics-user")).toBeFalse();
});

test("malformed consumed payloads fail at the boundary", async () => {
	const mock = scripted([json({ number: "wrong" })]);
	const repo = new GitHubRepository(new GitHubClient({ token: "t", fetch: mock.fetch }), "o", "r");
	expect(repo.getIssue(1)).rejects.toThrow("invalid GitHub issue response");
});

test("checkStates merges check runs and commit statuses, preferring check runs", async () => {
	const mock = scripted([
		json({
			check_runs: [
				{ name: "pipeline (3.10)", status: "completed", conclusion: "success" },
				{ name: "pipeline (3.11)", status: "in_progress", conclusion: null },
				{ name: "harness", status: "completed", conclusion: "failure" },
			],
		}),
		json({
			statuses: [
				{ context: "legacy", state: "success" },
				{ context: "harness", state: "success" },
			],
		}),
	]);
	const repo = new GitHubRepository(new GitHubClient({ token: "t", fetch: mock.fetch }), "o", "r");
	const states = await repo.checkStates("abc");
	expect(states.get("pipeline (3.10)")).toBe("success");
	expect(states.get("pipeline (3.11)")).toBe("pending");
	expect(states.get("harness")).toBe("failure");
	expect(states.get("legacy")).toBe("success");
});

// #1233 calls this the merge gate: it decides a PR counts as approved from a review `state` and
// an `author_association`, both of which the payload schemas accept as any string. It had no test
// of its own. Both inputs are decided by closed comparisons, so an unrecognised value denies the
// approval rather than granting it — pinned here so that is a guarantee and not an accident.
describe("hasApprovedReview", () => {
	const review = (state: string, author_association: string) => ({
		id: 1,
		state,
		user: { login: "u" },
		author_association,
	});

	async function approves(state: string, association: string): Promise<boolean> {
		const mock = scripted([json([review(state, association)])]);
		const repo = new GitHubRepository(new GitHubClient({ token: "t", fetch: mock.fetch }), "o", "r");
		return repo.hasApprovedReview(2);
	}

	test.each(["OWNER", "MEMBER", "COLLABORATOR"])("APPROVED by %s approves", async (association) => {
		expect(await approves("APPROVED", association)).toBeTrue();
	});

	test.each(["CONTRIBUTOR", "FIRST_TIMER", "FIRST_TIME_CONTRIBUTOR", "NONE", "MANNEQUIN", ""])(
		"APPROVED by %s does not approve",
		async (association) => {
			expect(await approves("APPROVED", association)).toBeFalse();
		},
	);

	test.each(["not-a-real-association", "superuser", "ADMIN", "owner", "OWNER ", "MEMBER\n"])(
		"an unrecognised association %p does not approve",
		async (association) => {
			expect(await approves("APPROVED", association)).toBeFalse();
		},
	);

	test.each(["approved", "APPROVED ", " APPROVED", "APPROVED\n", "TOTALLY_BOGUS", "CHANGES_REQUESTED", ""])(
		"state %p does not approve",
		async (state) => {
			expect(await approves(state, "OWNER")).toBeFalse();
		},
	);

	test("both must hold: an authorized association on a non-approving state is not approved", async () => {
		expect(await approves("COMMENTED", "OWNER")).toBeFalse();
	});
});
