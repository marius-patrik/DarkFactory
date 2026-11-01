import { describe, expect, test } from "bun:test";
import { HINT_MARKER } from "../../src/approvals/commands.ts";
import { COMMAND_HINT_BODY } from "../../src/pipeline/dispatch-effects.ts";
import { type DispatchEventContext, dispatchEvent, normalisePayload } from "../../src/pipeline/event.ts";
import { CLAIM_PREFIX, CLAIM_SUFFIX } from "../../src/pipeline/failure-effect.ts";
import { PLAN_MARKER } from "../../src/pipeline/plan-scope.ts";
import { handlerContext, labelChanges, operations, postedComments, type RecordingIo, recordingIo } from "./handlers.ts";

const REPO = "marius-patrik/DarkFactory";
const PR = 1160;
const PLAN = 1150;
const REQUEST = 1148;

/** A `repository` object as every GitHub webhook payload carries it. */
const REPOSITORY = { full_name: REPO };

/** A failure issue body, as the reporter writes it: workflow, run id, both in the body. */
const FAILURE_BODY = [
	"<!-- pipeline-failure: ci.yml -->",
	"## The pipeline is red",
	"",
	"- Run id: `12345678901`",
	"",
	"The gate suite failed on develop.",
].join("\n");

/** The run a recurrence names, which is half of its effect identity. */
const RECURRENCE_RUN = "https://github.com/marius-patrik/DarkFactory/actions/runs/987654321";

/** A `Failed again` comment, which is how a recurrence is reported rather than a second issue. */
const FAILED_AGAIN = `Failed again: ${RECURRENCE_RUN}`;

/** An `issues.opened` payload for a Request intake. */
function openedIssue(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		action: "opened",
		repository: REPOSITORY,
		issue: { number: REQUEST, body: "It stalls.", labels: [] },
		...overrides,
	};
}

/** An `issue_comment` payload, with the defaults a real comment carries. */
function issueComment(
	body: string,
	issue: Record<string, unknown> = {},
	comment: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		action: "created",
		repository: REPOSITORY,
		issue: {
			number: REQUEST,
			body: "It stalls.",
			labels: [{ name: "Request" }],
			user: { login: "marius-patrik" },
			...issue,
		},
		comment: { body, user: { login: "marius-patrik", type: "User" }, author_association: "OWNER", ...comment },
	};
}

/**
 * A Plan body naming its parent Request.
 *
 * The plain `Parent Request: #N` form, not the bolded `**Parent Request**: #N` one the plan *comment*
 * uses. The Python's body pattern does not allow markdown emphasis between the phrase and the
 * number, and only its comment pattern does - which is why a Plan's parent is found in a comment or
 * in a body the pipeline wrote itself, and not in a bolded body.
 */
const PLAN_WITH_PARENT = "## Scope\n- `a.ts`\nParent Request: #1148";

/** A pull request the comment was left on, which is what makes it a PR conversation. */
const PULL_REQUEST = { number: PR, pull_request: { html_url: `https://github.com/${REPO}/pull/${PR}` } };

/** What a {@link dispatcher} recorded the four unported stages being asked to do. */
interface StageCalls {
	selfReview: unknown[];
	selfReviewFix: unknown[];
	prFeedbackFix: unknown[];
	resume: unknown[];
}

/**
 * A `DispatchEventContext` wired to a recording port, a scripted agent and stage doubles that
 * record what they were asked to run.
 *
 * @param io - The recording port, which also serves the pull requests the resolvers read.
 * @param answers - What the agent answers, in call order.
 * @returns The context, the agent double, the reported lines, and what the stages were asked to do.
 */
function dispatcher(io: RecordingIo, answers: readonly string[] = []) {
	const base = handlerContext({ io: io.io, answers, repo: REPO, developmentBranch: "develop" });
	const stages: StageCalls = { selfReview: [], selfReviewFix: [], prFeedbackFix: [], resume: [] };
	const context: DispatchEventContext = {
		...base.context,
		stages: {
			selfReview: async (payload) => {
				stages.selfReview.push(payload);
			},
			selfReviewFix: async (payload) => {
				stages.selfReviewFix.push(payload);
			},
			prFeedbackFix: async (payload) => {
				stages.prFeedbackFix.push(payload);
			},
			resume: async (payload) => {
				stages.resume.push(payload);
			},
		},
		board: () => undefined,
		environment: { workspaceDir: "/workspace", stateDir: "/workspace", repository: REPO },
	};
	return { context, stages, agent: base.agent, reported: base.reported };
}

describe("dispatchEvent: an event that is not there", () => {
	test("a missing payload file is reported and reaches nothing", async () => {
		// A `dispatch` run whose `GITHUB_EVENT_PATH` is unset used to be a red build for a payload
		// that was never sent. `undefined` is the only way the caller can say "not there", because a
		// file holding `null` is a payload that reads as nothing.
		const io = recordingIo();
		const { context, reported } = dispatcher(io);

		const outcome = await dispatchEvent(context, { eventPath: "", eventName: "issues" });

		expect(outcome).toEqual({ kind: "ignored", reason: "event-not-found" });
		expect(reported).toEqual(["Event path  not found."]);
		expect(io.calls).toEqual([]);
	});

	test("an event name this pipeline does not handle reaches nothing", async () => {
		const io = recordingIo();
		const { context } = dispatcher(io);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/event.json",
			eventName: "push",
			payload: { repository: REPOSITORY, ref: "refs/heads/develop" },
		});

		expect(outcome).toEqual({ kind: "ignored", reason: "unsupported-event" });
		expect(io.calls).toEqual([]);
	});

	test("a malformed payload reaches nothing rather than acting on an empty object", async () => {
		// A pipeline-failure issue body read from a truncated file looks like an ordinary issue, and
		// interpreting an ordinary issue is a mutation. Refusing to act is the safe reading of a file
		// the pipeline could not parse.
		const io = recordingIo();
		const { context } = dispatcher(io);

		for (const payload of ["not json at all", "[1, 2, 3]", "42", null]) {
			expect(normalisePayload(payload)).toEqual({});
		}
		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/event.json",
			eventName: "issues",
			payload: "not json at all",
		});
		expect(outcome).toEqual({ kind: "ignored", reason: "not-an-intake-action" });
		expect(io.calls).toEqual([]);
	});

	test("a payload delivered as a JSON string is read, because a workflow can pipe one", async () => {
		const io = recordingIo({ [REQUEST]: { title: "Request: it stalls", body: "It stalls." } });
		const { context } = dispatcher(io, ["## Summary\nIt stalls."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/event.json",
			eventName: "issues",
			payload: JSON.stringify(openedIssue()),
		});

		expect(outcome.kind).toBe("handled");
		expect(operations(io)).toContain("addComment");
	});

	test("the repository falls back to the environment when the payload names none", async () => {
		const io = recordingIo({ [REQUEST]: { title: "Request: it stalls", body: "It stalls." } });
		const { context } = dispatcher(io, ["## Summary\nIt stalls."]);

		await dispatchEvent(context, {
			eventPath: "/tmp/event.json",
			eventName: "issues",
			payload: { action: "opened", issue: { number: REQUEST } },
		});

		expect(io.calls[0]?.args[0]).toBe(REPO);
	});
});

describe("dispatchEvent: intake on an issues event", () => {
	test("an unlabelled issue is labelled Request and then interpreted", async () => {
		// The label goes on before the agent runs, so the issue is routed by label while the
		// interpretation is still being written.
		const io = recordingIo({ [REQUEST]: { title: "Request: it stalls", body: "It stalls." } });
		const { context, reported } = dispatcher(io, ["## Summary\nIt stalls."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issues",
			payload: openedIssue(),
		});

		expect(operations(io)).toEqual(["changeLabels", "issueView", "changeLabels", "addComment"]);
		expect(reported).toContain(`Auto-labeled issue #${REQUEST} as Request`);
		expect(outcome.kind).toBe("handled");
	});

	test("a Plan issue is not interpreted, because its parent Request already was", async () => {
		const io = recordingIo();
		const { context, reported } = dispatcher(io);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issues",
			payload: openedIssue({ issue: { number: PLAN, body: "The plan.", labels: [{ name: "Plan" }] } }),
		});

		expect(outcome).toEqual({ kind: "ignored", reason: "plan-issue" });
		expect(reported).toEqual([`Issue #${PLAN} is a Plan; interpretation belongs to its parent Request.`]);
		expect(io.calls).toEqual([]);
	});

	test("a labelled event only enters on the intake label, not on any second label", async () => {
		// `labeled` carries the issue's whole label set, so keying on the set re-enters the pipeline
		// every time a second label lands on a live Request and starts a duplicate run.
		const io = recordingIo();
		const { context } = dispatcher(io);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issues",
			payload: openedIssue({
				action: "labeled",
				label: { name: "area:agents" },
				issue: { number: REQUEST, body: "It stalls.", labels: [{ name: "Request" }] },
			}),
		});

		expect(outcome).toEqual({ kind: "ignored", reason: "unrelated-label" });
		expect(io.calls).toEqual([]);
	});

	test("a label that cannot be applied is reported and the issue is still interpreted", async () => {
		const io = recordingIo(
			{ [REQUEST]: { title: "Request: it stalls", body: "It stalls." } },
			{ changeLabels: new Error("HTTP 403: Resource not accessible by integration") },
		);
		const { context, reported } = dispatcher(io, ["## Summary\nIt stalls."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issues",
			payload: openedIssue(),
		});

		expect(outcome.kind).toBe("handled");
		expect(reported).toContain("Could not label #1148 as Request: HTTP 403: Resource not accessible by integration");
		expect(reported).not.toContain(`Auto-labeled issue #${REQUEST} as Request`);
	});
});

describe("dispatchEvent: a failure report", () => {
	test("the opening event elects one repair, and the run that wins it interprets the issue", async () => {
		const io = recordingIo(
			{ [REQUEST]: { title: "Failure: the gate suite is red", body: FAILURE_BODY, commentIds: [900] } },
			{ prNumberSequence: [] },
		);
		const { context, reported } = dispatcher(io, ["## Summary\nThe suite is red."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issues",
			payload: openedIssue({ issue: { number: REQUEST, body: FAILURE_BODY, labels: [] } }),
		});

		const claim = io.calls.find((call) => call.op === "addComment");
		expect(claim?.args[2]).toBe(`${CLAIM_PREFIX}ci.yml@12345678901${CLAIM_SUFFIX}`);
		expect(reported).toContain("Claimed the repair of ci.yml@12345678901 on issue #1148.");
		expect(outcome.kind).toBe("handled");
	});

	test("a run that lost the election does not interpret, so two runs cannot both repair", async () => {
		// Two claim comments with different ids mean a competing run got there first. This run's own
		// claim is the highest id, and the lowest wins.
		const competingClaim = `${CLAIM_PREFIX}ci.yml@12345678901${CLAIM_SUFFIX}`;
		const io = recordingIo({
			[REQUEST]: {
				title: "Failure: the gate suite is red",
				body: FAILURE_BODY,
				comments: [competingClaim, competingClaim],
				commentIds: [100, 101],
			},
		});
		const { context, reported } = dispatcher(io, ["## Summary\nThe suite is red."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issues",
			payload: openedIssue({ issue: { number: REQUEST, body: FAILURE_BODY, labels: [] } }),
		});

		expect(outcome).toEqual({ kind: "ignored", reason: "claim-lost" });
		expect(reported).toContain(
			"Another run already claimed the repair of ci.yml@12345678901 (claim 100, this run is 101); " +
				"not dispatching a second repair.",
		);
		// Nothing was interpreted: the interpretation is the mutation the election bounds.
		expect(operations(io)).not.toContain("issueView");
	});

	test("a claim that cannot be posted does not dispatch, because a claim that was not made is not a claim", async () => {
		const io = recordingIo(
			{ [REQUEST]: { title: "Failure: …", body: FAILURE_BODY } },
			{ addComment: new Error("HTTP 410: gone") },
		);
		const { context, reported } = dispatcher(io, ["## Summary"]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issues",
			payload: openedIssue({ issue: { number: REQUEST, body: FAILURE_BODY, labels: [] } }),
		});

		expect(outcome).toEqual({ kind: "ignored", reason: "claim-lost" });
		expect(reported).toContain("Could not claim the repair of ci.yml@12345678901: HTTP 410: gone");
	});

	test("a claim that cannot be read back dispatches, because a mute is the failure being removed", async () => {
		const io = recordingIo(
			{ [REQUEST]: { title: "Failure: …", body: FAILURE_BODY } },
			{ issueComments: new Error("HTTP 502: bad gateway") },
		);
		const { context, reported } = dispatcher(io, ["## Summary\nThe suite is red."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issues",
			payload: openedIssue({ issue: { number: REQUEST, body: FAILURE_BODY, labels: [] } }),
		});

		expect(reported).toContain("Could not read the claims on #1148: HTTP 502: bad gateway");
		expect(outcome.kind).toBe("handled");
	});

	test("a `Failed again` comment re-enters the repair, and is read before the bot check", async () => {
		// The reporter comments `Failed again` on the still-open issue rather than filing a second
		// one, so this is the only way a red build that came back after a repair enters again.
		const io = recordingIo(
			{
				[REQUEST]: {
					title: "Failure: the gate suite is red",
					body: FAILURE_BODY,
					commentIds: [900],
				},
			},
			{ prNumberSequence: [] },
		);
		const { context, reported } = dispatcher(io, ["## Summary\nThe suite is red."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment(FAILED_AGAIN, { body: FAILURE_BODY }, { user: { login: "github-actions", type: "Bot" } }),
		});

		expect(reported).toContain(`#${REQUEST} failed again as ci.yml@${RECURRENCE_RUN}; dispatching the repair.`);
		expect(outcome).toEqual({ kind: "handled", stage: "interpret", detail: `interpreted issue #${REQUEST}` });
	});

	test("a recurrence this run lost the election for is ignored", async () => {
		const competingClaim = `${CLAIM_PREFIX}ci.yml@${RECURRENCE_RUN}${CLAIM_SUFFIX}`;
		const io = recordingIo({
			[REQUEST]: {
				title: "Failure: …",
				body: FAILURE_BODY,
				comments: [competingClaim, competingClaim],
				commentIds: [50, 51],
			},
		});
		const { context, agent, reported } = dispatcher(io, ["## Summary"]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment(FAILED_AGAIN, { body: FAILURE_BODY }, { user: { login: "github-actions", type: "Bot" } }),
		});

		expect(outcome).toEqual({ kind: "ignored", reason: "claim-lost" });
		expect(reported).toContain(`#${REQUEST} failed again as ci.yml@${RECURRENCE_RUN}; another run is repairing it.`);
		expect(agent.requests).toEqual([]);
	});

	test("ordinary chatter on a failure issue starts no second repair", async () => {
		const io = recordingIo({
			[REQUEST]: { title: "Failure: …", body: FAILURE_BODY, comments: ["still red on develop"] },
		});
		const { context, agent, reported } = dispatcher(io, ["## Summary"]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("still red on develop", { body: FAILURE_BODY }),
		});

		expect(outcome).toEqual({ kind: "ignored", reason: "failure-chatter" });
		expect(reported).toEqual([`Skipping ordinary comment on failure issue #${REQUEST}.`]);
		expect(agent.requests).toEqual([]);
	});

	test("`resume` on a failure issue unblocks it and answers the human, rather than restarting the repair", async () => {
		// The repair is elected by effect identity, so resuming it here would start a second one. What
		// the human wants is the item back in play, and an answer.
		const io = recordingIo(
			{ [REQUEST]: { title: "Failure: …", body: FAILURE_BODY, comments: ["still red"] } },
			{ prNumberSequence: [] },
		);
		const { context, stages, agent } = dispatcher(io, ["The repair is in progress."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("/df resume", { body: FAILURE_BODY }),
		});

		expect(outcome).toEqual({ kind: "handled", stage: "respond", detail: `unblocked and resumed #${REQUEST}` });
		expect(labelChanges(io)).toEqual([{ number: REQUEST, labels: ["Blocked"], add: false }]);
		expect(agent.requests).toHaveLength(1);
		expect(stages.resume).toEqual([]);
	});
});

describe("dispatchEvent: comments that are not commands", () => {
	test("a plain comment on a Request is answered", async () => {
		const io = recordingIo({ [REQUEST]: { title: "Request: it stalls", body: "It stalls." } });
		const { context, agent } = dispatcher(io, ["Thanks - looking now."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("any update on this?"),
		});

		expect(outcome.kind).toBe("handled");
		expect(agent.requests[0]?.kind).toBe("chat");
		expect(agent.requests[0]?.prompt).toContain('"any update on this?"');
	});

	test("a bot's own comment is not answered, which is how a self-reply loop starts", async () => {
		const io = recordingIo();
		const { context, agent, reported } = dispatcher(io, ["Sure."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("I have updated the plan.", {}, { user: { login: "github-actions[bot]", type: "Bot" } }),
		});

		expect(outcome).toEqual({ kind: "ignored", reason: "bot-or-agent" });
		expect(reported).toEqual([`Skipping comment on #${REQUEST} authored by bot/agent (github-actions[bot]).`]);
		expect(agent.requests).toEqual([]);
	});

	test("the agent's own branding is skipped even from a human-looking login", async () => {
		const io = recordingIo();
		const { context } = dispatcher(io);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("<!-- darkfactory-agent -->\n### DarkFactory Agent Interpretation\n\nIt stalls."),
		});

		expect(outcome).toEqual({ kind: "ignored", reason: "bot-or-agent" });
	});

	test("free text that merely mentions a command is answered, and hinted at once", async () => {
		const io = recordingIo({ [REQUEST]: { title: "Request: it stalls", body: "It stalls.", comments: [] } });
		const { context } = dispatcher(io, ["I read that as feedback, not a decision."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("I would approve of this direction, but not yet"),
		});

		expect(outcome.kind).toBe("handled");
		// The hint goes on before the answer: a reader who has just been told their comment is not a
		// command should not have to scroll past the reply that treated it as one.
		expect(postedComments(io)[0]).toBe(COMMAND_HINT_BODY);
		expect(postedComments(io)[0]).toContain(HINT_MARKER);
		expect(postedComments(io)).toHaveLength(2);
	});

	test("the hint is not posted twice", async () => {
		const io = recordingIo({
			[REQUEST]: { title: "Request: it stalls", body: "It stalls.", comments: [COMMAND_HINT_BODY] },
		});
		const { context } = dispatcher(io, ["Noted."]);

		await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("I would approve of this direction, but not yet"),
		});

		// The comment itself is still answered; only the repeated hint is suppressed.
		expect(postedComments(io).filter((body) => body.includes(HINT_MARKER))).toEqual([]);
		expect(postedComments(io)).toHaveLength(1);
	});

	test("a comment that is not even about a gate is not hinted at", async () => {
		const io = recordingIo({ [REQUEST]: { title: "Request: it stalls", body: "It stalls.", comments: [] } });
		const { context } = dispatcher(io, ["Looking."]);

		await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("any update on this?"),
		});

		expect(postedComments(io).some((body) => body.includes(HINT_MARKER))).toBe(false);
	});
});

describe("dispatchEvent: gate commands", () => {
	test("`approve` resumes the item, and the resume is handed the item and its surface", async () => {
		const io = recordingIo();
		const { context, stages, reported } = dispatcher(io);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("/df approve"),
		});

		expect(outcome).toEqual({ kind: "dispatched", stage: "resume" });
		expect(stages.resume).toEqual([{ stage: "resume", item: REQUEST, is_pr: false }]);
		expect(reported).toContain(`Approval comment on #${REQUEST} from @marius-patrik.`);
	});

	test("a stranger's `approve` is answered as feedback, and the run says why it did nothing", async () => {
		// A stranger's approve is feedback, never a gate transition - implementing a plan because
		// anyone on the internet said so is the failure this guard exists to prevent.
		const io = recordingIo({ [REQUEST]: { title: "Request: it stalls", body: "It stalls." } });
		const { context, stages, agent, reported } = dispatcher(io, ["Thanks for the feedback."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment(
				"/df approve",
				{},
				{ user: { login: "somebody-else", type: "User" }, author_association: "NONE" },
			),
		});

		expect(outcome.kind).toBe("handled");
		expect(stages.resume).toEqual([]);
		expect(agent.requests[0]?.kind).toBe("chat");
		expect(reported).toContain(
			`Ignoring approve command on #${REQUEST} from @somebody-else: not the author nor OWNER/MEMBER/COLLABORATOR.`,
		);
	});

	test("the issue's own author may approve with no association at all", async () => {
		// `author_association` is GitHub's own relationship, and a Request's author has none by
		// definition. Keying on it alone means the person who filed the issue can never approve it.
		const io = recordingIo();
		const { context, stages } = dispatcher(io);

		await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment(
				"approve",
				{ user: { login: "a-contributor" } },
				{ user: { login: "a-contributor", type: "User" }, author_association: "NONE" },
			),
		});

		expect(stages.resume).toEqual([{ stage: "resume", item: REQUEST, is_pr: false }]);
	});

	test("a rejected Request with a plan posted re-plans, with the feedback folded in", async () => {
		const io = recordingIo(
			{
				[REQUEST]: {
					title: "Request: it stalls",
					body: "It stalls.",
					comments: [`<!-- darkfactory-agent -->\n${PLAN_MARKER}\n### Implementation Plan\n\n## Scope`],
				},
			},
			{ prNumberSequence: [] },
		);
		const { context, agent, reported } = dispatcher(io, ["## Scope\nThe gate."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("/df reject say which test proves it"),
		});

		expect(outcome.kind).toBe("handled");
		expect(agent.requests[0]?.kind).toBe("plan");
		expect(agent.requests[0]?.prompt).toContain('"say which test proves it"');
		expect(reported).toContain(`Rejection comment on #${REQUEST} from @marius-patrik.`);
	});

	test("a rejected Request with no plan re-interprets instead", async () => {
		// One issue carries both gates, so which one a rejection answers is read back from the issue:
		// planning twice wastes a run, and approving a plan nobody posted stalls the pipeline.
		const io = recordingIo({ [REQUEST]: { title: "Request: it stalls", body: "It stalls.", comments: [] } });
		const { context, agent } = dispatcher(io, ["## Summary\nRe-read."]);

		await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("/df reject the scope is wrong"),
		});

		expect(agent.requests[0]?.kind).toBe("classify");
		expect(agent.requests[0]?.prompt).toContain('"the scope is wrong"');
	});

	test("a rejected Plan issue re-plans against the parent Request it names", async () => {
		const io = recordingIo(
			{
				[PLAN]: { title: "Plan: it stalls", body: PLAN_WITH_PARENT, comments: [] },
				[REQUEST]: { title: "Request: the self-review loop stalls", body: "The digest repeats." },
			},
			{ prNumberSequence: [] },
		);
		const { context, agent } = dispatcher(io, ["## Scope\nThe gate."]);

		await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("/df reject narrow it", {
				number: PLAN,
				body: PLAN_WITH_PARENT,
				labels: [{ name: "Plan" }],
			}),
		});

		expect(agent.requests[0]?.kind).toBe("plan");
		// The plan is read from the parent Request and posted on the Plan issue, so the prompt names
		// the Request and the number is not the issue the comment was on.
		expect(agent.requests[0]?.prompt).toContain(`Implementation Plan for Request #${REQUEST}`);
		expect(agent.requests[0]?.prompt).toContain("The digest repeats.");
	});

	test("a rejected Plan with no discoverable parent is answered rather than guessed at", async () => {
		const io = recordingIo({ [PLAN]: { title: "Plan: it stalls", body: "## Scope\n- `a.ts`", comments: [] } });
		const { context, agent, reported } = dispatcher(io, ["Which Request is this for?"]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("/df reject narrow it", {
				number: PLAN,
				body: "## Scope\n- `a.ts`",
				labels: [{ name: "Plan" }],
			}),
		});

		expect(reported).toContain(`Could not find parent Request for Plan #${PLAN}`);
		expect(agent.requests[0]?.kind).toBe("chat");
		expect(outcome.kind).toBe("handled");
	});

	test("a rejected pull request dispatches a feedback fix against the Plan it implements", async () => {
		// A rejection with feedback becomes a code revision on the pull request's own branch, not a
		// second implementation, because the plan is approved and only the code diverged from it.
		const io = recordingIo(
			{},
			{ prNumberSequence: [] },
			{
				[PR]: {
					body: "## Summary\nCloses #1150",
					comments: [],
					closingIssues: [{ number: PLAN, labels: [{ name: "Plan" }], title: "Plan: it stalls" }],
				},
			},
		);
		const { context, stages } = dispatcher(io);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment(
				"/df reject the test is wrong",
				{ ...PULL_REQUEST, body: "", user: { login: "marius-patrik" } },
				{},
			),
		});

		expect(outcome).toEqual({ kind: "dispatched", stage: "pr-feedback-fix" });
		// The Plan names no discoverable parent, so the Python's `or plan` fallback names the Plan
		// itself as the Request - which is what stops the feedback reaching nothing at all.
		expect(stages.prFeedbackFix[0]).toEqual({
			stage: "pr-feedback-fix",
			pr: PR,
			plan: PLAN,
			request: PLAN,
			feedback: "the test is wrong",
		});
	});

	test("a rejected pull request with no discoverable Plan is answered", async () => {
		const io = recordingIo({}, { prNumberSequence: [] }, { [PR]: { body: "## Summary\nNo links.", comments: [] } });
		const { context, stages, agent } = dispatcher(io, ["Which plan?"]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "issue_comment",
			payload: issueComment("/df reject fix it", { ...PULL_REQUEST, body: "", user: { login: "marius-patrik" } }),
		});

		expect(outcome.kind).toBe("handled");
		expect(stages.prFeedbackFix).toEqual([]);
		expect(agent.requests[0]?.kind).toBe("chat");
	});
});

describe("dispatchEvent: a pull request's own review thread", () => {
	function reviewComment(body: string, comment: Record<string, unknown> = {}): Record<string, unknown> {
		return {
			action: "created",
			repository: REPOSITORY,
			pull_request: { number: PR, user: { login: "marius-patrik" } },
			comment: { body, user: { login: "marius-patrik", type: "User" }, author_association: "OWNER", ...comment },
		};
	}

	test("an approval on a review comment resumes the pull request", async () => {
		const io = recordingIo();
		const { context, stages } = dispatcher(io);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "pull_request_review_comment",
			payload: reviewComment("lgtm"),
		});

		expect(outcome).toEqual({ kind: "dispatched", stage: "resume" });
		expect(stages.resume).toEqual([{ stage: "resume", item: PR, is_pr: true }]);
	});

	test("an approval reads nothing, because it needs no Plan to act", async () => {
		// The Python returned before the plan lookup for an approval. A read here would cost a
		// request on the most common review-comment path and learn nothing.
		const io = recordingIo();
		const { context } = dispatcher(io);

		await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "pull_request_review_comment",
			payload: reviewComment("lgtm"),
		});

		expect(io.calls).toEqual([]);
	});

	test("a rejection dispatches a feedback fix against the Plan, falling back to the Plan as Request", async () => {
		const io = recordingIo(
			{},
			{},
			{
				[PR]: {
					body: "## Summary\nCloses #1150",
					comments: [],
					closingIssues: [{ number: PLAN, labels: [{ name: "Plan" }], title: "Plan: it stalls" }],
				},
			},
		);
		const { context, stages, reported } = dispatcher(io);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "pull_request_review_comment",
			payload: reviewComment("/df reject the test is wrong"),
		});

		expect(outcome).toEqual({ kind: "dispatched", stage: "pr-feedback-fix" });
		// The Plan has no discoverable parent, so the Python's `or plan` fallback names the Plan
		// itself as the Request rather than sending the feedback nowhere.
		expect(stages.prFeedbackFix[0]).toEqual({
			stage: "pr-feedback-fix",
			pr: PR,
			plan: PLAN,
			request: PLAN,
			feedback: "the test is wrong",
		});
		expect(reported).toContain(`PR review comment on #${PR} from @marius-patrik: /df reject the test is wrong...`);
	});

	test("an ordinary review comment is answered on the pull request", async () => {
		const io = recordingIo({}, {}, { [PR]: { body: "", comments: [] } });
		const { context, agent } = dispatcher(io, ["Good catch."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "pull_request_review_comment",
			payload: reviewComment("this line is off by one"),
		});

		expect(outcome.kind).toBe("handled");
		expect(agent.requests[0]?.prompt).toContain("PR #1160");
	});

	test("an edited review comment is not acted on", async () => {
		// Only `created` is a trigger. Acting on `edited` would re-answer a comment a human merely
		// fixed a typo in.
		const io = recordingIo();
		const { context, agent } = dispatcher(io, ["Sure."]);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "pull_request_review_comment",
			payload: { ...reviewComment("lgtm"), action: "edited" },
		});

		expect(outcome).toEqual({ kind: "ignored", reason: "not-created" });
		expect(agent.requests).toEqual([]);
	});
});

describe("dispatchEvent: the pipeline dispatching itself", () => {
	function agentDispatch(clientPayload: unknown): Record<string, unknown> {
		return { action: "agent-dispatch", repository: REPOSITORY, client_payload: clientPayload };
	}

	test("a self-review stage is handed its payload with the iteration defaulted to one", async () => {
		const io = recordingIo();
		const { context, stages } = dispatcher(io);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "repository_dispatch",
			payload: agentDispatch({ stage: "self-review", pr: PR, plan: PLAN, request: REQUEST }),
		});

		expect(outcome).toEqual({ kind: "dispatched", stage: "self-review" });
		expect(stages.selfReview).toEqual([{ stage: "self-review", pr: PR, plan: PLAN, request: REQUEST, iteration: 1 }]);
	});

	test("each stage reaches its own body rather than a shared one", async () => {
		// A dispatcher that called one function for every stage would run a self-review's body with a
		// feedback payload and report success.
		const io = recordingIo();
		const { context, stages } = dispatcher(io);

		await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "repository_dispatch",
			payload: agentDispatch({ stage: "self-review-fix", pr: PR, plan: PLAN, request: REQUEST, iteration: 2 }),
		});
		await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "repository_dispatch",
			payload: agentDispatch({ stage: "pr-feedback-fix", pr: PR, plan: PLAN, feedback: "do it again" }),
		});
		await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "repository_dispatch",
			payload: agentDispatch({ stage: "resume", item: REQUEST, is_pr: false }),
		});

		expect(stages.selfReviewFix).toEqual([
			{ stage: "self-review-fix", pr: PR, plan: PLAN, request: REQUEST, iteration: 2 },
		]);
		expect(stages.prFeedbackFix).toEqual([
			{ stage: "pr-feedback-fix", pr: PR, plan: PLAN, feedback: "do it again", iteration: 1 },
		]);
		expect(stages.resume).toEqual([{ stage: "resume", item: REQUEST, is_pr: false, iteration: 1 }]);
	});

	test("a stage this pipeline does not run is ignored rather than guessed at", async () => {
		const io = recordingIo();
		const { context, stages } = dispatcher(io);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "repository_dispatch",
			payload: agentDispatch({ stage: "triage", pr: PR }),
		});

		expect(outcome).toEqual({ kind: "ignored", reason: "unknown-stage" });
		expect(Object.values(stages).every((calls) => calls.length === 0)).toBe(true);
	});

	test("a repository_dispatch that is not an agent dispatch is ignored", async () => {
		const io = recordingIo();
		const { context, stages } = dispatcher(io);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "repository_dispatch",
			payload: { action: "deploy", repository: REPOSITORY, client_payload: { stage: "self-review" } },
		});

		expect(outcome).toEqual({ kind: "ignored", reason: "unsupported-event" });
		expect(stages.selfReview).toEqual([]);
	});

	test("an agent dispatch with no client payload is ignored, not run against an empty one", async () => {
		// The Python's `payload.get("client_payload", {})` produced `{}`, whose `stage` is `None` and
		// so reached no branch. A stage that guessed an issue number out of that would mutate one.
		const io = recordingIo();
		const { context, stages } = dispatcher(io);

		const outcome = await dispatchEvent(context, {
			eventPath: "/tmp/e.json",
			eventName: "repository_dispatch",
			payload: { action: "agent-dispatch", repository: REPOSITORY },
		});

		expect(outcome).toEqual({ kind: "ignored", reason: "unknown-stage" });
		expect(Object.values(stages).every((calls) => calls.length === 0)).toBe(true);
	});
});
