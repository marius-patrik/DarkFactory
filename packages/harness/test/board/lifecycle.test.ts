import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CanonicalStatus } from "../../../protocol/src/workflow.ts";
import { CHECKPOINT_FILENAME } from "../../src/board/checkpoint.ts";
import {
	type BoardEventContext,
	handleIssueEvent,
	handlePullRequestEvent,
	handlePushEvent,
	type WebhookPayload,
} from "../../src/board/events.ts";
import { BoardRun } from "../../src/board/run.ts";
import { RecordingTarget } from "./fakes.ts";

/**
 * Real-time lifecycle handling: what a webhook does to the board, and to the Requests it binds.
 *
 * Every assertion here is about a sequence a human can observe - the board column an item lands in,
 * the label it carries, whether an issue got closed - because that is the whole contract of the
 * automation. The projection itself is covered in `projection.test.ts`.
 */

/** The repository these fixtures name. */
const REPO = "marius-patrik/DarkFactory";

/** A run that reports nowhere, plus the branches whose pushes reconcile the board. */
function context(overrides: Partial<BoardEventContext> = {}): BoardEventContext {
	return {
		run: new BoardRun({ stdout: () => {}, stderr: () => {} }),
		defaultBranch: "main",
		developmentBranch: "develop",
		sweep: async () => {},
		...overrides,
	};
}

/** The statuses written to the board, in order, as `item -> status` pairs. */
function statusSequence(target: RecordingTarget): [string, string][] {
	return target.editedStatuses.map((entry) => [entry.itemId, entry.status]);
}

/** A state directory pointing at no checkpoint, so an issue is never held `Blocked` by accident. */
function emptyStateEnv(): Record<string, string | undefined> {
	return { STATE_DIR: mkdtempSync(join(tmpdir(), "df-board-events-")) };
}

/** Sets STATE_DIR for the duration of a call, so a checkpoint is looked for in a known place. */
async function withStateDir<T>(env: Record<string, string | undefined>, body: () => Promise<T>): Promise<T> {
	const previous = process.env.STATE_DIR;
	process.env.STATE_DIR = env.STATE_DIR;
	try {
		return await body();
	} finally {
		if (previous === undefined) delete process.env.STATE_DIR;
		else process.env.STATE_DIR = previous;
	}
}

/** A payload with the repository filled in, which every fixture needs. */
function payload(body: Record<string, unknown>): WebhookPayload {
	return { repository: { full_name: REPO }, ...body } as WebhookPayload;
}

describe("an issue event", () => {
	test("a new issue lands on the board at the status its labels imply", async () => {
		const target = new RecordingTarget();
		await withStateDir(emptyStateEnv(), () =>
			handleIssueEvent(
				payload({
					action: "opened",
					issue: {
						number: 1,
						html_url: `https://github.com/${REPO}/issues/1`,
						labels: [{ name: "In Progress" }],
					},
				}),
				target,
				context(),
			),
		);
		expect(target.addedItems).toHaveLength(1);
		expect(statusSequence(target)).toEqual([["item-1", "In Progress"]]);
	});

	test("closing an active issue marks it Done exclusively, clearing the stale status label", async () => {
		const target = new RecordingTarget();
		await withStateDir(emptyStateEnv(), () =>
			handleIssueEvent(
				payload({
					action: "closed",
					issue: {
						number: 1,
						html_url: `https://github.com/${REPO}/issues/1`,
						labels: [{ name: "In Progress" }],
					},
				}),
				target,
				context(),
			),
		);
		expect(statusSequence(target)).toEqual([["item-1", "Done"]]);
		expect(target.statusLabels).toEqual([{ repo: REPO, number: 1, status: "Done" }]);
	});

	test("an issue closed as dropped keeps its terminal status", async () => {
		const target = new RecordingTarget();
		await withStateDir(emptyStateEnv(), () =>
			handleIssueEvent(
				payload({
					action: "closed",
					issue: { number: 2, html_url: `https://github.com/${REPO}/issues/2`, labels: [{ name: "Dropped" }] },
				}),
				target,
				context(),
			),
		);
		expect(statusSequence(target)).toEqual([["item-1", "Dropped"]]);
		expect(target.statusLabels).toEqual([{ repo: REPO, number: 2, status: "Dropped" }]);
	});

	test("an issue closed as not planned is Dropped, not Done", async () => {
		const target = new RecordingTarget();
		await withStateDir(emptyStateEnv(), () =>
			handleIssueEvent(
				payload({
					action: "closed",
					issue: {
						number: 77,
						html_url: `https://github.com/${REPO}/issues/77`,
						state: "closed",
						state_reason: "not_planned",
						labels: [{ name: "In Progress" }],
					},
				}),
				target,
				context(),
			),
		);
		expect(statusSequence(target)).toEqual([["item-1", "Dropped"]]);
		expect(target.statusLabels).toEqual([{ repo: REPO, number: 77, status: "Dropped" }]);
	});

	test("a stale Done label on an open issue is stripped to the ready column", async () => {
		const target = new RecordingTarget();
		await withStateDir(emptyStateEnv(), () =>
			handleIssueEvent(
				payload({
					action: "labeled",
					issue: {
						number: 3,
						state: "open",
						html_url: `https://github.com/${REPO}/issues/3`,
						labels: [{ name: "Request" }, { name: "Done" }],
					},
				}),
				target,
				context(),
			),
		);
		expect(statusSequence(target)).toEqual([["item-1", "ToDo"]]);
		expect(target.statusLabels).toEqual([{ repo: REPO, number: 3, status: "ToDo" }]);
	});
});

describe("a reopen and the quota checkpoint", () => {
	test("a reopened issue under a current checkpoint stays Blocked", async () => {
		// A reopen must not wipe quota-blocked resume state: the agent is still paused, and the
		// board saying `ToDo` is what put it back in the queue.
		const dir = emptyStateEnv();
		const checkpoint = join(String(dir.STATE_DIR), CHECKPOINT_FILENAME);
		writeFileSync(
			checkpoint,
			JSON.stringify({ issue_number: 7, timestamp: new Date().toISOString().replace(/\.\d+Z$/, "Z") }),
			"utf8",
		);
		const target = new RecordingTarget();
		await withStateDir(dir, () =>
			handleIssueEvent(
				payload({
					action: "reopened",
					issue: { number: 7, html_url: `https://github.com/${REPO}/issues/7`, labels: [{ name: "Request" }] },
				}),
				target,
				context(),
			),
		);
		expect(statusSequence(target)).toEqual([["item-1", "Blocked"]]);
		expect(target.statusLabels).toEqual([{ repo: REPO, number: 7, status: "Blocked" }]);
	});

	test("a plain reopen with no checkpoint returns to the ready column", async () => {
		const target = new RecordingTarget();
		await withStateDir(emptyStateEnv(), () =>
			handleIssueEvent(
				payload({
					action: "reopened",
					issue: { number: 8, html_url: `https://github.com/${REPO}/issues/8`, labels: [{ name: "Request" }] },
				}),
				target,
				context(),
			),
		);
		expect(statusSequence(target)).toEqual([["item-1", "ToDo"]]);
		expect(target.statusLabels).toEqual([{ repo: REPO, number: 8, status: "ToDo" }]);
	});

	test("an abandoned checkpoint no longer forces the board status to Blocked", async () => {
		// End to end: the age bound is what stops one quota exhaustion pinning an issue forever and
		// the projection rolling it backward on every later event.
		const dir = emptyStateEnv();
		const stale = new Date(Date.now() - 3 * 86_400_000).toISOString().replace(/\.\d+Z$/, "Z");
		writeFileSync(
			join(String(dir.STATE_DIR), CHECKPOINT_FILENAME),
			JSON.stringify({ issue_number: 16, timestamp: stale }),
			"utf8",
		);
		const target = new RecordingTarget();
		await withStateDir(dir, () =>
			handleIssueEvent(
				payload({
					action: "reopened",
					issue: { number: 16, html_url: `https://github.com/${REPO}/issues/16`, labels: [{ name: "Request" }] },
				}),
				target,
				context(),
			),
		);
		expect(statusSequence(target)).toEqual([["item-1", "ToDo"]]);
		expect(target.statusLabels).toEqual([{ repo: REPO, number: 16, status: "ToDo" }]);
	});

	test("expiry releases the quota pause but not a human's Blocked label", async () => {
		// The two signals are separate. A checkpoint says the agent stopped; a `Blocked` label says
		// a person decided this is blocked, and no amount of checkpoint expiry touches that.
		const dir = emptyStateEnv();
		const stale = new Date(Date.now() - 3 * 86_400_000).toISOString().replace(/\.\d+Z$/, "Z");
		writeFileSync(
			join(String(dir.STATE_DIR), CHECKPOINT_FILENAME),
			JSON.stringify({ issue_number: 19, timestamp: stale }),
			"utf8",
		);
		const target = new RecordingTarget();
		await withStateDir(dir, () =>
			handleIssueEvent(
				payload({
					action: "reopened",
					issue: {
						number: 19,
						html_url: `https://github.com/${REPO}/issues/19`,
						labels: [{ name: "Request" }, { name: "Blocked" }],
					},
				}),
				target,
				context(),
			),
		);
		expect(statusSequence(target)).toEqual([["item-1", "Blocked"]]);
		expect(target.statusLabels).toEqual([{ repo: REPO, number: 19, status: "Blocked" }]);
	});
});

describe("a pull request event", () => {
	test("a draft pull request opening does not move its Request past the approval gate", async () => {
		const target = new RecordingTarget();
		await handlePullRequestEvent(
			payload({
				action: "opened",
				pull_request: {
					html_url: `https://github.com/${REPO}/pull/9`,
					body: "Implements the feature. Closes #5",
					labels: [],
				},
			}),
			target,
			context(),
		);
		expect(target.statusLabels).toEqual([]);
		expect(statusSequence(target)).toContainEqual(["item-1", "In Progress"]);
	});

	test("marking a pull request ready is the first signal that bound work is active", async () => {
		const target = new RecordingTarget();
		await handlePullRequestEvent(
			payload({
				action: "ready_for_review",
				pull_request: {
					html_url: `https://github.com/${REPO}/pull/9`,
					body: "Implements the feature. Closes #5",
					labels: [],
				},
			}),
			target,
			context(),
		);
		expect(target.statusLabels).toEqual([{ repo: REPO, number: 5, status: "In Progress" }]);
		expect(statusSequence(target)).toContainEqual(["item-1", "In Progress"]);
	});

	test("merging reconciles the pull request, its issues, their labels and their open state", async () => {
		const target = new RecordingTarget();
		await handlePullRequestEvent(
			payload({
				action: "closed",
				pull_request: {
					html_url: `https://github.com/${REPO}/pull/9`,
					body: "Fixes the bug. Resolves #5",
					merged: true,
					labels: [],
				},
			}),
			target,
			context(),
		);
		expect(target.statusLabels).toEqual([{ repo: REPO, number: 5, status: "Done" }]);
		expect(target.closedIssues).toEqual([{ repo: REPO, number: 5 }]);
		expect(statusSequence(target)).toContainEqual(["item-1", "Done"]);
	});

	test("abandoning a pull request never looks like success on the board", async () => {
		const target = new RecordingTarget();
		await handlePullRequestEvent(
			payload({
				action: "closed",
				pull_request: {
					html_url: `https://github.com/${REPO}/pull/9`,
					body: "Closes #5",
					merged: false,
					labels: [],
				},
			}),
			target,
			context(),
		);
		expect(statusSequence(target)).toEqual([["item-1", "Dropped"]]);
		expect(target.statusLabels).toEqual([]);
		expect(target.closedIssues).toEqual([]);
	});

	test("a closed unmerged pull request is Dropped with a Dropped label", async () => {
		const target = new RecordingTarget();
		await handlePullRequestEvent(
			payload({
				action: "closed",
				pull_request: {
					number: 88,
					html_url: `https://github.com/${REPO}/pull/88`,
					body: "Some abandoned work",
					merged: false,
					labels: [{ name: "In Progress" }],
				},
			}),
			target,
			context(),
		);
		expect(statusSequence(target)).toContainEqual(["item-1", "Dropped"]);
		expect(target.statusLabels).toEqual([{ repo: REPO, number: 88, status: "Dropped" }]);
	});

	test("a merged pull request closes and marks Done both its bound and its closing issues", async () => {
		const target = new RecordingTarget();
		await handlePullRequestEvent(
			payload({
				action: "closed",
				pull_request: {
					number: 99,
					html_url: `https://github.com/${REPO}/pull/99`,
					body: "Resolves #42",
					merged: true,
					labels: [],
				},
			}),
			target,
			context(),
		);
		expect(target.statusLabels).toContainEqual({ repo: REPO, number: 99, status: "Done" });
		expect(target.statusLabels).toContainEqual({ repo: REPO, number: 42, status: "Done" });
		expect(target.closedIssues).toContainEqual({ repo: REPO, number: 42 });
		expect(statusSequence(target)).toContainEqual(["item-1", "Done"]);
	});

	test("a merged partial pull request stays terminal without completing an advanced Request", async () => {
		const target = new RecordingTarget();
		await handlePullRequestEvent(
			payload({
				action: "closed",
				pull_request: {
					number: 100,
					html_url: `https://github.com/${REPO}/pull/100`,
					body: "Advances #42",
					merged: true,
					labels: [],
				},
			}),
			target,
			context(),
		);
		expect(target.statusLabels).toContainEqual({ repo: REPO, number: 100, status: "Done" });
		expect(target.statusLabels.some((entry) => entry.number === 42)).toBe(false);
		expect(target.closedIssues.some((entry) => entry.number === 42)).toBe(false);
	});
});

describe("a push event", () => {
	test("a push carrying a closing keyword settles the References it names", async () => {
		const target = new RecordingTarget();
		await handlePushEvent(
			payload({
				ref: "refs/heads/main",
				commits: [{ message: "fix(core): correct frame codec\n\nCloses #12" }],
			}),
			target,
			context(),
		);
		expect(target.statusLabels).toEqual([{ repo: REPO, number: 12, status: "Done" }]);
		expect(target.closedIssues).toEqual([{ repo: REPO, number: 12 }]);
	});

	test("a commit that only advances a Request does not turn it terminal", async () => {
		const target = new RecordingTarget();
		await handlePushEvent(
			payload({
				ref: "refs/heads/main",
				commits: [{ message: "feat(core): partial slice\n\nAdvances #12" }],
			}),
			target,
			context(),
		);
		expect(target.statusLabels).toEqual([]);
		expect(target.closedIssues).toEqual([]);
	});

	test("only the default and development branches reconcile the board", async () => {
		const other = new RecordingTarget();
		await handlePushEvent(
			payload({ ref: "refs/heads/feature/x", commits: [{ message: "Closes #12" }] }),
			other,
			context(),
		);
		expect(other.closedIssues).toEqual([]);

		const integration = new RecordingTarget();
		await handlePushEvent(
			payload({ ref: "refs/heads/develop", commits: [{ message: "Closes #12" }] }),
			integration,
			context(),
		);
		expect(integration.closedIssues).toEqual([{ repo: REPO, number: 12 }]);
	});

	test("a push whose branch is named as the repository default reconciles it", async () => {
		// The default branch is a declaration, not a constant: this repository could name it
		// anything, and a hardcoded `main` would silently stop reconciling.
		const target = new RecordingTarget();
		await handlePushEvent(
			payload({
				repository: { full_name: REPO, default_branch: "darkfactory" },
				ref: "refs/heads/darkfactory",
				commits: [{ message: "fix(ci): fix automation\n\nCloses #68" }],
			}),
			target,
			context({ defaultBranch: "darkfactory", developmentBranch: "darkfactory" }),
		);
		expect(target.statusLabels).toEqual([{ repo: REPO, number: 68, status: "Done" }]);
		expect(target.closedIssues).toEqual([{ repo: REPO, number: 68 }]);
	});

	test("a push runs the sweep so a write it could not make is repaired at once", async () => {
		const target = new RecordingTarget();
		let swept = 0;
		await handlePushEvent(
			payload({ ref: "refs/heads/main", commits: [] }),
			target,
			context({
				sweep: async () => {
					swept += 1;
				},
			}),
		);
		expect(swept).toBe(1);
	});

	test("a push below the reconciliation reserve settles its References but skips the sweep", async () => {
		const target = new RecordingTarget();
		const run = new BoardRun({ stdout: () => {}, stderr: () => {} });
		run.graphqlRemaining = 10;
		let swept = 0;
		await handlePushEvent(
			payload({ ref: "refs/heads/main", commits: [{ message: "Closes #12" }] }),
			target,
			context({
				run,
				sweep: async () => {
					swept += 1;
				},
			}),
		);
		expect(target.closedIssues).toEqual([{ repo: REPO, number: 12 }]);
		expect(swept).toBe(0);
	});
});

describe("the status written for a tracked item is the projection's, not the event's", () => {
	test("the webhook's own status label is not trusted over the projection", async () => {
		// The payload is a snapshot from before the event, and the projection reads the whole item.
		// An issue opened with a `Done` label still lands in the ready column.
		const target = new RecordingTarget();
		const written: CanonicalStatus[] = [];
		await handleIssueEvent(
			payload({
				action: "labeled",
				issue: {
					number: 4,
					state: "open",
					html_url: `https://github.com/${REPO}/issues/4`,
					labels: [{ name: "Done" }, { name: "Backlog" }],
				},
			}),
			target,
			context(),
		);
		for (const action of target.actions) {
			if (action.kind === "track") written.push(action.status);
		}
		expect(written).toEqual(["Backlog"]);
	});
});
