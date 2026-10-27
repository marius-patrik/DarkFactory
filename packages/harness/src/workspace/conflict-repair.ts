import { lstat, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { runGit } from "./git.ts";
import { type CommitIdentity } from "./commitChunk.ts";
import { runDetectedVerification } from "./runVerify.ts";

/** Each resolution is an explicitly observed conflicted path, never an arbitrary model-selected file. */
export type ConflictResolver = (input: {
	file: string;
	content: string;
	baseBranch: string;
}) => Promise<string>;

/** A resolved Git merge with deterministic verification and immutable commit evidence. */
export interface ConflictRepairEvidence {
	status: "repaired";
	conflictedFiles: string[];
	commitSha: string;
	verification: Awaited<ReturnType<typeof runDetectedVerification>>;
}

/**
 * Completes an ALREADY IN PROGRESS deterministic merge on an isolated worktree.
 * It does not select branches, start a second merge or publish remote changes.
 * The caller must journal the outer git.branch.update effect and separately
 * perform a lease-guarded, readback-verified push.
 *
 * Model-produced text is never trusted as a success signal. The result requires
 * an unmerged-index check, actual verification commands, and a Git merge commit.
 */
export async function repairObservedMergeConflicts(options: {
	worktree: string;
	baseBranch: string;
	conflictedFiles: readonly string[];
	resolveConflict: ConflictResolver;
	identity: CommitIdentity;
}): Promise<ConflictRepairEvidence> {
	const worktree = resolve(options.worktree);
	const mergeHead = runGit(worktree, ["rev-parse", "MERGE_HEAD"]).trim();
	if (!/^[a-f0-9]{40}$/iu.test(mergeHead))
		throw new Error("Conflict repair requires an active Git merge");
	const before = runGit(worktree, ["rev-parse", "HEAD"]).trim();
	const observed = runGit(worktree, ["diff", "--name-only", "--diff-filter=U", "-z"])
		.split("\0").filter(Boolean).sort();
	const expected = [...options.conflictedFiles].sort();
	if (!observed.length || JSON.stringify(observed) !== JSON.stringify(expected))
		throw new Error("Conflicted path manifest differs from the actual Git index");

	for (const file of observed) {
		const path = resolve(worktree, file);
		const rel = relative(worktree, path);
		if (!rel || rel.startsWith("..") || isAbsolute(rel))
			throw new Error(`Conflict path escapes isolated worktree: ${file}`);
		const kind = await lstat(path);
		if (!kind.isFile() || kind.isSymbolicLink())
			throw new Error(`Conflict resolution supports regular files only: ${file}`);
		const content = await readFile(path, "utf8");
		const resolved = await options.resolveConflict({
			file, content, baseBranch: options.baseBranch,
		});
		if (typeof resolved !== "string" || resolved.length === 0)
			throw new Error(`Resolver returned no content for ${file}`);
		if (/^(?:<{7}|={7}|>{7})(?:$|\s)/mu.test(resolved))
			throw new Error(`Unresolved conflict markers remain in ${file}`);
		await writeFile(path, resolved, "utf8");
		runGit(worktree, ["add", "--", file]);
	}
	if (runGit(worktree, ["ls-files", "-u", "-z"]).length)
		throw new Error("Cannot complete conflict repair: unmerged Git index entries remain");

	const verification = await runDetectedVerification({
		repoDir: worktree, changedFiles: observed,
	});
	if (!verification.length || verification.some((entry) =>
		!entry.action.supported || !entry.action.command ||
		!entry.result || entry.result.timedOut || entry.result.exitCode !== 0))
		throw new Error("Conflict repair has no successful comprehensive deterministic verification");

	const env = {
		GIT_AUTHOR_NAME: options.identity.name,
		GIT_AUTHOR_EMAIL: options.identity.email,
		GIT_COMMITTER_NAME: options.identity.name,
		GIT_COMMITTER_EMAIL: options.identity.email,
	};
	runGit(worktree, ["commit", "--no-edit"], { env });
	const commitSha = runGit(worktree, ["rev-parse", "HEAD"]).trim();
	const parents = runGit(worktree, ["rev-list", "--parents", "-n", "1", commitSha]).split(" ");
	if (!/^[a-f0-9]{40}$/iu.test(commitSha) || parents.length !== 3 ||
		!parents.includes(before) || !parents.includes(mergeHead))
		throw new Error("Conflict repair did not produce an observed two-parent merge commit");
	if (runGit(worktree, ["status", "--porcelain"]).trim())
		throw new Error("Conflict repair left uncommitted workspace changes");
	return { status: "repaired", conflictedFiles: observed, commitSha, verification };
}
