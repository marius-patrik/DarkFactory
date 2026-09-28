import { describe, expect, test } from "bun:test";
import {
	type CommentDecision,
	commentActor,
	eventRepository,
	INTAKE_ACTIONS,
	routeIssueCommentEvent,
	routeIssuesEvent,
	routeRepositoryDispatch,
	routeReviewCommentEvent,
} from "../../src/pipeline/dispatch.ts";

/** A decision carrying nothing but what every caller already knows. */
const NO_COMMAND: CommentDecision = { allowedApprover: true };

/** The failure body the reporter writes, so the effect identity resolves. */
const FAILURE_BODY = "## Pipeline failure: CI\n\n<!-- pipeline-failure: CI -->\n\n- Run id: `3600000001`\n";

describe("routeIssuesEvent: intake fires on opened and on labelled Request", () => {
	test("an opened Request is interpreted", () => {
		expect(routeIssuesEvent({ action: "opened", issue: { number: 7, labels: ["Request"] } })).toEqual({
			kind: "interpret",
			issue: 7,
			ensureRequestLabel: false,
		});
	});

	test("an existing issue enters the pipeline when it is labelled Request", () => {
		// This is why intake is not only `opened`: a repository that already tracks requests as
		// issues can start the pipeline on one that exists.
		expect(
			routeIssuesEvent({ action: "labeled", label: { name: "Request" }, issue: { number: 9, labels: ["Bug"] } }),
		).toEqual({ kind: "interpret", issue: 9, ensureRequestLabel: true });
	});

	test("labelled with any other label does not start a second run", () => {
		// The payload's `label` names the applied label; the issue's own label set cannot, or adding
		// any second label to a live Request would re-enter the pipeline.
		expect(
			routeIssuesEvent({ action: "labeled", label: { name: "area:ci" }, issue: { number: 9, labels: ["Request"] } }),
		).toEqual({ kind: "ignore", reason: "unrelated-label" });
	});

	test("the applied label is matched case-insensitively", () => {
		expect(routeIssuesEvent({ action: "labeled", label: "request", issue: { number: 9, labels: [] } }).kind).toBe(
			"interpret",
		);
	});
});

test("intake reads both actions, and no others", () => {
	expect([...INTAKE_ACTIONS].sort()).toEqual(["labeled", "opened"]);
	expect(routeIssuesEvent({ action: "reopened", issue: { number: 1 } })).toEqual({
		kind: "ignore",
		reason: "not-an-intake-action",
	});
	expect(routeIssuesEvent({ action: "closed", issue: { number: 1 } })).toEqual({
		kind: "ignore",
		reason: "not-an-intake-action",
	});
});

describe("routeIssuesEvent: what intake deliberately does not do", () => {
	test("a Plan issue is left to its parent Request", () => {
		// Interpreting it again asks what a plan means, which is a question nobody posed, and the
		// answer lands on the same issue as the plan that follows moments later.
		expect(routeIssuesEvent({ action: "opened", issue: { number: 4, labels: ["Plan"] } })).toEqual({
			kind: "ignore",
			reason: "plan-issue",
		});
	});

	test("an event with no issue number reaches nothing", () => {
		expect(routeIssuesEvent({ action: "opened", issue: { labels: [] } })).toEqual({
			kind: "ignore",
			reason: "no-issue-number",
		});
	});

	test("a failure report is interpreted only after this run wins its effect identity", () => {
		const route = routeIssuesEvent({ action: "opened", issue: { number: 5, body: FAILURE_BODY } });
		expect(route).toEqual({ kind: "interpret", issue: 5, ensureRequestLabel: true, claim: "CI@3600000001" });
	});

	test("an ordinary issue asks for the Request label rather than aborting the run", () => {
		expect(routeIssuesEvent({ action: "opened", issue: { number: 6, labels: ["Bug"] } })).toEqual({
			kind: "interpret",
			issue: 6,
			ensureRequestLabel: true,
		});
	});
});

describe("routeIssueCommentEvent", () => {
	test("a recurrence comment is taken before the bot check, because it is a trigger", () => {
		const route = routeIssueCommentEvent(
			{
				action: "created",
				issue: { number: 5, body: FAILURE_BODY },
				comment: {
					body: "Failed again: https://github.com/o/r/actions/runs/3600000009",
					user: { login: "github-actions[bot]" },
				},
			},
			{ ...NO_COMMAND, claimWon: true },
		);
		expect(route).toEqual({
			kind: "interpret",
			issue: 5,
			claim: "CI@https://github.com/o/r/actions/runs/3600000009",
		});
	});

	test("a recurrence of the run already being repaired is claimed, not dispatched again", () => {
		const route = routeIssueCommentEvent(
			{
				action: "created",
				issue: { number: 5, body: FAILURE_BODY },
				comment: { body: "Failed again: https://x/2", user: { login: "github-actions[bot]" } },
			},
			{ ...NO_COMMAND, claimWon: false },
		);
		expect(route).toEqual({ kind: "ignore", reason: "claim-lost" });
	});

	test("a bot comment is ignored", () => {
		expect(
			routeIssueCommentEvent(
				{
					action: "created",
					issue: { number: 7, labels: ["Request"] },
					comment: { body: "<!-- darkfactory-agent -->\nInterpretation", user: { login: "someone" } },
				},
				NO_COMMAND,
			),
		).toEqual({ kind: "ignore", reason: "bot-or-agent" });
	});

	test("ordinary chatter on a failure issue starts no repair, but a resume still unblocks it", () => {
		const chatter = routeIssueCommentEvent(
			{
				action: "created",
				issue: { number: 5, body: FAILURE_BODY },
				comment: { body: "looks red again", user: { login: "marius-patrik" } },
			},
			NO_COMMAND,
		);
		expect(chatter).toEqual({ kind: "ignore", reason: "failure-chatter" });
		const resume = routeIssueCommentEvent(
			{
				action: "created",
				issue: { number: 5, body: FAILURE_BODY },
				comment: { body: "/df resume", user: { login: "marius-patrik" } },
			},
			{ ...NO_COMMAND, command: "resume" },
		);
		expect(resume).toEqual({ kind: "resume", issue: 5, isPr: false });
	});

	test("an approval from an allowed author resumes the item", () => {
		expect(
			routeIssueCommentEvent(
				{
					action: "created",
					issue: { number: 7, labels: ["Request"] },
					comment: { body: "/df approve", user: { login: "marius-patrik" } },
				},
				{ ...NO_COMMAND, command: "approve" },
			),
		).toEqual({ kind: "resume", issue: 7, isPr: false });
	});

	test("a stranger's command is feedback, never a gate transition", () => {
		expect(
			routeIssueCommentEvent(
				{
					action: "created",
					issue: { number: 7, labels: ["Request"] },
					comment: { body: "/df approve", user: { login: "a-stranger" } },
				},
				{ allowedApprover: false, command: "approve" },
			),
		).toEqual({ kind: "respond", issue: 7, isPr: false, body: "/df approve", postCommandHint: false });
	});

	describe("a rejection routes back to the stage that owns the gate", () => {
		const reject = (issue: Record<string, unknown>, decision: Partial<CommentDecision>) =>
			routeIssueCommentEvent(
				{
					action: "created",
					issue: issue as never,
					comment: { body: "/df reject too vague", user: { login: "marius-patrik" } },
				},
				{ ...NO_COMMAND, command: "reject", feedback: "too vague", ...decision },
			);

		test("a Request with no plan yet re-runs the interpretation", () => {
			expect(reject({ number: 7, labels: ["Request"] }, { hasPlan: false })).toEqual({
				kind: "rerun",
				stage: "interpret",
				issue: 7,
				feedback: "too vague",
				plan: 7,
				request: 7,
			});
		});

		test("a Request with a posted plan re-runs planning", () => {
			// One issue carries both gates, so which one is rejected is read back from the issue.
			expect(reject({ number: 7, labels: ["Request"] }, { hasPlan: true })).toEqual({
				kind: "rerun",
				stage: "plan",
				issue: 7,
				feedback: "too vague",
				plan: 7,
				request: 7,
			});
		});

		test("a Plan issue re-runs planning against its parent Request", () => {
			expect(reject({ number: 8, labels: ["Plan"] }, { request: 7 })).toEqual({
				kind: "rerun",
				stage: "plan",
				issue: 8,
				feedback: "too vague",
				plan: 8,
				request: 7,
			});
		});

		test("a Plan with no discoverable parent is answered instead of re-planned", () => {
			expect(reject({ number: 8, labels: ["Plan"] }, {})).toEqual({
				kind: "respond",
				issue: 8,
				isPr: false,
				body: "/df reject too vague",
				postCommandHint: false,
			});
		});

		test("a pull request rejection becomes a revision on its branch", () => {
			expect(reject({ number: 9, pull_request: {} }, { plan: 8, request: 7 })).toEqual({
				kind: "rerun",
				stage: "pr-feedback-fix",
				issue: 9,
				feedback: "too vague",
				plan: 8,
				request: 7,
			});
		});

		test("a pull request with no resolvable Plan is answered instead", () => {
			expect(reject({ number: 9, pull_request: {} }, {})).toEqual({
				kind: "respond",
				issue: 9,
				isPr: true,
				body: "/df reject too vague",
				postCommandHint: false,
			});
		});

		test("an issue that is neither Request nor Plan is only answered", () => {
			expect(reject({ number: 10, labels: ["Bug"] }, {})).toEqual({
				kind: "respond",
				issue: 10,
				isPr: false,
				body: "/df reject too vague",
				postCommandHint: false,
			});
		});
	});

	test("free text on a gated issue is answered, and the command hint posts at most once", () => {
		expect(
			routeIssueCommentEvent(
				{
					action: "created",
					issue: { number: 7, labels: ["Request"] },
					comment: { body: "I think you should approve this", user: { login: "marius-patrik" } },
				},
				{ ...NO_COMMAND, looksLikeCommand: true },
			),
		).toEqual({
			kind: "respond",
			issue: 7,
			isPr: false,
			body: "I think you should approve this",
			postCommandHint: true,
		});
	});

	test("free text on an ungated issue gets no hint, because nothing there is gated", () => {
		expect(
			routeIssueCommentEvent(
				{
					action: "created",
					issue: { number: 10, labels: ["Bug"] },
					comment: { body: "maybe approve?", user: { login: "marius-patrik" } },
				},
				{ ...NO_COMMAND, looksLikeCommand: true },
			),
		).toEqual({ kind: "respond", issue: 10, isPr: false, body: "maybe approve?", postCommandHint: false });
	});

	test("an edited or deleted comment is not a created one", () => {
		expect(
			routeIssueCommentEvent({ action: "edited", issue: { number: 7 }, comment: { body: "x" } }, NO_COMMAND),
		).toEqual({ kind: "ignore", reason: "not-created" });
	});
});

describe("routeReviewCommentEvent", () => {
	const pr = { number: 9, user: { login: "marius-patrik" } };

	test("a rejection that resolves to a Plan becomes a revision on the pull request's branch", () => {
		expect(
			routeReviewCommentEvent(
				{
					action: "created",
					pull_request: pr,
					comment: { body: "/df reject still leaks", user: { login: "marius-patrik" } },
				},
				{ ...NO_COMMAND, command: "reject", feedback: "still leaks", plan: 8, request: 7 },
			),
		).toEqual({ kind: "rerun", stage: "pr-feedback-fix", pr: 9, feedback: "still leaks", plan: 8, request: 7 });
	});

	test("an approval resumes the pull request", () => {
		expect(
			routeReviewCommentEvent(
				{ action: "created", pull_request: pr, comment: { body: "/df approve", user: { login: "marius-patrik" } } },
				{ ...NO_COMMAND, command: "approve" },
			),
		).toEqual({ kind: "resume", pr: 9 });
	});

	test("a plain review comment is only answered", () => {
		expect(
			routeReviewCommentEvent(
				{
					action: "created",
					pull_request: pr,
					comment: { body: "nit: rename this", user: { login: "marius-patrik" } },
				},
				NO_COMMAND,
			),
		).toEqual({ kind: "respond", pr: 9, body: "nit: rename this" });
	});

	test("a bot review comment is ignored", () => {
		expect(
			routeReviewCommentEvent(
				{
					action: "created",
					pull_request: pr,
					comment: { body: "<!-- darkfactory-agent -->", user: { login: "github-actions[bot]" } },
				},
				NO_COMMAND,
			),
		).toEqual({ kind: "ignore", reason: "bot-or-agent" });
	});

	test("a stranger's review command is answered, not acted on", () => {
		expect(
			routeReviewCommentEvent(
				{ action: "created", pull_request: pr, comment: { body: "/df reject", user: { login: "a-stranger" } } },
				{ allowedApprover: false, command: "reject", plan: 8 },
			),
		).toEqual({ kind: "respond", pr: 9, body: "/df reject" });
	});
});

describe("routeRepositoryDispatch", () => {
	test.each(["self-review", "self-review-fix", "pr-feedback-fix"] as const)("routes the %j stage", (stage) => {
		expect(routeRepositoryDispatch({ stage })).toMatchObject({ kind: "run", stage });
	});

	test("a dispatch that omits the iteration is the first review", () => {
		expect(routeRepositoryDispatch({ stage: "self-review" })).toEqual({
			kind: "run",
			stage: "self-review",
			iteration: 1,
		});
		expect(routeRepositoryDispatch({ stage: "self-review-fix", iteration: 4 })).toEqual({
			kind: "run",
			stage: "self-review-fix",
			iteration: 4,
		});
	});

	test("resume is a stage of its own", () => {
		expect(routeRepositoryDispatch({ stage: "resume", item: 7 })).toEqual({ kind: "run", stage: "resume" });
	});

	test("a stage this pipeline does not run is ignored rather than guessed at", () => {
		expect(routeRepositoryDispatch({ stage: "deploy" })).toEqual({ kind: "ignore", reason: "unknown-stage" });
		expect(routeRepositoryDispatch({})).toEqual({ kind: "ignore", reason: "unknown-stage" });
	});
});

describe("eventRepository", () => {
	test("reads the slug from the payload's repository object", () => {
		expect(eventRepository({ full_name: "o/r" })).toBe("o/r");
	});

	test("accepts a bare string repository", () => {
		expect(eventRepository("o/r")).toBe("o/r");
	});

	test("invents no repository when the event names none", () => {
		// This used to fall back to `marius-patrik/DarkFactory`, this repository's own slug, baked
		// into a pipeline that is installed into other repositories. A run that could not name its
		// target resolved to DarkFactory and reported success against it. It names nothing now, and
		// the caller supplies the environment's slug or fails.
		expect(eventRepository(undefined)).toBe("");
		expect(eventRepository({})).toBe("");
		expect(eventRepository("")).toBe("");
		expect(eventRepository(undefined, "env/slug")).toBe("env/slug");
	});
});

test("a comment's identity is read defensively, because the payload nests it", () => {
	expect(commentActor({ user: { login: "a", type: "User" }, author_association: "OWNER" })).toEqual({
		login: "a",
		authorAssociation: "OWNER",
		userType: "User",
	});
	expect(commentActor({})).toEqual({ login: "", authorAssociation: "", userType: "" });
});
