/**
 * File system reader abstraction for secure credential import contexts.
 * @packageDocumentation
 */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Injectable home-relative file access so importers run against fixtures or
 * scoped sandboxes, never modifying real system files.
 */
export interface HomeReader {
	/** Root directory for imports. */
	readonly home: string;
	/** Reads a file relative to `home`. */
	read(relativePath: string): Promise<string | undefined>;
}

/** OS-native implementation of HomeReader. */
export class OsHomeReader implements HomeReader {
	readonly home: string;

	/**
	 * @param home - Root directory for imports, defaults to system homedir.
	 */
	constructor(home: string = homedir()) {
		this.home = home;
	}

	async read(relativePath: string): Promise<string | undefined> {
		try {
			return await readFile(join(this.home, relativePath), "utf8");
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code === "ENOENT" || code === "ENOTDIR") return undefined;
			throw error;
		}
	}
}
