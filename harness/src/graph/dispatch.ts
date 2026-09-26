import { readFile } from "node:fs/promises";
import { GitHubClient } from "../github/client.ts";
import { GitHubRepository } from "../github/repository.ts";
import { bundledGraphPath } from "./assets.ts";
import { type CheckStateSource, type ChecksGateResult, evaluateChecksGate } from "./checks-gate.ts";
import { type TranslatedEvent, translateGitHubEvent } from "./events.ts";
import { plan } from "./planner.ts";
import { loadRunState, saveRunState } from "./run-state.ts";
import { validateGraph } from "./validator.ts";

/**
 * Options for the dispatch command.
 * Controls input paths, output behavior, and overrides.
 */
export interface DispatchOptions {
	eventName: string;
	eventPath: string;
	graphPath?: string;
	runsPath?: string;
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
				if (i < argv.length) args.graphPath = argv[i++];
				break;
			case "--runs":
				if (i < argv.length) args.runsPath = argv[i++];
				break;
		}
	}

	return args;
}

async function readJsonFile(path: string): Promise<unknown> {
	return JSON.parse(await readFile(path, "utf8"));
}

function extractSubject(translated: TranslatedEvent & { kind: "event" }): string {
	if (translated.event.type === "checks.completed" && translated.subject.ref) {
		const ref = translated.subject.ref.trim();
		if (ref.length > 0) {
			return `${translated.subject.number}-${ref.substring(0, 7)}`;
		}
	}
	return `${translated.subject.number}`;
}

function githubCheckSource(token: string, repository: string): CheckStateSource {
	const [owner, repo] = repository.split("/");
	if (!owner || !repo) throw new Error("Invalid GITHUB_REPOSITORY format");
	const repoInstance = new GitHubRepository(new GitHubClient({ token }), owner, repo);
	return { checkStates: (ref) => repoInstance.checkStates(ref) };
}

/**
 * Dispatch a workflow based on a GitHub event.
 * @param argv - Command line arguments passed to the dispatch command.
 * @param options - Optional overrides, such as a custom check state source.
 * @returns A promise that resolves when dispatch processing is complete.
 */
export async function dispatch(
	argv: string[],
	options?: {
		checkStateSource?: CheckStateSource;
	},
): Promise<void> {
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
	const graphPath = opts.graphPath ?? bundledGraphPath();
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
			const firstNode = action.nodes[0];
			if (firstNode) runState.current_node = firstNode;
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

	await saveRunState(runsDir, subject, runState);
}

export type { TranslatedEvent } from "./events.ts";
