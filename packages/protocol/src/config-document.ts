import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

/** Recognized semantic blocks in a DarkFactory combined configuration document. */
export type DarkFactoryConfigBlock = "repo" | "docs" | "providers";

/**
 * The DarkFactory directory holding plugins, skills and the configuration document, relative to the
 * repository root and normalized to forward slashes without a leading `./` or trailing slash.
 *
 * `DF_CONFIG_DIR` is the single place this is decided, so a repository that keeps its configuration
 * under another name does not need a code change to have its plugins found alongside it. Anything
 * that reaches into the DarkFactory directory reads it from here rather than repeating the
 * environment lookup, which is how three copies of this logic drifted apart.
 */
export function darkFactoryDirectory(env: Readonly<Record<string, string | undefined>> = process.env): string {
	return (env.DF_CONFIG_DIR?.trim() || ".darkfactory").replaceAll("\\", "/").replace(/^\.\//u, "").replace(/\/$/u, "");
}

/** JSON document containing DarkFactory configuration blocks. */
export interface DarkFactoryConfigDocument {
	repo?: unknown;
	docs?: unknown;
	providers?: unknown;
	[key: string]: unknown;
}

/** Resolves the single combined DarkFactory configuration document selected for a repository. */
export function resolveConfigDocumentPath(
	root: string,
	env: Readonly<Record<string, string | undefined>> = process.env,
): string | undefined {
	const repositoryRoot = resolve(root);
	const configDirectory = resolve(repositoryRoot, darkFactoryDirectory(env));
	const candidatesIn = (directory: string): string[] =>
		["repo.dfconfig", "config.dfconfig", ".dfconfig"]
			.map((name) => join(directory, name))
			.filter((path) => existsSync(path));
	const rootCandidates = candidatesIn(repositoryRoot);
	const folderCandidates =
		configDirectory === repositoryRoot || !existsSync(configDirectory) ? [] : candidatesIn(configDirectory);

	if (rootCandidates.length > 0 && folderCandidates.length > 0) {
		throw new Error(
			`Ambiguous DarkFactory configuration: candidates exist in both the repository root (${rootCandidates.join(", ")}) and ${configDirectory} (${folderCandidates.join(", ")}); remove all but one config.dfconfig, repo.dfconfig, or .dfconfig location.`,
		);
	}
	const candidates = rootCandidates.length > 0 ? rootCandidates : folderCandidates;
	if (candidates.length > 1) {
		const scope = rootCandidates.length > 0 ? repositoryRoot : configDirectory;
		throw new Error(
			`Ambiguous DarkFactory configuration aliases in ${scope}: ${candidates.join(", ")}; keep only repo.dfconfig, config.dfconfig, or .dfconfig.`,
		);
	}
	return candidates[0];
}

/** Parses one JSON-encoded DarkFactory combined configuration document. */
export function parseConfigDocument(source: string, path: string): DarkFactoryConfigDocument {
	let value: unknown;
	try {
		value = JSON.parse(source) as unknown;
	} catch (error) {
		throw new Error(`Invalid DarkFactory configuration JSON at ${path}: ${String(error)}`);
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`DarkFactory configuration at ${path} must contain an object.`);
	}
	return value as DarkFactoryConfigDocument;
}

/** Selects one recognized semantic block from a combined configuration document. */
export function configBlock(
	document: DarkFactoryConfigDocument,
	block: DarkFactoryConfigBlock,
	path: string,
): Record<string, unknown> | undefined {
	const value = document[block];
	if (value === undefined || value === null) return undefined;
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`DarkFactory configuration block ${block} at ${path} must contain an object.`);
	}
	return value as Record<string, unknown>;
}
