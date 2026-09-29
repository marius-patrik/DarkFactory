/**
 * A drop-in command line for the release workflow, staged to replace `release.py --repo-root ...`.
 *
 * The workflow does not call this yet. It runs `release.py` on purpose, as a cross-check oracle: the
 * release resolves the version and tag twice, with `release/versioning.ts` and with the Python, and
 * fails the release if the two disagree. That double resolution is stated in `release.yml` with a
 * retirement condition, and it is why the Python has not been swapped out. This file is the
 * replacement, waiting on that cross-check being retired rather than being forgotten.
 *
 * Every flag the Python wrapper accepted is accepted here with the same meaning, and the JSON it
 * prints is the same document the workflow already parses: `release.yml` reads `version`, `tag`,
 * `steps[].command`, `steps[].cwd` and `metadata_problems` out of it with `jq` and inline Python.
 * The keys are therefore the wire format, snake_case, and not the camelCase the module uses
 * internally - renaming them would break a workflow step that is not this change's to edit.
 */
import { writeFileSync } from "node:fs";
import {
	checkMetadata,
	type GhCommand,
	type RecordVersionResult,
	recordVersion,
	resolveRelease,
	syncMetadata,
} from "./release.ts";

/** What the caller asked for on the command line. */
export interface ReleaseCliOptions {
	repoRoot: string;
	bump: string | null;
	syncMetadata: boolean;
	recordVersion: string | null;
	releasedTag: string | null;
	notesOut: string | null;
}

/** Reads the flags the release workflow passes, in the Python wrapper's own spelling. */
export function parseArgs(argv: readonly string[], env: NodeJS.ProcessEnv = process.env): ReleaseCliOptions {
	const value = (name: string): string | undefined => {
		const index = argv.indexOf(name);
		return index >= 0 ? argv[index + 1] : undefined;
	};
	return {
		repoRoot: value("--repo-root") ?? ".",
		bump: value("--bump") ?? env.REQUESTED_BUMP ?? null,
		syncMetadata: argv.includes("--sync-metadata"),
		recordVersion: value("--record-version") ?? null,
		releasedTag: value("--released-tag") ?? null,
		notesOut: value("--notes-out") ?? null,
	};
}

/** The resolved release as the workflow's steps read it out of the JSON. */
function toWire(resolved: ReturnType<typeof resolveRelease> & { metadataSynced?: string[] }): Record<string, unknown> {
	return {
		version: resolved.version,
		tag: resolved.tag,
		mode: resolved.mode,
		bump: resolved.bump,
		previous: resolved.previous,
		notes: resolved.notes,
		steps: resolved.steps,
		metadata_problems: resolved.metadataProblems,
		...(resolved.metadataSynced ? { metadata_synced: resolved.metadataSynced } : {}),
	};
}

/** The recorded version as the workflow's steps read it out of the JSON. */
function recordToWire(result: RecordVersionResult): Record<string, unknown> {
	return {
		recorded: result.recorded,
		version: result.version,
		branch: result.branch,
		base: result.base,
		issue: result.issue,
		pull_request: result.pullRequest,
		reason: result.reason,
	};
}

/** Runs one invocation and returns the JSON the workflow consumes. */
export function run(options: ReleaseCliOptions, ghCommand?: GhCommand): Record<string, unknown> {
	if (options.recordVersion) {
		return recordToWire(recordVersion(options.repoRoot, options.recordVersion, options.releasedTag, ghCommand));
	}

	const resolved = resolveRelease(options.repoRoot, options.bump);
	if (options.syncMetadata && resolved.version) {
		resolved.metadataSynced = syncMetadata(options.repoRoot, resolved.version);
		resolved.metadataProblems = checkMetadata(options.repoRoot, resolved.version);
	}
	if (options.notesOut && resolved.notes) writeFileSync(options.notesOut, resolved.notes, "utf8");
	return toWire(resolved);
}

if (import.meta.main) {
	const options = parseArgs(process.argv.slice(2));
	try {
		console.log(JSON.stringify(run(options), null, 2));
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
