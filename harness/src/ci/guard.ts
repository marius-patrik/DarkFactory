import { resolveChecksForRepo } from "./config.ts";
import type { CheckRunItem, CiConfig, RequiredChecksResult, ResolvedCheck } from "./schema.ts";

/**
 * Compute the overall required‑checks state from a list of check runs.
 *
 * @param config - CI configuration or already resolved checks.
 * @param checkRuns - List of check run items retrieved from GitHub.
 * @param repoSlug - Optional repository slug for per‑repo overrides.
 * @returns An object describing the aggregated state, including failing, pending, missing, passed checks and details.
 */
export function requiredChecksState(
	config: CiConfig | ResolvedCheck[],
	checkRuns: CheckRunItem[],
	repoSlug?: string,
): RequiredChecksResult {
	const resolvedChecks: ResolvedCheck[] = Array.isArray(config)
		? config
		: resolveChecksForRepo(config, repoSlug);

	const requiredChecks = resolvedChecks.filter((c) => c.required);

	const runsByName = new Map<string, CheckRunItem>();
	for (const run of checkRuns) {
		runsByName.set(run.name, run);
	}

	const failing: string[] = [];
	const pending: string[] = [];
	const missing: string[] = [];
	const passed: string[] = [];
	const details: Record<string, { required: boolean; status?: string; conclusion?: string | null }> = {};

	for (const check of resolvedChecks) {
		const run = runsByName.get(check.name);
		details[check.name] = {
			required: check.required,
			status: run?.status,
			conclusion: run?.conclusion,
		};
	}

	for (const check of requiredChecks) {
		const run = runsByName.get(check.name);
		if (!run) {
			missing.push(check.name);
			pending.push(check.name);
			continue;
		}

		if (run.status !== "completed") {
			pending.push(check.name);
			continue;
		}

		const conclusion = run.conclusion ?? "";
		if (conclusion === "success" || conclusion === "neutral" || conclusion === "skipped") {
			passed.push(check.name);
		} else {
			failing.push(check.name);
		}
	}

	let state: "green" | "pending" | "failed";
	if (failing.length > 0) {
		state = "failed";
	} else if (pending.length > 0) {
		state = "pending";
	} else {
		state = "green";
	}

	return {
		state,
		failing,
		pending,
		missing,
		passed,
		details,
	};
}

/**
 * Determine whether an alert should be triggered based on the number of repairs and a threshold.
 *
 * @param repairCount - Number of repairs performed.
 * @param alertAfter - Optional threshold; if undefined or non‑positive, alerts are never triggered.
 * @returns True if an alert should be raised, false otherwise.
 */
export function shouldAlert(repairCount: number, alertAfter?: number): boolean {
	if (typeof alertAfter !== "number" || alertAfter <= 0) {
		return false;
	}
	return repairCount >= alertAfter;
}
