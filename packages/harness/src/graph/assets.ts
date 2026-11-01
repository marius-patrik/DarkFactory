import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Resolve the canonical graph from an extracted native bundle before source paths. */
export function bundledGraphPath(): string {
	const installed = join(dirname(process.execPath), "assets", "graph.darkfactory.json");
	if (existsSync(installed)) return installed;
	return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "graph.darkfactory.json");
}
