import { describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PrApprovalOutcome } from "../../../../packages/github/src/approvals/pr-approval.ts";
import type { BoardTarget } from "../../../../packages/harness/src/board/client.ts";
import {
	main,
	PR_APPROVAL_FLAGS,
	parsePrApprovalArgs,
	resolveApprovalEventEnvironment,
} from "../../../../packages/harness/src/board/pr-approval-main.ts";

/**
 * The entry point's contract with the workflow that runs it.
 *
 * The Python's handler took no arguments and returned `None` in every path, so this checks two things
 * that a caller depends on and that nothing else in the codebase pins: that an argument is rejected
 * rather than ignored, and that a declined event still exits zero.
 */

/** A target that records nothing; the entry never calls it when a handler is injected. */
const quietTarget = {
	track: async () => undefined,
	setStatusLabel: async () => undefined,
	addIssueLabel: async () => undefined,
	closeIssue: async () => undefined,
} as unknown as BoardTarget;

/**
 * A handler that returns a fixed outcome and counts how many times it was reached.
 *
 * The counter is returned as an object rather than destructured: `const { handle, calls } = ...` copies
 * `calls` by value at that moment, so it reads 0 forever. The first version of this test asserted on
 * the destructured number and passed for the wrong reason once, then failed for the right one.
 */
function handlerReturning(outcome: PrApprovalOutcome): { handle: never; reached: { count: number } } {
	const reached = { count: 0 };
	const handle = (async () => {
		reached.count += 1;
		return outcome;
	}) as never;
	return { handle, reached };
}

describe("the approval entry's argument surface", () => {
	it("declares no flags, because handle_pr_approval.py had none", () => {
		expect(PR_APPROVAL_FLAGS).toEqual([]);
	});

	it("accepts an empty argument list", () => {
		expect(() => parsePrApprovalArgs([])).not.toThrow();
	});

	it("rejects an argument rather than ignoring it", () => {
		// The script takes no arguments, so one means the caller expected a different program. Running
		// anyway would let a renamed subcommand look like a successful no-op.
		expect(() => parsePrApprovalArgs(["approve"])).toThrow(/unexpected argument/u);
	});
});

describe("the approval entry's exit code", () => {
	it("exits 0 when it declined to act, as the Python did", async () => {
		// An event that is not an approval is not a failure. A declined event reddening the workflow is
		// what the exit code is here to prevent.
		const { handle, reached } = handlerReturning({
			entered: false,
			reason: "not an approval event",
			merged: false,
		});
		const code = await main([], { client: quietTarget, handle, env: {} });
		expect(code).toBe(0);
		expect(reached.count).toBe(1);
	});

	it("exits 0 after arming auto-merge, including when the merge was not observed", async () => {
		const { handle } = handlerReturning({
			entered: true,
			reason: "merge not observed within the poll window",
			merged: false,
		});
		expect(await main([], { client: quietTarget, handle, env: {} })).toBe(0);
	});

	it("exits 0 after a merge lands and the board is reconciled", async () => {
		const { handle } = handlerReturning({ entered: true, reason: null, merged: true });
		expect(await main([], { client: quietTarget, handle, env: {} })).toBe(0);
	});

	it("propagates a rejected board write, so the process exits non-zero", async () => {
		// The Python had no try/except around the board calls, so a failed write failed the run.
		// Swallowing it here would hide the failure the reconciliation exists to report.
		const handle = (async () => {
			throw new Error("board write failed");
		}) as never;
		await expect(main([], { client: quietTarget, handle, env: {} })).rejects.toThrow(/board write failed/u);
	});

	it("rejects an argument before doing any work", async () => {
		const { handle, reached } = handlerReturning({ entered: true, reason: null, merged: true });
		await expect(main(["--approve"], { client: quietTarget, handle, env: {} })).rejects.toThrow(/unexpected argument/u);
		expect(reached.count).toBe(0);
	});
});


describe("large GitHub approval events are read without process-environment expansion", () => {
	it("reads an unbounded PR comment from runner event JSON after the process starts", async () => {
		const directory = await mkdtemp(join(tmpdir(), "df-pr-approval-"));
		try {
			const eventPath = join(directory, "event.json");
			const body = `/df reject ${"x".repeat(180_000)}`;
			await writeFile(eventPath, JSON.stringify({ comment: { body } }));
			let observed: string | undefined;
			const handle = (async ({ env }: { env?: Record<string, string | undefined> }) => {
				observed = env?.COMMENT_BODY;
				return { entered: false, reason: "not approved", merged: false };
			}) as never;
			const result = await main([], {
				env: { GITHUB_EVENT_NAME: "issue_comment", IS_PR: "true", GITHUB_EVENT_PATH: eventPath },
				client: quietTarget,
				handle,
			});
			expect(result).toBe(0);
			expect(observed).toBe(body);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	it("fails closed for a PR comment with no available event payload", async () => {
		await expect(
			resolveApprovalEventEnvironment({ GITHUB_EVENT_NAME: "issue_comment", IS_PR: "true" }),
		).rejects.toThrow(/Missing GITHUB_EVENT_PATH/u);
	});

	it("fails closed on malformed or non-string approval comment bodies", async () => {
		const directory = await mkdtemp(join(tmpdir(), "df-pr-approval-"));
		try {
			const eventPath = join(directory, "event.json");
			for (const payload of ["{broken", "{}", '{"comment":{"body":null}}']) {
				await writeFile(eventPath, payload);
				await expect(
					resolveApprovalEventEnvironment({
						GITHUB_EVENT_NAME: "issue_comment",
						IS_PR: "true",
						GITHUB_EVENT_PATH: eventPath,
					}),
				).rejects.toThrow();
			}
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	it("does not read event files for native PR reviews or non-PR comments", async () => {
		const review = { GITHUB_EVENT_NAME: "pull_request_review", GITHUB_EVENT_PATH: "/absent" };
		const issue = { GITHUB_EVENT_NAME: "issue_comment", IS_PR: "false", GITHUB_EVENT_PATH: "/absent" };
		expect(await resolveApprovalEventEnvironment(review)).toEqual(review);
		expect(await resolveApprovalEventEnvironment(issue)).toEqual(issue);
	});

	it("retains an explicitly injected comment for existing callers", async () => {
		const env = { GITHUB_EVENT_NAME: "issue_comment", IS_PR: "true", COMMENT_BODY: "/df approve" };
		expect(await resolveApprovalEventEnvironment(env)).toEqual(env);
	});
});
