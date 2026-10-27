import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Source/install-relative path to DarkFactory's bundled canonical workflow graph. */
export function bundledGraphPath(): string {
	return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "graph.darkfactory.json");
}
