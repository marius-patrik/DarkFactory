import { deepStrictEqual } from "node:assert";
import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { GitHubClient } from "../github/client.ts";
import { GitHubRepository } from "../github/repository.ts";
import { type CheckStateSource, type ChecksGateResult, evaluateChecksGate } from "./checks-gate.ts";
import { type TranslatedEvent, translateGitHubEvent } from "./events.ts";
import { plan } from "./planner.ts";
import { loadRunState, saveRunState } from "./run-state.ts";
import type { PlanAction } from "./types.ts";
import { validateGraph } from "./validator.ts";

export interface DispatchOptions {
	eventName: string;
	eventPath: string;
	graphPath?: string;
	runsPath?: string;
	shadow: boolean;
	summaryPath?: string;
}

interface GitHubTokenEnv {
	GH_TOKEN?: string;
	GITHUB_TOKEN?: string;
}

interface GitHubRepoEnv {
	GITHUB_REPOSITORY?: string;
}

function parseArgs(argv: string[]): DispatchOptions {
	const args: DispatchOptions = {
		eventName: "",
		eventPath: "",
		shadow: false,
	};

	let i = 0;
	while (i < argv.length) {
		const arg = argv[i++];
		switch (arg) {
			case "--event-name":
				args.eventName = argv[i++] ?? "";
				break;
			case "--event":
				args.eventPath = argv[i++] ?? "";
				break;
			case "--graph":
				args.graphPath = argv[i++];
				break;
			case "--runs":
				args.runsPath = argv[i++];
				break;
			case "--shadow":
				if (i < argv.length && (argv[i] === "true" || argv[i] === "false")) {
					args.shadow = argv[i++] === "true";
				} else {
					args.shadow = true;
				}
				break;
			case "--summary":
				args.summaryPath = argv[i++];
				break;
		}
	}

	return args;
}

async function readJsonFile(path: string): Promise<unknown> {
	return JSON.parse(await readFile(path, "utf8"));
}

function extractSubject(translated: TranslatedEvent & { kind: "event" }): string {
	return `${translated.subject.number}`;
}

/** The job summary to append to: --summary, else GITHUB_STEP_SUMMARY; outside Actions nothing is written. */
function summaryTarget(explicit: string | undefined): string | undefined {
	return explicit || process.env.GITHUB_STEP_SUMMARY;
}

function githubCheckSource(token: string, repository: string): CheckStateSource {
	const [owner, repo] = repository.split("/");
	if (!owner || !repo) throw new Error("Invalid GITHUB_REPOSITORY format");
	const repoInstance = new GitHubRepository(new GitHubClient({ token }), owner, repo);
	return { checkStates: (ref) => repoInstance.checkStates(ref) };
}

// Semantic comparison for actions
function actionsMatch(pythonAction: unknown, tsAction: PlanAction): boolean {
	if (!pythonAction || typeof pythonAction !== "object") return false;
	const p = pythonAction as Record<string, unknown>;

	if (p.type !== tsAction.type) return false;

	if (tsAction.type === "none") return p.type === "none";

	try {
		if (tsAction.type === "run") {
			// Compare nodes
			const pyNodes = Array.isArray(p.nodes) ? p.nodes : [];
			if (!Array.isArray(tsAction.nodes)) return false;
			deepStrictEqual(pyNodes.slice().sort(), tsAction.nodes.slice().sort());
		} else if (tsAction.type === "gate" || tsAction.type === "hint" || tsAction.type === "comment") {
			// Compare node
			if (typeof p.node === "undefined") return false;
			deepStrictEqual(p.node, tsAction.node);
		}
		return true;
	} catch {
		return false;
	}
}

export async function dispatch(argv: string[], options?: { checkStateSource?: CheckStateSource }): Promise<void> {
	const opts = parseArgs(argv);

	// Load the event payload
	const eventPayload = await readJsonFile(opts.eventPath);

	// Translate the GitHub event
	const translated = translateGitHubEvent(opts.eventName, eventPayload);

	// Handle skip case
	if (translated.kind === "skip") {
		console.log(JSON.stringify({ type: "skip", reason: translated.reason }));
		return;
	}

	// Load the graph
	// A repository manifest carries the graph in its `graph` section; a standalone graph file is the graph itself.
	const graphPath = opts.graphPath ?? ".darkfactory/manifest.json";
	const document = JSON.parse(await readFile(graphPath, "utf8")) as unknown;
	const workflowGraph = validateGraph(
		document && typeof document === "object" && "graph" in document ? (document as { graph: unknown }).graph : document,
	);

	// For checks.completed events, evaluate the checks gate if tokens are present
	let gateResult: ChecksGateResult | undefined;

	if (translated.event.type === "checks.completed") {
		const env: GitHubTokenEnv & GitHubRepoEnv = {
			GH_TOKEN: process.env.GH_TOKEN,
			GITHUB_TOKEN: process.env.GITHUB_TOKEN,
			GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
		};

		if (env.GH_TOKEN || env.GITHUB_TOKEN) {
			if (env.GITHUB_REPOSITORY) {
				const checkStateSource: CheckStateSource =
					options?.checkStateSource ?? githubCheckSource((env.GH_TOKEN || env.GITHUB_TOKEN)!, env.GITHUB_REPOSITORY);

				gateResult = await evaluateChecksGate(workflowGraph, checkStateSource, translated.subject.ref ?? "");

				if (gateResult.conclusion === "pending") {
					console.log(JSON.stringify({ type: "none", reason: "required checks pending" }));
					return;
				}

				// Update the conclusion based on gate result
				(translated.event as { type: "checks.completed"; conclusion: string }).conclusion =
					gateResult.conclusion === "required_green" ? "required_green" : "failed";
			}
		}
	}

	// Get the subject number
	const subject = extractSubject(translated);

	// Load or create RunState
	const runsDir = opts.runsPath ?? ".darkfactory/runs";
	const runState = await loadRunState(runsDir, subject, workflowGraph);

	// Plan the action
	const action = plan(workflowGraph, translated.event, runState);

	// Advance the run state to the selected node before persisting
	if (action.type !== "none") {
		if (action.type === "run" && action.nodes.length > 0) {
			runState.current_node = action.nodes[0];
		} else if (action.type === "gate" || action.type === "hint" || action.type === "comment") {
			runState.current_node = action.node;
		}
	}

	// Prepare the base output
	const baseOutput = {
		subject,
		event: translated.event.type,
		current_node: runState.current_node,
		action: action.type,
		commands: action.type === "run" && action.nodes ? action.nodes.map((id) => `bun df run --node ${id}`) : [],
	};

	// If this is a checks.completed event with a non‑pending gate result, emit the checks JSON
	const output =
		translated.event.type === "checks.completed" && gateResult && gateResult.conclusion !== "pending"
			? {
					...baseOutput,
					type: "checks",
					result: gateResult.conclusion === "required_green" ? "pass" : "fail",
				}
			: baseOutput;

	// Print the output
	console.log(JSON.stringify(output));

	// Handle shadow mode
	if (opts.shadow) {
		const summaryPath = summaryTarget(opts.summaryPath);
		if (summaryPath) {
			const summaryLines: string[] = [];

			// Verification logic: Shadow verification diffs
			if (process.env.DF_SHADOW_VERIFY === "true") {
				const pythonActionPath = process.env.DF_PYTHON_ACTION_PATH ?? join(process.cwd(), "python_action.json");
				summaryLines.push("### Verification Diff");
				try {
					const pythonAction = await readJsonFile(pythonActionPath);
					if (actionsMatch(pythonAction, action)) {
						summaryLines.push("No drift detected between TS and Python actions.");
					} else {
						summaryLines.push(
							`Drift detected!\nTS action: ${JSON.stringify(action)}\nPython action: ${JSON.stringify(pythonAction)}`,
						);
					}
				} catch (e) {
					summaryLines.push(
						`Incomplete/In-progress: Unable to verify. Error: ${e instanceof Error ? e.message : String(e)}`,
					);
				}
				summaryLines.push("");
			}

			// Append markdown summary
			summaryLines.push(
				`## Dispatch: ${subject}`,
				`Event: ${translated.event.type}`,
				`Current node: ${runState.current_node}`,
				`Action: ${action.type}`,
				...(action.type === "run" && action.nodes
					? [`Commands:`, ...action.nodes.map((id) => `- bun df run --node ${id}`)]
					: []),
			);

			try {
				await appendFile(summaryPath, summaryLines.join("\n") + "\n\n");
			} catch (e) {
				if (process.env.DF_SHADOW_VERIFY === "true") {
					throw new Error(`Failed to write shadow run summary: ${e}`);
				}
				console.error("Failed to write shadow run summary:", e);
			}
		}
	} else {
		// Save the updated RunState
		await saveRunState(runsDir, subject, runState);
	}
}

export type { TranslatedEvent } from "./events.ts";
