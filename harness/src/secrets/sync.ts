import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { Vault } from "./vault.ts";
import { loadVault, mergeVaults, saveVault } from "./vault-store.ts";

export interface SyncOptions {
	dataRepoPath: string;
	remote?: string;
	branch?: string;
	keyBase64?: string;
}

async function git(cwd: string, ...args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
	const exitCode = await proc.exited;
	return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

export async function isGitRepo(path: string): Promise<boolean> {
	try {
		const s = await stat(join(path, ".git"));
		return s.isDirectory();
	} catch {
		return false;
	}
}

export async function initDataRepo(dataRepoPath: string): Promise<void> {
	const result = await git(dataRepoPath, "init");
	if (result.exitCode !== 0) throw new Error(`git init failed: ${result.stderr}`);
}

export async function cloneDataRepo(repoUrl: string, targetPath: string): Promise<void> {
	const proc = Bun.spawn(["git", "clone", repoUrl, targetPath], { stdout: "pipe", stderr: "pipe" });
	const stderr = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;
	if (exitCode !== 0) throw new Error(`git clone failed: ${stderr.trim()}`);
}

export async function pull(options: SyncOptions): Promise<{ updated: boolean; output: string }> {
	const remote = options.remote ?? "origin";
	const branch = options.branch ?? "main";
	const hasRemote = await git(options.dataRepoPath, "remote");
	if (!hasRemote.stdout.includes(remote)) {
		return { updated: false, output: "No remote configured" };
	}
	const result = await git(options.dataRepoPath, "pull", "--rebase", remote, branch);
	if (result.exitCode !== 0) {
		return { updated: false, output: result.stderr || result.stdout };
	}
	return { updated: !result.stdout.includes("Already up to date"), output: result.stdout };
}

export async function commitAndPush(
	options: SyncOptions,
	message: string,
): Promise<{ pushed: boolean; output: string }> {
	const { dataRepoPath } = options;
	const remote = options.remote ?? "origin";
	const branch = options.branch ?? "main";

	// Add vault files; push-map may not exist yet - filter to existing files
	const { stat: fsStat } = await import("node:fs/promises");
	const existing: string[] = [];
	for (const f of ["vault.enc.json", "vault.meta.json", "push-map.json"]) {
		try {
			await fsStat(join(dataRepoPath, f));
			existing.push(f);
		} catch {
			/* skip missing */
		}
	}
	if (existing.length === 0) return { pushed: false, output: "No files to commit" };
	const addResult = await git(dataRepoPath, "add", ...existing);
	if (addResult.exitCode !== 0) throw new Error(`git add failed: ${addResult.stderr}`);

	const diffResult = await git(dataRepoPath, "diff", "--cached", "--quiet");
	let committed = false;
	if (diffResult.exitCode !== 0) {
		const commitResult = await git(dataRepoPath, "commit", "-m", message);
		if (commitResult.exitCode !== 0) throw new Error(`git commit failed: ${commitResult.stderr}`);
		committed = true;
	}

	const hasRemote = await git(dataRepoPath, "remote");
	if (!hasRemote.stdout.includes(remote)) {
		return { pushed: false, output: committed ? "Committed locally (no remote)" : "No changes to commit" };
	}
	const pushResult = await git(dataRepoPath, "push", remote, branch);
	if (pushResult.exitCode !== 0) {
		// If already up to date, git push says Everything up-to-date but exit 0, so failure here is real
		return { pushed: false, output: `Push failed: ${pushResult.stderr}` };
	}
	// Detect if push actually transferred commits
	const didPush =
		committed ||
		!(pushResult.stdout.includes("Everything up-to-date") || pushResult.stderr.includes("Everything up-to-date"));
	return {
		pushed: didPush,
		output: pushResult.stdout || pushResult.stderr || (didPush ? "Pushed" : "Everything up-to-date"),
	};
}

async function readRemoteVault(options: SyncOptions, keyBase64: string): Promise<Vault | undefined> {
	const remote = options.remote ?? "origin";
	const branch = options.branch ?? "main";
	// Ensure we have latest remote
	await git(options.dataRepoPath, "fetch", remote);
	const show = await git(options.dataRepoPath, "show", `${remote}/${branch}:vault.enc.json`);
	if (show.exitCode !== 0) return undefined;
	try {
		const envelope = JSON.parse(show.stdout);
		const { decryptVault } = await import("./crypto.ts");
		return decryptVault(envelope, keyBase64);
	} catch {
		return undefined;
	}
}

async function tryMerge(options: SyncOptions, keyBase64: string): Promise<string[]> {
	const localVault = await loadVault(options.dataRepoPath, keyBase64);
	const remoteVault = await readRemoteVault(options, keyBase64);
	if (!remoteVault) return [];
	const { merged, conflicts } = mergeVaults(localVault, remoteVault);
	// Also need reverse: what if local has entries remote doesn't? mergeVaults already handles local->remote, but need to ensure remote entries missing locally are added
	// mergeVaults loops local then remote, so both directions covered except when remote wins and local older - already handled
	// But we also need to handle case where remote has entries that local doesn't have - already added
	// Save if different
	const localJson = JSON.stringify(localVault.entries.slice().sort((a, b) => a.name.localeCompare(b.name)));
	const mergedJson = JSON.stringify(merged.entries.slice().sort((a, b) => a.name.localeCompare(b.name)));
	if (localJson !== mergedJson) {
		await saveVault(options.dataRepoPath, merged, keyBase64);
	}
	return conflicts;
}

export async function syncDataRepo(
	options: SyncOptions,
	commitMessage = "df secrets sync",
): Promise<{ pulled: boolean; pushed: boolean; pullOutput: string; pushOutput: string; conflicts: string[] }> {
	const remote = options.remote ?? "origin";
	const branch = options.branch ?? "main";
	let conflicts: string[] = [];

	// Try pull --rebase first
	const hasRemote = await git(options.dataRepoPath, "remote");
	const hasRemoteFlag = hasRemote.stdout.includes(remote);

	if (hasRemoteFlag) {
		const pullResult = await git(options.dataRepoPath, "pull", "--rebase", remote, branch);
		if (pullResult.exitCode !== 0) {
			// Conflict? Try to abort and merge vaults if key available
			const isConflict =
				pullResult.stderr.includes("CONFLICT") ||
				pullResult.stdout.includes("CONFLICT") ||
				pullResult.stderr.includes("conflict") ||
				pullResult.stderr.includes("Failed to merge");
			if (isConflict) {
				await git(options.dataRepoPath, "rebase", "--abort").catch(() => undefined);
				if (options.keyBase64) {
					conflicts = await tryMerge(options, options.keyBase64);
				}
			}
			// Return pull output but continue to commit/push merged result
			const pushResult = await commitAndPush(options, commitMessage);
			return {
				pulled: false,
				pushed: pushResult.pushed,
				pullOutput: pullResult.stderr || pullResult.stdout,
				pushOutput: (conflicts.length ? `Conflicts: ${conflicts.join("; ")}; ` : "") + pushResult.output,
				conflicts,
			};
		}
		// Pull succeeded; still check for vault merge if key available (in case remote had unrelated changes)
		if (options.keyBase64) {
			const extraConflicts = await tryMerge(options, options.keyBase64);
			conflicts = extraConflicts;
		}
		const pushResult = await commitAndPush(options, commitMessage);
		const fullPushOutput = (conflicts.length ? `Conflicts: ${conflicts.join("; ")}; ` : "") + pushResult.output;
		return {
			pulled: !pullResult.stdout.includes("Already up to date"),
			pushed: pushResult.pushed,
			pullOutput: pullResult.stdout,
			pushOutput: fullPushOutput,
			conflicts,
		};
	}
	// No remote
	const pushResult = await commitAndPush(options, commitMessage);
	return {
		pulled: false,
		pushed: pushResult.pushed,
		pullOutput: "No remote configured",
		pushOutput: pushResult.output,
		conflicts,
	};
}
