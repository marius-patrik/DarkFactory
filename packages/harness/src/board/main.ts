import { existsSync, readFileSync } from "node:fs";
import { BoardAutomation } from "./automation.ts";
import type { WebhookPayload } from "./events.ts";

/**
 * The board automation entry point.
 *
 * **Nothing runs this file.** It was written to replace a Python script, and no workflow invokes it:
 * the fourteen workflows in `.github/workflows/` contain no board automation job, and none of them
 * names this path. The comment used to say "the entry point the board automation workflow runs",
 * which was a claim about a caller that does not exist — the same defect as a hook that is declared
 * and never invoked, and it points the next reader at enforcement that is not there.
 *
 * So the file is staged, not live. It needs a caller, or it needs to be deleted, and this comment
 * exists so that the choice is visible rather than assumed. The commit that wires it up should
 * remove this paragraph.
 *
 * It takes the same three shapes the script it replaces took: reconcile everything on demand, or
 * handle the webhook named by `GITHUB_EVENT_NAME` and read from `GITHUB_EVENT_PATH`. A rate limit
 * exits zero - the work is deferred to the next run, and failing the job would only add a red mark
 * to a run that did nothing wrong - while a recorded board failure exits non-zero, because a board
 * that silently stopped accepting writes is the failure this reports.
 */

/** What the run was asked to do. */
interface AutomationOptions {
	dryRun: boolean;
	reconcile: boolean;
	board: number | null;
	owner: string | null;
	repo: string | null;
}

/** A `--flag`, a `--flag value` pair, or a `--flag=value` pair, out of an argument list. */
function parseOptions(argv: readonly string[]): AutomationOptions {
	const options: AutomationOptions = {
		dryRun: false,
		reconcile: false,
		board: null,
		owner: null,
		repo: null,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index] as string;
		const [flag, inline] = argument.includes("=") ? argument.split("=", 2) : [argument, undefined];
		const value = () => inline ?? argv[++index] ?? null;
		switch (flag) {
			case "--dry-run":
				options.dryRun = true;
				break;
			case "--reconcile":
				options.reconcile = true;
				break;
			case "--board": {
				const parsed = Number.parseInt(String(value()), 10);
				options.board = Number.isNaN(parsed) ? null : parsed;
				break;
			}
			case "--owner":
				options.owner = value();
				break;
			case "--repo":
				options.repo = value();
				break;
			default:
				break;
		}
	}
	return options;
}

/** The exit code a finished run reports. */
function exitCode(automation: BoardAutomation): number {
	if (automation.run.rateLimited) {
		automation.run.notice("Project board rate limit reached; exiting cleanly.");
		return 0;
	}
	if (automation.run.failures.length > 0) {
		automation.run.notice(`${automation.run.failures.length} board operation(s) failed`);
		return 1;
	}
	return 0;
}

/** Runs the automation once, returning the exit code the workflow should see. */
export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
	const options = parseOptions(argv);
	const automation = new BoardAutomation(
		options.owner ? { env: { ...process.env, PROJECT_OWNER: options.owner } } : {},
	);

	if (options.dryRun || options.reconcile || options.board !== null) {
		await automation.sweep({
			boardNumbers: options.board !== null ? [options.board] : null,
			repoSlugs: options.repo ? [options.repo] : null,
			dryRun: options.dryRun,
		});
		return exitCode(automation);
	}

	const eventPath = process.env.GITHUB_EVENT_PATH;
	const eventName = process.env.GITHUB_EVENT_NAME ?? "";

	if (!eventPath || !existsSync(eventPath)) {
		if (!eventName || eventName === "schedule" || eventName === "workflow_dispatch") {
			await automation.processEvent(eventName || "workflow_dispatch", {});
			return exitCode(automation);
		}
		automation.run.say(`No GITHUB_EVENT_PATH found for event "${eventName}"`);
		return 0;
	}

	const payload = JSON.parse(readFileSync(eventPath, "utf8")) as WebhookPayload;
	await automation.processEvent(eventName, payload);
	return exitCode(automation);
}

if (import.meta.main) {
	process.exitCode = await main();
}
