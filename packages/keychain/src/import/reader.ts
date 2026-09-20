import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Injectable home-relative file access so importers run against fixtures, never
 * real credential files. Paths are always relative to `home`, which keeps both
 * tests and the data a test touches inside the sandboxed home.
 */
export interface HomeReader {
	readonly home: string;
	read(relativePath: string): Promise<string | undefined>;
}

export class OsHomeReader implements HomeReader {
	readonly home: string;

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
