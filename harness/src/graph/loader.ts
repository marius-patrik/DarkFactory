import { readFile } from "node:fs/promises";
import { GraphValidationError, validateGraph } from "./validator.ts";
import type { WorkflowGraph } from "./types.ts";

async function json(path: string): Promise<unknown> {
	try { return JSON.parse(await readFile(path, "utf8")); }
	catch (error) { throw new GraphValidationError([`${path}: ${error instanceof Error ? error.message : String(error)}`]); }
}

/**
 * Load a workflow graph from a JSON file.
 * @param path - Path to the JSON file containing the graph.
 * @returns The validated WorkflowGraph.
 * @throws GraphValidationError if the file cannot be parsed or validation fails.
 */
export async function loadGraph(path: string): Promise<WorkflowGraph> { return validateGraph(await json(path)); }
/**
 * Load a workflow graph from a manifest file that contains a "graph" property.
 * @param path - Path to the manifest JSON file.
 * @returns The validated WorkflowGraph extracted from the manifest.
 * @throws GraphValidationError if the manifest is malformed or missing the graph.
 */
export async function loadManifestGraph(path: string): Promise<WorkflowGraph> {
	const manifest = await json(path);
	if (!manifest || typeof manifest !== "object" || !("graph" in manifest)) throw new GraphValidationError([`${path}.graph: required`]);
	return validateGraph((manifest as { graph: unknown }).graph);
}
