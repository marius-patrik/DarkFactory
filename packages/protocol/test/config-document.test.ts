import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
	test("selects canonical root repo.df", async () => {
		const root = await fixture();
		const expected = await writeConfig(root, "repo.df");
		expect(resolveConfigDocumentPath(root, {})).toBe(expected);
	});

	test("accepts root config.df as the same logical document", async () => {
		const root = await fixture();
		const expected = await writeConfig(root, "config.df");
		expect(resolveConfigDocumentPath(root, {})).toBe(expected);
	});

	test("uses a custom DF_CONFIG_DIR", async () => {
		const root = await fixture();
		const expected = await writeConfig(root, "configuration/repo.df");
		expect(resolveConfigDocumentPath(root, { DF_CONFIG_DIR: "configuration" })).toBe(expected);
	});

	test("falls back to the default .darkfactory directory", async () => {
		const root = await fixture();
		const expected = await writeConfig(root, ".darkfactory/config.df");
		expect(resolveConfigDocumentPath(root, {})).toBe(expected);
	});

	test("rejects both aliases in one scope", async () => {
		const root = await fixture();
		await writeConfig(root, "repo.df");
		await writeConfig(root, "config.df");
		expect(() => resolveConfigDocumentPath(root, {})).toThrow("Ambiguous DarkFactory configuration aliases");
	});

	test("rejects root and folder candidates together", async () => {
		const root = await fixture();
		await writeConfig(root, "repo.df");
		await writeConfig(root, ".darkfactory/config.df");
		expect(() => resolveConfigDocumentPath(root, {})).toThrow("candidates exist in both the repository root");
	});

	test("consumers select repo, docs, and providers independently", () => {
		const document = parseConfigDocument(
			JSON.stringify({
				repo: { identity: { repo: "example" } },
				docs: { version: 1, home: ".agents/PRD.md" },
				providers: { defaultChain: "example/model@default" },
			}),
			"repo.df",
		);
		expect(configBlock(document, "repo", "repo.df")).toEqual({ identity: { repo: "example" } });
		expect(configBlock(document, "docs", "repo.df")).toEqual({ version: 1, home: ".agents/PRD.md" });
		expect(configBlock(document, "providers", "repo.df")).toEqual({
			defaultChain: "example/model@default",
		});
	});
});
