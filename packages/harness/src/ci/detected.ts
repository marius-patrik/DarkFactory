import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
	qualityMatrix,
	type ResolvedRepositoryActions,
	resolveDetectedRepositoryActions,
} from "../../../capability/src/actions.ts";
import { detectRepositoryEvidence, type RepositoryEvidence } from "../../../core/src/repository-evidence.ts";

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
	// Compiled standalone builds resolve official capabilities next to the executable; Bun source
	// checkouts continue to use the tracked .darkfactory/plugins tree.
	const installedPlugins = join(dirname(process.execPath), "plugins");
	const root = capabilitiesRoot
		? resolve(capabilitiesRoot)
		: existsSync(installedPlugins)
			? installedPlugins
			: resolve(import.meta.dir, "..", "..", "..", "..", ".darkfactory", "plugins");
	const resolution = await resolveDetectedRepositoryActions(evidence, root);
	return { evidence, resolution, matrix: qualityMatrix(resolution) };
}

/**
 * A GitHub green check must prove that at least one real action was executed,
 * and that every required package action was covered or explicitly exempted.
 * An empty matrix is not success, and executable rows cannot hide missing ones.
 */
export function assertQualityCoverage(state: DetectedQualityState): void {
	if (state.resolution.gaps.length > 0) {
		const uncovered = state.resolution.gaps.map((gap) => `${gap.packageId}:${gap.kind}`).join(", ");
		throw new Error(`Uncovered required quality actions: ${uncovered}`);
	}
	if (state.matrix.length === 0)
		throw new Error("No executable quality actions detected; refusing a vacuous green quality check");
}

