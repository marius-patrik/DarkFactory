import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("@darkfactory/auth browser isolation", () => {
	test("browser-safe root does not export or import confidential broker/keychain code", async () => {
		const root = join(import.meta.dir, "..", "src");
		const index = await readFile(join(root, "index.ts"), "utf8");
		const client = await readFile(join(root, "client.ts"), "utf8");
		for (const source of [index, client]) {
			expect(source).not.toContain("@darkfactory/keychain");
			expect(source).not.toContain('from "./broker.ts"');
			expect(source).not.toContain("clientSecret");
			expect(source).not.toContain("privateKey");
		}
	});
});
