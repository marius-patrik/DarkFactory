import { requiredChecksForDetectedQuality } from "@darkfactory/capability/actions";
import type { GitHubRepository } from "../github/repository.ts";
import { resolveDetectedQuality, type DetectedQualityState } from "./detected.ts";
import { checkWorkflowsDrift } from "./installer.ts";
import { computeRequiredChecks, verifyBranchProtection } from "./protection.ts";

export interface DoctorCheckResult {
	status: "pass" | "warn" | "fail" | "skipped";
	message: string;
	details?: unknown;
}

export interface DoctorReport {
	ok: boolean;
	checks: {
		repository: DoctorCheckResult;
		workflows: DoctorCheckResult;
		protection: DoctorCheckResult;
	};
}

export async function runCiDoctor(
	repoDir = process.cwd(),
	repo?: GitHubRepository,
	branch?: string,
): Promise<DoctorReport> {
	let detected: DetectedQualityState | undefined;
	let repositoryResult: DoctorCheckResult;
	try {
		detected = await resolveDetectedQuality(repoDir);
		const gaps = detected.resolution.gaps;
		repositoryResult = gaps.length === 0
			? {
					status: "pass",
					message: `Detected ${detected.evidence.packages.length} package(s) with complete deterministic action coverage`,
					details: { packages: detected.evidence.packages, matrix: detected.matrix },
				}
			: {
					status: "warn",
					message: `Detected ${detected.evidence.packages.length} package(s) with ${gaps.length} explicitly unsupported/missing action(s)`,
					details: { packages: detected.evidence.packages, gaps, matrix: detected.matrix },
				};
	} catch (error) {
		repositoryResult = {
			status: "fail",
			message: `Repository detection/action resolution failed: ${error instanceof Error ? error.message : String(error)}`,
		};
	}

	let workflowsResult: DoctorCheckResult;
	try {
		const drift = await checkWorkflowsDrift(repoDir);
		const modified = drift.filter((item) => item.status === "modified");
		const missing = drift.filter((item) => item.status === "missing");
		const outdated = drift.filter((item) => item.status === "outdated");
		const inSync = drift.filter((item) => item.status === "in_sync");
		if (modified.length > 0) {
			workflowsResult = {
				status: "fail",
				message: `Managed workflows modified: ${modified.map((item) => item.file).join(", ")}`,
				details: drift,
			};
		} else if (missing.length > 0) {
			workflowsResult = {
				status: "fail",
				message: `Managed workflows missing: ${missing.map((item) => item.file).join(", ")}`,
				details: drift,
			};
		} else if (outdated.length > 0) {
			workflowsResult = {
				status: "warn",
				message: `Managed workflows outdated: ${outdated.map((item) => item.file).join(", ")}`,
				details: drift,
			};
		} else {
			workflowsResult = {
				status: "pass",
				message: `All ${inSync.length} managed workflow(s) in sync`,
				details: drift,
			};
		}
	} catch (error) {
		workflowsResult = {
			status: "fail",
			message: `Failed to inspect workflows: ${error instanceof Error ? error.message : String(error)}`,
		};
	}

	let protectionResult: DoctorCheckResult;
	if (!repo || !detected) {
		protectionResult = {
			status: "skipped",
			message: "Branch protection check skipped (repository client or detected quality state unavailable)",
		};
	} else {
		try {
			const checks = requiredChecksForDetectedQuality(detected.resolution);
			const expected = computeRequiredChecks(checks);
			const defaultBranch = branch ?? detected.evidence.repoDf.identity?.default_branch ?? "main";
			const verification = await verifyBranchProtection(repo, expected, defaultBranch);
			protectionResult = verification.valid
				? {
						status: "pass",
						message: `Remote protection matches all ${expected.length} required checks (source: ${verification.source})`,
						details: verification,
					}
				: {
						status: "fail",
						message: "Branch protection does not match detector-derived required checks",
						details: verification,
					};
		} catch (error) {
			protectionResult = {
				status: "fail",
				message: `Failed to verify branch protection: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	const ok = repositoryResult.status !== "fail"
		&& workflowsResult.status !== "fail"
		&& protectionResult.status !== "fail";
	return {
		ok,
		checks: {
			repository: repositoryResult,
			workflows: workflowsResult,
			protection: protectionResult,
		},
	};
}
