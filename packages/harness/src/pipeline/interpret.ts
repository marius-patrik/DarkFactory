/**
 * Reading a Request and posting what it asks for.
 *
 * Replaces `handle_interpret` in `.github/scripts/agent_runner.py`. The order is the Python's and is
 * the behaviour: read the issue, classify and apply its labels, ask the agent, then post. Labelling
 * happens *before* the agent runs and is deliberately best-effort, because an agent that cannot
 * apply a label has still read the issue and can still interpret it - aborting there threw the whole
 * run away and filed a pipeline-failure issue whose only content was a traceback.
 */

import { INTERPRETATION_FOOTER } from "../approvals/commands.ts";
import type { PipelineContext } from "./handler-context.ts";
import { classifyTypeAndArea } from "./labels.ts";
import { bestEffort } from "./pipeline-io.ts";
import { AGENT_ERROR_PREFIX, isQuotaExhaustionNotice, rewriteFileLinks } from "./signals.ts";

/** Marks every comment this pipeline posts, so a later pass can recognise its own output. */
const AGENT_MARKER = "<!-- darkfactory-agent -->";

/** What interpreting a Request did. */
export type InterpretOutcome =
	/** An interpretation was posted on the issue. */
	| { kind: "posted"; comment: string; labels: { type: string; area: string } }
	/**
	 * The agent ran out of quota, so nothing was posted.
	 *
	 * This is not a failure: the work done so far is real, and the Python returned quietly for the
	 * caller to checkpoint and block.
	 */
	| { kind: "quota-exhausted"; notice: string }
	/** The agent failed, an execution-error comment was posted, and the run ends non-zero. */
	| { kind: "failed"; notice: string; comment: string };

/** What to interpret. */
export interface InterpretRequest {
	/** The Request issue number. */
	issueNumber: number;
	/** The repository slug, `owner/name`. */
	repo: string;
	/**
	 * Reviewer feedback from a `reject`/`revise` comment. When present the interpretation is re-run
	 * with the feedback instead of starting over.
	 */
	feedback?: string;
}

/**
 * Builds the prompt that asks for an interpretation.
 *
 * @param title - The Request's title.
 * @param body - The Request's body.
 * @param feedback - Reviewer feedback the new interpretation must address, when there is any.
 * @returns The prompt.
 */
function interpretationPrompt(title: string, body: string, feedback: string): string {
	const prompt =
		`Analyze this user request issue:\nTitle: ${title}\nBody: ${body}\n\n` +
		"Draft a structured Interpretation comment containing:\n" +
		"1. Verbatim Request Summary\n" +
		"2. Architectural Scope & Breakdown\n" +
		"3. Proposed Verification Plan\n" +
		"Keep it concise and clear.\n" +
		"Cite repository files as plain `path/to/file` code spans, never as file:// URLs.";
	if (!feedback) return prompt;
	return (
		prompt +
		"\n\nThe previous interpretation was rejected with this reviewer feedback, " +
		`which must be addressed in the new interpretation:\n"${feedback}"`
	);
}

/**
 * Generates and posts an interpretation comment on a Request issue.
 *
 * Replaces `handle_interpret`. The Python returned `None` and left its effect on the issue; the
 * outcome is returned here so a caller - and the tests - can see which of the three paths ran
 * without going back to the issue to find out.
 *
 * @param context - The handler's GitHub port, agent, and reporting.
 * @param request - The Request to interpret, and any reviewer feedback to fold in.
 * @returns What interpreting it did.
 * @throws {@link AgentRunFailure} when the agent fails, after the error comment is posted.
 */
export async function handleInterpret(context: PipelineContext, request: InterpretRequest): Promise<InterpretOutcome> {
	const { repo, issueNumber, feedback = "" } = request;
	const { io } = context;

	const issue = await io.issueView(repo, issueNumber, ["title", "body", "labels"]);
	const title = issue.title;
	const body = issue.body;
	const classification = classifyTypeAndArea(`${title} ${body}`, context.taxonomy);

	await bestEffort(
		`label #${issueNumber} as ${classification.type},${classification.area}`,
		() => io.changeLabels(repo, issueNumber, { add: true, labels: [classification.type, classification.area] }),
		context.warn,
	);

	const interpretation = await context.runAgentPrompt({
		prompt: interpretationPrompt(title, body, feedback),
		kind: "classify",
		checkpoint: {
			issueNumber,
			repo,
			isPr: false,
			completedSteps: [
				`Read Request issue #${issueNumber}`,
				`Classified labels as \`${classification.type}\`, \`${classification.area}\``,
			],
		},
	});

	if (isQuotaExhaustionNotice(interpretation)) {
		return { kind: "quota-exhausted", notice: interpretation };
	}

	if (interpretation.startsWith(AGENT_ERROR_PREFIX)) {
		const comment = `${AGENT_MARKER}\n### DarkFactory Agent Execution Error\n\n${interpretation}\n`;
		await io.addComment(repo, issueNumber, comment);
		context.fail(`Interpretation failed on issue #${issueNumber}; Execution Error posted.`);
	}

	const comment =
		`${AGENT_MARKER}\n### DarkFactory Agent Interpretation\n\n` +
		`${rewriteFileLinks(interpretation, repo, context.developmentBranch)}\n\n` +
		`---\n*Assigned Labels: \`${classification.type}\`, \`${classification.area}\`. ${INTERPRETATION_FOOTER}.*`;
	await io.addComment(repo, issueNumber, comment);
	context.say(`Interpretation posted on issue #${issueNumber}`);
	return { kind: "posted", comment, labels: { type: classification.type, area: classification.area } };
}
