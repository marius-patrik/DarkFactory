import type { CheckRunItem, RequiredChecksResult, ResolvedCheck } from "./schema.ts";

export function requiredChecksState(
	resolvedChecks: readonly ResolvedCheck[],
	checkRuns: readonly CheckRunItem[],
): RequiredChecksResult {
	const requiredChecks = resolvedChecks.filter((check) => check.required);
	const runsByName = new Map(checkRuns.map((run) => [run.name, run]));

	const failing: string[] = [];
	const pending: string[] = [];
	const missing: string[] = [];
	const passed: string[] = [];
	const details: RequiredChecksResult["details"] = {};

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
		if (conclusion === "success" || conclusion === "neutral" || conclusion === "skipped") passed.push(check.name);
		else failing.push(check.name);
	}

	return {
		state: failing.length > 0 ? "failed" : pending.length > 0 ? "pending" : "green",
		failing,
		pending,
		missing,
		passed,
		details,
	};
}

export function shouldAlert(repairCount: number, alertAfter?: number): boolean {
	return typeof alertAfter === "number" && alertAfter > 0 && repairCount >= alertAfter;
}
