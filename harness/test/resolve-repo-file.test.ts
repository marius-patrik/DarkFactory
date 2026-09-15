import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, test } from "bun:test";

import { resolveRepoFile } from "../src/storage/resolve-repo-file";

describe("resolveRepoFile", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "df-resolve-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	function write(file: string): Promise<void> {
		return mkdir(join(tempDir, dirname(file)), { recursive: true }).then(() =>
			writeFile(join(tempDir, file), "", "utf8"),
		);
	}

	test("returns primary path when neither file exists", async () => {
		const path = resolveRepoFile("repo.df", tempDir);
		expect(path).toBe(join(tempDir, ".darkfactory", "repo.df"));
	});

	test("returns .darkfactory/<name> when only it exists", async () => {
		await write(".darkfactory/repo.df");
		const path = resolveRepoFile("repo.df", tempDir);
		expect(path).toBe(join(tempDir, ".darkfactory", "repo.df"));
	});

	test("returns <root>/<name> when only it exists", async () => {
		await write("config.df");
		const path = resolveRepoFile("config.df", tempDir);
		expect(path).toBe(join(tempDir, "config.df"));
	});

	test("precedence: .darkfactory/<name> wins over <root>/<name>", async () => {
		await write(".darkfactory/config.df");
		const path = resolveRepoFile("config.df", tempDir);
		expect(path).toBe(join(tempDir, ".darkfactory", "config.df"));
	});

	test("both present throws error naming both paths", async () => {
		await write(".darkfactory/repo.df");
		await write("repo.df");
		expect(() => resolveRepoFile("repo.df", tempDir)).toThrow(
			/conflicting repo files.*both exist/,
		);
		expect(() => resolveRepoFile("repo.df", tempDir)).toThrow(
			join(tempDir, ".darkfactory", "repo.df"),
		);
		expect(() => resolveRepoFile("repo.df", tempDir)).toThrow(
			join(tempDir, "repo.df"),
		);
	});

	test("old path .darkfactory/manifest.json throws naming repo.df", async () => {
		await write(".darkfactory/manifest.json");
		expect(() => resolveRepoFile("repo.df", tempDir)).toThrow(/repo.df/);
	});

	test("old path .darkfactory/df/config.json throws naming config.df", async () => {
		await write(".darkfactory/df/config.json");
		expect(() => resolveRepoFile("config.df", tempDir)).toThrow(/config.df/);
	});

	test("old path .github/darkfactory.json throws naming repo.df", async () => {
		await write(".github/darkfactory.json");
		expect(() => resolveRepoFile("repo.df", tempDir)).toThrow(/repo.df/);
	});
});