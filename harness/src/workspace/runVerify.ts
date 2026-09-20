import { join, resolve } from "node:path";
import {
	actionsForTouchedFiles,
	resolveDetectedRepositoryActions,
	type ResolvedRepositoryAction,
} from "@darkfactory/capability/actions";
import { detectRepositoryEvidence } from "@darkfactory/core/repository-evidence";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";

/** Result of a verification command run via {@link runVerify}. */
export interface VerifyResult {
	/** Exit code of the command; 124 when it was killed by the timeout, 127 when it could not start. */
	exitCode: number;
	/** True when the command (and every process it started) was killed by the timeout. */
	timedOut: boolean;
	/** The last `tailBytes` characters of the combined stdout and stderr, in the order they were written. */
	outputTail: string;
}

/** Options for {@link runVerify}. */
export interface RunVerifyOptions {
	/** Directory the command runs in; required. */
	worktree: string;
	/** Shell command line from configuration, e.g. `bun test`. */
	command: string;
	/** Milliseconds before the whole process tree is killed. */
	timeoutMs: number;
	/** Characters of output to keep; default 4096. */
	tailBytes?: number;
}

/**
 * Kills a process and everything it started. A shell's children keep the output pipes open, so killing only the
 * shell leaves the caller waiting for the grandchild (spawnSync with a timeout hung this way on Windows).
 *
 * @param child - The spawned shell.
 */
function killTree(child: ChildProcess): void {
	if (child.pid === undefined) return;
	if (process.platform === "win32") {
		spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
		return;
	}
	try {
		process.kill(-child.pid, "SIGKILL");
	} catch {
		child.kill("SIGKILL");
	}
}

/**
 * Runs a configured verification command inside a worktree and reports its outcome without throwing.
 *
 * The command runs through the platform shell with `cwd` set to `worktree` (never the process directory). When it
 * exceeds `timeoutMs`, the command and every process it started are killed.
 *
 * @param options - Worktree, command, timeout and output tail size.
 * @returns Exit code, timeout flag and the tail of the combined output.
 * @throws Error when `worktree` is empty.
 */
export function runVerify({ worktree, command, timeoutMs, tailBytes = 4096 }: RunVerifyOptions): Promise<VerifyResult> {
	if (!worktree) throw new Error("runVerify requires an explicit worktree directory");
	return new Promise((resolve) => {
		let output = "";
		let timedOut = false;
		let settled = false;
		const keep = (chunk: Buffer | string) => {
			output = (output + chunk.toString()).slice(-tailBytes);
		};
		const finish = (result: VerifyResult) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve(result);
		};
		const child = spawn(command, {
			cwd: worktree,
			shell: true,
			windowsHide: true,
			// Its own process group on POSIX, so the timeout can kill the whole tree.
			detached: process.platform !== "win32",
		});
		const timer = setTimeout(() => {
			timedOut = true;
			killTree(child);
		}, timeoutMs);
		child.stdout?.on("data", keep);
		child.stderr?.on("data", keep);
		child.on("error", (error) =>
			finish({ exitCode: 127, timedOut: false, outputTail: `${output}${error.message}`.slice(-tailBytes) }),
		);
		child.on("close", (code, signal) =>
			finish({ exitCode: timedOut ? 124 : (code ?? (signal ? 1 : 0)), timedOut, outputTail: output }),
		);
	});
}

/** Options for canonical touched-package verification. */
export interface RunDetectedVerificationOptions {
	repoDir: string;
	changedFiles: readonly string[];
	capabilitiesRoot?: string;
	timeoutMs?: number;
}

/** Result for one touched-package verification action, including explicit unsupported gaps. */
export interface DetectedVerificationResult {
	action: ResolvedRepositoryAction;
	result?: VerifyResult;
}

/**
 * Runs the canonical detected test/lint/format actions for packages touched by a chunk.
 * No command table or fallback inference exists here; unsupported actions remain explicit results.
 */
export async function runDetectedVerification(
	options: RunDetectedVerificationOptions,
): Promise<DetectedVerificationResult[]> {
	const repoDir = resolve(options.repoDir);
	const evidence = await detectRepositoryEvidence(repoDir);
	const resolution = await resolveDetectedRepositoryActions(
		evidence,
		options.capabilitiesRoot ?? join(repoDir, "capabilities"),
	);
	const actions = actionsForTouchedFiles(resolution, options.changedFiles);
	const results: DetectedVerificationResult[] = [];
	for (const action of actions) {
		if (!action.supported || !action.command) {
			results.push({ action });
			continue;
		}
		results.push({
			action,
			result: await runVerify({
				worktree: resolve(repoDir, action.cwd),
				command: action.command,
				timeoutMs: options.timeoutMs ?? 15 * 60_000,
			}),
		});
	}
	return results;
}
