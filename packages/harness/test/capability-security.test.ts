import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

/** Where the capability packages live. The plugins are the same directories. */
const CAPABILITIES_ROOT = resolve(import.meta.dir, "../../../.darkfactory/plugins");

describe("capability credential boundary", () => {
	test("official capability sources declare credentials instead of reading raw secret stores", async () => {
		// Assert the root exists: a walk of a missing directory throws, and a walk of a directory that
		// happens to be empty passes for the wrong reason. This test was masked by a leftover
		// `capabilities/` directory and passed without checking anything.
		expect(existsSync(CAPABILITIES_ROOT)).toBe(true);

		let checked = 0;
		for (const directory of await readdir(CAPABILITIES_ROOT, { withFileTypes: true })) {
			if (!directory.isDirectory() || directory.name.startsWith(".")) continue;
			for (const entry of await readdir(resolve(CAPABILITIES_ROOT, directory.name), { withFileTypes: true })) {
				if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
				checked++;
				const source = await readFile(resolve(CAPABILITIES_ROOT, directory.name, entry.name), "utf8");
				expect(source).not.toMatch(/(?:process\.env|Bun\.env|Deno\.env|\.credentials\.read\(|FileCredentialStore)/u);
			}
		}
		// A capability package that stopped declaring sources must fail the test rather than pass it.
		expect(checked).toBeGreaterThan(0);
	});
});
