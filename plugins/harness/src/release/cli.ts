/** Resolves release notes, assets, and metadata without a repository VERSION file. */
import { writeFileSync } from "node:fs";
import {
	checkMetadata,
	resolveRelease,
	syncMetadata,
} from "./release.ts";

/** What the caller asked for on the command line. */
interface ReleaseCliOptions {
	repoRoot: string;
	bump: string | null;
	syncMetadata: boolean;
	notesOut: string | null;
}

/** Reads the flags the release workflow passes, in the Python wrapper's own spelling. */
function parseArgs(argv: readonly string[], env: NodeJS.ProcessEnv = process.env): ReleaseCliOptions {
	const value = (name: string): string | undefined => {
		const index = argv.indexOf(name);
		return index >= 0 ? argv[index + 1] : undefined;
	};
	return {
		repoRoot: value("--repo-root") ?? ".",
		bump: value("--bump") ?? env.REQUESTED_BUMP ?? null,
		syncMetadata: argv.includes("--sync-metadata"),
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

/** Runs one invocation and returns the JSON the workflow consumes. */
function run(options: ReleaseCliOptions): Record<string, unknown> {
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
