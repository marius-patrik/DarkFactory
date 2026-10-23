import { describe, expect, test } from "bun:test";
import { AgentRunFailure } from "../../src/pipeline/handler-context.ts";
import { handleRespond } from "../../src/pipeline/respond.ts";
import { AGENT_ERROR_PREFIX, QUOTA_EXHAUSTED_NOTICE } from "../../src/pipeline/signals.ts";
import { handlerContext, operations, postedComments, recordingIo } from "./handlers.ts";

const REPO = "marius-patrik/DarkFactory";

describe("handleRespond: the ordinary path", () => {
	test("feedback on an issue is answered on that issue", async () => {
		const recording = recordingIo();
		const { context, reported } = handlerContext({
			io: recording.io,
			answers: ["Agreed - it needs the digest."],
		});

		const outcome = await handleRespond(context, {
			number: 1148,
			commentText: "Why does it report the same digest twice?",
			repo: REPO,
		});

		expect(operations(recording)).toEqual(["addComment"]);
		expect(recording.calls[0]?.args[1]).toBe(1148);
		expect(reported).toEqual(["Responded to comment on #1148"]);
		expect(outcome).toEqual({
			kind: "posted",
			comment: "<!-- darkfactory-agent -->\n### DarkFactory Agent Response\n\nAgreed - it needs the digest.",
			isPr: false,
		});
	});

	test("feedback on a pull request is answered on that pull request", async () => {
		const recording = recordingIo();
		const { context } = handlerContext({ io: recording.io, answers: ["Fixed in the next push."] });

		const outcome = await handleRespond(context, {
			number: 62,
			commentText: "Please rename this.",
			repo: REPO,
			isPr: true,
		});

		expect(recording.calls[0]?.args[1]).toBe(62);
		expect(outcome.kind === "posted" && outcome.isPr).toBe(true);
	});

	test("the prompt and the checkpoint both name the surface the feedback was left on", async () => {
		// The Python's prompt and its checkpoint context both said "PR" or "Issue", and the
		// checkpoint is what a resume reports, so a PR answered as an issue reads wrong on resume.
		const onPr = recordingIo();
		const pr = handlerContext({ io: onPr.io, answers: ["ok"] });
		await handleRespond(pr.context, { number: 62, commentText: "rename this", repo: REPO, isPr: true });

		const onIssue = recordingIo();
		const issue = handlerContext({ io: onIssue.io, answers: ["ok"] });
		await handleRespond(issue.context, { number: 1148, commentText: "why twice", repo: REPO });

		expect(pr.agent.requests[0]?.prompt).toContain("User posted the following feedback on PR #62");
		expect(pr.agent.requests[0]?.checkpoint?.isPr).toBe(true);
		expect(pr.agent.requests[0]?.checkpoint?.completedSteps).toEqual(["Received user comment on PR #62"]);

		expect(issue.agent.requests[0]?.prompt).toContain("User posted the following feedback on Issue #1148");
		expect(issue.agent.requests[0]?.checkpoint?.isPr).toBe(false);
		expect(issue.agent.requests[0]?.checkpoint?.completedSteps).toEqual(["Received user comment on Issue #1148"]);
	});

	test("the answer is run as a chat, with no timeout of its own", async () => {
		// Responding to a human is a short exchange, so it takes the agent's default timeout rather
		// than one of the stage timeouts.
		const recording = recordingIo();
		const { context, agent } = handlerContext({ io: recording.io, answers: ["ok"] });

		await handleRespond(context, { number: 1148, commentText: "why", repo: REPO });

		expect(agent.requests[0]?.kind).toBe("chat");
		expect(agent.requests[0]?.timeout).toBeUndefined();
	});

	test("a `file://` citation in the answer is rewritten to a link at the development branch", async () => {
		const recording = recordingIo();
		const { context } = handlerContext({
			io: recording.io,
			answers: ["Look at file:///workspace/packages/harness/src/pipeline/respond.ts."],
		});

		await handleRespond(context, { number: 1148, commentText: "where", repo: REPO });

		expect(postedComments(recording)[0]).toContain(
			"[packages/harness/src/pipeline/respond.ts](https://github.com/marius-patrik/DarkFactory/blob/develop/packages/harness/src/pipeline/respond.ts)",
		);
	});
});

describe("handleRespond: failure paths", () => {
	test("a quota notice posts nothing and is not a failure", async () => {
		const recording = recordingIo();
		const { context, reported } = handlerContext({ io: recording.io, answers: [QUOTA_EXHAUSTED_NOTICE] });

		const outcome = await handleRespond(context, { number: 1148, commentText: "why", repo: REPO });

		expect(operations(recording)).toEqual([]);
		expect(reported).toEqual([]);
		expect(outcome).toEqual({ kind: "quota-exhausted", notice: QUOTA_EXHAUSTED_NOTICE });
	});

	test("an agent failure posts the error comment and ends the run non-zero", async () => {
		const recording = recordingIo();
		const { context } = handlerContext({ io: recording.io, answers: [`${AGENT_ERROR_PREFIX}: no harness on PATH`] });

		const failing = handleRespond(context, { number: 62, commentText: "rename this", repo: REPO, isPr: true });

		await expect(failing).rejects.toBeInstanceOf(AgentRunFailure);
		expect(postedComments(recording)).toEqual([
			`<!-- darkfactory-agent -->\n### DarkFactory Agent Execution Error\n\n${AGENT_ERROR_PREFIX}: no harness on PATH`,
		]);
	});

	test("a comment that cannot be posted throws, so the answer is not lost silently", async () => {
		const recording = recordingIo({}, { addComment: new Error("Forbidden") });
		const { context } = handlerContext({ io: recording.io, answers: ["ok"] });

		expect(handleRespond(context, { number: 1148, commentText: "why", repo: REPO })).rejects.toThrow("Forbidden");
	});

	test("a pull request and an issue are the same comment call, so both land the same way", async () => {
		// `gh pr comment` and `gh issue comment` are the same REST call. Keeping them one method here
		// is what stops a future divergence between the two paths.
		const onPr = recordingIo();
		await handleRespond(handlerContext({ io: onPr.io, answers: ["ok"] }).context, {
			number: 62,
			commentText: "x",
			repo: REPO,
			isPr: true,
		});
		const onIssue = recordingIo();
		await handleRespond(handlerContext({ io: onIssue.io, answers: ["ok"] }).context, {
			number: 62,
			commentText: "x",
			repo: REPO,
		});

		expect(operations(onPr)).toEqual(operations(onIssue));
		expect(postedComments(onPr)).toEqual(postedComments(onIssue));
	});
});
