/**
 * Applies declared branch protection, but only once CI has actually reported those checks green.
 *
 * The configuration issue asks a person to turn protection on by hand and gives the reason: *"Turn it
 * on once CI has reported green at least once, so the required checks are contexts that actually exist
 * — protection requiring a check nothing reports blocks every merge forever."* That reasoning is sound
 * and the pipeline can satisfy it itself: `getCheckStatus` and `requiredChecksState` already compute
 * whether the declared checks are green, and `applyBranchProtection` already applies a lane.
 *
 * Everything needed was here; the two halves were never joined, so the answer to a question the
 * pipeline could answer became a line in an issue nobody reads. This is that joining.
 *
 * Ordering matters and is the whole design. Protection requiring a check that never reports blocks
 * every merge on the branch permanently, so a repository is protected *after* its checks have run, and
 * never on the strength of the declaration alone.
 */

import { requiredChecksState } from "./guard.ts";
import { applyBranchProtection } from "./protection.ts";
import type { CheckRunItem } from "./schema.ts";
import type { GitHubRepository } from "../github/repository.ts";

/** A lane as `repo.protection.lanes` declares it. */
export interface DeclaredLane {
	branch: string;
	requiredChecks: readonly string[];
	approvals?: number;
	strict?: boolean;
	enforceAdmins?: boolean;
	resolveConversations?: boolean;
}

/** What the pipeline concluded about a repository's protection. */
export interface ProtectionDecision {
	/** Branch the decision is about, or undefined when the document declares no lanes. */
	branch?: string;
	/** What was done, or deliberately not done. */
	outcome: "applied" | "not-green" | "not-declared" | "dry-run";
	/** Human-readable reason, always present: a silent skip is indistinguishable from a bug. */
	reason: string;
	/** Checks that were missing or unfinished, when the reason is `not-green`. */
	unmet?: string[];
}

/**
 * Decides whether a lane's checks have reported green.
 *
 * Delegated to {@link requiredChecksState} rather than reimplemented, so the definition of "green"
 * used here is the same one the guard uses to hold a pull request. Two implementations of "green"
 * would drift, and the one that drifted the wrong way would protect a repository whose checks are
 * failing.
 *
 * @param requiredChecks Check names the lane requires.
 * @param checkRuns Check runs observed on the branch head.
 * @returns Whether the lane may be applied, and which checks were unmet.
 */
export function laneIsGreen(
	requiredChecks: readonly string[],
	checkRuns: readonly CheckRunItem[],
): { green: boolean; unmet: string[] } {
	// Every required check must be both present and completed. `requiredChecksState` treats a missing
	// check as pending, which is the reading that matters here: a check nothing has reported has not
	// reported green.
	const state = requiredChecksState(
		requiredChecks.map((name) => ({ name, required: true })),
		checkRuns,
	);
	// `requiredChecksState` lists a missing check in both `missing` and `pending` - a check that has not
	// reported is both absent and unfinished - so the three lists overlap by design. Deduplicated and
	// sorted, because this list is read by a person in a configuration issue and "b, b" sends them
	// looking for a second check.
	const unmet = [...new Set([...state.missing, ...state.pending, ...state.failing])].sort();
	return { green: state.state === "green", unmet };
}

/**
 * Applies a declared lane once its checks are green.
 *
 * @param repository The repository to protect.
 * @param lane The declared lane.
 * @param checkRuns Check runs observed on the lane's branch head.
 * @param options Dry-run reports the decision without writing.
 * @returns What was done, and why.
 */
export async function protectLaneWhenGreen(
	repository: GitHubRepository,
	lane: DeclaredLane,
	checkRuns: readonly CheckRunItem[],
	options: { dryRun?: boolean; log?: (message: string) => void } = {},
): Promise<ProtectionDecision> {
	const log = options.log ?? (() => {});

	// A lane with no checks is not protecting anything, and applying it would create a ruleset that
	// looks like protection and enforces nothing. That is a configuration mistake, so it is reported as
	// one rather than applied.
	if (lane.requiredChecks.length === 0) {
		return {
			branch: lane.branch,
			outcome: "not-declared",
			reason: `${lane.branch} declares no required checks, so there is nothing to wait for and nothing to enforce`,
		};
	}

	const { green, unmet } = laneIsGreen(lane.requiredChecks, checkRuns);
	if (!green) {
		const reason = `${lane.branch} is not protected: ${unmet.join(", ")} ${unmet.length === 1 ? "has" : "have"} not reported green`;
		log(reason);
		return { branch: lane.branch, outcome: "not-green", reason, unmet };
	}

	const result = await applyBranchProtection(repository, [...lane.requiredChecks], {
		branch: lane.branch,
		strict: lane.strict,
		approvals: lane.approvals,
		enforceAdmins: lane.enforceAdmins,
		resolveConversations: lane.resolveConversations,
		dryRun: options.dryRun === true,
	});

	// `ApplyProtectionResult` carries no reason field, so a failure explains itself from what it did
	// manage: which contexts were written. Saying "could not be protected" with nothing after it is the
	// kind of message that costs an hour.
	const reason = result.success
		? `${lane.branch} ${options.dryRun === true ? "would be" : "is"} protected: ${lane.requiredChecks.join(", ")} reported green`
		: `${lane.branch} could not be protected; the source was ${result.source ?? "unknown"} and it reported ${result.contexts.length} context(s)`;
	log(reason);
	return {
		branch: lane.branch,
		outcome: options.dryRun === true ? "dry-run" : "applied",
		reason,
	};
}
