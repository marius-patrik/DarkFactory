import { requiredChecksForDetectedQuality } from "@darkfactory/capability/actions";
import { GitHubClient } from "../github/client.ts";
import { GitHubRepository } from "../github/repository.ts";
import { resolveDetectedQuality, runDetectedQuality } from "./detected.ts";
import { runCiDoctor } from "./doctor.ts";
import { installWorkflows, updateWorkflows } from "./installer.ts";
import { applyBranchProtection, computeRequiredChecks, verifyBranchProtection } from "./protection.ts";
import { getCheckStatus, getRunLogs, getWorkflowRuns, rerunWorkflowRun } from "./status.ts";

export interface CiCliContext {
	repo?: GitHubRepository;
	log?: (msg: string) => void;
	error?: (msg: string) => void;
}

function getOption(args: string[], name: string): string | undefined {
	return getOptions(args, name)[0];
}

function getOptions(args: string[], name: string): string[] {
	const values: string[] = [];
	for (let i = 0; i < args.length; i++) {
		if (args[i] === name && i + 1 < args.length) {
			values.push(args[i + 1]!);
		}
	}
	return values;
}

function hasFlag(args: string[], ...names: string[]): boolean {
	return names.some((name) => args.includes(name));
}

function resolveRepoClient(repoPath: string, explicitRepo?: GitHubRepository): GitHubRepository | undefined {
	if (explicitRepo) return explicitRepo;
	const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
	if (!token) return undefined;

	const repoSlug = process.env.GITHUB_REPOSITORY ?? process.env.DF_REPO;
	if (!repoSlug || !repoSlug.includes("/")) return undefined;

	const [owner, repo] = repoSlug.split("/");
	const client = new GitHubClient({ token });
	return new GitHubRepository(client, owner!, repo!);
}

export async function runCiCli(args: string[], context: CiCliContext = {}): Promise<number> {
	const log = context.log ?? console.log;
	const error = context.error ?? console.error;

	const subcommand = args[0];
	const repoPath = getOption(args, "--repo") ?? process.cwd();
	const isJson = hasFlag(args, "--json");

	switch (subcommand) {
		case "matrix": {
			const capabilitiesRoot = getOption(args, "--capabilities-root");
			const state = await resolveDetectedQuality(repoPath, capabilitiesRoot);
			log(
				JSON.stringify(
					{
						packages: state.evidence.packages,
						domains: state.evidence.domains,
						ecosystems: state.evidence.ecosystems,
						matrix: state.matrix,
						gaps: state.resolution.gaps,
					},
					null,
					2,
				),
			);
			return 0;
		}

		case "quality": {
			const capabilitiesRoot = getOption(args, "--capabilities-root");
			const executions = await runDetectedQuality(repoPath, { capabilitiesRoot });
			if (isJson) {
				log(JSON.stringify(executions, null, 2));
			} else {
				for (const execution of executions) {
					if (!execution.supported) {
						log(`[unsupported] ${execution.packageId} ${execution.kind}: ${execution.reason ?? "missing action"}`);
						continue;
					}
					const result = execution.result!;
					log(
						`[${result.exitCode === 0 ? "pass" : "fail"}] ${execution.packageId} ${execution.kind}: ${execution.command}`,
					);
					if (result.outputTail) log(result.outputTail);
				}
			}
			return executions.some((execution) => execution.result && execution.result.exitCode !== 0) ? 1 : 0;
		}

		case "install": {
			const dryRun = hasFlag(args, "--dry-run");
			const force = hasFlag(args, "--force");
			const report = await installWorkflows(repoPath, { dryRun, force });

			if (isJson) {
				log(JSON.stringify(report, null, 2));
				return 0;
			}

			if (report.dryRun) log("[dry-run] No files written.");
			if (report.installed.length > 0) {
				log(`Installed ${report.installed.length} workflow(s): ${report.installed.join(", ")}`);
			}
			if (report.skippedModified.length > 0) {
				log(
					`Skipped ${report.skippedModified.length} user-modified workflow(s) (use --force to overwrite): ${report.skippedModified.join(", ")}`,
				);
			}
			if (report.skippedUnmanaged.length > 0) {
				log(
					`Skipped ${report.skippedUnmanaged.length} unmanaged workflow(s) (use --force to overwrite): ${report.skippedUnmanaged.join(", ")}`,
				);
			}
			return 0;
		}

		case "update": {
			const dryRun = hasFlag(args, "--dry-run");
			const force = hasFlag(args, "--force");
			const report = await updateWorkflows(repoPath, { dryRun, force });

			if (isJson) {
				log(JSON.stringify(report, null, 2));
				return 0;
			}

			if (report.dryRun) log("[dry-run] No files written.");
			if (report.updated.length > 0) {
				log(`Updated ${report.updated.length} workflow(s): ${report.updated.join(", ")}`);
			}
			if (report.upToDate.length > 0) {
				log(`${report.upToDate.length} workflow(s) already up-to-date: ${report.upToDate.join(", ")}`);
			}
			if (report.skippedModified.length > 0) {
				log(
					`Skipped ${report.skippedModified.length} user-modified workflow(s) (use --force to overwrite): ${report.skippedModified.join(", ")}`,
				);
			}
			if (report.skippedUnmanaged.length > 0) {
				log(`Skipped ${report.skippedUnmanaged.length} unmanaged workflow(s): ${report.skippedUnmanaged.join(", ")}`);
			}
			return 0;
		}

		case "status": {
			const repo = resolveRepoClient(repoPath, context.repo);
			if (!repo) {
				error("Error: GitHub repository client not configured (set GH_TOKEN and GITHUB_REPOSITORY).");
				return 1;
			}

			const detected = await resolveDetectedQuality(repoPath);
			const checks = requiredChecksForDetectedQuality(detected.resolution);
			const prNumber = getOption(args, "--pr");
			let ref = getOption(args, "--ref");

			if (prNumber) {
				const pr = await repo.listPullRequests({ state: "all" });
				const match = pr.find((p) => p.number === Number(prNumber));
				if (!match) {
					error(`Error: Pull request #${prNumber} not found`);
					return 1;
				}
				ref = match.head.ref;
			}

			if (!ref) {
				ref = "HEAD";
			}

			const status = await getCheckStatus(repo, ref, checks);

			if (isJson) {
				log(JSON.stringify(status, null, 2));
				return status.state === "failed" ? 1 : 0;
			}

			log(`Ref: ${ref}`);
			log(`State: ${status.state.toUpperCase()}`);
			log("Checks:");
			for (const c of status.checks) {
				const symbol = c.conclusion === "success" ? "✓" : c.conclusion === "failure" ? "✗" : "⟳";
				const req = c.required ? "[required]" : "[optional]";
				log(
					`  ${symbol} ${c.name.padEnd(25)} ${req.padEnd(12)} status=${c.status} conclusion=${c.conclusion ?? "none"}`,
				);
			}

			return status.state === "failed" ? 1 : 0;
		}

		case "runs": {
			const repo = resolveRepoClient(repoPath, context.repo);
			if (!repo) {
				error("Error: GitHub repository client not configured (set GH_TOKEN and GITHUB_REPOSITORY).");
				return 1;
			}

			const workflow = getOption(args, "--workflow");
			const limitStr = getOption(args, "--limit");
			const limit = limitStr ? Number(limitStr) : 20;

			const runs = await getWorkflowRuns(repo, { workflow, limit });

			if (isJson) {
				log(JSON.stringify(runs, null, 2));
				return 0;
			}

			log(`ID\tWORKFLOW\tBRANCH\tSTATUS\tCONCLUSION\tACTOR`);
			for (const r of runs) {
				log(`${r.id}\t${r.name}\t${r.head_branch}\t${r.status}\t${r.conclusion ?? "in_progress"}\t${r.actor}`);
			}
			return 0;
		}

		case "logs": {
			const runIdStr = args[1];
			if (!runIdStr || runIdStr.startsWith("-")) {
				error("Usage: df ci logs <run-id> [--failed] [--job <id>]");
				return 1;
			}
			const runId = Number(runIdStr);

			const repo = resolveRepoClient(repoPath, context.repo);
			if (!repo) {
				error("Error: GitHub repository client not configured (set GH_TOKEN and GITHUB_REPOSITORY).");
				return 1;
			}

			const failedOnly = hasFlag(args, "--failed", "--failed-only");
			const jobIdStr = getOption(args, "--job");
			const jobId = jobIdStr ? Number(jobIdStr) : undefined;

			const report = await getRunLogs(repo, runId, { failedOnly, jobId });

			if (isJson) {
				log(JSON.stringify(report, null, 2));
				return 0;
			}

			for (const job of report.jobs) {
				log(`=== Job: ${job.name} (id: ${job.id}, status: ${job.status}, conclusion: ${job.conclusion}) ===`);
				log(job.excerpt);
				log("");
			}
			return 0;
		}

		case "rerun": {
			const runIdStr = args[1];
			if (!runIdStr || runIdStr.startsWith("-")) {
				error("Usage: df ci rerun <run-id> [--failed]");
				return 1;
			}
			const runId = Number(runIdStr);

			const repo = resolveRepoClient(repoPath, context.repo);
			if (!repo) {
				error("Error: GitHub repository client not configured (set GH_TOKEN and GITHUB_REPOSITORY).");
				return 1;
			}

			const failedOnly = hasFlag(args, "--failed", "--failed-only");
			await rerunWorkflowRun(repo, runId, { failedOnly });

			log(`Workflow run ${runId} rerun triggered${failedOnly ? " (failed jobs only)" : ""}.`);
			return 0;
		}

		case "protect": {
			const repo = resolveRepoClient(repoPath, context.repo);
			if (!repo) {
				error("Error: GitHub repository client not configured (set GH_TOKEN and GITHUB_REPOSITORY).");
				return 1;
			}

			const detected = await resolveDetectedQuality(repoPath);
			const checks = requiredChecksForDetectedQuality(detected.resolution);
			const branch = getOption(args, "--branch") ?? detected.evidence.repoDf.identity?.default_branch ?? "main";
			const dryRun = hasFlag(args, "--dry-run");
			const verify = hasFlag(args, "--verify");
			const required = computeRequiredChecks(checks);

			if (verify) {
				const verification = await verifyBranchProtection(repo, required, branch);
				if (isJson) {
					log(JSON.stringify(verification, null, 2));
					return verification.valid ? 0 : 1;
				}

				if (verification.valid) {
					log(`✓ Branch protection matches all ${required.length} required checks.`);
					return 0;
				}

				error(`✗ Branch protection mismatch!`);
				if (verification.missing.length > 0) {
					error(`  Missing required checks: ${verification.missing.join(", ")}`);
				}
				if (verification.extra.length > 0) {
					error(`  Unexpected extra checks: ${verification.extra.join(", ")}`);
				}
				if (!verification.strict) {
					error(`  Strict branch policy is disabled`);
				}
				return 1;
			}

			const result = await applyBranchProtection(repo, required, { branch, dryRun });
			if (isJson) {
				log(JSON.stringify(result, null, 2));
				return 0;
			}

			if (result.dryRun) {
				log(`[dry-run] Would apply required status checks: ${result.contexts.join(", ")}`);
			} else {
				log(`Applied ${result.contexts.length} required checks to ${branch} (source: ${result.source})`);
			}
			return 0;
		}

		case "doctor": {
			const isOffline = hasFlag(args, "--offline");
			const repo = isOffline ? undefined : resolveRepoClient(repoPath, context.repo);
			const report = await runCiDoctor(repoPath, repo);

			if (isJson) {
				log(JSON.stringify(report, null, 2));
				return report.ok ? 0 : 1;
			}

			log("CI Doctor Report:");
			const detected = report.checks.repository;
			log(`  Repository: [${detected.status.toUpperCase()}] ${detected.message}`);
			const wf = report.checks.workflows;
			log(`  Workflows:  [${wf.status.toUpperCase()}] ${wf.message}`);
			const pr = report.checks.protection;
			log(`  Protection: [${pr.status.toUpperCase()}] ${pr.message}`);

			return report.ok ? 0 : 1;
		}

		case "help":
		default:
			log(`df ci commands:
  df ci matrix  [--repo <path>] [--capabilities-root <path>]
  df ci quality [--repo <path>] [--capabilities-root <path>] [--json]
  df ci install [--repo <path>] [--dry-run] [--force]
  df ci update  [--repo <path>] [--dry-run] [--force]
  df ci status  [--repo <path>] [--pr <n> | --ref <r>] [--json]
  df ci runs    [--repo <path>] [--workflow <w>] [--limit <n>] [--json]
  df ci logs <run-id> [--failed] [--job <id>] [--repo <path>]
  df ci rerun <run-id> [--failed] [--repo <path>]
  df ci protect [--repo <path>] [--branch <branch>] [--dry-run] [--verify]
  df ci doctor  [--repo <path>] [--offline] [--json]`);
			return 0;
	}
}
