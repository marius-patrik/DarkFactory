import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * HomeReader provides read‑only access to files relative to a user's home
 * directory. Implementations should never touch real credential files; they are
 * used by importers and tests with a sandboxed home.
 */
export interface HomeReader {
	/**
	 * Absolute path to the home directory used as the base for relative reads.
	 */
	readonly home: string;
	/**
	 * Reads a file relative to `home`.
	 * @param relativePath - Path relative to the home directory.
	 * @returns The file contents as a string, or `undefined` if the file does not exist.
	 */
	read(relativePath: string): Promise<string | undefined>;
}

/**
 * OsHomeReader implements {@link HomeReader} using the real operating‑system
 * home directory (or a custom directory for tests). It reads files using
 * Node's `fs/promises.readFile`.
 */
export class OsHomeReader implements HomeReader {
	/** Absolute path to the home directory used by this reader. */
	readonly home: string;

	/**
	 * Creates a reader rooted at `home`.
	 * @param home - Absolute path to the home directory.
	 */
	constructor(home: string = homedir()) {
		this.home = home;
	}

	/**
	 * Reads a file relative to the home directory.
	 * @param relativePath - Path relative to the home directory.
	 * @returns File contents or undefined if not found.
	 */
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
