import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveDfFile } from "../src/utils/resolver";

describe("resolveDfFile", () => {
	it("resolves .darkfactory/<name>.df", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-resolver-"));
		try {
			await mkdir(join(temp, ".darkfactory"));
			await writeFile(join(temp, ".darkfactory", "test.df"), "{}");
			expect(resolveDfFile(temp, "test")).toBe(join(temp, ".darkfactory", "test.df"));
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("resolves <name>.df at root", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-resolver-"));
		try {
			await writeFile(join(temp, "test.df"), "{}");
			expect(resolveDfFile(temp, "test")).toBe(join(temp, "test.df"));
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("throws error when both exist", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-resolver-"));
		try {
			await mkdir(join(temp, ".darkfactory"));
			await writeFile(join(temp, ".darkfactory", "test.df"), "{}");
			await writeFile(join(temp, "test.df"), "{}");
			expect(() => resolveDfFile(temp, "test")).toThrow("Both");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});

	it("throws error when neither exist", async () => {
		const temp = await mkdtemp(join(tmpdir(), "df-resolver-"));
		try {
			expect(() => resolveDfFile(temp, "test")).toThrow("test.df not found");
		} finally {
			await rm(temp, { recursive: true, force: true });
		}
	});
});
