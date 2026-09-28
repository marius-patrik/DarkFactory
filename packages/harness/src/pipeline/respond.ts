/**
 * Answering a human's free-text feedback on an issue or a pull request.
 *
 * Replaces `handle_respond` in `.github/scripts/agent_runner.py`. The only thing that varies is
 * whether the comment lands on an issue or on a pull request, and the Python's own comment is that
 * the two are the same REST call: a pull request's conversation comment *is* an issue comment. What
 * does change is the wording the agent is given - "PR" versus "Issue" - and the Python's prompt
 * and checkpoint both name the surface, so both are carried through here.
 */

import type { PipelineContext } from "./handler-context.ts";
import { AGENT_ERROR_PREFIX, isQuotaExhaustionNotice, rewriteFileLinks } from "./signals.ts";

/** Marks every comment this pipeline posts, so a later pass can recognise its own output. */
const AGENT_MARKER = "<!-- darkfactory-agent -->";

/** What responding did. */
export type RespondOutcome =
	/** A response was posted. */
	| { kind: "posted"; comment: string; isPr: boolean }
	/** The agent ran out of quota, so nothing was posted. */
	| { kind: "quota-exhausted"; notice: string }
	/** The agent failed, an execution-error comment was posted, and the run ends non-zero. */
	| { kind: "failed"; notice: string; comment: string };

/** The feedback to answer. */
export interface RespondRequest {
	/** The issue or pull request number. */
	number: number;
	/** The comment body, as a human wrote it. */
	commentText: string;
	/** The repository slug, `owner/name`. */
	repo: string;
	/** Whether the feedback was on a pull request rather than an issue. */
	isPr?: boolean;
}

/**
 * Builds the prompt that asks for a response to feedback.
 *
 * @param request - The feedback, and the surface it was left on.
 * @returns The prompt.
 */
function respondPrompt(request: RespondRequest): string {
	const surface = request.isPr ? "PR" : "Issue";
	return (
		`User posted the following feedback on ${surface} #${request.number}:\n` +
		`"${request.commentText}"\n\n` +
		"Provide a direct, helpful, and concise response addressing the feedback and detailing next actions.\n" +
		"Cite repository files as plain `path/to/file` code spans, never as file:// URLs."
	);
}

/**
 * Generates a contextual agent response to human feedback and posts it.
 *
 * Replaces `handle_respond`. Feedback is the common case in this pipeline: a comment that is not a
 * command lands here, so this is the path most human words take.
 *
 * @param context - The handler's GitHub port, agent, and reporting.
 * @param request - The feedback to answer and the surface it was left on.
 * @returns What responding did.
 * @throws {@link AgentRunFailure} when the agent fails, after the error comment is posted.
 */
export async function handleRespond(context: PipelineContext, request: RespondRequest): Promise<RespondOutcome> {
	const { repo, number, isPr = false } = request;
	const { io } = context;

	const response = await context.runAgentPrompt({
		prompt: respondPrompt(request),
		kind: "chat",
		checkpoint: {
			issueNumber: number,
			repo,
			isPr,
			completedSteps: [`Received user comment on ${isPr ? "PR" : "Issue"} #${number}`],
		},
	});

	if (isQuotaExhaustionNotice(response)) {
		return { kind: "quota-exhausted", notice: response };
	}

	if (response.startsWith(AGENT_ERROR_PREFIX)) {
		const comment = `${AGENT_MARKER}\n### DarkFactory Agent Execution Error\n\n${response}`;
		await io.addComment(repo, number, comment);
		context.fail(`Respond failed on #${number}; Execution Error posted.`);
	}

	const comment =
		`${AGENT_MARKER}\n### DarkFactory Agent Response\n\n` +
		`${rewriteFileLinks(response, repo, context.developmentBranch)}`;
	await io.addComment(repo, number, comment);
	context.say(`Responded to comment on #${number}`);
	return { kind: "posted", comment, isPr };
}
