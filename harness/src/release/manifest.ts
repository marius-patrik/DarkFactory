import { readFileSync } from "node:fs";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "@darkfactory/protocol/config-document";

/** Loads the `repo` block from the combined DarkFactory configuration document.
 *
 * @param root - Path to the repository root.
 * @returns The `repo` block as a plain object, or an empty object when absent.
 * @throws {Error} If configuration discovery is ambiguous or the document is malformed.
 */
export function loadRepoManifest(root: string): Record<string, unknown> {
	const path = resolveConfigDocumentPath(root);
	if (!path) return {};
	const raw = readFileSync(path, "utf8");
	const document = parseConfigDocument(raw, path);
	const repo = configBlock(document, "repo", path);
	return repo ?? {};
}
