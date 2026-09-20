import type { GitHubRepository } from "../github/repository.ts";
import { loadCiConfig } from "./config.ts";
import { resolveDetectedQuality } from "./detected.ts";
import { checkWorkflowsDrift } from "./installer.ts";
import { computeRequiredChecks, verifyBranchProtection } from "./protection.ts";
import type { CiConfig } from "./schema.ts";

export interface DoctorCheckResult {
	status: "pass" | "warn" | "fail" | "skipped";
	message: string;
	details?: unknown;
}

export interface DoctorReport {
	ok: boolean;
	checks: {
		repository: DoctorCheckResult;
		config: DoctorCheckResult;
		workflows: DoctorCheckResult;
		protection: DoctorCheckResult;
	};
}

export async function runCiDoctor(
	repoDir = process.cwd(),
	repo?: GitHubRepository,
	branch = "main",
): Promise<DoctorReport> {
	// Repository detection / capability action coverage.
	let repositoryResult: DoctorCheckResult;
	try {
		const detected = await resolveDetectedQuality(repoDir);
		const gaps = detected.resolution.gaps;
		repositoryResult =
			gaps.length === 0
				? {
						status: "pass",
						message: `Detected ${detected.evidence.packages.length} package(s) with complete required quality/docs action coverage`,
						details: { packages: detected.evidence.packages, matrix: detected.matrix },
					}
				: {
						status: "warn",
						message: `Detected ${detected.evidence.packages.length} package(s) with ${gaps.length} unsupported/missing required action(s)`,
						details: { packages: detected.evidence.packages, gaps },
					};
	} catch (error) {
		repositoryResult = {
			status: "fail",
			message: `Repository detection/action resolution failed: ${error instanceof Error ? error.message : String(error)}`,
		};
	}

	// 1. Check config
	let config: CiConfig | null = null;
	let configResult: DoctorCheckResult;

	try {
		config = await loadCiConfig(repoDir);
		const required = computeRequiredChecks(config);
		configResult = {
			status: "pass",
			message: `.darkfactory/ci.json is valid (${config.checks.length} check(s) declared, ${required.length} required)`,
			details: { checks: config.checks, alert_after: config.alert_after },
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		configResult = message.includes(".darkfactory/ci.json not found")
			? {
					status: "skipped",
					message: "Legacy .darkfactory/ci.json is absent; detected repository actions are the quality source of truth",
				}
			: { status: "fail", message };
	}

	// 2. Check workflows
	let workflowsResult: DoctorCheckResult;
	try {
		const drift = await checkWorkflowsDrift(repoDir);
		const modified = drift.filter((d) => d.status === "modified");
		const missing = drift.filter((d) => d.status === "missing");
		const outdated = drift.filter((d) => d.status === "outdated");
		const inSync = drift.filter((d) => d.status === "in_sync");

		if (modified.length > 0) {
			workflowsResult = {
				status: "fail",
				message: `Managed workflows modified by user (hash mismatch): ${modified.map((m) => m.file).join(", ")}`,
				details: drift,
			};
		} else if (missing.length > 0) {
			workflowsResult = {
				status: "fail",
				message: `Managed workflows missing: ${missing.map((m) => m.file).join(", ")}`,
				details: drift,
			};
		} else if (outdated.length > 0) {
			workflowsResult = {
				status: "warn",
				message: `Workflows outdated (run 'df ci update'): ${outdated.map((o) => o.file).join(", ")}`,
				details: drift,
			};
		} else {
			workflowsResult = {
				status: "pass",
				message: `All ${inSync.length} managed workflow(s) in sync`,
				details: drift,
			};
		}
	} catch (err: unknown) {
		workflowsResult = {
			status: "fail",
			message: `Failed to inspect workflows: ${err instanceof Error ? err.message : String(err)}`,
		};
	}

	// 3. Check protection
	let protectionResult: DoctorCheckResult;
	if (!repo || !config) {
		protectionResult = {
			status: "skipped",
			message: "Branch protection check skipped (no GitHub repository client or invalid config)",
		};
	} else {
		try {
			const expected = computeRequiredChecks(config, repo.slug);
			const verification = await verifyBranchProtection(repo, expected, branch);
			if (verification.valid) {
				protectionResult = {
					status: "pass",
					message: `Remote protection matches all ${expected.length} required checks (source: ${verification.source})`,
					details: verification,
				};
			} else {
				const issues: string[] = [];
				if (verification.missing.length > 0) {
					issues.push(`missing remote checks: ${verification.missing.join(", ")}`);
				}
				if (verification.extra.length > 0) {
					issues.push(`unexpected extra remote checks: ${verification.extra.join(", ")}`);
				}
				if (!verification.strict) {
					issues.push("strict branch up-to-date policy disabled");
				}

				protectionResult = {
					status: "fail",
					message: `Branch protection mismatch: ${issues.join("; ")}`,
					details: verification,
				};
			}
		} catch (err: unknown) {
			protectionResult = {
				status: "fail",
				message: `Failed to verify branch protection: ${err instanceof Error ? err.message : String(err)}`,
			};
		}
	}

	const ok =
		repositoryResult.status !== "fail" &&
		configResult.status !== "fail" &&
		workflowsResult.status !== "fail" &&
		protectionResult.status !== "fail";

	return {
		ok,
		checks: {
			repository: repositoryResult,
			config: configResult,
			workflows: workflowsResult,
			protection: protectionResult,
		},
	};
}
