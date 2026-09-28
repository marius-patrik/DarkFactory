/**
 * The two effects the event router performs that are neither routing nor handlers: electing one
 * repair per failing run, and telling a human once that only a command counts.
 *
 * Ported from `claim_failure_dispatch` and `post_command_hint_once` in
 * `.github/scripts/agent_runner.py`. Both are small, both are best-effort, and both are here rather
 * than in a handler because more than one route reaches them and neither belongs to any one stage.
 */

import { HINT_MARKER } from "../approvals/commands.ts";
import { claimBody, decideClaimElection } from "./failure-effect.ts";
import type { IssueCommentRow, PipelineIo } from "./pipeline-io.ts";
import { errorMessage } from "./pipeline-io.ts";

/**
 * The one-time hint posted when free text merely mentions a command word.
 *
 * The Python's own comment says the rest: a human writing "I approve of this direction" has not
 * approved anything, and answering that as a gate transition is how a plan gets implemented by
 * accident. The reply is to say so once, and then treat everything else as feedback.
 */
export const COMMAND_HINT_BODY =
	`${HINT_MARKER}\nThat looks like approval feedback, but only a command on its own line counts as a ` +
	"decision. Reply with `/df approve` (or `/approve`) to approve, `/df reject` (alias " +
	"`/df revise`, or `/reject` / `/revise`) to send the stage back with feedback, or `/df resume` " +
	"(or `/resume`) to resume a stopped run. Anything else is answered as ordinary feedback.";

/**
 * Where a run's own messages go.
 *
 * The two differ and the difference is the port's: `say` is the Python's `print`, which is the
 * run's narration, and `warn` is its `print(..., file=sys.stderr)`, which is the run's complaints.
 * The claim election narrates; a failed read complains.
 */
export interface RunReporting {
	/** Writes a progress line, as the Python's `print` did. */
	say: (message: string) => void;
	/** Writes a warning, as the Python's stderr print did. */
	warn: (message: string) => void;
}

/**
 * Elect exactly one run to repair a failure, or report that this run lost.
 *
 * A failure is repaired by committing, and committing turns CI red again, so an unbounded
 * "dispatch on failure" loop is why the `pipeline-failure` label used to be a mute. The bound is an
 * election rather than a check-then-act: every contender posts the same claim comment and the one
 * GitHub assigned the lowest comment id wins, so two runs racing one failure cannot both enter the
 * repair.
 *
 * A run that cannot post its claim does not dispatch, and a run that cannot read the claims back
 * does. Every ambiguous answer resolves towards repairing, because a mute is the failure mode this
 * exists to remove.
 *
 * @param io - The GitHub port.
 * @param issueNumber - The issue the failure is reported on.
 * @param effect - The effect identity, from `failureEffectId` or `refailureEffectId`.
 * @param repo - Repository slug, `owner/name`.
 * @param report - Where the run narrates and complains.
 * @returns `true` when this run may dispatch the repair.
 */
export async function claimFailureDispatch(
	io: PipelineIo,
	issueNumber: number,
	effect: string,
	repo: string,
	report: RunReporting,
): Promise<boolean> {
	// Not `bestEffort`: that answers "did it throw", which for a call returning nothing it cannot
	// tell from "it succeeded". The Python branched on `try_gh(...) is not None`, and the claim is
	// exactly the case where the two must not be confused - a claim that was not written is not a
	// claim, and dispatching on it would defeat the election the claim exists to run.
	try {
		await io.addComment(repo, issueNumber, claimBody(effect));
	} catch (error) {
		report.warn(`Could not claim the repair of ${effect}: ${errorMessage(error)}`);
		return false;
	}

	let rows: IssueCommentRow[];
	try {
		rows = await io.issueComments(repo, issueNumber);
	} catch (error) {
		// The claims could not be read. There is no evidence of a competing run, so this run
		// dispatches: a mute is the failure mode this whole mechanism exists to remove.
		report.warn(`Could not read the claims on #${issueNumber}: ${errorMessage(error)}`);
		report.say(`Claimed the repair of ${effect} on issue #${issueNumber}.`);
		return true;
	}

	if (
		!decideClaimElection(
			effect,
			rows.map((row) => ({ id: row.id, body: row.body })),
			true,
		)
	) {
		const ids = rows.map((row) => row.id);
		report.say(
			`Another run already claimed the repair of ${effect} ` +
				`(claim ${Math.min(...ids)}, this run is ${Math.max(...ids)}); ` +
				"not dispatching a second repair.",
		);
		return false;
	}
	report.say(`Claimed the repair of ${effect} on issue #${issueNumber}.`);
	return true;
}

/**
 * Post the command-grammar hint on an issue unless it is already there.
 *
 * @param io - The GitHub port.
 * @param issueNumber - The issue to hint on.
 * @param repo - Repository slug, `owner/name`.
 * @param report - Where the run complains.
 * @returns `true` when a hint was posted.
 */
export async function postCommandHintOnce(
	io: PipelineIo,
	issueNumber: number,
	repo: string,
	report: RunReporting,
): Promise<boolean> {
	let alreadyHinted: boolean;
	try {
		const issue = await io.issueView(repo, issueNumber, ["comments"]);
		alreadyHinted = issue.comments.some((comment) => comment.includes(HINT_MARKER));
	} catch (error) {
		// An unreadable issue means "unknown", and the Python's answer to unknown was silence: a
		// second hint is noise on a live conversation.
		report.warn(`Could not read comments on #${issueNumber}: ${errorMessage(error)}`);
		return false;
	}
	if (alreadyHinted) return false;
	try {
		await io.addComment(repo, issueNumber, COMMAND_HINT_BODY);
	} catch (error) {
		// Reported, and still "not posted": the caller decides what a failure to hint means, and the
		// honest answer is that the hint did not arrive.
		report.warn(`Could not post the command hint on #${issueNumber}: ${errorMessage(error)}`);
		return false;
	}
	return true;
}
