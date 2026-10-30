import { describe, expect, test } from "bun:test";
import { type TranslatedEvent, translateGitHubEvent } from "../../../../packages/harness/src/graph/index.ts";

const skip = (reason: string): TranslatedEvent => ({ kind: "skip", reason });

describe("translateGitHubEvent", () => {
	test("bot sender is ignored", () => {
		const payload = {
			action: "opened",
			sender: { type: "Bot", login: "github-actions[bot]" },
			issue: { number: 1, author_association: "NONE" },
		};
		expect(translateGitHubEvent("issues", payload)).toEqual(skip("bot ingress ignored"));
	});

	test("[bot] comment author is ignored", () => {
		const payload = {
			action: "created",
			sender: { type: "User", login: "human" },
			comment: { user: { login: "dependabot[bot]" }, author_association: "COLLABORATOR", body: "hi" },
			issue: { number: 8 },
		};
		expect(translateGitHubEvent("issue_comment", payload)).toEqual(skip("bot ingress ignored"));
	});

	test("issues.opened", () => {
		const payload = {
			action: "opened",
			sender: { type: "User", login: "alice" },
			issue: { number: 42, author_association: "OWNER" },
		};
		expect(translateGitHubEvent("issues", payload)).toEqual({
			kind: "event",
			event: { type: "issues.opened", actor: { login: "alice", association: "OWNER", is_bot: false } },
			subject: { number: 42, is_pr: false },
		});
	});

	test("issues.labeled carries label", () => {
		const payload = {
			action: "labeled",
			sender: { type: "User", login: "alice" },
			issue: { number: 7, author_association: "MEMBER" },
			label: { name: "feat" },
		};
		expect(translateGitHubEvent("issues", payload)).toEqual({
			kind: "event",
			event: { type: "issues.labeled", actor: { login: "alice", association: "MEMBER", is_bot: false }, label: "feat" },
			subject: { number: 7, is_pr: false },
		});
	});

	test("issues with unknown action skip", () => {
		const payload = {
			action: "closed",
			sender: { type: "User", login: "alice" },
			issue: { number: 7, author_association: "OWNER" },
		};
		expect(translateGitHubEvent("issues", payload)).toEqual(skip("issues.closed is not a graph event"));
	});

	test("comment on an issue has is_pr false", () => {
		const payload = {
			action: "created",
			sender: { type: "User", login: "human" },
			comment: { user: { login: "bob" }, author_association: "AUTHOR", body: "nice" },
			issue: { number: 5 },
		};
		expect(translateGitHubEvent("issue_comment", payload)).toEqual({
			kind: "event",
			event: { type: "comment", actor: { login: "bob", association: "AUTHOR", is_bot: false }, body: "nice" },
			subject: { number: 5, is_pr: false },
		});
	});

	test("comment on a pull request has is_pr true", () => {
		const payload = {
			action: "created",
			sender: { type: "User", login: "human" },
			comment: { user: { login: "bob" }, author_association: "CONTRIBUTOR", body: "looks good" },
			issue: { number: 5, pull_request: { url: "https://api.github.com/repos/x/y/pulls/5" } },
		};
		expect(translateGitHubEvent("issue_comment", payload)).toEqual({
			kind: "event",
			event: { type: "comment", actor: { login: "bob", association: "NONE", is_bot: false }, body: "looks good" },
			subject: { number: 5, is_pr: true },
		});
	});

	test("issue_comment edited is skipped", () => {
		const payload = { action: "edited", comment: { user: { login: "bob" }, body: "edited" }, issue: { number: 5 } };
		expect(translateGitHubEvent("issue_comment", payload)).toEqual(skip("issue_comment.edited is not a graph event"));
	});

	test("review submitted maps state and ref", () => {
		const payload = {
			action: "submitted",
			sender: { type: "User", login: "owner" },
			review: { user: { login: "owner" }, author_association: "OWNER", state: "APPROVED", commit_id: "a".repeat(40) },
			pull_request: { number: 11, head: { sha: "a".repeat(40) } },
		};
		expect(translateGitHubEvent("pull_request_review", payload)).toEqual({
			kind: "event",
			event: {
				type: "review",
				state: "APPROVED",
				actor: { login: "owner", association: "OWNER", is_bot: false },
				ref: "a".repeat(40),
			},
			subject: { number: 11, is_pr: true, ref: "a".repeat(40) },
		});
	});

	test("review submitted lower-cases state to uppercase", () => {
		const payload = {
			action: "submitted",
			review: { user: { login: "owner" }, author_association: "OWNER", state: "commented", commit_id: "b".repeat(40) },
			pull_request: { number: 2, head: { sha: "b".repeat(40) } },
		};
		expect(translateGitHubEvent("pull_request_review", payload)).toEqual({
			kind: "event",
			event: {
				type: "review",
				state: "COMMENTED",
				actor: { login: "owner", association: "OWNER", is_bot: false },
				ref: "b".repeat(40),
			},
			subject: { number: 2, is_pr: true, ref: "b".repeat(40) },
		});
	});

	test("check_suite completed success -> required_green", () => {
		const payload = {
			action: "completed",
			check_suite: { conclusion: "success", head_sha: "c".repeat(40), pull_requests: [{ number: 3 }] },
		};
		expect(translateGitHubEvent("check_suite", payload)).toEqual({
			kind: "event",
			event: { type: "checks.completed", conclusion: "required_green", ref: "c".repeat(40) },
			subject: { number: 3, is_pr: true, ref: "c".repeat(40) },
		});
	});

	test("check_suite completed failure -> failed", () => {
		const payload = {
			action: "completed",
			check_suite: { conclusion: "failure", head_sha: "d".repeat(40), pull_requests: [{ number: 3 }] },
		};
		expect(translateGitHubEvent("check_suite", payload)).toEqual({
			kind: "event",
			event: { type: "checks.completed", conclusion: "failed", ref: "d".repeat(40) },
			subject: { number: 3, is_pr: true, ref: "d".repeat(40) },
		});
	});

	test("review evidence binds the reviewed commit, not a later PR head", () => {
		const translated = translateGitHubEvent("pull_request_review", {
			action: "submitted",
			review: { state: "approved", commit_id: "d".repeat(40), user: { login: "owner" }, author_association: "OWNER" },
			pull_request: { number: 12, head: { sha: "e".repeat(40) } },
		});
		expect(translated).toMatchObject({
			kind: "event",
			event: { type: "review", ref: "d".repeat(40) },
			subject: { ref: "e".repeat(40) },
		});
	});

	test("missing and truncated SHA evidence cannot enter production review or checks", () => {
		expect(translateGitHubEvent("pull_request_review", {
			action: "submitted",
			review: { state: "approved", user: { login: "owner" } },
			pull_request: { number: 12, head: { sha: "a".repeat(40) } },
		})).toMatchObject({ kind: "skip", reason: "review lacks immutable commit evidence" });
		expect(translateGitHubEvent("check_suite", {
			action: "completed", check_suite: { head_sha: "abc", pull_requests: [{ number: 3 }] },
		})).toMatchObject({ kind: "skip", reason: "check suite lacks immutable commit evidence" });
	});

	test("check_suite with no pull requests is skipped", () => {
		const payload = { action: "completed", check_suite: { conclusion: "success", head_sha: "abc", pull_requests: [] } };
		expect(translateGitHubEvent("check_suite", payload)).toEqual(skip("check_suite has no pull requests"));
	});

	test("check_suite with non-completed action is skipped", () => {
		const payload = { action: "requested", check_suite: { head_sha: "abc", pull_requests: [{ number: 1 }] } };
		expect(translateGitHubEvent("check_suite", payload)).toEqual(skip("check_suite.requested is not a graph event"));
	});

	test("schedule translates with now", () => {
		const payload = { schedule: "*/15 * * * *", sender: { type: "User", login: "cron" } };
		expect(translateGitHubEvent("schedule", payload, "2024-01-01T00:00:00Z")).toEqual({
			kind: "event",
			event: { type: "schedule", schedule: "*/15 * * * *", now: "2024-01-01T00:00:00Z" },
			subject: { number: 0, is_pr: false },
		});
	});

	test("schedule with no schedule field defaults to empty string", () => {
		const payload = {};
		expect(translateGitHubEvent("schedule", payload, "2024-01-01T00:00:00Z")).toEqual({
			kind: "event",
			event: { type: "schedule", schedule: "", now: "2024-01-01T00:00:00Z" },
			subject: { number: 0, is_pr: false },
		});
	});

	test("unknown event name is skipped", () => {
		expect(translateGitHubEvent("ping", { sender: { type: "User", login: "x" } })).toEqual(
			skip("ping is not a graph event"),
		);
	});

	test("malformed payload (null) is skipped", () => {
		expect(translateGitHubEvent("issues", null)).toEqual(skip("malformed payload"));
	});

	test("malformed payload (non-object) is skipped", () => {
		expect(translateGitHubEvent("issues", "not json")).toEqual(skip("malformed payload"));
	});

	test("malformed issues payload (missing issue) is skipped", () => {
		expect(translateGitHubEvent("issues", { action: "opened", sender: { type: "User", login: "x" } })).toEqual(
			skip("malformed payload"),
		);
	});
});
