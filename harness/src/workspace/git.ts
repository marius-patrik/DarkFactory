import { spawnSync } from "node:child_process";

/** A git command that exited non-zero; carries the arguments, exit code and git's own error output. */
export class GitError extends Error {
	/**
	 * @param args - The git arguments that failed (without the leading `git`).
	 * @param exitCode - The process exit code, or null when git could not be started.
	 * @param stderr - What git wrote to standard error.
	 */
	constructor(
		readonly args: readonly string[],
		readonly exitCode: number | null,
		readonly stderr: string,
	) {
		super(`git ${args.join(" ")} failed (exit ${exitCode ?? "spawn error"}): ${stderr.trim()}`);
		this.name = "GitError";
	}
}

export class GitAuthError extends GitError {
	constructor(stderr: string) {
		super([], null, stderr);
		this.name = "GitAuthError";
	}
}

export class GitNetworkError extends GitError {
	constructor(stderr: string) {
		super([], null, stderr);
		this.name = "GitNetworkError";
	}
}

export class GitConflictError extends GitError {
	constructor(stderr: string) {
		super([], null, stderr);
		this.name = "GitConflictError";
	}
}

export function parseGitError(stderr: string, args: readonly string[] = [], exitCode: number | null = 1): GitError {
	if (stderr.includes("Authentication failed") || stderr.includes("could not read Username")) {
		return new GitAuthError(stderr);
	}
	if (stderr.includes("fatal: unable to access") || stderr.includes("Could not resolve host")) {
		return new GitNetworkError(stderr);
	}
	if (stderr.includes("conflict") || stderr.includes("fix conflicts")) {
		return new GitConflictError(stderr);
	}
	return new GitError(args, exitCode, stderr);
}

/** Options for {@link runGit}. */
export interface RunGitOptions {
	/** Extra environment variables for this git call (e.g. `GIT_AUTHOR_NAME`). */
	env?: Record<string, string>;
	/** Text written to git's standard input. */
	input?: string;
	/** Milliseconds before the git process is killed; default 120000. */
	timeoutMs?: number;
}

/**
 * Runs `git <args>` inside `repoDir` and returns its trimmed standard output.
 *
 * Every workspace operation goes through this function: arguments are passed as an array (no shell, so branch
 * names and paths are never interpreted) and the working directory is always the given repository, never the
 * process's current directory — a worktree test once ran `git worktree add` against the caller's own checkout.
 *
 * @param repoDir - Repository or worktree directory the command runs in.
 * @param args - Git arguments, e.g. `["status", "--porcelain"]`.
 * @param options - Environment, standard input and timeout.
 * @returns Standard output without trailing whitespace.
 * @throws {GitError} When git exits non-zero or cannot be started.
 */
export function runGit(repoDir: string, args: readonly string[], options: RunGitOptions = {}): string {
	if (!repoDir) throw new Error("runGit requires an explicit repository directory");
	if (repoDir.startsWith("-")) throw new Error("Repository directory cannot start with a hyphen");

	// Pre-flight check: ensure git is installed
	try {
		spawnSync("git", ["--version"]);
	} catch {
		throw new Error("Git is not installed or not accessible in $PATH.");
	}

	const result = spawnSync("git", ["-c", "core.askpass=true", ...args], {
		cwd: repoDir,
		encoding: "utf8",
		input: options.input,
		timeout: options.timeoutMs ?? 120_000,
		env: { ...process.env, GIT_TERMINAL_PROMPT: "0", ...options.env },
		windowsHide: true,
	});
	if (result.error) throw new GitError(args, null, result.error.message);
	if (result.status !== 0) throw parseGitError(result.stderr ?? "", args, result.status);
	return (result.stdout ?? "").trimEnd();
}
