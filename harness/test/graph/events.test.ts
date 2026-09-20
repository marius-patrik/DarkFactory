import { describe, expect, test } from "bun:test";
import { translateGitHubEvent, type TranslatedEvent } from "../../src/graph/index.ts";

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
			review: { user: { login: "owner" }, author_association: "OWNER", state: "APPROVED" },
			pull_request: { number: 11, head: { sha: "abc123" } },
		};
		expect(translateGitHubEvent("pull_request_review", payload)).toEqual({
			kind: "event",
			event: { type: "review", state: "APPROVED", actor: { login: "owner", association: "OWNER", is_bot: false } },
			subject: { number: 11, is_pr: true, ref: "abc123" },
		});
	});

	test("review submitted lower-cases state to uppercase", () => {
		const payload = {
			action: "submitted",
			review: { user: { login: "owner" }, author_association: "OWNER", state: "commented" },
			pull_request: { number: 2, head: { sha: "deadbeef" } },
		};
		expect(translateGitHubEvent("pull_request_review", payload)).toEqual({
			kind: "event",
			event: { type: "review", state: "COMMENTED", actor: { login: "owner", association: "OWNER", is_bot: false } },
			subject: { number: 2, is_pr: true, ref: "deadbeef" },
		});
	});

	test("check_suite completed success -> required_green", () => {
		const payload = {
			action: "completed",
			check_suite: { conclusion: "success", head_sha: "abc", pull_requests: [{ number: 3 }] },
		};
		expect(translateGitHubEvent("check_suite", payload)).toEqual({
			kind: "event",
			event: { type: "checks.completed", conclusion: "required_green" },
			subject: { number: 3, is_pr: true, ref: "abc" },
		});
	});

	test("check_suite completed failure -> failed", () => {
		const payload = {
			action: "completed",
			check_suite: { conclusion: "failure", head_sha: "abc", pull_requests: [{ number: 3 }] },
		};
		expect(translateGitHubEvent("check_suite", payload)).toEqual({
			kind: "event",
			event: { type: "checks.completed", conclusion: "failed" },
			subject: { number: 3, is_pr: true, ref: "abc" },
		});
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
