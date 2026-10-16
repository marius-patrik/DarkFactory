import { availableParallelism } from "node:os";
import { existsSync, realpathSync } from "node:fs";
import { delimiter, isAbsolute, join, relative, resolve, sep } from "node:path";
import { runVerify, type VerifyResult } from "../workspace/runVerify.ts";

/** One planned action of the official DF capability quality inventory. */
export interface QualityAction {
	id: string;
	packageId: string;
	kind: "test" | "lint" | "format_check" | "typecheck";
	command: string;
	cwd: string;
	ecosystem: string;
	packageManager: string;
	version?: string;
	setupCommand?: string;
	setupCwd?: string;
}

export interface QualityActionResult {
	id: string;
	command: string;
	cwd: string;
	result?: VerifyResult;
	blocked?: string;
}

export interface QualitySummary {
	planned: number;
	executed: number;
	passed: number;
	failed: number;
	blocked: number;
	results: QualityActionResult[];
}

/**
 * Execute a lossless quality plan on one machine. Install shared dependencies
 * once per manager root, then schedule independent package lanes concurrently.
 * All actions of one package/version lane run serially, preserving test isolation.
 */
export async function executeQualityPlan(
	repoDir: string,
	actions: readonly QualityAction[],
	options: {
		workers?: number;
		timeoutMs?: number;
		execute?: (command: string, cwd: string, timeoutMs: number) => Promise<VerifyResult>;
		log?: (message: string) => void;
	} = {},
): Promise<QualitySummary> {
	const root = resolve(repoDir);
	const log = options.log ?? (() => {});
	const requested = options.workers ?? Math.min(4, availableParallelism());
	if (!Number.isInteger(requested) || requested < 1 || requested > 32) {
		throw new Error("Quality worker count must be an integer between 1 and 32");
	}
	if (actions.length === 0) throw new Error("No executable quality actions were detected");
	const timeoutMs = options.timeoutMs ?? 15 * 60_000;
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
		throw new Error("Quality timeout must be a positive finite number");
	const execute =
		options.execute ??
		(async (command, cwd, timeout) => {
			const previous = process.env.PATH ?? "";
			// Package-local and manager-root tools are both accessible without a second install.
			const envPath = [join(cwd, "node_modules", ".bin"), join(root, "node_modules", ".bin"), previous].join(delimiter);
			return runVerify({ command, worktree: cwd, timeoutMs: timeout, env: { ...process.env, PATH: envPath } });
		});
	function safeDirectory(path: string): string {
		const full = resolve(root, path);
		const rel = relative(root, full);
		if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) {
			throw new Error(`Quality path escapes repository: ${path}`);
		}
		// Lexical containment alone is insufficient: a package directory may be a
		// symlink to a path outside the checkout. Validate the resolved filesystem.
		if (existsSync(full) && existsSync(root)) {
			const actual = realpathSync(full);
			const actualRoot = realpathSync(root);
			const actualRel = relative(actualRoot, actual);
			if (actualRel === ".." || actualRel.startsWith(".." + sep) || isAbsolute(actualRel))
				throw new Error(`Quality path escapes repository through symlink: ${path}`);
		}
		return full;
	}
	async function tryExecute(command: string, cwd: string): Promise<VerifyResult> {
		try {
			return await execute(command, cwd, timeoutMs);
		} catch (cause) {
			return {
				exitCode: 127,
				timedOut: false,
				outputTail: cause instanceof Error ? cause.message : String(cause),
			};
		}
	}

	const seenIds = new Set<string>();
	const setupByDirectory = new Map<string, { command: string; cwd: string }>();
	const lanes = new Map<string, { actions: { action: QualityAction; index: number }[]; setupKey?: string }>();
	actions.forEach((action, index) => {
		if (seenIds.has(action.id)) throw new Error(`Duplicate quality action ID: ${action.id}`);
		seenIds.add(action.id);
		if (!action.command?.trim()) throw new Error(`Missing command for ${action.id}`);
		safeDirectory(action.cwd);
		let setupKey: string | undefined;
		if (action.setupCommand) {
			setupKey = safeDirectory(action.setupCwd ?? action.cwd);
			const prior = setupByDirectory.get(setupKey);
			if (prior && prior.command !== action.setupCommand)
				throw new Error(`Conflicting dependency setup commands for ${setupKey}`);
			setupByDirectory.set(setupKey, { command: action.setupCommand, cwd: setupKey });
		}
		const laneKey = `${action.packageId}\u0000${action.version ?? ""}`;
		const lane = lanes.get(laneKey) ?? { actions: [], setupKey };
		if (lane.setupKey !== setupKey) throw new Error(`Inconsistent setup within ${laneKey}`);
		lane.actions.push({ action, index });
		lanes.set(laneKey, lane);
	});

	// Dependency installers may modify one shared workspace: never race installs.
	const failedSetups = new Map<string, string>();
	for (const [key, setup] of setupByDirectory) {
		log(`SETUP ${relative(root, key) || "."}: ${setup.command}`);
		const result = await tryExecute(setup.command, setup.cwd);
		if (result.exitCode !== 0) {
			const message = `setup failed (exit ${result.exitCode}): ${setup.command}\n${result.outputTail}`;
			failedSetups.set(key, message);
			log(`FAIL ${message}`);
		}
	}

	const results: QualityActionResult[] = new Array(actions.length);
	const work = [...lanes.values()];
	let cursor = 0;
	async function worker(): Promise<void> {
		while (cursor < work.length) {
			const lane = work[cursor++];
			if (!lane) continue;
			for (const { action, index } of lane.actions) {
				const blocked = lane.setupKey ? failedSetups.get(lane.setupKey) : undefined;
				if (blocked) {
					results[index] = { id: action.id, command: action.command, cwd: action.cwd, blocked };
					log(`BLOCKED ${action.id}: ${blocked}`);
					continue;
				}
				const outcome = await tryExecute(action.command, safeDirectory(action.cwd));
				results[index] = { id: action.id, command: action.command, cwd: action.cwd, result: outcome };
				log(`${outcome.exitCode === 0 ? "PASS" : "FAIL"} ${action.id} (exit ${outcome.exitCode})`);
				if (outcome.exitCode !== 0) log(outcome.outputTail);
			}
		}
	}
	await Promise.all(Array.from({ length: Math.min(requested, work.length) }, () => worker()));
	const summary: QualitySummary = {
		planned: actions.length,
		executed: results.filter((entry) => entry?.result !== undefined).length,
		passed: results.filter((entry) => entry?.result?.exitCode === 0).length,
		failed: results.filter((entry) => entry?.result && entry.result.exitCode !== 0).length,
		blocked: results.filter((entry) => entry?.blocked !== undefined).length,
		results,
	};
	if (summary.executed + summary.blocked !== summary.planned) {
		throw new Error(`Quality coverage discrepancy: ${JSON.stringify(summary)}`);
	}
	return summary;
}
