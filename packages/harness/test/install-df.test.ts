import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BINARY_NAME, stage, WRAPPER_NAME } from "../scripts/install";

const roots: string[] = [];
afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

/** Builds the minimal `dist/` + `scripts/` shape a staged install reads. */
async function harnessFixture(): Promise<string> {
	const root = await mkdtemp(join(process.cwd(), ".install-test-"));
	roots.push(root);
	await mkdir(join(root, "dist", "assets", "skills"), { recursive: true });
	await mkdir(join(root, "dist", "native", "darwin", "prebuilds"), { recursive: true });
	await mkdir(join(root, "scripts"), { recursive: true });
	await writeFile(join(root, "dist", "df"), "#!/bin/sh\nprintf 'runtime:%s\\n' \"$*\"\n");
	await chmod(join(root, "dist", "df"), 0o755);
	await writeFile(join(root, "dist", "assets", "graph.darkfactory.json"), "{}");
	await writeFile(join(root, "dist", "native", "darwin", "prebuilds", "darwin-platform.node"), "");
	await writeFile(join(root, "scripts", "df-wrapper.sh"), "#!/bin/sh\nprintf 'wrapper:%s\\n' \"$*\"\n");
	return root;
}

describe("staging the df runtime", () => {
	test("stages the wrapper, the binary and both resource trees", async () => {
		const root = await harnessFixture();
		const prefix = join(root, "prefix");
		const result = await stage({ root, prefix });

		expect(result.bin).toBe(join(prefix, "bin"));
		expect(result.installed).toEqual([BINARY_NAME, WRAPPER_NAME, "assets", "native"]);
		for (const entry of [WRAPPER_NAME, BINARY_NAME, "assets", "native"]) {
			expect(existsSync(join(result.bin, entry))).toBe(true);
		}
		expect(await readFile(join(result.bin, "assets", "graph.darkfactory.json"), "utf8")).toBe("{}");
		expect(existsSync(join(result.bin, "native", "darwin", "prebuilds", "darwin-platform.node"))).toBe(true);
	});

	test("the staged wrapper and binary are both executable", async () => {
		const root = await harnessFixture();
		const { bin } = await stage({ root, prefix: join(root, "prefix") });
		for (const entry of [WRAPPER_NAME, BINARY_NAME]) {
			expect(existsSync(join(bin, entry))).toBe(true);
		}
		// A staged runtime that is not executable fails at exec, not at install.
		const { mode } = await Bun.file(join(bin, WRAPPER_NAME)).stat();
		expect(mode! & 0o111).not.toBe(0);
	});

	test("an unbuilt harness fails at install rather than staging a broken runtime", async () => {
		const root = await mkdtemp(join(process.cwd(), ".install-test-"));
		roots.push(root);
		await expect(stage({ root, prefix: join(root, "prefix") })).rejects.toThrow(/bun run build/);
	});

	test("the staged wrapper is the repository wrapper, not a private copy", async () => {
		const root = await harnessFixture();
		await cp(join(process.cwd(), "scripts", "df-wrapper.sh"), join(root, "scripts", "df-wrapper.sh"));
		const { bin } = await stage({ root, prefix: join(root, "prefix") });
		expect(await readFile(join(bin, WRAPPER_NAME), "utf8")).toBe(
			await readFile(join(process.cwd(), "scripts", "df-wrapper.sh"), "utf8"),
		);
	});
});
