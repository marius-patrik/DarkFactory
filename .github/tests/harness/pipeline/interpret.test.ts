import { describe, expect, test } from "bun:test";
import { AgentRunFailure } from "../../src/pipeline/handler-context.ts";
import { handleInterpret } from "../../src/pipeline/interpret.ts";
import { AGENT_ERROR_PREFIX, QUOTA_EXHAUSTED_NOTICE } from "../../src/pipeline/signals.ts";
import { handlerContext, labelChanges, operations, postedComments, recordingIo } from "./handlers.ts";

/** A Request as intake finds it: opened, labelled, and about the pipeline's own machinery. */
const REQUEST = {
	title: "Request: self-review loop stalls on a repeated digest",
	body: "The agent harness reports the same review digest twice and the workflow never converges.",
};

const REPO = "marius-patrik/DarkFactory";

describe("handleInterpret: the ordinary path", () => {
	test("reads the issue, labels it, asks the agent, then posts the interpretation", async () => {
		// The order is the Python's: the labels go on before the agent runs, so an issue that is
		// routed by label is routed while the interpretation is being written.
		const recording = recordingIo({ 1148: REQUEST });
		const { context, agent, reported } = handlerContext({ io: recording.io, answers: ["## Summary\nIt stalls."] });

		const outcome = await handleInterpret(context, { issueNumber: 1148, repo: REPO });

		expect(operations(recording)).toEqual(["issueView", "changeLabels", "addComment"]);
		expect(agent.requests).toHaveLength(1);
		expect(agent.requests[0]?.kind).toBe("classify");
		expect(reported).toEqual(["Interpretation posted on issue #1148"]);
		expect(outcome.kind).toBe("posted");
	});

	test("classifies from the title and body together, and applies both labels in one edit", async () => {
		// The Request is about an agent harness failing in a workflow, so the type is the one the
		// body implies and the area is the one the repository declares for it. The Python passed
		// both to a single `--add-label`, so they arrive as one edit.
		const recording = recordingIo({ 1148: REQUEST });
		const { context } = handlerContext({ io: recording.io, answers: ["done"] });

		const outcome = await handleInterpret(context, { issueNumber: 1148, repo: REPO });

		expect(labelChanges(recording)).toEqual([{ number: 1148, labels: ["ci", "area:agents"], add: true }]);
		expect(outcome.kind === "posted" && outcome.labels.area).toBe("area:agents");
	});

	test("the posted comment carries the marker, the heading, the answer, and the footer", async () => {
		const recording = recordingIo({ 1148: REQUEST });
		const { context } = handlerContext({ io: recording.io, answers: ["## Verbatim Request Summary\nIt stalls."] });

		await handleInterpret(context, { issueNumber: 1148, repo: REPO });

		expect(postedComments(recording)).toEqual([
			[
				"<!-- darkfactory-agent -->",
				"### DarkFactory Agent Interpretation",
				"",
				"## Verbatim Request Summary\nIt stalls.",
				"",
				"---",
				"*Assigned Labels: `ci`, `area:agents`. Reply with `/df approve` to continue or `/df reject <feedback>` to revise.*",
			].join("\n"),
		]);
	});

	test("a `file://` citation is rewritten to a link at the development branch", async () => {
		// An agent citing a local path leaves a link that points at the reader's own machine; this
		// is the one rewrite that makes the comment readable on GitHub.
		const recording = recordingIo({ 1148: REQUEST });
		const { context } = handlerContext({
			io: recording.io,
			answers: ["See file:///workspace/packages/harness/src/pipeline/dispatch.ts for the router."],
		});

		await handleInterpret(context, { issueNumber: 1148, repo: REPO });

		expect(postedComments(recording)[0]).toContain(
			"[packages/harness/src/pipeline/dispatch.ts](https://github.com/marius-patrik/DarkFactory/blob/develop/packages/harness/src/pipeline/dispatch.ts)",
		);
	});

	test("the checkpoint records what intake did, so a stopped run resumes rather than restarts", async () => {
		const recording = recordingIo({ 1148: REQUEST });
		const { context, agent } = handlerContext({ io: recording.io, answers: ["done"] });

		await handleInterpret(context, { issueNumber: 1148, repo: REPO });

		expect(agent.requests[0]?.checkpoint).toEqual({
			issueNumber: 1148,
			repo: REPO,
			isPr: false,
			completedSteps: ["Read Request issue #1148", "Classified labels as `ci`, `area:agents`"],
		});
	});
});

describe("handleInterpret: re-running on reviewer feedback", () => {
	test("feedback reaches the prompt and nothing else changes", async () => {
		const recording = recordingIo({ 1148: REQUEST });
		const { context, agent } = handlerContext({ io: recording.io, answers: ["revised"] });

		await handleInterpret(context, { issueNumber: 1148, repo: REPO, feedback: "Name the file, not the module." });

		expect(agent.requests[0]?.prompt).toContain(
			'The previous interpretation was rejected with this reviewer feedback, which must be addressed in the new interpretation:\n"Name the file, not the module."',
		);
	});

	test("without feedback the prompt says nothing about a rejection", async () => {
		const recording = recordingIo({ 1148: REQUEST });
		const { context, agent } = handlerContext({ io: recording.io, answers: ["revised"] });

		await handleInterpret(context, { issueNumber: 1148, repo: REPO });

		expect(agent.requests[0]?.prompt).not.toContain("previous interpretation was rejected");
	});
});

describe("handleInterpret: failure paths", () => {
	test("a label that will not apply does not stop the interpretation", async () => {
		// This is the `try_gh` path: an agent that cannot apply a label has still read the issue and
		// can still interpret it. Aborting here filed a pipeline-failure issue whose only content was
		// a traceback.
		const recording = recordingIo({ 1148: REQUEST }, { changeLabels: new Error("label does not exist") });
		const { context, reported } = handlerContext({ io: recording.io, answers: ["## Summary\nIt stalls."] });

		const outcome = await handleInterpret(context, { issueNumber: 1148, repo: REPO });

		expect(reported[0]).toBe("Could not label #1148 as ci,area:agents: label does not exist");
		expect(operations(recording)).toEqual(["issueView", "changeLabels", "addComment"]);
		expect(outcome.kind).toBe("posted");
	});

	test("an issue whose fields are all absent still gets read, labelled and answered", async () => {
		// A malformed payload must not read as an absent issue: the Python defaulted both fields to
		// the empty string, classified that, and posted, rather than raising on the missing key.
		const recording = recordingIo({ 7: {} });
		const { context, agent } = handlerContext({ io: recording.io, answers: ["nothing to interpret"] });

		const outcome = await handleInterpret(context, { issueNumber: 7, repo: REPO });

		expect(agent.requests[0]?.prompt).toContain("Title: \nBody: \n");
		expect(outcome.kind).toBe("posted");
	});

	test("a quota notice posts nothing and is not a failure", async () => {
		// Quota exhaustion is not a failure: the work done so far is real, and the run stops to be
		// checkpointed and blocked rather than to go red.
		const recording = recordingIo({ 1148: REQUEST });
		const { context, reported } = handlerContext({ io: recording.io, answers: [QUOTA_EXHAUSTED_NOTICE] });

		const outcome = await handleInterpret(context, { issueNumber: 1148, repo: REPO });

		expect(operations(recording)).toEqual(["issueView", "changeLabels"]);
		expect(reported).toEqual([]);
		expect(outcome).toEqual({ kind: "quota-exhausted", notice: QUOTA_EXHAUSTED_NOTICE });
	});

	test("an agent failure posts the error comment and ends the run non-zero", async () => {
		const recording = recordingIo({ 1148: REQUEST });
		const { context } = handlerContext({ io: recording.io, answers: [`${AGENT_ERROR_PREFIX}: no harness on PATH`] });

		const failing = handleInterpret(context, { issueNumber: 1148, repo: REPO });

		await expect(failing).rejects.toBeInstanceOf(AgentRunFailure);
		expect(postedComments(recording)).toEqual([
			`<!-- darkfactory-agent -->\n### DarkFactory Agent Execution Error\n\n${AGENT_ERROR_PREFIX}: no harness on PATH\n`,
		]);
	});

	test("an issue that cannot be read throws, because there is nothing to interpret", async () => {
		const recording = recordingIo({}, { issueView: new Error("Not Found") });
		const { context } = handlerContext({ io: recording.io, answers: ["unused"] });

		expect(handleInterpret(context, { issueNumber: 999, repo: REPO })).rejects.toThrow("Not Found");
		expect(operations(recording)).toEqual(["issueView"]);
	});
});
