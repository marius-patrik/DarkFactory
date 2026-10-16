import { availableParallelism, tmpdir } from "node:os";
import { existsSync, realpathSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
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
		execute?: (command: string, cwd: string, timeoutMs: number, env?: NodeJS.ProcessEnv) => Promise<VerifyResult>;
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
		(async (command, cwd, timeout, environment) => {
			const env = { ...process.env, ...environment };
			// Package-local and manager-root tools are both accessible without a second install.
			const envPath = [join(cwd, "node_modules", ".bin"), join(root, "node_modules", ".bin"), env.PATH ?? ""].join(
				delimiter,
			);
			return runVerify({ command, worktree: cwd, timeoutMs: timeout, env: { ...env, PATH: envPath } });
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
	async function tryExecute(command: string, cwd: string, environment?: NodeJS.ProcessEnv): Promise<VerifyResult> {
		try {
			return await execute(command, cwd, timeoutMs, environment);
		} catch (cause) {
			return {
				exitCode: 127,
				timedOut: false,
				outputTail: cause instanceof Error ? cause.message : String(cause),
			};
		}
	}

	const seenIds = new Set<string>();
	const setupByDirectory = new Map<string, { command: string; cwd: string; pythonVersion?: string }>();
	const lanes = new Map<string, { actions: { action: QualityAction; index: number }[]; setupKey?: string }>();
	actions.forEach((action, index) => {
		if (seenIds.has(action.id)) throw new Error(`Duplicate quality action ID: ${action.id}`);
		seenIds.add(action.id);
		if (!action.command?.trim()) throw new Error(`Missing command for ${action.id}`);
		if (action.version && (action.ecosystem !== "python" || !/^3\.\d{1,2}(?:\.\d{1,2})?$/.test(action.version)))
			throw new Error(`Unverified interpreter/runtime version for ${action.id}: ${action.version}`);
		safeDirectory(action.cwd);
		let setupKey: string | undefined;
		if (action.setupCommand) {
			const cwd = safeDirectory(action.setupCwd ?? action.cwd);
			setupKey = JSON.stringify([cwd, action.ecosystem === "python" ? (action.version ?? null) : null]);
			const prior = setupByDirectory.get(setupKey);
			if (prior && prior.command !== action.setupCommand)
				throw new Error(`Conflicting dependency setup commands for ${cwd}`);
			setupByDirectory.set(setupKey, {
				command: action.setupCommand,
				cwd,
				...(action.ecosystem === "python" && action.version ? { pythonVersion: action.version } : {}),
			});
		}
		const laneKey = `${action.packageId}\u0000${action.version ?? ""}`;
		const lane = lanes.get(laneKey) ?? { actions: [], setupKey };
		if (lane.setupKey !== setupKey) throw new Error(`Inconsistent setup within ${laneKey}`);
		lane.actions.push({ action, index });
		lanes.set(laneKey, lane);
	});

	// Explicit Python version rows must actually use that interpreter. Give every
	// declared version an isolated environment: executing all 3.10-3.13 rows
	// under the last globally installed Python is a false-green CI result.
	const versions = [
		...new Set(actions.filter((action) => action.ecosystem === "python" && action.version).map((a) => a.version!)),
	];
	const pythonEnvs = new Map<string, NodeJS.ProcessEnv>();
	const unavailableVersions = new Map<string, string>();
	const pythonTemp = versions.length > 0 ? await mkdtemp(join(tmpdir(), "df-python-quality-")) : null;
	function quoted(value: string): string {
		return "'" + value.replaceAll("'", "'\\''") + "'";
	}
	try {
		for (const version of versions) {
			const home = join(pythonTemp!, "python-" + version);
			const executable = join(
				home,
				process.platform === "win32" ? "Scripts" : "bin",
				process.platform === "win32" ? "python.exe" : "python",
			);
			const environment: NodeJS.ProcessEnv = {
				PATH: [join(home, process.platform === "win32" ? "Scripts" : "bin"), process.env.PATH ?? ""].join(delimiter),
				VIRTUAL_ENV: home,
				PYTHONNOUSERSITE: "1",
			};
			const commands = [
				`uv python install ${version}`,
				`uv venv --seed --python ${version} ${quoted(home)}`,
				`uv pip install --python ${quoted(executable)} pytest black ruff mypy flake8 isort`,
				`python -c ${quoted(`import sys; assert sys.version_info[:2] == tuple(map(int, "${version}".split(".")[:2]))`)}`,
			];
			for (const command of commands) {
				const result = await tryExecute(command, root, environment);
				if (result.exitCode !== 0) {
					const message = `Python ${version} provisioning failed (exit ${result.exitCode}): ${command}\\n${result.outputTail}`;
					unavailableVersions.set(version, message);
					log(`FAIL ${message}`);
					break;
				}
			}
			if (!unavailableVersions.has(version)) pythonEnvs.set(version, environment);
		}
		// Dependency installers may modify one shared workspace: never race installs.
		const failedSetups = new Map<string, string>();
		for (const [key, setup] of setupByDirectory) {
			if (setup.pythonVersion && unavailableVersions.has(setup.pythonVersion)) {
				failedSetups.set(key, unavailableVersions.get(setup.pythonVersion)!);
				continue;
			}
			log(`SETUP ${relative(root, setup.cwd) || "."}: ${setup.command}`);
			const result = await tryExecute(
				setup.command,
				setup.cwd,
				setup.pythonVersion ? pythonEnvs.get(setup.pythonVersion) : undefined,
			);
			if (result.exitCode !== 0) {
				const message = `setup failed (exit ${result.exitCode}): ${setup.command}\\n${result.outputTail}`;
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
					const blocked =
						(action.ecosystem === "python" && action.version ? unavailableVersions.get(action.version) : undefined) ??
						(lane.setupKey ? failedSetups.get(lane.setupKey) : undefined);
					if (blocked) {
						results[index] = { id: action.id, command: action.command, cwd: action.cwd, blocked };
						log(`BLOCKED ${action.id}: ${blocked}`);
						continue;
					}
					const outcome = await tryExecute(
						action.command,
						safeDirectory(action.cwd),
						action.ecosystem === "python" && action.version ? pythonEnvs.get(action.version) : undefined,
					);
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
	} finally {
		if (pythonTemp) await rm(pythonTemp, { recursive: true, force: true });
	}
}
