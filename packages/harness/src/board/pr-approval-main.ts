import {
	handlePrApproval,
	type PrApprovalEnvironment,
	type PrApprovalLogger,
	runGh,
} from "../approvals/pr-approval.ts";
import { BoardAutomation } from "./automation.ts";
import type { BoardTarget } from "./client.ts";

/**
 * The entry point `handle_pr_approval.py` was, as a command.
 *
 * The Python had no flags: `if __name__ == "__main__": handle_pr_approval()`, and the handler read
 * everything from the environment — `GITHUB_ACTOR`, `GITHUB_REPOSITORY`, `GITHUB_EVENT_NAME`,
 * `PR_NUMBER`, `COMMENT_BODY`, `REVIEW_BODY`, `REVIEW_STATE`, `IS_PR`, `BOT_TOKEN`,
 * `APPROVER_ASSOCIATION`, `APPROVER_TYPE`, `ISSUE_AUTHOR`, `PROJECT_OWNER`, `PROJECT_NUMBER`. So this
 * takes no arguments either, and an argument is an error rather than something quietly ignored.
 *
 * The board target comes from `BoardAutomation.projectClient()`, which reads `PROJECT_OWNER` and
 * `PROJECT_NUMBER` from the same environment the workflow already sets. That is the point of using it
 * rather than constructing a client here: there is one owner of "how a board is reached", and this
 * command is not it.
 *
 * ## The exit code is 0 on every path the Python reached
 *
 * `handle_pr_approval` returned `None` everywhere, so the process exited 0 — including when it declined
 * to act because the event was not an approval, or the actor was not permitted. A declined event
 * reddening the workflow would be wrong, and the workflow's `if` conditions depend on it staying green.
 *
 * The one non-zero path is a **rejected board write**, and it is not handled here at all: the
 * rejection propagates out of `main`, and a script whose top-level await rejects exits non-zero. The
 * Python behaved the same way, having no try/except around those calls.
 */

/** The flags the Python accepted: none. */
export const PR_APPROVAL_FLAGS: readonly string[] = [];

export interface PrApprovalMainDeps {
	env?: PrApprovalEnvironment;
	logger?: PrApprovalLogger;
	/** Injected so a test can exercise the entry without a board, a token or a network. */
	client?: BoardTarget;
	handle?: typeof handlePrApproval;
}

/**
 * Parse the Python's argument list, which is empty.
 *
 * `process.argv.slice(2)` is what `bun` hands a script, and the Python's `sys.argv[1:]` is the same
 * shape. Anything in it is rejected rather than skipped: the script takes no arguments, so an argument
 * means the caller expected a different program, and running anyway would hide that.
 */
export function parsePrApprovalArgs(argv: readonly string[]): void {
	if (argv.length > 0) {
		throw new Error(
			`unexpected argument: ${argv[0]} — handle_pr_approval.py takes no arguments and reads the event from the environment`,
		);
	}
}

/** Run the approval handler once and report the exit code the workflow should see. */
export async function main(
	argv: readonly string[] = process.argv.slice(2),
	deps: PrApprovalMainDeps = {},
): Promise<number> {
	parsePrApprovalArgs(argv);
	const env = deps.env ?? process.env;
	// Built only when a test has not supplied one, so no test reaches for a token or a board.
	const board = deps.client ? null : new BoardAutomation({ env });
	const outcome = await (deps.handle ?? handlePrApproval)({
		run: runGh,
		client: deps.client ?? (board as BoardAutomation).projectClient((board as BoardAutomation).projectNumber),
		logger: deps.logger ?? { out: (message) => console.log(message), err: (message) => console.error(message) },
		env,
	});
	// Every outcome the Python could reach exits 0. `reason` and `merged` are reported by the handler's
	// own narration; they are not the workflow's exit contract.
	void outcome;
	return 0;
}

if (import.meta.main) {
	process.exitCode = await main();
}
