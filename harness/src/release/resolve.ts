/** @packageDocumentation
 * Release resolution: decides everything about the next release without performing it.
 */

import { resolve as resolvePath } from "node:path";
import { $ } from "bun";
import { buildNotes } from "./notes.ts";
import { planAssets, collectAssets, type BuildStep } from "./assets.ts";
import { checkMetadata, syncMetadata } from "./metadata.ts";
import { resolve, type ResolveResult } from "./versioning.ts";
import { configure } from "./environment.ts";

/** Result of resolving the next release. */
export interface ResolvedRelease {
	version: string | null;
	tag: string | null;
	mode: string;
	bump: string | null;
	previous: string | null;
	notes: string;
	steps: BuildStep[];
	metadataProblems: string[];
}

/** Decides everything about the next release without performing it.
 *
 * @param repoRoot - Repository root.
 * @param requested - An explicit bump or exact version requested by a human.
 * @returns A mapping with `version`, `tag`, `mode`, `bump`, `previous`, `notes`, `steps` and
 *   `metadataProblems`. `version` is `null` when no release is warranted.
 */
export async function resolveRelease(repoRoot: string, requested?: string | null): Promise<ResolvedRelease> {
	const decision = await resolve(repoRoot, requested);
	const version = decision.next;

	if (!version) {
		return {
			version: null,
			tag: null,
			mode: decision.mode,
			bump: decision.bump,
			previous: decision.current,
			notes: "",
			steps: [],
			metadataProblems: [],
		};
	}

	// The tag the decision was measured against, not a freshly recomputed one: measuring the notes
	// window against a different tag than the version decision used is how a release ends up
	// describing commits that are already published.
	const messages = await getCommitsSince(repoRoot, decision.currentTag);

	return {
		version,
		tag: decision.tag,
		mode: decision.mode,
		bump: decision.bump,
		previous: decision.current,
		notes: buildNotes(messages, version, decision.current),
		steps: await planAssets(repoRoot),
		metadataProblems: checkMetadata(repoRoot, version),
	};
}

/** Collects commit messages added since a tag.
 *
 * @param repoRoot - Path to the repository root.
 * @param tag - The tag to measure from, or `null` to take the whole history.
 * @returns Full commit messages, newest first.
 */
async function getCommitsSince(repoRoot: string, tag: string | null): Promise<string[]> {
	const span = tag ? `${tag}..HEAD` : "HEAD";
	try {
		const result = await $`git -C ${repoRoot} log ${span} --format=%B%x00`.text();
		return result.split("\0").map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 0);
	} catch {
		return [];
	}
}

/** Synchronizes metadata for a resolved release.
 *
 * @param repoRoot - Repository root.
 * @param resolved - The resolved release.
 * @returns The resolved release with `metadataSynced` and updated `metadataProblems` added.
 */
export async function syncReleaseMetadata(
	repoRoot: string,
	resolved: ResolvedRelease,
): Promise<ResolvedRelease & { metadataSynced: string[] }> {
	if (!resolved.version) {
		return { ...resolved, metadataSynced: [] };
	}
	const synced = syncMetadata(repoRoot, resolved.version);
	const problems = checkMetadata(repoRoot, resolved.version);
	return { ...resolved, metadataSynced: synced, metadataProblems: problems };
}

/** Writes release notes to a file.
 *
 * @param notes - The release notes.
 * @param outPath - Path to write the notes to.
 */
export async function writeNotes(notes: string, outPath: string): Promise<void> {
	const dir = resolvePath(outPath, "..");
	await $`mkdir -p ${dir}`;
	await Bun.write(outPath, notes);
}