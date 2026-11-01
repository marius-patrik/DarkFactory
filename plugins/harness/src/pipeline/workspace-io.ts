/**
 * The working copy the pipeline mutates, behind one port.
 *
 * Ported from the git, formatter, test-suite and `time.sleep` calls `handle_implement` and
 * `handle_plan_alignment` make in `.github/scripts/agent_runner.py`. The Python reached for those
 * through `subprocess` and `shutil.which`; this port states them as a surface, so a handler's
 * sequence of operations can be asserted without a real repository, a real `bun`, and a sixty-second
 * wait for a pull request to appear.
 *
 * This is a port and not a second git client. The implementation below is the only code here that
 * starts a process, and it goes through the repository's own {@link runGit} so the safety
 * properties that function already guarantees - arguments as an array, an explicit repository
 * directory, no interactive credential prompt - hold here too.
 */

import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { runGit } from "../workspace/git.ts";
import { errorMessage } from "./pipeline-io.ts";

/** The committer identity the pipeline commits under; the Python's `GIT_BOT_NAME`/`GIT_BOT_EMAIL`. */
const GIT_BOT_NAME = "github-actions[bot]";

/** The committer email the pipeline commits under. */
const GIT_BOT_EMAIL = "41898282+github-actions[bot]@users.noreply.github.com";

/**
 * One test suite's result, as `subprocess.CompletedProcess` carried it.
 *
 * `args` is kept because the pull request body quotes the command the suite ran, and that command
 * is the process's argv rather than anything the suite printed.
 */
export interface VerificationResult {
	/** The command that ran, argv without any shell. */
	args: string[];
	/** The suite's exit status. */
	returncode: number;
	/** The suite's standard output. */
	stdout: string;
	/** The suite's standard error. */
	stderr: string;
}

/** What one `formatRepository` pass did. */
interface FormatterRun {
	/** The human-readable names of the formatters that ran. */
	ran: string[];
	/** One notice per formatter that was present and failed. */
	notices: string[];
}

/** A completed command, whether it succeeded. */
interface CompletedCommand {
	returncode: number;
	stdout: string;
	stderr: string;
}

/** What {@link WorkspaceIo.removePath} found at a path. */
type RemovedPath = "file" | "directory" | undefined;

/**
 * Everything the pipeline's implementation and verification stages do to the working copy.
 *
 * Every method except {@link WorkspaceIo.resolveBaseRefs} and {@link WorkspaceIo.sleep} throws when
 * the underlying process fails, which is the Python's `run_git` behaviour: the caller decides
 * whether a given failure is fatal by catching it at the point the Python caught it.
 */
export interface WorkspaceIo {
	/**
	 * Give the container's git a committer identity and trust the mounted working copy.
	 *
	 * Never throws. The Python's `configure_git_identity` caught every failure and printed a notice,
	 * because a container with no global identity still commits fine once a local one is set, and a
	 * stage that treats this as fatal never gets that far.
	 *
	 * @returns A notice per command that failed, for the caller to report. Empty when all five set.
	 */
	configureGitIdentity(): string[];

	/**
	 * Run `git <args>` in the workspace and return its standard output.
	 *
	 * @param args - The git subcommand and its arguments.
	 * @returns Standard output, without trailing whitespace.
	 * @throws When git exits non-zero, carrying git's own stderr in the message.
	 */
	git(args: readonly string[]): string;

	/**
	 * Remove a path from the working copy, and report what was there.
	 *
	 * The Python reached for `os.path.isfile`/`islink`, then `os.remove`, and separately for
	 * `os.path.isdir` then `shutil.rmtree`, because the two cases reach for different git commands
	 * afterwards. Reporting which of them applied keeps that difference in the caller, where the git
	 * call is made, rather than hiding it in the removal.
	 *
	 * @param path - The repository-relative path to remove.
	 * @returns `"file"` for a file or a symlink, `"directory"` for a directory, and `undefined` when
	 *   nothing is there.
	 */
	removePath(path: string): RemovedPath;

	/**
	 * The base refs that actually resolve in the workspace, in preference order.
	 *
	 * A shallow checkout holds one commit and no other refs, so a diff against `origin/<base>` can
	 * fail purely because the base was never fetched. That is a different condition from an empty
	 * diff, and the caller has to be able to tell them apart - which is why this throws naming the
	 * base and the refs that do exist rather than returning an empty list.
	 *
	 * @param base - The base branch name to resolve.
	 * @returns The resolvable refs among `origin/<base>...HEAD`, `<base>...HEAD`, `origin/<base>`
	 *   and `<base>`, in that order.
	 * @throws When no candidate ref resolves.
	 */
	resolveBaseRefs(base: string): string[];

	/**
	 * Run every formatter whose manifest and executable are both available.
	 *
	 * Formatting is never a review topic, so the agent normalises the tree itself before
	 * committing; a formatter that is absent, or that fails, is reported and skipped rather than
	 * failing the run.
	 *
	 * @returns The names of the formatters that ran, and a notice per formatter that failed.
	 */
	formatRepository(): FormatterRun;

	/**
	 * Run every declared test suite, returning on the first failure.
	 *
	 * Stopping at the first failure is deliberate: the agent's fix prompt is given the output that
	 * actually matters, not a concatenation of every suite.
	 *
	 * @returns The first failing suite, or the last suite that ran. A synthetic success is returned
	 *   when the repository declares no suite at all.
	 */
	verifyRepository(): VerificationResult;

	/**
	 * Wait, as the Python's `time.sleep` did between pull request polls.
	 *
	 * @param ms - Milliseconds to wait.
	 */
	sleep(ms: number): Promise<void>;
}

/** The base refs `resolve_base_refs` tries, in preference order. */
const BASE_REF_CANDIDATES = (base: string): string[] => [
	`origin/${base}...HEAD`,
	`${base}...HEAD`,
	`origin/${base}`,
	base,
];

/** The git identity commands `configure_git_identity` runs, in order. */
function gitIdentityCommands(): string[][] {
	return [
		["config", "--global", "--add", "safe.directory", "*"],
		["config", "--global", "user.name", GIT_BOT_NAME],
		["config", "--global", "user.email", GIT_BOT_EMAIL],
		["config", "user.name", GIT_BOT_NAME],
		["config", "user.email", GIT_BOT_EMAIL],
	];
}

/** A process runner, so the workspace implementation can be exercised without a repository. */
export type CommandRunner = (command: readonly string[]) => CompletedCommand;

/**
 * The suites `verify_repository` runs when their manifest is present, in order.
 *
 * The Python's list, unchanged: a Python repository's suite runs before a Node one, and a Rust
 * workspace's before either. A suite whose executable is missing is an explicit failure rather than
 * a skip, because a run that quietly verified nothing is worse than one that says it could not.
 */
const SUITES: ReadonlyArray<{ manifest: string; command: readonly string[] }> = [
	{ manifest: "pyproject.toml", command: ["python3", "-m", "pytest", "tests/", "-q"] },
	{ manifest: "Cargo.toml", command: ["cargo", "test", "--workspace", "--quiet"] },
];

/**
 * Resolve one declared package script through a Node-compatible runner available in the image.
 *
 * The agent image is Bun-first and does not guarantee npm, so a root `package.json` identifies a
 * Node workspace rather than a specific package-manager binary. `packageManager` is honoured when it
 * names a runner that exists; the rest are tried in a fixed order.
 *
 * @param workspaceDir - The working directory to read `package.json` from.
 * @param script - The package script name.
 * @param which - Whether an executable is on PATH, for the resolution to try.
 * @returns The command to run, or `undefined` when the script is undeclared or no runner exists.
 */
function nodeScriptCommand(
	workspaceDir: string,
	script: string,
	which: (executable: string) => boolean,
): string[] | undefined {
	let pkg: unknown;
	try {
		pkg = JSON.parse(readFileSync(join(workspaceDir, "package.json"), "utf8"));
	} catch {
		return undefined;
	}
	if (pkg === null || typeof pkg !== "object") return undefined;
	const declared = pkg as { scripts?: unknown; packageManager?: unknown };
	if (declared.scripts === null || typeof declared.scripts !== "object") return undefined;
	const scriptBody = (declared.scripts as Record<string, unknown>)[script];
	if (typeof scriptBody !== "string") return undefined;

	const manager = typeof declared.packageManager === "string" ? declared.packageManager.split("@")[0] : undefined;
	const known = ["bun", "pnpm", "npm", "yarn"];
	const runners = manager && known.includes(manager) ? [manager as string] : [];
	for (const name of known) {
		if (!runners.includes(name)) runners.push(name);
	}
	for (const runner of runners) {
		if (!which(runner)) continue;
		// `yarn <script>` is the one runner that takes no `run`; the rest would treat it as a script
		// named `run`.
		return runner === "yarn" ? [runner, script] : [runner, "run", script];
	}
	return undefined;
}

/**
 * Whether an executable is on `PATH`.
 *
 * @param executable - The program to look for.
 * @returns `true` when the shell can find it.
 */
function onPath(executable: string): boolean {
	const probe = spawnSync(executable, ["--version"], { stdio: "ignore" });
	return probe.error === undefined && probe.status !== null;
}

/**
 * The {@link WorkspaceIo} over a real working copy.
 *
 * @param workspaceDir - The working directory every command runs in.
 * @param run - The process runner; defaults to a `spawnSync` runner with no shell.
 * @param which - Whether an executable is on PATH; defaults to a `spawnSync` probe.
 * @param sleep - How to wait; defaults to a real timer.
 * @returns The port.
 */
export function localWorkspaceIo(
	workspaceDir: string,
	options: {
		run?: CommandRunner;
		which?: (executable: string) => boolean;
		sleep?: (ms: number) => Promise<void>;
	} = {},
): WorkspaceIo {
	const run: CommandRunner =
		options.run ??
		((command) => {
			const result = spawnSync(command[0] as string, command.slice(1), {
				cwd: workspaceDir,
				encoding: "utf8",
				timeout: 120_000,
				windowsHide: true,
			});
			return {
				returncode: result.status ?? 1,
				stdout: result.stdout ?? "",
				stderr: result.error?.message ?? result.stderr ?? "",
			};
		});
	const which = options.which ?? onPath;
	const wait = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

	/** Run a command, tolerating a failure the Python's `subprocess.run` would not have raised on. */
	const attempt = (command: readonly string[]): CompletedCommand => {
		try {
			return run(command);
		} catch (error) {
			return { returncode: 1, stdout: "", stderr: errorMessage(error) };
		}
	};

	return {
		configureGitIdentity() {
			const notices: string[] = [];
			for (const args of gitIdentityCommands()) {
				try {
					runGit(workspaceDir, args);
				} catch (error) {
					// Reported by the caller rather than thrown: the Python printed this to stderr and
					// carried on, and a local identity still makes a commit work.
					notices.push(`Git config notice: ${errorMessage(error)}`);
				}
			}
			return notices;
		},

		git(args) {
			return runGit(workspaceDir, args);
		},

		removePath(path) {
			const full = join(workspaceDir, path);
			// A symlink is stat-ed before its target, so `isFile` on a dangling link is false and
			// `isSymbolicLink` is not - which is the Python's `isfile(...) or islink(...)`.
			const stats = lstatSync(full, { throwIfNoEntry: false });
			if (!stats) return undefined;
			if (stats.isSymbolicLink() || stats.isFile()) {
				rmSync(full, { force: true });
				return "file";
			}
			if (stats.isDirectory()) {
				rmSync(full, { recursive: true, force: true });
				return "directory";
			}
			return undefined;
		},

		resolveBaseRefs(base) {
			const resolvable: string[] = [];
			for (const ref of BASE_REF_CANDIDATES(base)) {
				// The base endpoint is verified rather than the range: `git rev-parse --verify a...b`
				// reports failure for an empty range, which a base equal to HEAD legitimately
				// produces.
				const endpoint = ref.endsWith("...HEAD") ? ref.slice(0, -"...HEAD".length) : ref;
				try {
					runGit(workspaceDir, ["rev-parse", "--verify", "--quiet", `${endpoint}^{commit}`]);
					resolvable.push(ref);
				} catch {
					// Not resolvable in this workspace; the next candidate is tried.
				}
			}
			if (resolvable.length > 0) return resolvable;
			let available = "";
			try {
				available = runGit(workspaceDir, ["for-each-ref", "--format=%(refname:short)", "refs/remotes", "refs/heads"]);
			} catch (error) {
				available = errorMessage(error);
			}
			throw new Error(
				`Cannot resolve base branch '${base}' in ${workspaceDir}; none of ${BASE_REF_CANDIDATES(base).join(", ")} exist. ` +
					`Refusing to report an empty diff against a base that does not exist. ` +
					`Refs present: ${available || "(none)"}.`,
			);
		},

		formatRepository() {
			const ran: string[] = [];
			const notices: string[] = [];
			const formatters: Array<{ name: string; manifest: string; command: readonly string[] }> = [
				{ name: "black", manifest: "pyproject.toml", command: ["black", "."] },
				{ name: "cargo fmt", manifest: "Cargo.toml", command: ["cargo", "fmt", "--all"] },
			];
			const nodeFormat = nodeScriptCommand(workspaceDir, "format", which);
			if (nodeFormat) formatters.push({ name: "web formatter", manifest: "package.json", command: nodeFormat });

			for (const formatter of formatters) {
				if (!existsSync(join(workspaceDir, formatter.manifest))) continue;
				if (!which(formatter.command[0] as string)) continue;
				const result = attempt(formatter.command);
				if (result.returncode === 0) {
					ran.push(formatter.name);
				} else {
					notices.push(`Formatter ${formatter.name} notice: ${result.stderr.slice(-500)}`);
				}
			}
			return { ran, notices };
		},

		verifyRepository() {
			const suites = [...SUITES];
			if (existsSync(join(workspaceDir, "package.json"))) {
				const nodeTest = nodeScriptCommand(workspaceDir, "test", which);
				// A declared Node test with no available runner fails explicitly: a run that reported
				// success having verified nothing is the worse outcome.
				if (!nodeTest) {
					return {
						args: ["node-package-runner"],
						returncode: 127,
						stdout: "",
						stderr: "package.json declares a test script but no Bun/npm/pnpm/yarn runner is available",
					};
				}
				suites.push({ manifest: "package.json", command: nodeTest });
			}

			let last: VerificationResult = { args: ["true"], returncode: 0, stdout: "", stderr: "" };
			for (const suite of suites) {
				if (!existsSync(join(workspaceDir, suite.manifest))) continue;
				if (!which(suite.command[0] as string)) {
					return {
						args: [...suite.command],
						returncode: 127,
						stdout: "",
						stderr: `Required verification executable is unavailable: ${suite.command[0] as string}`,
					};
				}
				const result = attempt(suite.command);
				last = { args: [...suite.command], ...result };
				if (last.returncode !== 0) return last;
			}
			return last;
		},

		sleep: wait,
	};
}
