import { join, resolve } from "node:path";
import {
	qualityMatrix,
	type ResolvedRepositoryActions,
	resolveDetectedRepositoryActions,
} from "@darkfactory/capability/actions";
import { detectRepositoryEvidence, type RepositoryEvidence } from "@darkfactory/core/repository-evidence";
import { runVerify, type VerifyResult } from "../workspace/runVerify.ts";

/** Canonical detected repository quality state consumed by df CI/operator surfaces. */
export interface DetectedQualityState {
	evidence: RepositoryEvidence;
	resolution: ResolvedRepositoryActions;
	matrix: ReturnType<typeof qualityMatrix>;
}

/** Resolves repository evidence plus official/consumer capability actions exactly once. */
export async function resolveDetectedQuality(
	repoDir = process.cwd(),
	capabilitiesRoot?: string,
): Promise<DetectedQualityState> {
	const evidence = await detectRepositoryEvidence(repoDir);
	const root = capabilitiesRoot ? resolve(capabilitiesRoot) : join(evidence.root, "capabilities");
	const resolution = await resolveDetectedRepositoryActions(evidence, root);
	return { evidence, resolution, matrix: qualityMatrix(resolution) };
}

/** Result of one detected executable quality action. */
export interface DetectedQualityExecution {
	packageId: string;
	kind: "test" | "lint" | "format_check";
	supported: boolean;
	command?: string;
	reason?: string;
	result?: VerifyResult;
}

/** Runs the supported detected test/lint/format actions without inventing fallback commands. */
export async function runDetectedQuality(
	repoDir = process.cwd(),
	options: { capabilitiesRoot?: string; timeoutMs?: number } = {},
): Promise<DetectedQualityExecution[]> {
	const state = await resolveDetectedQuality(repoDir, options.capabilitiesRoot);
	const results: DetectedQualityExecution[] = [];
	for (const entry of state.resolution.packages) {
		for (const kind of ["test", "lint", "format_check"] as const) {
			const action = entry.actions[kind];
			if (!action.supported || !action.command) {
				results.push({
					packageId: entry.package.id,
					kind,
					supported: false,
					...(action.reason ? { reason: action.reason } : {}),
				});
				continue;
			}
			const worktree = resolve(repoDir, action.cwd);
			results.push({
				packageId: entry.package.id,
				kind,
				supported: true,
				command: action.command,
				result: await runVerify({
					worktree,
					command: action.command,
					timeoutMs: options.timeoutMs ?? 15 * 60_000,
				}),
			});
		}
	}
	return results;
}
