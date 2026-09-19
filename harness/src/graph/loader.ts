import { readFile } from "node:fs/promises";
import { GraphValidationError, validateGraph } from "./validator.ts";
import type { WorkflowGraph } from "./types.ts";

async function json(path: string): Promise<unknown> {
	try {
		return JSON.parse(await readFile(path, "utf8"));
	} catch (error) {
		throw new GraphValidationError([`${path}: ${error instanceof Error ? error.message : String(error)}`]);
	}
}

export async function loadGraph(path: string): Promise<WorkflowGraph> {
	return validateGraph(await json(path));
}
export async function loadManifestGraph(path: string): Promise<WorkflowGraph> {
	const manifest = await json(path);
	if (!manifest || typeof manifest !== "object" || !("graph" in manifest))
		throw new GraphValidationError([`${path}.graph: required`]);
	return validateGraph((manifest as { graph: unknown }).graph);
}
