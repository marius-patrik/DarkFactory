import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CanonicalStatus } from "../../../protocol/src/workflow.ts";
import {
	extractBoundIssues,
	extractClosingIssues,
	issueUrl,
	repoAndNumberFromContent,
} from "../../src/board/bindings.ts";
import {
	CHECKPOINT_FILENAME,
	checkpointAgeSeconds,
	checkpointCoversIssue,
	checkpointMaxAgeSeconds,
	DEFAULT_CHECKPOINT_MAX_AGE_SECONDS,
} from "../../src/board/checkpoint.ts";
import { BoardRun, CommandFailure, describeFailure, isRateLimited } from "../../src/board/run.ts";
import { type BoardItem, determineStatusFromLabels, expectedStatus, settledStatus } from "../../src/board/status.ts";
import { STATUS_NAMES } from "../../src/board/taxonomy.ts";

/**
 * The pure half of the board automation: what an item reads as, and what holds it `Blocked`.
 *
 * These are the assertions that had to survive the port unchanged, because they are the claims the
 * board rests on - a closed issue is terminal, an open one is not, and a quota pause holds an issue
 * only while the pause is current.
 */

/** The repository these fixtures name, from the configuration this repository declares. */
const REPO = "marius-patrik/DarkFactory";

/** A state directory no other test can see, and the environment that points at it. */
function stateDir(): { dir: string; env: Record<string, string | undefined> } {
	const dir = mkdtempSync(join(tmpdir(), "df-board-checkpoint-"));
	return { dir, env: { STATE_DIR: dir } };
}

/** Writes a checkpoint the way the agent runner does, and returns its path. */
function writeCheckpoint(dir: string, issueNumber: number, timestamp?: string): string {
	const path = join(dir, CHECKPOINT_FILENAME);
	const payload: Record<string, unknown> = { issue_number: issueNumber };
	if (timestamp !== undefined) payload.timestamp = timestamp;
	writeFileSync(path, JSON.stringify(payload), "utf8");
	return path;
}

/** Whole seconds since the epoch, the form the runner writes. */
function stamp(offsetSeconds: number): string {
	return new Date(Date.now() + offsetSeconds * 1000).toISOString().replace(/\.\d+Z$/, "Z");
}

describe("issue bindings", () => {
	test("terminal and nonterminal bindings are recognised in documented forms", () => {
		expect(extractBoundIssues("Closes #123")).toEqual([123]);
		expect(extractBoundIssues("Fixes #45 and resolves #67")).toEqual([45, 67]);
		expect(extractBoundIssues("CLOSED #10")).toEqual([10]);
		expect(extractBoundIssues("Advances #11")).toEqual([11]);
		expect(extractBoundIssues(`Resolves https://github.com/${REPO}/issues/89`)).toEqual([89]);
		expect(extractBoundIssues(`Advances https://github.com/${REPO}/issues/90`)).toEqual([90]);
		expect(extractBoundIssues("Just discussing issue #123 without keyword")).toEqual([]);
		expect(extractBoundIssues("")).toEqual([]);
		expect(extractBoundIssues(null)).toEqual([]);
	});

	test("repeated references collapse to one sorted list", () => {
		expect(extractBoundIssues("Advances #7, fixes #3, resolves #7")).toEqual([3, 7]);
	});

	test("only GitHub closing syntax carries terminal completion intent", () => {
		// `Advances` is deliberately excluded: a partial slice closes nothing.
		expect(extractClosingIssues("Advances #7, fixes #3, closes #9")).toEqual([3, 9]);
	});
});

describe("status projection from labels alone", () => {
	test("active labels outrank nothing on an open item, and the default is the ready column", () => {
		expect(determineStatusFromLabels(["bug", "Blocked"])).toBe("Blocked");
		expect(determineStatusFromLabels(["enhancement", "In Progress"])).toBe("In Progress");
		expect(determineStatusFromLabels(["Backlog"])).toBe("Backlog");
		expect(determineStatusFromLabels(["ToDo"])).toBe("ToDo");
		expect(determineStatusFromLabels(["random", "label"])).toBe("ToDo");
		expect(determineStatusFromLabels([])).toBe("ToDo");
	});

	test("a terminal label is believed on a closed item", () => {
		expect(determineStatusFromLabels(["Done"], true)).toBe("Done");
		expect(determineStatusFromLabels(["Superseded"], true)).toBe("Superseded");
		expect(determineStatusFromLabels(["Dropped"], true)).toBe("Dropped");
	});

	test("a terminal status outranks a stale active label on a closed item", () => {
		// The whole point of the closed branch coming first: a stale `In Progress` left behind by an
		// earlier transition must not keep a closed item reading as work in flight.
		expect(determineStatusFromLabels(["In Progress", "Done"], true)).toBe("Done");
		expect(determineStatusFromLabels(["In Progress", "Dropped"], true)).toBe("Dropped");
	});

	test("a stale terminal label is ignored on an open item", () => {
		expect(determineStatusFromLabels(["Done"])).toBe("ToDo");
		expect(determineStatusFromLabels(["In Progress", "Done"])).toBe("In Progress");
		expect(determineStatusFromLabels(["Dropped", "Blocked"])).toBe("Blocked");
	});

	test("both spellings of the ToDo column mean the same column", () => {
		expect(determineStatusFromLabels(["To Do"])).toBe("ToDo");
	});
});

describe("expected_status, table-driven across every canonical state", () => {
	const cases: [string, BoardItem, Record<string, unknown>, CanonicalStatus][] = [
		// Pull requests: merged is Done, closed unmerged is Dropped, and a duplicate is Superseded.
		["merged pull request", { is_pr: true, state: "closed", merged: true }, {}, "Done"],
		["pull request in the merged state", { is_pr: true, state: "merged", merged: true }, {}, "Done"],
		[
			"pull request with a merged_at timestamp",
			{ type: "PullRequest", state: "closed", merged_at: "2026-09-14T00:00:00Z" },
			{},
			"Done",
		],
		["closed unmerged pull request", { is_pr: true, state: "closed", merged: false }, {}, "Dropped"],
		[
			"closed unmerged pull request labelled Superseded",
			{ is_pr: true, state: "closed", merged: false, labels: ["Superseded"] },
			{},
			"Superseded",
		],
		[
			"closed unmerged pull request labelled duplicate",
			{ is_pr: true, state: "closed", merged: false, labels: ["duplicate"] },
			{},
			"Superseded",
		],
		["open pull request", { is_pr: true, state: "open", draft: false }, {}, "In Progress"],
		["open draft pull request", { is_pr: true, state: "open", draft: true }, {}, "In Progress"],
		[
			"open pull request labelled In Progress",
			{ is_pr: true, state: "open", labels: ["In Progress"] },
			{},
			"In Progress",
		],
		["open pull request labelled Blocked", { is_pr: true, state: "open", labels: ["Blocked"] }, {}, "Blocked"],
		["open pull request under a checkpoint", { is_pr: true, state: "open" }, { checkpoint: true }, "Blocked"],
		// Issues closed: a completion is Done, a non-implementation is Dropped, a duplicate is
		// Superseded, and an unexplained close is Dropped rather than Done.
		["issue closed as completed", { kind: "Issue", state: "closed", state_reason: "completed" }, {}, "Done"],
		["issue closed with a Done label", { kind: "Issue", state: "closed", labels: ["Done"] }, {}, "Done"],
		[
			"issue closed with a merged bound pull request",
			{ kind: "Issue", state: "closed" },
			{ boundPrs: [{ merged: true }] },
			"Done",
		],
		["issue closed as not planned", { kind: "Issue", state: "closed", state_reason: "not_planned" }, {}, "Dropped"],
		["issue closed with a Dropped label", { kind: "Issue", state: "closed", labels: ["Dropped"] }, {}, "Dropped"],
		["issue closed as duplicate", { kind: "Issue", state: "closed", state_reason: "duplicate" }, {}, "Superseded"],
		["issue closed as superseded", { kind: "Issue", state: "closed", state_reason: "superseded" }, {}, "Superseded"],
		[
			"issue closed with a Superseded label",
			{ kind: "Issue", state: "closed", labels: ["Superseded"] },
			{},
			"Superseded",
		],
		["issue closed with nothing to say", { kind: "Issue", state: "closed" }, {}, "Dropped"],
		[
			"closed issue with a stale In Progress label",
			{ kind: "Issue", state: "closed", labels: ["In Progress"] },
			{},
			"Dropped",
		],
		["open issue labelled Blocked", { kind: "Issue", state: "open", labels: ["Blocked"] }, {}, "Blocked"],
		["open issue under a checkpoint", { kind: "Issue", state: "open" }, { checkpoint: true }, "Blocked"],
		["open issue labelled In Progress", { kind: "Issue", state: "open", labels: ["In Progress"] }, {}, "In Progress"],
		[
			"open issue with a ready bound pull request",
			{ kind: "Issue", state: "open" },
			{ boundPrs: [{ state: "open", draft: false }] },
			"In Progress",
		],
		["open issue labelled Backlog", { kind: "Issue", state: "open", labels: ["Backlog"] }, {}, "Backlog"],
		["open issue labelled ToDo", { kind: "Issue", state: "open", labels: ["ToDo"] }, {}, "ToDo"],
		["unlabelled open issue", { kind: "Issue", state: "open", labels: [] }, {}, "ToDo"],
		["open issue with a stale terminal Done label", { kind: "Issue", state: "open", labels: ["Done"] }, {}, "ToDo"],
	];

	for (const [name, item, options, expected] of cases) {
		test(name, () => {
			expect(expectedStatus(item, options)).toBe(expected);
		});
	}
});

describe("settled status of a closed item", () => {
	test("an open item is never overridden from the outside", () => {
		// An open item's status is exactly the judgement the board exists to record.
		expect(settledStatus(false, false, ["In Progress"])).toBeNull();
	});

	test("merging is the definition of finished", () => {
		expect(settledStatus(true, true, [])).toBe("Done");
	});

	test("closed without implementing is dropped, not done", () => {
		expect(settledStatus(true, false, [])).toBe("Dropped");
	});

	test.each(["Done", "Superseded", "Dropped"])("a %s label is believed on a closed item", (label) => {
		// An item closed as superseded must not be flattened into dropped.
		expect(settledStatus(true, false, [label])).toBe(label);
	});

	test("a stale In Progress label does not survive closing", () => {
		// The exact drift found on the board: closed items still showing In Progress.
		expect(settledStatus(true, false, ["In Progress"])).toBe("Dropped");
	});
});

describe("the quota checkpoint's age bound", () => {
	test("a checkpoint written moments ago must survive, or a quota pause is not a pause", () => {
		// The guarantee the bound must not break: a reopen arriving after a quota exhaustion still
		// reports Blocked, so the resume state is not wiped.
		const { dir, env } = stateDir();
		writeCheckpoint(dir, 11, stamp(0));
		expect(checkpointCoversIssue(11, { env })).toBe(true);
	});

	test("a checkpoint older than the bound is abandoned, not pending", () => {
		// Before the bound, one quota exhaustion in a persisted state directory pinned its issue to
		// Blocked indefinitely: remove_checkpoint is reachable only from an explicit resume, so
		// nothing ever cleared it, and the board projection re-applied Blocked on every later event.
		const { dir, env } = stateDir();
		writeCheckpoint(dir, 12, stamp(-3 * 86_400));
		expect(checkpointCoversIssue(12, { env })).toBe(false);
	});

	test("the bound is configurable for an operator with a longer quota horizon", () => {
		const { dir, env } = stateDir();
		// 36h: outside the 24h default, inside the 48h window set below.
		writeCheckpoint(dir, 13, stamp(-36 * 3600));
		expect(checkpointCoversIssue(13, { env })).toBe(false);
		expect(checkpointCoversIssue(13, { env, maxAgeSeconds: 48 * 3600 })).toBe(true);
	});

	test("the bound is also configurable from the environment", () => {
		expect(checkpointMaxAgeSeconds({})).toBe(DEFAULT_CHECKPOINT_MAX_AGE_SECONDS);
		expect(checkpointMaxAgeSeconds({ DF_CHECKPOINT_MAX_AGE_SECONDS: "120" })).toBe(120);
		expect(checkpointMaxAgeSeconds({ DF_CHECKPOINT_MAX_AGE_SECONDS: "not-a-number" })).toBe(
			DEFAULT_CHECKPOINT_MAX_AGE_SECONDS,
		);
	});

	test("a missing or malformed timestamp is judged on the file's mtime, not trusted forever", () => {
		// The runner always writes a timestamp, so a payload without one is either hand-written or
		// from an older writer. Falling back to mtime keeps the reopen guarantee for a file that was
		// just written, while still expiring an old one.
		const { dir, env } = stateDir();
		const path = join(dir, CHECKPOINT_FILENAME);
		writeFileSync(path, JSON.stringify({ issue_number: 14 }), "utf8");
		expect(checkpointCoversIssue(14, { env })).toBe(true);

		const old = Date.now() / 1000 - 3 * 86_400;
		utimesSync(path, old, old);
		expect(checkpointCoversIssue(14, { env })).toBe(false);
	});

	test("a timestamp written in another format is unreadable and falls back to the mtime", () => {
		const { dir, env } = stateDir();
		writeCheckpoint(dir, 21, "2026-01-02T03:04:05+00:00");
		expect(checkpointCoversIssue(21, { env })).toBe(true);

		const old = Date.now() / 1000 - 3 * 86_400;
		utimesSync(join(dir, CHECKPOINT_FILENAME), old, old);
		expect(checkpointCoversIssue(21, { env })).toBe(false);
	});

	test("clock skew must not expire a live checkpoint", () => {
		const { dir, env } = stateDir();
		writeCheckpoint(dir, 15, stamp(2 * 3600));
		expect(checkpointCoversIssue(15, { env })).toBe(true);
	});

	test("a negative age counts as zero rather than as already expired", () => {
		const { dir } = stateDir();
		const path = writeCheckpoint(dir, 22, stamp(3600));
		expect(checkpointAgeSeconds(path, { issue_number: 22, timestamp: stamp(3600) })).toBe(0);
	});

	test("matching stays exact, so a checkpoint for one issue never holds another", () => {
		const { dir, env } = stateDir();
		writeCheckpoint(dir, 17, stamp(0));
		expect(checkpointCoversIssue(18, { env })).toBe(false);
	});

	test("an unparseable checkpoint file releases the issue rather than holding it", () => {
		const { dir, env } = stateDir();
		writeFileSync(join(dir, CHECKPOINT_FILENAME), "{ not json", "utf8");
		expect(checkpointCoversIssue(23, { env })).toBe(false);
	});

	test("a checkpoint is looked for in the state directory, the workspace, then the repository", () => {
		const { dir } = stateDir();
		const workspace = mkdtempSync(join(tmpdir(), "df-board-workspace-"));
		writeCheckpoint(workspace, 24, stamp(0));
		expect(checkpointCoversIssue(24, { env: { STATE_DIR: dir, GITHUB_WORKSPACE: workspace } })).toBe(true);
	});
});

describe("a run's budget and failures", () => {
	test("the live GraphQL reserve is the only write gate", () => {
		const run = new BoardRun({ stdout: () => {}, stderr: () => {} });
		expect(run.canMutate()).toBe(true);
		run.graphqlRemaining = 5_000;
		expect(run.canMutate()).toBe(true);
		expect(run.canReconcile()).toBe(true);
	});

	test("a sweep holds back a much higher reserve than a single write", () => {
		// Skipping a sweep costs nothing - the next one sees the same items - whereas spending the
		// reserve costs every real-time event that follows.
		const run = new BoardRun({ stdout: () => {}, stderr: () => {} });
		run.graphqlRemaining = 850;
		expect(run.canReconcile()).toBe(false);
		expect(run.canMutate()).toBe(true);

		run.graphqlRemaining = 1_500;
		expect(run.canReconcile()).toBe(true);
	});

	test("at or below the minimum every mutation pauses", () => {
		const run = new BoardRun({ stdout: () => {}, stderr: () => {} });
		run.graphqlRemaining = 45;
		expect(run.canMutate()).toBe(false);
		expect(run.canReconcile()).toBe(false);
	});

	test("a rate limit stops the run whatever the reserve says", () => {
		const run = new BoardRun({ stdout: () => {}, stderr: () => {} });
		run.graphqlRemaining = 5_000;
		run.markRateLimited("GraphQL quota exhausted");
		expect(run.canMutate()).toBe(false);
		expect(run.canReconcile()).toBe(false);
	});

	test("the thresholds are read from the environment and fall back when absent", () => {
		const run = new BoardRun({
			env: { PROJECT_QUOTA_MINIMUM: "not-a-number", PROJECT_QUOTA_RECONCILIATION_THRESHOLD: "900" },
			stdout: () => {},
			stderr: () => {},
		});
		expect(run.quotaMinimum).toBe(50);
		expect(run.reconciliationThreshold).toBe(900);
	});

	test("there is no per-run mutation cap", () => {
		// A fixed budget truncated a long run and left the board half-updated, so the counter is
		// observability only and gates nothing.
		const run = new BoardRun({ stdout: () => {}, stderr: () => {} });
		run.graphqlRemaining = 5_000;
		for (let index = 0; index < 40; index += 1) run.recordMutation();
		expect(run.mutationsPerformed).toBe(40);
		expect(run.canMutate()).toBe(true);
	});

	test("a recorded failure is what makes a run fail", () => {
		const run = new BoardRun({ stdout: () => {}, stderr: () => {} });
		run.fail("adding https://example/1 to project 16: boom");
		expect(run.failures).toHaveLength(1);
	});
});

describe("failures say what went wrong", () => {
	test("captured standard error reaches the message", () => {
		// The line explaining the failure is the line that was being dropped: `gh` reports a rate
		// limit there and the exception alone says only that the command exited non-zero.
		const failure = new CommandFailure("gh project list exited with status 1", "unknown owner type\n");
		expect(describeFailure(failure)).toContain("unknown owner type");
		expect(describeFailure(failure)).toContain("exited with status 1");
	});

	test("standard output is used when there is no standard error", () => {
		const failure = new CommandFailure("gh exited with status 1", undefined, "API rate limit already exceeded");
		expect(describeFailure(failure)).toContain("API rate limit already exceeded");
	});

	test("output reported as bytes does not break the message", () => {
		const failure = new CommandFailure("gh exited with status 1", new TextEncoder().encode("boom\n"));
		expect(describeFailure(failure)).toContain("boom");
	});

	test("an error with no captured output renders as itself", () => {
		// Most errors carry nothing captured and must not gain empty parentheses.
		expect(describeFailure(new Error("plain"))).toBe("plain");
	});
});

describe("rate limit detection", () => {
	test.each([
		"unknown owner type",
		"API rate limit exceeded",
		"secondary rate limit",
		"was submitted too quickly",
		"too many requests",
		"quota exceeded",
	])("%s is recognised across REST, GraphQL and gh", (phrase) => {
		expect(isRateLimited(new CommandFailure("gh exited with status 1", phrase))).toBe(true);
	});

	test("an ordinary failure is not a rate limit", () => {
		expect(isRateLimited(new Error("HTTP 500 on GET /repos/o/r/issues"))).toBe(false);
	});
});

describe("board content targets", () => {
	test("an item's repository and number come from its url when it has no repository of its own", () => {
		expect(repoAndNumberFromContent({ number: 42, url: `https://github.com/${REPO}/issues/42` })).toEqual({
			repo: REPO,
			number: 42,
		});
	});

	test("a pull request url names the same target as the issue it is about", () => {
		expect(repoAndNumberFromContent({ url: "https://github.com/o/r/pull/7" })).toEqual({ repo: "o/r", number: 7 });
	});

	test("content that is not a GitHub url cannot be labelled, and says so", () => {
		// A null repository is the signal not to guess: a cross-repository issue is not this run's
		// to write a label on.
		expect(repoAndNumberFromContent({ number: 5, url: "https://example.test/5" })).toEqual({ repo: null, number: 5 });
	});

	test("the issue url is the key every board item is stored under", () => {
		expect(issueUrl("o/r", 9)).toBe("https://github.com/o/r/issues/9");
	});
});

describe("the canonical taxonomy", () => {
	test("the board column order is the repository's, and nothing has drifted", () => {
		// `pipeline-scripts.test.ts` asserts the same list against the Python declaration; this is
		// the assertion that outlives the port.
		expect([...STATUS_NAMES]).toEqual(["Backlog", "ToDo", "In Progress", "Blocked", "Done", "Superseded", "Dropped"]);
	});

	test("the status taxonomy is not hardcoded into the port either", () => {
		const source = readFileSync(join(import.meta.dir, "..", "..", "src", "board", "taxonomy.ts"), "utf8");
		expect(source).toContain("@darkfactory/protocol/workflow");
	});
});
