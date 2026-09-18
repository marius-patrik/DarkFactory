import { existsSync } from "node:fs";
import { join } from "node:path";

const LEGACY_PATHS = [
	".darkfactory/manifest.json",
	".darkfactory/df/config.json",
	".github/darkfactory.json",
] as const;

/**
 * Resolves a .df file path with precedence: .darkfactory/<name>.df then <name>.df.
 *
 * @param root The repository root directory.
 * @param name The base name of the file (e.g., 'repo', 'config').
 * @returns The path to the .df file.
 * @throws Error If both locations exist or a legacy path is present.
 */
export function resolveDfFile(root: string, name: string): string {
	const dfPath = join(root, ".darkfactory", `${name}.df`);
	const rootPath = join(root, `${name}.df`);

	// Hard cutover: legacy paths must never be read.
	for (const legacy of LEGACY_PATHS) {
		if (existsSync(join(root, legacy))) {
			throw new Error(
				`Legacy path '${legacy}' is no longer supported. Use '${name}.df' at one of: '${dfPath}' or '${rootPath}'.`,
			);
		}
	}

	const dfExists = existsSync(dfPath);
	const rootExists = existsSync(rootPath);

	if (dfExists && rootExists) {
		throw new Error(`Both ${dfPath} and ${rootPath} exist; only one is allowed.`);
	}
	if (dfExists) {
		return dfPath;
	}
	if (rootExists) {
		return rootPath;
	}

	// Neither exists - return primary path so callers can create it or test with it.
	return dfPath;
}

