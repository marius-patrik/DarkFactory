import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * The resolved path to a repository file.
 *
 * This is always an absolute path (or a path relative to the current working directory)
 * pointing at the canonical location of the requested file.
 */
export type ResolvedFile = string;

/**
 * Options for resolving a repository file.
 */
export interface ResolveOptions {
	/**
	 * Root directory of the repository.
	 *
	 * Defaults to `process.cwd()`.
	 */
	repoRoot?: string;
}

/**
 * Legacy paths that must never be read.
 *
 * If any of these files exist, the resolver throws an error naming the new location
 * so the caller can migrate immediately.
 */
const LEGACY_PATHS = [
	".darkfactory/manifest.json",
	".darkfactory/df/config.json",
	".github/darkfactory.json",
] as const;

/**
 * Resolve the canonical path for a repository file.
 *
 * Precedence:
 * 1. `.darkfactory/<name>` (the new location)
 * 2. `<repoRoot>/<name>` (the fallback location)
 *
 * If both locations exist, an `Error` is thrown naming both paths.
 *
 * Legacy paths (`.darkfactory/manifest.json`, `.darkfactory/df/config.json`,
 * `.github/darkfactory.json`) are never read. If any of them exist, an `Error` is
 * thrown naming the new location so the repository can be migrated.
 *
 * If neither the primary nor the fallback file exists, the primary path
 * (`.darkfactory/<name>`) is returned so callers can create it.
 *
 * @param name - The file name to resolve (`'repo.df'` or `'config.df'`).
 * @param repoRoot - Root directory of the repository. Defaults to `process.cwd()`.
 * @returns The resolved file path.
 * @throws {Error} When both primary and fallback files exist.
 * @throws {Error} When a legacy path exists, naming the new location.
 */
export function resolveRepoFile(name: "repo.df" | "config.df", repoRoot?: string): ResolvedFile {
	const root = repoRoot ?? process.cwd();
	const primary = join(root, ".darkfactory", name);
	const fallback = join(root, name);

	// Hard transition: legacy paths must never be read.
	for (const legacy of LEGACY_PATHS) {
		if (existsSync(join(root, legacy))) {
			throw new Error(
				`Legacy path '${legacy}' is no longer supported. ` +
				`Use '${name}' at one of: '${primary}' or '${fallback}'.`,
			);
		}
	}

	const primaryExists = existsSync(primary);
	const fallbackExists = existsSync(fallback);

	if (primaryExists && fallbackExists) {
		throw new Error(`conflicting repo files for '${name}': both exist: '${primary}' and '${fallback}'`);
	}

	if (primaryExists) {
		return primary;
	}

	if (fallbackExists) {
		return fallback;
	}

	// Neither exists – return the primary path so callers can create it.
	return primary;
}