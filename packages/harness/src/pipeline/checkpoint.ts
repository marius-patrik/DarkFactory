/**
 * The checkpoint a run leaves behind when it stops part-way.
 *
 * Quota exhaustion is not a failure: the work done so far is real, and the right outcome is a
 * checkpoint plus a `Blocked` item rather than a red build. The checkpoint is what makes a later
 * resume continue rather than start over.
 *
 * Two properties make it survivable. It is written to a temporary file and renamed into place, so a
 * run killed mid-write leaves either the previous checkpoint or the new one and never a truncated
 * file. And it is added to `.git/info/exclude` rather than to `.gitignore`, so the checkpoint is
 * ignored in the working copy without ever being committed - a checkpoint is runtime state, not
 * repository content, and one that gets committed is one that lands in a diff the scope gate then
 * has to reason about.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** The checkpoint's filename, inside the workspace directory. */
export const CHECKPOINT_FILENAME = ".antigravity_checkpoint.json";

/** What a checkpoint records about a stopped run. */
export interface Checkpoint {
	/** When the run stopped, as an ISO-8601 UTC instant. */
	timestamp: string;
	/** The issue or pull request the run was working on. */
	issueNumber: number;
	/** The repository slug. */
	repo: string;
	/** Whether the item is a pull request. */
	isPr: boolean;
	/** The branch in flight, when the run had checked one out. */
	branchName?: string | undefined;
	/** The steps that completed before the run stopped. */
	completedSteps: string[];
	/** The item's state; `Blocked` for a quota stop. */
	status: string;
	/** The provider's own words for why the run stopped. */
	errorDetail: string;
}

/**
 * Add the checkpoint filename to a working copy's local git excludes.
 *
 * Handles a plain repository, a worktree, and a submodule, all of which spell `.git` differently:
 * a directory in the first case, a `gitdir:` pointer file in the others. Every failure here is
 * swallowed, because failing to write an exclude must not fail the checkpoint the run is taking
 * while it runs out of quota.
 *
 * @param gitDir - The working copy to exclude the checkpoint from.
 */
export function excludeCheckpointFromGit(gitDir: string): void {
	try {
		const gitEntry = join(gitDir, ".git");
		let infoDir: string | undefined;
		if (existsSync(gitEntry) && statSync(gitEntry).isDirectory()) {
			infoDir = join(gitEntry, "info");
		} else if (existsSync(gitEntry) && statSync(gitEntry).isFile()) {
			const content = readFileSync(gitEntry, "utf8").trim();
			if (content.startsWith("gitdir:")) {
				const target = content.slice("gitdir:".length).trim();
				infoDir = join(target.startsWith("/") ? target : join(gitDir, target), "info");
			}
		}
		if (!infoDir) return;
		const excludeFile = join(infoDir, "exclude");
		mkdirSync(dirname(excludeFile), { recursive: true });
		const existing = existsSync(excludeFile) ? readFileSync(excludeFile, "utf8") : "";
		if (existing.includes(CHECKPOINT_FILENAME)) return;
		const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
		writeFileSync(excludeFile, `${existing}${separator}${CHECKPOINT_FILENAME}\n`);
	} catch {
		// An unwritable exclude is not worth failing a quota checkpoint over.
	}
}

/**
 * Write a checkpoint into a workspace directory.
 *
 * @param checkpoint - The state to record.
 * @param workspaceDir - The directory the checkpoint belongs in.
 * @returns The absolute path of the checkpoint file.
 */
export function saveCheckpoint(checkpoint: Checkpoint, workspaceDir: string): string {
	mkdirSync(workspaceDir, { recursive: true });
	excludeCheckpointFromGit(workspaceDir);
	const checkpointFile = join(workspaceDir, CHECKPOINT_FILENAME);
	const temporary = `${checkpointFile}.tmp.${crypto.randomUUID().replaceAll("-", "")}`;
	try {
		writeFileSync(temporary, `${JSON.stringify(checkpoint, null, 2)}\n`);
		renameSync(temporary, checkpointFile);
	} finally {
		if (existsSync(temporary)) rmSync(temporary, { force: true });
	}
	return checkpointFile;
}

/**
 * Read the checkpoint a workspace holds, if it has one.
 *
 * A checkpoint that will not parse is reported as absent rather than thrown: a resume that cannot
 * read the old checkpoint must still start, and starting over is a better outcome than refusing to
 * run at all.
 *
 * @param workspaceDir - The directory to look in.
 * @returns The checkpoint, or `undefined` when there is none or it is unreadable.
 */
export function loadCheckpoint(workspaceDir: string): Checkpoint | undefined {
	const checkpointFile = join(workspaceDir, CHECKPOINT_FILENAME);
	if (!existsSync(checkpointFile)) return undefined;
	try {
		const parsed: unknown = JSON.parse(readFileSync(checkpointFile, "utf8"));
		if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
		return parsed as Checkpoint;
	} catch {
		return undefined;
	}
}

/**
 * Remove a workspace's checkpoint.
 *
 * Called when the pipeline reaches a state that needs no resumption, so a later run does not read
 * a checkpoint describing work that is already merged.
 *
 * @param workspaceDir - The directory to clear.
 */
export function clearCheckpoint(workspaceDir: string): void {
	const checkpointFile = join(workspaceDir, CHECKPOINT_FILENAME);
	if (!existsSync(checkpointFile)) return;
	try {
		rmSync(checkpointFile, { force: true });
	} catch {
		// Nothing downstream depends on the file being gone; the next save overwrites it.
	}
}

/**
 * Instructions posted with a quota notice, telling a human how to resume.
 *
 * Kept as one constant so the notice and the message that points at it cannot disagree about what
 * a person is supposed to type.
 */
export const RESUME_INSTRUCTIONS =
	"When quota limits reset or additional quota is provisioned:\n" +
	"1. Verify that quota is available on at least one configured harness.\n" +
	"2. Comment `/df resume` on this issue/PR to resume execution.\n" +
	"3. The agent resumes from the checkpoint on whichever harness is available.";
