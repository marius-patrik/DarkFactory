/**
 * Unit tests for the pull request approval and auto-merge handler.
 */
import { describe, expect, test } from "bun:test";
import {
	collectBoundIssues,
	detectApproval,
	type GhResult,
	type GhRunner,
	handlePrApproval,
	MERGE_POLL_ATTEMPTS,
	type ProjectBoardClient,
	submitProxyReview,
} from "../../src/approvals/pr-approval.ts";

/** Collects everything the handler narrates, so a test can assert on it. */
function recorder(): { lines: string[]; logger: { out: (line: string) => void; err: (line: string) => void } } {
	const lines: string[] = [];
	return { lines, logger: { out: (line) => lines.push(line), err: (line) => lines.push(line) } };
}

/** A board client that records every mutation and does nothing else. */
function boardSpy(): ProjectBoardClient & { added: string[]; labelled: string[]; moved: string[] } {
	const added: string[] = [];
	const labelled: string[] = [];
	const moved: string[] = [];
	return {
		added,
		labelled,
		moved,
		addItem: (url) => {
			added.push(url);
			return `item-${added.length}`;
		},
		editStatus: (itemId) => {
			moved.push(itemId);
		},
		setStatusLabel: (_repo, number) => {
			labelled.push(`#${number}`);
		},
	};
}

const OK: GhResult = { exitCode: 0, stdout: "", stderr: "" };

/** A logger that keeps the test output readable when the point is the return value. */
const SILENT = { out: () => {}, err: () => {} };

describe("collecting the issues a pull request binds", () => {
	test("merges GitHub's link graph with the body regex, then deduplicates", () => {
		expect(
			collectBoundIssues({
				closingIssuesReferences: [{ number: 5 }, { number: 7 }],
				body: "Closes #7 and fixes #9",
			}),
		).toEqual([5, 7, 9]);
	});

	test("a cross-repository url binds just as a short reference does", () => {
		expect(collectBoundIssues({ body: "Resolves https://github.com/other/repo/issues/41" })).toEqual([41]);
	});

	test("a pull request with neither source yields nothing rather than raising", () => {
		expect(collectBoundIssues({})).toEqual([]);
		expect(collectBoundIssues({ closingIssuesReferences: null, body: null })).toEqual([]);
	});
});

describe("detecting an approval", () => {
	test.each([
		["approve", true],
		["/approve", true],
		["LGTM", true],
		["merge", true],
		["/df approve", true],
		["looks good to me, approve when ready", false],
		["I do not approve yet", false],
		["/df reject", false],
		["/reject", false],
		["/df revise", false],
		["/df resume", false],
		["good", false],
		["", false],
	])("a comment body of %p registers as approval=%p", (body, expected) => {
		const { prNumber, approved } = detectApproval({
			GITHUB_EVENT_NAME: "issue_comment",
			IS_PR: "true",
			PR_NUMBER: "42",
			COMMENT_BODY: body,
		});
		expect(prNumber).toBe("42");
		expect(approved).toBe(expected);
	});

	test("an approval on a plain issue is a plan gate, not a merge instruction", () => {
		expect(detectApproval({ GITHUB_EVENT_NAME: "issue_comment", IS_PR: "false", COMMENT_BODY: "approve" })).toEqual({
			prNumber: null,
			approved: false,
		});
	});

	test.each(["approved", "APPROVED", "Approved"])("a native %s review counts without consulting IS_PR", (state) => {
		// The workflow used to derive IS_PR from the `issue` object, which
		// `pull_request_review` events do not carry, so every native approval was missed.
		expect(detectApproval({ GITHUB_EVENT_NAME: "pull_request_review", PR_NUMBER: "7", REVIEW_STATE: state })).toEqual({
			prNumber: "7",
			approved: true,
		});
	});

	test.each([
		["commented", "approve"],
		["commented", "LGTM, merge it"],
		["changes_requested", "approve"],
		["dismissed", ""],
		["", "approved"],
	])("a %s review whose body says %p never counts", (state) => {
		expect(detectApproval({ GITHUB_EVENT_NAME: "pull_request_review", PR_NUMBER: "7", REVIEW_STATE: state })).toEqual({
			prNumber: "7",
			approved: false,
		});
	});

	test("an event that is neither a review nor a comment carries no approval", () => {
		expect(detectApproval({ GITHUB_EVENT_NAME: "push" })).toEqual({ prNumber: null, approved: false });
	});
});

describe("the actor gate", () => {
	const forbidden: GhRunner = () => {
		throw new Error("an unapproved actor must not reach the merge path");
	};

	test("rejects strangers", () => {
		const { lines, logger } = recorder();
		const outcome = handlePrApproval({
			run: forbidden,
			client: boardSpy(),
			logger,
			env: { GITHUB_ACTOR: "stranger", APPROVER_ASSOCIATION: "CONTRIBUTOR", ISSUE_AUTHOR: "marius-patrik" },
		});
		expect(outcome.entered).toBe(false);
		expect(lines.join("\n")).toContain("Actor stranger is not the author nor OWNER/MEMBER/COLLABORATOR");
	});

	test("rejects bots even with an owner association", () => {
		const outcome = handlePrApproval({
			run: forbidden,
			client: boardSpy(),
			logger: recorder().logger,
			env: { GITHUB_ACTOR: "github-actions[bot]", APPROVER_ASSOCIATION: "OWNER" },
		});
		expect(outcome.entered).toBe(false);
	});

	test("lets the Request author through without a privileged role", () => {
		const { lines, logger } = recorder();
		const run: GhRunner = () => ({
			exitCode: 0,
			stdout: '{"isDraft": false, "state": "MERGED", "reviewDecision": ""}',
			stderr: "",
		});
		const outcome = handlePrApproval({
			run,
			client: boardSpy(),
			logger,
			env: {
				GITHUB_ACTOR: "author",
				APPROVER_ASSOCIATION: "CONTRIBUTOR",
				ISSUE_AUTHOR: "author",
				GITHUB_EVENT_NAME: "issue_comment",
				IS_PR: "true",
				PR_NUMBER: "42",
				COMMENT_BODY: "/df approve",
			},
		});
		expect(outcome.entered).toBe(true);
		expect(outcome.reason).toBe("pull request is MERGED");
		expect(lines.join("\n")).toContain("approved by @author");
	});

	test("an event that is not an approval stops before any gh call", () => {
		const outcome = handlePrApproval({
			run: forbidden,
			client: boardSpy(),
			logger: recorder().logger,
			env: {
				GITHUB_ACTOR: "author",
				APPROVER_ASSOCIATION: "OWNER",
				GITHUB_EVENT_NAME: "issue_comment",
				IS_PR: "true",
				PR_NUMBER: "42",
				COMMENT_BODY: "/df reject use bun",
			},
		});
		expect(outcome).toEqual({ entered: false, reason: "not an approval event", merged: false });
	});
});

describe("the proxy review", () => {
	test("refuses without a bot token, because GitHub rejects self-approval", () => {
		let calls = 0;
		const run: GhRunner = () => {
			calls += 1;
			return OK;
		};
		expect(submitProxyReview(1, "o/r", "someone", { run, env: {}, logger: SILENT })).toBe(false);
		expect(calls).toBe(0);
	});

	test("verifies that the review landed rather than assuming it did", () => {
		let sawBot = false;
		const run: GhRunner = (args, _repo, options) => {
			if (args[0] === "pr") {
				sawBot = options?.asBot === true;
				return { exitCode: 1, stdout: "", stderr: "not permitted to approve own PR" };
			}
			return OK;
		};
		expect(submitProxyReview(1, "o/r", "someone", { run, env: { BOT_TOKEN: "bot" }, logger: SILENT })).toBe(false);
		expect(sawBot).toBe(true);
	});

	test("reports an approval that landed", () => {
		const run: GhRunner = (args) => (args[0] === "pr" ? OK : { exitCode: 0, stdout: "APPROVED\n", stderr: "" });
		expect(submitProxyReview(1, "o/r", "someone", { run, env: { BOT_TOKEN: "bot" }, logger: SILENT })).toBe(true);
	});
});

describe("auto-merge and post-merge reconciliation", () => {
	const openEnv = {
		GITHUB_ACTOR: "owner",
		APPROVER_ASSOCIATION: "OWNER",
		GITHUB_REPOSITORY: "o/r",
		GITHUB_EVENT_NAME: "issue_comment",
		IS_PR: "true",
		PR_NUMBER: "42",
		COMMENT_BODY: "/df approve",
	};

	test("readies a draft, arms auto-merge, and reconciles once the merge lands", () => {
		const issued: string[][] = [];
		let views = 0;
		const run: GhRunner = (args) => {
			issued.push([...args]);
			if (args[0] !== "pr" || args[1] !== "view") return OK;
			views += 1;
			if (views === 1) {
				return { exitCode: 0, stdout: '{"isDraft": true, "state": "OPEN", "reviewDecision": ""}', stderr: "" };
			}
			if (views === 2) return { exitCode: 0, stdout: '{"state": "OPEN"}', stderr: "" };
			return {
				exitCode: 0,
				stdout: JSON.stringify({
					state: "MERGED",
					url: "https://github.com/o/r/pull/42",
					body: "Closes #7",
					closingIssuesReferences: [{ number: 5 }],
				}),
				stderr: "",
			};
		};
		const board = boardSpy();
		const outcome = handlePrApproval({ run, client: board, logger: recorder().logger, env: openEnv });

		expect(outcome.merged).toBe(true);
		expect(issued.some((args) => args[1] === "ready")).toBe(true);
		expect(issued.some((args) => args[1] === "merge" && args.includes("--auto"))).toBe(true);
		// The board sees the pull request and both bound issues: 5 from the link graph, 7 from the body.
		expect(board.labelled).toEqual(["#42", "#5", "#7"]);
		expect(board.added).toEqual([
			"https://github.com/o/r/pull/42",
			"https://github.com/o/r/issues/5",
			"https://github.com/o/r/issues/7",
		]);
		expect(issued.filter((args) => args[0] === "issue" && args[1] === "close").map((args) => args[2])).toEqual([
			"5",
			"7",
		]);
	});

	test("reports honestly when the merge has not landed inside the poll window", () => {
		const run: GhRunner = (args) => {
			if (args[1] === "view" && args.includes("reviewDecision")) {
				return { exitCode: 0, stdout: '{"isDraft": false, "state": "OPEN", "reviewDecision": ""}', stderr: "" };
			}
			if (args[1] === "view") return { exitCode: 0, stdout: '{"state": "OPEN"}', stderr: "" };
			return OK;
		};
		let slept = 0;
		const { lines, logger } = recorder();
		const outcome = handlePrApproval({
			run,
			client: boardSpy(),
			logger,
			env: openEnv,
			sleep: () => {
				slept += 1;
			},
		});

		expect(outcome.merged).toBe(false);
		expect(slept).toBe(MERGE_POLL_ATTEMPTS);
		expect(lines.join("\n")).toContain("auto-merge stays armed");
	});

	test("reconciliation declines a pull request that is not merged", () => {
		const { lines, logger } = recorder();
		const run: GhRunner = () => ({ exitCode: 0, stdout: '{"state": "CLOSED"}', stderr: "" });
		const board = boardSpy();
		const outcome = handlePrApproval({ run, client: board, logger, env: { ...openEnv, PR_NUMBER: "42" } });
		// A closed pull request is not merged, so the handler exits before arming auto-merge.
		expect(outcome.merged).toBe(false);
		expect(board.labelled).toEqual([]);
		expect(lines.join("\n")).not.toContain("Reconciling post-merge");
	});
});
