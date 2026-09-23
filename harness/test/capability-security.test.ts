import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("capability credential boundary", () => {
	test("official capability sources declare credentials instead of reading raw secret stores", async () => {
		const root = resolve(import.meta.dir, "../../capabilities");
		for (const directory of await readdir(root, { withFileTypes: true })) {
			if (!directory.isDirectory()) continue;
			for (const entry of await readdir(resolve(root, directory.name), { withFileTypes: true })) {
				if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
				const source = await readFile(resolve(root, directory.name, entry.name), "utf8");
				expect(source).not.toMatch(/(?:process\.env|Bun\.env|Deno\.env|\.credentials\.read\(|FileCredentialStore)/u);
			}
		}
	});
});
