/**
 * Unit tests for the pull request approval and auto-merge handler.
 */
import { readFileSync } from "node:fs";
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

describe("approval workflow authentication and merge notifications", () => {
	test("uses independent app/Actions and user Projects credentials", () => {
		const workflow = Bun.YAML.parse(
			readFileSync(new URL("../../../../.github/workflows/pr-approval-automerge.yml", import.meta.url), "utf8"),
		) as {
			on: { pull_request_target: { types: string[] } };
			jobs: {
				"on-approval": { steps: Array<{ env?: Record<string, string> }> };
			};
		};
		const env = workflow.jobs["on-approval"].steps.at(-1)?.env;
		expect(env?.GH_TOKEN).toBe("${{ steps.app-token.outputs.token || github.token }}");
		expect(env?.GH_PROJECT_TOKEN).toBe("${{ secrets.GH_PROJECT_TOKEN }}");
		expect(env?.PR_MERGED).toBe("${{ github.event.pull_request.merged }}");
		expect(env?.PR_BASE_BRANCH).toBe("${{ github.event.pull_request.base.ref }}");
		expect(env?.DEFAULT_BRANCH).toBe("${{ github.event.repository.default_branch }}");
		expect(workflow.on.pull_request_target.types).toEqual(["closed"]);
	});
});

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
		// Async on purpose. The real client is a GraphQL client and its writes are promises, and a
		// synchronous fake is what let `handlePrApproval` be declared synchronous — the signature was
		// shaped by the test rather than by the dependency it would run against in production.
		track: async (url, status) => {
			added.push(url);
			moved.push(status);
		},
		setStatusLabel: async (_repo, number) => {
			labelled.push(`#${number}`);
		},
		addIssueLabel: async () => undefined,
		closeIssue: async () => undefined,
	};
}

const OK: GhResult = { exitCode: 0, stdout: "", stderr: "" };

/** A logger that keeps the test output readable when the point is the return value. */
const SILENT = { out: () => {}, err: () => {} };

describe("collecting the issues a pull request binds", () => {
	test("collects verified same-repository references and deduplicates", () => {
		expect(
			collectBoundIssues(
				{
					closingIssuesReferences: [
						{ number: 5, url: "https://github.com/o/r/issues/5" },
						{ number: 7, url: "https://github.com/o/r/issues/7" },
					],
					body: "Closes #7 and fixes #9",
				},
				"o/r",
			),
		).toEqual([5, 7, 9]);
	});

	test("ignores cross-repository links and unverified closing-reference numbers", () => {
		expect(
			collectBoundIssues(
				{
					closingIssuesReferences: [
						{ number: 41, url: "https://github.com/other/repo/issues/41" },
						{ number: 7, url: "https://github.com/o/r/issues/7" },
						{ number: 99 },
					],
					body: "Fixes https://github.com/other/repo/issues/41 and closes https://github.com/O/R/issues/8",
				},
				"o/r",
			),
		).toEqual([7, 8]);
	});

	test("a pull request with neither source yields nothing rather than raising", () => {
		expect(collectBoundIssues({}, "o/r")).toEqual([]);
		expect(collectBoundIssues({ closingIssuesReferences: null, body: null }, "o/r")).toEqual([]);
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

	test("rejects strangers", async () => {
		const { lines, logger } = recorder();
		const outcome = await handlePrApproval({
			run: forbidden,
			client: boardSpy(),
			logger,
			env: { GITHUB_ACTOR: "stranger", APPROVER_ASSOCIATION: "CONTRIBUTOR", ISSUE_AUTHOR: "marius-patrik" },
		});
		expect(outcome.entered).toBe(false);
		expect(lines.join("\n")).toContain("Actor stranger is not the author nor OWNER/MEMBER/COLLABORATOR");
	});

	test("rejects bots even with an owner association", async () => {
		const outcome = await handlePrApproval({
			run: forbidden,
			client: boardSpy(),
			logger: recorder().logger,
			env: { GITHUB_ACTOR: "github-actions[bot]", APPROVER_ASSOCIATION: "OWNER" },
		});
		expect(outcome.entered).toBe(false);
	});

	test("lets the Request author through without a privileged role", async () => {
		const { lines, logger } = recorder();
		const run: GhRunner = () => ({
			exitCode: 0,
			stdout: '{"isDraft": false, "state": "MERGED", "reviewDecision": ""}',
			stderr: "",
		});
		const outcome = await handlePrApproval({
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

	test("reconciles a merged-close webhook even if its actor is a bot", async () => {
		const called: string[][] = [];
		const run: GhRunner = (args) => {
			called.push([...args]);
			return {
				exitCode: 0,
				stdout: JSON.stringify({
					state: "MERGED",
					url: "https://github.com/o/r/pull/7",
					body: "Closes #3 and fixes https://github.com/other/repo/issues/7",
					closingIssuesReferences: [],
				}),
				stderr: "",
			};
		};
		const board = boardSpy();
		const result = await handlePrApproval({
			run,
			client: board,
			logger: SILENT,
			env: {
				GITHUB_ACTOR: "github-actions[bot]",
				GITHUB_EVENT_NAME: "pull_request_target",
				PR_MERGED: "true",
				PR_BASE_BRANCH: "main",
				DEFAULT_BRANCH: "main",
				PR_NUMBER: "7",
				GITHUB_REPOSITORY: "o/r",
			},
		});
		expect(result.merged).toBe(true);
		expect(board.added).toEqual(["https://github.com/o/r/pull/7", "https://github.com/o/r/issues/3"]);
		expect(called.filter((args) => args[0] === "issue" && args[1] === "close").map((args) => args[2])).toEqual(["3"]);
	});

	test("never marks work complete when a PR merges into a non-default branch", async () => {
		const run: GhRunner = () => {
			throw new Error("non-default branch merge must not reconcile issues");
		};
		const result = await handlePrApproval({
			run,
			client: boardSpy(),
			logger: SILENT,
			env: {
				GITHUB_EVENT_NAME: "pull_request_target",
				PR_MERGED: "true",
				PR_BASE_BRANCH: "feature",
				DEFAULT_BRANCH: "main",
				PR_NUMBER: "7",
			},
		});
		expect(result.reason).toBe("merged outside default branch");
	});

	test("ignores closed PRs that were not merged", async () => {
		const run: GhRunner = () => {
			throw new Error("unmerged close must not make GitHub requests");
		};
		const result = await handlePrApproval({
			run,
			client: boardSpy(),
			logger: SILENT,
			env: { GITHUB_EVENT_NAME: "pull_request_target", PR_MERGED: "false", PR_NUMBER: "7" },
		});
		expect(result.entered).toBe(false);
	});

	test("an event that is not an approval stops before any gh call", async () => {
		const outcome = await handlePrApproval({
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

	test("readies a draft, requests an asynchronous merge and leaves reconciliation for the close webhook", async () => {
		const issued: string[][] = [];
		let views = 0;
		const run: GhRunner = (args) => {
			issued.push([...args]);
			if (args[0] === "api" && args[1]?.includes("/pulls?")) return { exitCode: 0, stdout: "[]", stderr: "" };
			if (args[0] === "api")
				return {
					exitCode: 0,
					stdout: JSON.stringify({ status: "pending", details: { uuid: "test-merge-uuid" } }),
					stderr: "",
				};
			if (args[0] !== "pr" || args[1] !== "view") return OK;
			views += 1;
			if (views === 1) {
				return {
					exitCode: 0,
					stdout:
						'{"isDraft": true, "state": "OPEN", "reviewDecision": "", "headRefOid": "0123456789abcdef0123456789abcdef01234567", "baseRefName": "main"}',
					stderr: "",
				};
			}
			if (views === 2) return { exitCode: 0, stdout: '{"state": "OPEN"}', stderr: "" };
			return {
				exitCode: 0,
				stdout: JSON.stringify({
					state: "MERGED",
					url: "https://github.com/o/r/pull/42",
					body: "Closes #7",
					closingIssuesReferences: [{ number: 5, url: "https://github.com/o/r/issues/5" }],
				}),
				stderr: "",
			};
		};
		const board = boardSpy();
		const outcome = await handlePrApproval({
			run,
			client: board,
			logger: recorder().logger,
			env: openEnv,
			sleep: () => {},
		});

		expect(outcome.merged).toBe(true);
		expect(issued.some((args) => args[1] === "ready")).toBe(true);
		expect(
			issued.some(
				(args) =>
					args[0] === "api" &&
					args.includes("PUT") &&
					args.includes("repos/o/r/pulls/42/merge-async") &&
					args.includes("sha=0123456789abcdef0123456789abcdef01234567"),
			),
		).toBe(true);
		// The merged-close event, not the poll, is responsible for issue and board writes.
		expect(board.labelled).toEqual([]);
		expect(board.added).toEqual([]);
		expect(issued.some((args) => args[0] === "issue" && args[1] === "close")).toBe(false);
	});

	test("reports honestly when the merge has not landed inside the poll window", async () => {
		const run: GhRunner = (args) => {
			if (args[0] === "api" && args[1]?.includes("/pulls?")) return { exitCode: 0, stdout: "[]", stderr: "" };
			if (args[0] === "api")
				return {
					exitCode: 0,
					stdout: JSON.stringify({ status: "pending", details: { uuid: "test-merge-uuid" } }),
					stderr: "",
				};
			if (args[1] === "view" && args.some((arg) => arg.includes("reviewDecision"))) {
				return {
					exitCode: 0,
					stdout:
						'{"isDraft": false, "state": "OPEN", "reviewDecision": "", "headRefOid": "0123456789abcdef0123456789abcdef01234567", "baseRefName": "main"}',
					stderr: "",
				};
			}
			if (args[1] === "view") return { exitCode: 0, stdout: '{"state": "OPEN"}', stderr: "" };
			return OK;
		};
		const intervals: number[] = [];
		const { lines, logger } = recorder();
		const outcome = await handlePrApproval({
			run,
			client: boardSpy(),
			logger,
			env: openEnv,
			sleep: (interval) => {
				intervals.push(interval);
			},
		});

		expect(outcome.merged).toBe(false);
		expect(intervals).toEqual(Array(MERGE_POLL_ATTEMPTS).fill(5_000));
		expect(lines.join("\n")).toContain("asynchronous request test-merge-uuid remains unconfirmed");
	});

	test("does not merge unapproved downstack ancestors when an upstack PR is approved", async () => {
		const called: string[][] = [];
		const run: GhRunner = (args) => {
			called.push([...args]);
			if (args[0] === "api" && args[1]?.includes("/pulls?"))
				return {
					exitCode: 0,
					stdout: JSON.stringify([{ number: 41, head: { ref: "feature/parent", repo: { full_name: "o/r" } } }]),
					stderr: "",
				};
			return {
				exitCode: 0,
				stdout: JSON.stringify({
					state: "OPEN",
					isDraft: false,
					reviewDecision: "APPROVED",
					headRefOid: "0123456789abcdef0123456789abcdef01234567",
					baseRefName: "feature/parent",
				}),
				stderr: "",
			};
		};
		const outcome = await handlePrApproval({ run, client: boardSpy(), logger: SILENT, env: openEnv });
		expect(outcome.merged).toBe(false);
		expect(outcome.reason).toBe("unmerged downstack PR #41");
		expect(called.some((args) => args[0] === "api" && args.includes("PUT"))).toBe(false);
	});

	test("reuses a conflicting in-flight async merge only when it matches the reviewed SHA", async () => {
		const run: GhRunner = (args) => {
			if (args[0] === "api" && args[1]?.includes("/pulls?")) return { exitCode: 0, stdout: "[]", stderr: "" };
			if (args[0] === "api" && args.includes("PUT"))
				return {
					exitCode: 1,
					stdout: JSON.stringify({
						status: "pending",
						details: {
							uuid: "existing-uuid",
							expected_head_sha: "0123456789abcdef0123456789abcdef01234567",
							merge_action: "default",
						},
					}),
					stderr: "HTTP 409: Conflict",
				};
			if (args[0] === "api") return { exitCode: 0, stdout: JSON.stringify({ status: "enqueued" }), stderr: "" };
			return {
				exitCode: 0,
				stdout: JSON.stringify({
					state: "OPEN",
					isDraft: false,
					reviewDecision: "APPROVED",
					headRefOid: "0123456789abcdef0123456789abcdef01234567",
					baseRefName: "main",
				}),
				stderr: "",
			};
		};
		const result = await handlePrApproval({ run, client: boardSpy(), logger: SILENT, env: openEnv });
		expect(result.reason).toBe("merge queued");
	});

	test("refuses to reuse a conflicting async request for a different SHA", async () => {
		const run: GhRunner = (args) => {
			if (args[0] === "api" && args[1]?.includes("/pulls?")) return { exitCode: 0, stdout: "[]", stderr: "" };
			if (args[0] === "api")
				return {
					exitCode: 1,
					stdout: JSON.stringify({
						status: "pending",
						details: { uuid: "existing-uuid", expected_head_sha: "f".repeat(40), merge_action: "default" },
					}),
					stderr: "HTTP 409",
				};
			return {
				exitCode: 0,
				stdout: JSON.stringify({
					state: "OPEN",
					isDraft: false,
					reviewDecision: "APPROVED",
					headRefOid: "0123456789abcdef0123456789abcdef01234567",
					baseRefName: "main",
				}),
				stderr: "",
			};
		};
		await expect(handlePrApproval({ run, client: boardSpy(), logger: SILENT, env: openEnv })).rejects.toThrow(
			"HTTP 409",
		);
	});
	test("fails loudly if GitHub rejects a stacked merge instead of claiming auto-merge is armed", async () => {
		const run: GhRunner = (args) => {
			if (args[0] === "api" && args[1]?.includes("/pulls?")) return { exitCode: 0, stdout: "[]", stderr: "" };
			if (args[0] === "api") return { exitCode: 1, stdout: "", stderr: "merge denied" };
			return {
				exitCode: 0,
				stdout: JSON.stringify({
					state: "OPEN",
					isDraft: false,
					reviewDecision: "APPROVED",
					headRefOid: "0123456789abcdef0123456789abcdef01234567",
					baseRefName: "main",
				}),
				stderr: "",
			};
		};
		await expect(handlePrApproval({ run, client: boardSpy(), logger: SILENT, env: openEnv })).rejects.toThrow(
			"merge denied",
		);
	});

	test("fails when GitHub asynchronously rejects a merge on repository rules", async () => {
		const run: GhRunner = (args) => {
			if (args[0] === "api" && args.includes("PUT"))
				return {
					exitCode: 0,
					stdout: JSON.stringify({ status: "pending", details: { uuid: "test-merge-uuid" } }),
					stderr: "",
				};
			if (args[0] === "api" && args[1]?.includes("/pulls?")) return { exitCode: 0, stdout: "[]", stderr: "" };
			if (args[0] === "api")
				return {
					exitCode: 0,
					stdout: JSON.stringify({ status: "failed", details: { message: "review required" } }),
					stderr: "",
				};
			return {
				exitCode: 0,
				stdout: JSON.stringify({
					state: "OPEN",
					isDraft: false,
					reviewDecision: "APPROVED",
					headRefOid: "0123456789abcdef0123456789abcdef01234567",
					baseRefName: "main",
				}),
				stderr: "",
			};
		};
		await expect(handlePrApproval({ run, client: boardSpy(), logger: SILENT, env: openEnv })).rejects.toThrow(
			"review required",
		);
	});

	test("stops polling when the native merge API queues the PR", async () => {
		const called: string[][] = [];
		const run: GhRunner = (args) => {
			called.push([...args]);
			if (args[0] === "api" && args[1]?.includes("/pulls?")) return { exitCode: 0, stdout: "[]", stderr: "" };
			if (args[0] === "api") return { exitCode: 0, stdout: JSON.stringify({ status: "enqueued" }), stderr: "" };
			return {
				exitCode: 0,
				stdout: JSON.stringify({
					state: "OPEN",
					isDraft: false,
					reviewDecision: "APPROVED",
					headRefOid: "0123456789abcdef0123456789abcdef01234567",
					baseRefName: "main",
				}),
				stderr: "",
			};
		};
		const board = boardSpy();
		const result = await handlePrApproval({ run, client: board, logger: SILENT, env: openEnv });
		expect(result.reason).toBe("merge queued");
		expect(result.merged).toBe(false);
		expect(board.added).toEqual([]);
		expect(called.filter((args) => args[0] === "api" && args.includes("PUT"))).toHaveLength(1);
	});

	test("reconciliation declines a pull request that is not merged", async () => {
		const { lines, logger } = recorder();
		const run: GhRunner = () => ({ exitCode: 0, stdout: '{"state": "CLOSED"}', stderr: "" });
		const board = boardSpy();
		const outcome = await handlePrApproval({ run, client: board, logger, env: { ...openEnv, PR_NUMBER: "42" } });
		// A closed pull request is not merged, so the handler exits before arming auto-merge.
		expect(outcome.merged).toBe(false);
		expect(board.labelled).toEqual([]);
		expect(lines.join("\n")).not.toContain("Reconciling post-merge");
	});
});

describe("merged-close reconciliation awaits every remote board write", () => {
	function mergedClose(): GhRunner {
		return () => ({
			exitCode: 0,
			stdout: JSON.stringify({
				state: "MERGED",
				url: "https://github.com/o/r/pull/7",
				body: "Closes #3",
				closingIssuesReferences: [{ number: 3, url: "https://github.com/o/r/issues/3" }],
			}),
			stderr: "",
		});
	}

	test("awaits remote board writes before the workflow exits", async () => {
		const settled: string[] = [];
		const client: ProjectBoardClient = {
			track: async () => {
				await Bun.sleep(1);
				settled.push("track");
			},
			setStatusLabel: async () => {
				await Bun.sleep(1);
				settled.push("setStatusLabel");
			},
			closeIssue: async () => undefined,
			addIssueLabel: async () => undefined,
		};
		const outcome = await handlePrApproval({
			run: mergedClose(),
			client,
			logger: SILENT,
			env: {
				GITHUB_EVENT_NAME: "pull_request_target",
				PR_MERGED: "true",
				PR_BASE_BRANCH: "main",
				DEFAULT_BRANCH: "main",
				GITHUB_REPOSITORY: "o/r",
				PR_NUMBER: "7",
			},
		});
		expect(outcome.merged).toBe(true);
		expect(settled).toEqual(["track", "setStatusLabel", "setStatusLabel", "track"]);
	});

	test("does not swallow a failed post-merge board write", async () => {
		const client: ProjectBoardClient = {
			track: async () => {
				throw new Error("board write failed");
			},
			setStatusLabel: async () => undefined,
			closeIssue: async () => undefined,
			addIssueLabel: async () => undefined,
		};
		await expect(
			handlePrApproval({
				run: mergedClose(),
				client,
				logger: SILENT,
				env: {
					GITHUB_EVENT_NAME: "pull_request_target",
					PR_MERGED: "true",
					PR_BASE_BRANCH: "main",
					DEFAULT_BRANCH: "main",
					GITHUB_REPOSITORY: "o/r",
					PR_NUMBER: "7",
				},
			}),
		).rejects.toThrow(/board write failed/u);
	});
});
