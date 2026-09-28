/**
 * What a run leaves behind when the whole attempt chain produced no answer.
 *
 * Ported from `_post_agent_failure_notice` and `checkpoint_and_notify_exhaustion` in
 * `.github/scripts/agent_runner.py`. Both are the tail of `run_agent_prompt`: one runs when every
 * attempt produced nothing usable, the other when every attempt was out of quota. They live together
 * because they answer the same question - where does a person find out that this run stopped - and
 * they differ only in whether progress was worth preserving.
 *
 * That distinction is not cosmetic. Exhaustion is not a failure: the work done so far is real, so it
 * is checkpointed, the item is labelled `Blocked`, and the run is resumable. Producing nothing at all
 * is the pipeline silently succeeding over an empty shell, which must turn the workflow red rather
 * than "pass" with vacuous comments - and it gets no checkpoint, because there is no progress to
 * resume.
 */

import type { GitHubClient } from "../github/client.ts";
import { GitHubError } from "../github/errors.ts";
import { describeChain } from "../install/harness-registry.ts";
import { type BoardStatus, blockEntity } from "./board-status.ts";
import { type Checkpoint, RESUME_INSTRUCTIONS, saveCheckpoint } from "./checkpoint.ts";
import type { PipelineEnv } from "./handler-context.ts";
import type { PipelineIo } from "./pipeline-io.ts";
import {
	alreadyExists,
	exhaustedProviders,
	mergeProviderResets,
	nextQuotaReset,
	QUOTA_PROVIDERS_VARIABLE,
	quotaBlockRecord,
	quotaRunVariable,
} from "./quota.ts";
import type { WorkspaceIo } from "./workspace-io.ts";

/** Marks every comment this pipeline posts, so a later pass can recognise its own output. */
const AGENT_MARKER = "<!-- darkfactory-agent -->";

/** The status a checkpointed item is left in. */
const BLOCKED_STATUS = "Blocked";

/** The step a checkpoint records when the caller named none. */
const DEFAULT_COMPLETED_STEP = "Pipeline execution initiated";

/** The commit message the Python used for a checkpoint commit. */
const CHECKPOINT_COMMIT = "chore(ci): checkpoint progress on quota exhaustion";

/** The environment variable holding the Actions run id, which is absent outside Actions. */
const RUN_ID = "GITHUB_RUN_ID";

/** Format an epoch second as the `YYYY-MM-DD HH:MM:SS UTC` form the notice prints. */
function utcStamp(epochSeconds: number): string {
	return `${new Date(Math.floor(epochSeconds) * 1000).toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

/** Format an epoch second as the `YYYY-MM-DDTHH:MM:SSZ` instant a checkpoint records. */
function isoStamp(epochSeconds: number): string {
	return `${new Date(Math.floor(epochSeconds) * 1000).toISOString().slice(0, 19)}Z`;
}

/** The message of a thrown value. */
function describe(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * The repository variables a quota stop is recorded in.
 *
 * `record_quota_block` wrote two of them: one per run, naming the item and when it may resume, and
 * one shared provider map, so a later resume knows which provider is worth trying first. Both are
 * Actions variables rather than issue state, which is why they are not on {@link PipelineIo}: a
 * handler has no business writing them, and only a stop has a reason to.
 */
export interface QuotaBlockStore {
	/**
	 * Read a repository variable's value.
	 *
	 * @param repo - Repository slug, `owner/name`.
	 * @param name - The variable name.
	 * @returns The value, or `undefined` when the variable does not exist.
	 */
	read(repo: string, name: string): Promise<string | undefined>;

	/**
	 * Create the variable, or overwrite it when it already exists.
	 *
	 * `record_quota_block` created and then fell back to a patch on HTTP 409, which is the same
	 * intent as a create-or-overwrite; the distinction is the store's, not the caller's.
	 *
	 * @param repo - Repository slug, `owner/name`.
	 * @param name - The variable name.
	 * @param value - The value to store.
	 */
	write(repo: string, name: string, value: string): Promise<void>;
}

/** Where a notice is posted, as the target item and the repository it belongs to. */
export interface NoticeTarget {
	/** The issue or pull request number. */
	number: number;
	/** Whether the item is a pull request; a pull request's comment is still an issue comment. */
	isPr: boolean;
	/** The repository slug. */
	repo: string;
}

/** The surfaces a failure notice touches, and where a failure to touch one goes. */
export interface AgentFailurePort {
	/** The GitHub port, for the notice comment and the `Blocked` label. */
	io: Pick<PipelineIo, "addComment" | "changeLabels">;
	/** The project board, for the `Blocked` column. */
	board: BoardStatus;
	/** Where the Python's notices went. */
	warn: (message: string) => void;
}

/** What {@link checkpointAndNotifyExhaustion} needs beyond the notice surfaces. */
export interface CheckpointPort extends AgentFailurePort {
	/** The working copy, for the checkpoint commit and push. */
	workspace: Pick<WorkspaceIo, "git">;
	/** The environment the run was given. */
	env: PipelineEnv;
	/** The directory the checkpoint file and the checkpoint commit live in. */
	workspaceDir: string;
	/** The current time, in epoch seconds. */
	now: () => number;
	/** The repository variables a blocked item is recorded in. */
	quotaBlocks: QuotaBlockStore;
}

/**
 * Post the short notice an empty chain leaves behind.
 *
 * Every attempt running the prompt came back empty or print-timed-out, so there is no agent text to
 * relay. The comment still has to say something, because an execution that ends without any trace
 * looks exactly like one that was never run - and it must not replace the failure already being
 * raised, so a failed post is a notice and nothing more.
 *
 * @param port - The notice surfaces and where a failed post goes.
 * @param target - Where to post; the Python skipped entirely when no issue number was known.
 * @param message - The failure reason, already redacted by the caller.
 */
export async function postAgentFailureNotice(
	port: AgentFailurePort,
	target: NoticeTarget | undefined,
	message: string,
): Promise<void> {
	if (!target?.number) return;
	const body = `${AGENT_MARKER}\n### DarkFactory Agent Execution Error\n\n${message}`;
	try {
		await port.io.addComment(target.repo, target.number, body);
	} catch (error) {
		port.warn(`Notice: Failed to post agent output failure notice: ${describe(error)}`);
	}
}

/** The quota exhaustion notice, exactly as the Python assembled it. */
function exhaustionComment(options: {
	models: string;
	steps: readonly string[];
	branchName: string | undefined;
	resetAtUtc: string;
	errorDetail: string;
}): string {
	const steps = options.steps.map((step) => `- [x] ${step}`).join("\n");
	const body =
		`${AGENT_MARKER}\n` +
		"### ⚠️ DarkFactory Agent Quota Exhaustion Notice\n\n" +
		"Execution has paused because API quota was exhausted across every configured " +
		`harness and model:\n${options.models}\n\n` +
		`#### Completed Steps\n${steps}\n\n` +
		"#### Checkpoint Information\n" +
		`- **Branch**: \`${options.branchName || "N/A"}\`\n` +
		`- **Automatic Resume**: ${options.resetAtUtc}\n` +
		"- **Checkpoint**: Progress preserved in `.antigravity_checkpoint.json`\n" +
		"- **Project Status**: Updated to `Blocked`\n\n" +
		`#### Instructions to Resume\n${RESUME_INSTRUCTIONS}\n`;
	if (!options.errorDetail) return body;
	return `${body}\n<details><summary>Error Details</summary>\n\n\`\`\`\n${options.errorDetail.trim()}\n\`\`\`\n</details>\n`;
}

/** Parse a stored provider map, treating anything unreadable as an empty one. */
function parseProviderMap(value: string | undefined): Record<string, number> {
	if (!value) return {};
	try {
		const parsed: unknown = JSON.parse(value);
		if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
		const map: Record<string, number> = {};
		for (const [provider, resetAt] of Object.entries(parsed as Record<string, unknown>)) {
			if (typeof resetAt === "number" && Number.isFinite(resetAt)) map[provider] = resetAt;
		}
		return map;
	} catch {
		return {};
	}
}

/**
 * Record a blocked item in the repository variables a resume reads.
 *
 * The run variable is a create-or-overwrite and the provider map is merged rather than replaced, so a
 * run blocked until tomorrow is not unblocked by a later run that only saw a one-minute retry delay
 * for the same provider.
 *
 * @param store - The repository variables.
 * @param input - The item, the providers, when it may resume, and when the block was recorded.
 * @param report - Where a failed write goes; recording a block must never fail the notice.
 */
export async function recordQuotaBlock(
	store: QuotaBlockStore,
	input: {
		repo: string;
		runId: string;
		item: number;
		isPr: boolean;
		resetAt: number;
		blockedAt: number;
		providers: readonly string[];
	},
	report: (message: string) => void,
): Promise<void> {
	const runVariable = quotaRunVariable(input.runId);
	const record = quotaBlockRecord({
		item: input.item,
		isPr: input.isPr,
		resetAt: input.resetAt,
		blockedAt: input.blockedAt,
	});

	const existing = await store
		.read(input.repo, QUOTA_PROVIDERS_VARIABLE)
		.then(parseProviderMap)
		.catch((error: unknown) => {
			report(`Notice: Failed to read provider map ${QUOTA_PROVIDERS_VARIABLE}: ${describe(error)}`);
			return {} as Record<string, number>;
		});
	const merged = mergeProviderResets(existing, input.providers, input.resetAt);

	try {
		await store.write(input.repo, runVariable, JSON.stringify(record));
	} catch (error) {
		report(`Notice: Failed to write quota variable ${runVariable}: ${describe(error)}`);
	}
	try {
		await store.write(input.repo, QUOTA_PROVIDERS_VARIABLE, JSON.stringify(merged));
	} catch (error) {
		report(`Notice: Failed to write provider map ${QUOTA_PROVIDERS_VARIABLE}: ${describe(error)}`);
	}
}

/** What the caller knows about the run that stopped, so the checkpoint describes it. */
export interface ExhaustionContext {
	/** The issue or pull request the run was working on. */
	issueNumber: number;
	/** The repository slug. */
	repo: string;
	/** Whether the item is a pull request. */
	isPr?: boolean;
	/** The branch in flight, when the run had checked one out. */
	branchName?: string | undefined;
	/** The steps that completed before the run stopped. */
	completedSteps?: readonly string[] | undefined;
	/** The provider's own words for why the run stopped. */
	errorDetail: string;
}

/**
 * Checkpoint the run, post the exhaustion notice, and block the item.
 *
 * The order is the Python's and every step depends on the one before it: the checkpoint file is
 * written first because a later resume reads it; the working copy is committed and pushed second so
 * the branch the resume continues from holds the work; the notice is posted third because it is the
 * only thing a person reads; and the `Blocked` label and board column go on last, because they are
 * what the failure reporter and the board reconcile against.
 *
 * Everything after the checkpoint is best-effort. A run that cannot push, cannot comment, or cannot
 * reach the board has still checkpointed, and losing the checkpoint over a failed comment is the
 * worse outcome - so each failure is a notice and the sequence continues.
 *
 * @param port - The notice surfaces, the working copy, the environment, the clock and the variables.
 * @param context - The run that stopped, and the provider's words for why.
 * @returns The checkpoint that was written.
 */
export async function checkpointAndNotifyExhaustion(
	port: CheckpointPort,
	context: ExhaustionContext,
): Promise<Checkpoint> {
	const isPr = context.isPr ?? false;
	const steps = context.completedSteps?.length ? [...context.completedSteps] : [DEFAULT_COMPLETED_STEP];
	const blockedAt = port.now();
	const checkpoint: Checkpoint = {
		timestamp: isoStamp(blockedAt),
		issueNumber: context.issueNumber,
		repo: context.repo,
		isPr,
		branchName: context.branchName,
		completedSteps: steps,
		status: BLOCKED_STATUS,
		errorDetail: context.errorDetail,
	};

	saveCheckpoint(checkpoint, port.workspaceDir);

	if (context.branchName) {
		try {
			port.workspace.git(["add", "-A"]);
			if (port.workspace.git(["status", "--porcelain"])) {
				port.workspace.git(["commit", "-m", CHECKPOINT_COMMIT]);
				try {
					port.workspace.git(["push", "origin", context.branchName]);
				} catch (error) {
					port.warn(`Notice: Git push during checkpoint notice: ${describe(error)}`);
				}
			}
		} catch (error) {
			port.warn(`Notice: Git checkpoint notice: ${describe(error)}`);
		}
	}

	const resetAt = nextQuotaReset(context.errorDetail, blockedAt);
	const body = exhaustionComment({
		models: describeChain({ env: port.env }),
		steps,
		branchName: context.branchName,
		resetAtUtc: utcStamp(resetAt),
		errorDetail: context.errorDetail,
	});
	try {
		await port.io.addComment(context.repo, context.issueNumber, body);
	} catch (error) {
		port.warn(`Notice: Failed to post quota exhaustion notice comment: ${describe(error)}`);
	}

	blockEntity(port, context.repo, context.issueNumber, isPr);

	const runId = port.env[RUN_ID];
	if (runId) {
		await recordQuotaBlock(
			port.quotaBlocks,
			{
				repo: context.repo,
				runId,
				item: context.issueNumber,
				isPr,
				resetAt,
				blockedAt,
				providers: exhaustedProviders(context.errorDetail),
			},
			port.warn,
		);
	}
	return checkpoint;
}

/**
 * The {@link QuotaBlockStore} over {@link GitHubClient}.
 *
 * Actions variables are created and then patched, and the create reports a conflict rather than
 * succeeding, so a store that only knew how to create would leave the provider map frozen at the
 * first run's value for every run after it. The conflict is therefore the branch, not an error.
 *
 * @param client - The GitHub client every request goes through.
 * @returns The store.
 */
export function githubQuotaBlockStore(client: GitHubClient): QuotaBlockStore {
	return {
		async read(repo, name) {
			try {
				const variable = await client.rest<{ value?: string }>(
					"GET",
					`/repos/${repo}/actions/variables/${encodeURIComponent(name)}`,
				);
				return variable.value;
			} catch (error) {
				// A variable that has never been written is not an error: the map starts empty.
				if (error instanceof GitHubError && error.status === 404) return undefined;
				throw error;
			}
		},

		async write(repo, name, value) {
			try {
				await client.rest("POST", `/repos/${repo}/actions/variables`, { name, value });
			} catch (error) {
				if (!alreadyExists(describe(error))) throw error;
				await client.rest("PATCH", `/repos/${repo}/actions/variables/${encodeURIComponent(name)}`, { value });
			}
		},
	};
}
