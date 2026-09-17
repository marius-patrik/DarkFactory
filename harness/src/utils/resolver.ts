import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Resolves a .df file path with precedence: .darkfactory/<name>.df then <name>.df.
 *
 * @param root The repository root directory.
 * @param name The base name of the file (e.g., 'repo', 'config').
 * @returns The path to the .df file.
 * @throws Error If both locations exist or neither exists.
 */
export function resolveDfFile(root: string, name: string): string {
	const dfPath = join(root, ".darkfactory", `${name}.df`);
	const rootPath = join(root, `${name}.df`);

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

	throw new Error(`Neither ${dfPath} nor ${rootPath} found.`);
}
