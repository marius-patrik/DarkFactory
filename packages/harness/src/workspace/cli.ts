import { statSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { runGit } from "./git.ts";
import {
	abortOperation,
	continueOperation,
	fetch,
	getConflictState,
	getDiff,
	getGitStatus,
	getLog,
} from "./gitWorkspace.ts";

/**
 * Validates that the path is a valid git repository directory with proper permissions and existence checks.
 */
function validateRepoPath(repoPath: string): void {
	if (!repoPath || typeof repoPath !== "string") {
		throw new Error(`Invalid repository path: ${repoPath}`);
	}
	if (repoPath.startsWith("-")) {
		throw new Error(`Repository path cannot start with a hyphen: ${repoPath}`);
	}
	const resolved = resolve(repoPath);
	try {
		// Use lstatSync to detect symlinks and avoid unexpected behavior with existSync/statSync
		const stats = statSync(resolved);
		if (!stats.isDirectory()) {
			throw new Error(`Path ${repoPath} is not a directory.`);
		}
	} catch (error: unknown) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ENOENT") {
			throw new Error(`Path ${repoPath} does not exist.`);
		}
		if (code === "EACCES") {
			throw new Error(`Permission denied for path ${repoPath}.`);
		}
		throw new Error(`Failed to access path ${repoPath}: ${error instanceof Error ? error.message : String(error)}`);
	}
	try {
		// git rev-parse --git-dir returns the git directory or worktree git-dir
		runGit(resolved, ["rev-parse", "--git-dir"]);
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Path ${repoPath} is not a valid Git repository: ${error.message}`);
		}
		throw new Error(`Path ${repoPath} is not a valid Git repository.`);
	}
}

const DEFAULT_LOG_LIMIT = 20;

function getUpstreamRemote(repoPath: string): string {
	try {
		const currentBranch = runGit(repoPath, ["branch", "--show-current"]);
		if (currentBranch) {
			const remote = runGit(repoPath, ["config", "--get", `branch.${currentBranch}.remote`]);
			if (remote) {
				const remotes = runGit(repoPath, ["remote"]).split(/\r?\n/);
				if (remotes.includes(remote)) {
					return remote;
				}
			}
		}
	} catch {}

	// Fallback to origin if it exists
	try {
		const remotes = runGit(repoPath, ["remote"]).split(/\r?\n/);
		if (remotes.includes("origin")) {
			return "origin";
		}
	} catch {}

	throw new Error("No upstream branch tracked and no default 'origin' remote found.");
}

/**
 * Checks for conflict state and warns the user.
 */
function checkConflictState(repoPath: string): void {
	const conflict = getConflictState(repoPath);
	if (conflict.operation !== "none") {
		process.stderr.write(`\n⚠️ Warning: Repository in conflict state (${conflict.operation}).\n`);
	}
}

/**
 * Runs the workspace CLI subcommand router.
 *
 * @param args - Subcommand and arguments.
 */
export async function runWorkspaceCli(args: string[]): Promise<void> {
	const program = new Command();
	program.exitOverride();

	program
		.name("df workspace")
		.description("Workspace management commands")
		.option("--repo <path>", "Repository path", process.cwd())
		.hook("preAction", (thisCommand) => {
			const repoPath = thisCommand.opts().repo;
			try {
				validateRepoPath(repoPath);
			} catch (e) {
				program.error((e as Error).message);
			}
			if (thisCommand.name() !== "status" && thisCommand.name() !== "abort" && thisCommand.name() !== "continue") {
				checkConflictState(repoPath);
			}
		});

	program.configureOutput({
		writeErr: (str) => process.stderr.write(str),
	});

	program
		.command("status")
		.description("Show workspace status")
		.option("--json", "Output in JSON format")
		.action((options) => {
			try {
				const repoPath = program.opts().repo;
				const status = getGitStatus(repoPath);
				const conflict = getConflictState(repoPath);
				if (options.json) {
					console.log(JSON.stringify({ ...status, conflict }, null, 2));
					return;
				}
				console.log(`Branch: ${status.branch}`);
				console.log(`Dirty: ${status.isDirty}`);
				console.log(`In-progress Operation: ${status.inProgressOperation}`);
				if (status.changedFiles.length > 0) {
					console.log("Changed Files:");
					for (const file of status.changedFiles) {
						console.log(`  ${file}`);
					}
				}
				if (conflict.operation !== "none") {
					console.log("\n⚠️ Conflict State Detected:");
					console.log(`  Operation: ${conflict.operation}`);
					if (conflict.base) console.log(`  Base: ${conflict.base}`);
					if (conflict.head) console.log(`  Head: ${conflict.head}`);
					console.log(`  Conflicted Files: ${conflict.conflictedPaths.join(", ") || "none"}`);
					console.log(`  Actionable Commands:`);
					console.log(`    Continue: ${conflict.continuationCommands.continue}`);
					console.log(`    Abort: ${conflict.continuationCommands.abort}`);
				}
			} catch (error) {
				program.error(`Error: ${(error as Error).message}`);
			}
		});

	program
		.command("diff")
		.description("Show diff")
		.option("--staged", "Show staged changes")
		.option("--base <ref>", "Base reference")
		.action((options) => {
			try {
				const repoPath = program.opts().repo;
				const diffOutput = getDiff(repoPath, { staged: options.staged, base: options.base });
				console.log(diffOutput);
			} catch (error) {
				program.error(`Error: ${(error as Error).message}`);
			}
		});

	program
		.command("log")
		.description("Show log")
		.option("--limit <n>", "Limit the number of commits", DEFAULT_LOG_LIMIT.toString())
		.action((options) => {
			try {
				const repoPath = program.opts().repo;
				const limit = Number.parseInt(options.limit, 10);
				if (Number.isNaN(limit) || limit <= 0) {
					program.error("Error: --limit must be a positive integer.");
				}
				if (limit > 1000) {
					program.error("Error: --limit cannot exceed 1000.");
				}
				const logLines = getLog(repoPath, limit);
				for (const line of logLines) {
					console.log(line);
				}
			} catch (error) {
				program.error(`Error: ${(error as Error).message}`);
			}
		});

	program
		.command("fetch")
		.description("Fetch from remote")
		.option("--remote <remote>", "Remote name (defaults to upstream remote)")
		.action((options) => {
			try {
				const repoPath = program.opts().repo;
				const remote = options.remote ?? getUpstreamRemote(repoPath);

				const remotes = runGit(repoPath, ["remote"]).split(/\r?\n/);
				if (!remotes.includes(remote)) {
					program.error(`Error: remote '${remote}' does not exist.`);
				}

				fetch(repoPath, remote);
				console.log(`Fetched from ${remote}.`);
			} catch (error) {
				program.error(`Error: ${(error as Error).message}`);
			}
		});

	program
		.command("continue")
		.description("Continue an in-progress operation")
		.action(() => {
			try {
				const repoPath = program.opts().repo;
				continueOperation(repoPath);
				console.log("Operation continued successfully.");
			} catch (error) {
				program.error(`Error: ${(error as Error).message}`);
			}
		});

	program
		.command("abort")
		.description("Abort an in-progress operation")
		.action(() => {
			try {
				const repoPath = program.opts().repo;
				abortOperation(repoPath);
				console.log("Operation aborted successfully.");
			} catch (error) {
				program.error(`Error: ${(error as Error).message}`);
			}
		});

	await program.parseAsync(args, { from: "user" });
}
