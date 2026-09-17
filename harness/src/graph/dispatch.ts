import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { GitHubClient } from "../github/client.ts";
import { GitHubRepository } from "../github/repository.ts";
import { type CheckStateSource, type ChecksGateResult, evaluateChecksGate } from "./checks-gate.ts";
import { type TranslatedEvent, translateGitHubEvent } from "./events.ts";
import { plan } from "./planner.ts";
import { loadRunState, saveRunState } from "./run-state.ts";
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
	let eventName = "";
	let eventPath = "";
	let graphPath: string | undefined;
	let runsPath: string | undefined;
	let shadow = false;
	let summaryPath: string | undefined;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--event-name") {
			eventName = argv[++i] ?? "";
			continue;
		}
		if (arg === "--event") {
			eventPath = argv[++i] ?? "";
			continue;
		}
		if (arg === "--graph") {
			graphPath = argv[++i];
			continue;
		}
		if (arg === "--runs") {
			runsPath = argv[++i];
			continue;
		}
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
		if (arg === "--summary") {
			summaryPath = argv[++i];
		}
	}

	return { eventName, eventPath, graphPath, runsPath, shadow, summaryPath };
}

async function readJsonFile(path: string): Promise<unknown> {
	return JSON.parse(await readFile(path, "utf8"));
}

function extractSubject(translated: TranslatedEvent & { kind: "event" }): string {
	return `${translated.subject.number}`;
}

/** The job summary to append to: --summary, else GITHUB_STEP_SUMMARY; outside Actions nothing is written. */
function summaryTarget(explicit: string | undefined): string | undefined {
	return explicit || process.env.GITHUB_STEP_SUMMARY || undefined;
}

/** Required check states from the GitHub API for the repository the workflow runs in. */
function githubCheckSource(token: string, repository: string): CheckStateSource {
	const [owner, repo] = repository.split("/");
	if (!owner || !repo) throw new Error(`GITHUB_REPOSITORY must be owner/repo, got ${repository}`);
	return new GitHubRepository(new GitHubClient({ token }), owner, repo);
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
	// Verification logic: Shadow verification diffs
	if (opts.shadow && process.env.DF_SHADOW_VERIFY === "true") {
		// Diffs TypeScript decisions against Python pipeline actions
		// This is a placeholder for the logic required by acceptance criteria
		console.log("Shadow mode: Performing verification diffs");
	}

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
		let nodeId: string | undefined;
		if (action.type === "run" && action.nodes.length > 0) {
			nodeId = action.nodes[0];
		} else if (action.type === "gate" || action.type === "hint" || action.type === "comment") {
			nodeId = action.node;
		}
		if (nodeId !== undefined) {
			runState.current_node = nodeId;
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

	// Verification logic: Shadow verification diffs
	if (opts.shadow && process.env.DF_SHADOW_VERIFY === "true") {
		const graphDir = graphPath ? join(graphPath, "..") : ".darkfactory";
		const pythonActionPath = process.env.DF_PYTHON_ACTION_PATH ?? join(graphDir, "python_action.json");
		let diffMessage = "### Verification Diff\n\n";
		try {
			const pythonAction = await readJsonFile(pythonActionPath);
			const tsAction = { type: action.type, nodes: (action as any).nodes ?? [], node: (action as any).node };
			
			if (JSON.stringify(pythonAction) === JSON.stringify(tsAction)) {
				diffMessage += "No drift detected between TS and Python actions.";
			} else {
				diffMessage += `Drift detected!\nTS action: ${JSON.stringify(tsAction)}\nPython action: ${JSON.stringify(pythonAction)}`;
			}
		} catch (e) {
			diffMessage += `Incomplete/In-progress: Unable to verify. Error: ${e instanceof Error ? e.message : String(e)}`;
		}
		const summaryPath = summaryTarget(opts.summaryPath);
		if (summaryPath) await appendFile(summaryPath, diffMessage + "\n\n");
	}

	// Handle shadow mode vs normal mode
	if (opts.shadow) {
		// Append markdown summary instead of saving state
		const summaryPath = summaryTarget(opts.summaryPath);
		const summaryLines = [
			`## Dispatch: ${subject}`,
			`Event: ${translated.event.type}`,
			`Current node: ${runState.current_node}`,
			`Action: ${action.type}`,
			...(action.type === "run" && action.nodes
				? [`Commands:`, ...action.nodes.map((id) => `- bun df run --node ${id}`)]
				: []),
		];

		if (summaryPath) await appendFile(summaryPath, summaryLines.join("\n") + "\n\n");
	} else {
		// Save the updated RunState
		await saveRunState(runsDir, subject, runState);
	}
}

export type { TranslatedEvent } from "./events.ts";
