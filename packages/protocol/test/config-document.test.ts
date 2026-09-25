import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "../src/config-document.ts";

const roots: string[] = [];

async function fixture(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "df-config-document-"));
	roots.push(root);
	return root;
}

async function writeConfig(root: string, relative: string, blocks: Record<string, unknown> = {}): Promise<string> {
	const path = join(root, relative);
	await mkdir(join(path, ".."), { recursive: true });
	await writeFile(path, JSON.stringify(blocks), "utf8");
	return path;
}

afterEach(async () => {
	for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("combined DarkFactory configuration", () => {
	test("selects canonical root repo.dfconfig", async () => {
		const root = await fixture();
		const expected = await writeConfig(root, "repo.dfconfig");
		expect(resolveConfigDocumentPath(root, {})).toBe(expected);
	});

	test("accepts root config.dfconfig as the same logical document", async () => {
		const root = await fixture();
		const expected = await writeConfig(root, "config.dfconfig");
		expect(resolveConfigDocumentPath(root, {})).toBe(expected);
	});

	test("accepts the empty-basename root alias", async () => {
		const root = await fixture();
		const expected = await writeConfig(root, ".dfconfig");
		expect(resolveConfigDocumentPath(root, {})).toBe(expected);
	});

	test("uses a custom DF_CONFIG_DIR", async () => {
		const root = await fixture();
		const expected = await writeConfig(root, "configuration/repo.dfconfig");
		expect(resolveConfigDocumentPath(root, { DF_CONFIG_DIR: "configuration" })).toBe(expected);
	});

	test("falls back to the default .darkfactory directory", async () => {
		const root = await fixture();
		const expected = await writeConfig(root, ".darkfactory/config.dfconfig");
		expect(resolveConfigDocumentPath(root, {})).toBe(expected);
	});

	test("rejects duplicate aliases in one scope", async () => {
		const root = await fixture();
		await writeConfig(root, "repo.dfconfig");
		await writeConfig(root, "config.dfconfig");
		await writeConfig(root, ".dfconfig");
		expect(() => resolveConfigDocumentPath(root, {})).toThrow("Ambiguous DarkFactory configuration aliases");
	});

	test("rejects root and folder candidates together", async () => {
		const root = await fixture();
		await writeConfig(root, "repo.dfconfig");
		await writeConfig(root, ".darkfactory/config.dfconfig");
		expect(() => resolveConfigDocumentPath(root, {})).toThrow("candidates exist in both the repository root");
	});

	test("does not accept legacy .df configuration paths", async () => {
		const root = await fixture();
		await writeConfig(root, "repo.df");
		await writeConfig(root, "config.df");
		expect(resolveConfigDocumentPath(root, {})).toBeUndefined();
	});

	test("resolves the same combined document for every supported filename", async () => {
		const blocks = {
			repo: { identity: { repo: "example" } },
			docs: { version: 1, home: ".agents/PRD.md" },
			providers: { defaultChain: "example/model@default" },
		};
		for (const filename of ["repo.dfconfig", "config.dfconfig", ".dfconfig"]) {
			const root = await fixture();
			const expected = await writeConfig(root, filename, blocks);
			expect(resolveConfigDocumentPath(root, {})).toBe(expected);
			const document = parseConfigDocument(await readFile(expected, "utf8"), expected);
			expect(configBlock(document, "repo", expected)).toEqual(blocks.repo);
			expect(configBlock(document, "docs", expected)).toEqual(blocks.docs);
			expect(configBlock(document, "providers", expected)).toEqual(blocks.providers);
		}
	});

	test("consumers select repo, docs, and providers independently", () => {
		const document = parseConfigDocument(
			JSON.stringify({
				repo: { identity: { repo: "example" } },
				docs: { version: 1, home: ".agents/PRD.md" },
				providers: { defaultChain: "example/model@default" },
			}),
			"repo.dfconfig",
		);
		expect(configBlock(document, "repo", "repo.dfconfig")).toEqual({ identity: { repo: "example" } });
		expect(configBlock(document, "docs", "repo.dfconfig")).toEqual({ version: 1, home: ".agents/PRD.md" });
		expect(configBlock(document, "providers", "repo.dfconfig")).toEqual({
			defaultChain: "example/model@default",
		});
	});
});
