import { readFile } from "node:fs/promises";
import { writeFile, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { GraphEvent, RunState } from "./types.ts";
import { plan } from "./planner.ts";
import { loadRunState, saveRunState } from "./run-state.ts";
import { loadManifestGraph } from "./loader.ts";
import { translateGitHubEvent, type TranslatedEvent } from "./events.ts";
import { evaluateChecksGate, type CheckStateSource, type ChecksGateResult } from "./checks-gate.ts";

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
	let eventName = "";
	let eventPath = "";
	let graphPath: string | undefined;
	let runsPath: string | undefined;
	let shadow = false;
	let summaryPath: string | undefined;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--event-name") { eventName = argv[++i] ?? ""; continue; }
		if (arg === "--event") { eventPath = argv[++i] ?? ""; continue; }
		if (arg === "--graph") { graphPath = argv[++i]; continue; }
		if (arg === "--runs") { runsPath = argv[++i]; continue; }
		if (arg === "--shadow") {
		const next = argv[i + 1];
		if (next === "true" || next === "false") {
			shadow = next === "true";
			i++;
		} else {
			shadow = true;
		}
		continue;
	}
		if (arg === "--summary") { summaryPath = argv[++i]; continue; }
	}

	return { eventName, eventPath, graphPath, runsPath, shadow, summaryPath };
}

async function readJsonFile(path: string): Promise<unknown> {
	return JSON.parse(await readFile(path, "utf8"));
}

function extractSubject(translated: TranslatedEvent & { kind: "event" }): string {
	return `${translated.subject.number}`;
}

async function getSummaryPath(): Promise<string> {
	return process.env.GITHUB_STEP_SUMMARY ?? "step_summary.md";
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
	const graphPath = opts.graphPath ?? ".darkfactory/manifest.json";
	const manifest = JSON.parse(await readFile(graphPath, "utf8")) as unknown;
	const graph = loadManifestGraph(graphPath).then(g => g);
	const workflowGraph = await graph;

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
				// Create a minimal CheckStateSource (in-process, can be stubbed in tests)
				const checkStateSource: CheckStateSource = options?.checkStateSource ?? {
					checkStates: async (ref: string): Promise<Map<string, "success" | "pending" | "failure">> => {
						// Stub implementation - in real usage would call GitHub API
						return new Map();
					},
				};

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
		let nodeId: string | undefined;
		if (action.type === "run" && action.nodes.length > 0) { nodeId = action.nodes[0]; }
		else if (action.type === "gate" || action.type === "hint" || action.type === "comment") { nodeId = action.node; }
		if (nodeId !== undefined) { runState.current_node = nodeId; }
	}

	// Prepare the base output
	const baseOutput = {
		subject,
		event: translated.event.type,
		current_node: runState.current_node,
		action: action.type,
		commands: action.type === "run" && action.nodes
 ? action.nodes.map((id) => `bun df run --node ${id}`) : [],
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

	// Handle shadow mode vs normal mode
	if (opts.shadow) {
		// Append markdown summary instead of saving state
		const summaryPath = opts.summaryPath ?? await getSummaryPath();
		const summaryLines = [
			`## Dispatch: ${subject}`,
			`Event: ${translated.event.type}`,
			`Current node: ${runState.current_node}`,
			`Action: ${action.type}`,
			...(action.type === "run" && action.nodes ? [
				`Commands:`,
				...action.nodes.map((id) => `- bun df run --node ${id}`),
			] : []),
		];

		await appendFile(summaryPath, summaryLines.join("\n") + "\n\n");
	} else {
		// Save the updated RunState
		await saveRunState(runsDir, subject, runState);
	}
}

export { type TranslatedEvent } from "./events.ts";
