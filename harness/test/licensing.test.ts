import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyLicence, declaredLicence, licenceBody, NO_LICENCE, OFFERED_LICENCES } from "../src/ci/licensing.ts";
import type { GitHubClient } from "../src/github/client.ts";

const roots: string[] = [];
async function root(): Promise<string> {
	const dir = await mkdtemp(join(process.cwd(), ".licence-test-"));
	roots.push(dir);
	return dir;
}
process.on("exit", () => {
	for (const dir of roots) void rm(dir, { recursive: true, force: true });
});

/** Writes a manifest whose repo block declares the given licence. */
async function withManifest(licence: Record<string, string> | null): Promise<string> {
	const dir = await root();
	const body = { repo: licence ? { $comment: "x", license: licence } : { $comment: "x" } };
	await writeFile(join(dir, "repo.dfconfig"), JSON.stringify(body, null, 2));
	return dir;
}

/** Client returning one canned licence body. */
function clientReturning(body: unknown): GitHubClient {
	return { rest: async () => ({ body }) } as unknown as GitHubClient;
}

const GPL = "GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n\nCopyright (C) [year] [fullname]\n";

describe("reading the declared licence", () => {
	test("reads spdx, holder and year", async () => {
		const dir = await withManifest({ spdx: "GPL-3.0", holder: "Patrik Marius", year: "2026" });
		expect(await declaredLicence(dir)).toEqual({ spdx: "GPL-3.0", holder: "Patrik Marius", year: "2026" });
	});

	test("defaults a silent manifest to deliberately unlicensed", async () => {
		const dir = await withManifest(null);
		expect((await declaredLicence(dir)).spdx).toBe(NO_LICENCE);
	});

	test("defaults a repository with no manifest at all", async () => {
		expect((await declaredLicence(await root())).spdx).toBe(NO_LICENCE);
	});
});

describe("fetching licence text", () => {
	test("fills in only the bracketed placeholders", async () => {
		const text = await licenceBody(clientReturning(GPL), "GPL-3.0", "Patrik Marius", "2026");
		expect(text).toContain("Copyright (C) 2026 Patrik Marius");
	});

	test("leaves the appendix angle-bracket instructions alone", async () => {
		const withAppendix = `${GPL}\n<one line to give the program's name and a brief idea of what it does.>\n`;
		const text = await licenceBody(clientReturning(withAppendix), "GPL-3.0", "Patrik Marius", "2026");
		expect(text).toContain("<one line to give the program's name");
		expect(text).not.toContain("Patrik Marius's own source files");
	});

	test("replaces every occurrence, not just the first", async () => {
		const twice = "[fullname] wrote it.\n[fullname] licensed it.\n";
		const text = await licenceBody(clientReturning(twice), "MIT", "Ada", "2026");
		expect(text).toBe("Ada wrote it.\nAda licensed it.\n");
	});

	test("returns nothing when GitHub does not know the identifier", async () => {
		expect(await licenceBody(clientReturning(undefined), "NOPE-1.0")).toBeUndefined();
	});

	test("returns nothing when the request fails", async () => {
		const failing = {
			rest: async () => {
				throw new Error("404");
			},
		} as unknown as GitHubClient;
		expect(await licenceBody(failing, "GPL-3.0")).toBeUndefined();
	});
});

describe("applying the licence", () => {
	test("writes the licence file", async () => {
		const dir = await withManifest({ spdx: "MIT", holder: "Ada", year: "2026" });
		expect(await applyLicence({ root: dir, client: clientReturning("MIT text [year] [fullname]") })).toBe("MIT");
		expect(existsSync(join(dir, "LICENSE"))).toBe(true);
	});

	test("is idempotent: an unchanged file is left alone", async () => {
		const dir = await withManifest({ spdx: "MIT" });
		await applyLicence({ root: dir, client: clientReturning("MIT text") });
		const first = await readFile(join(dir, "LICENSE"), "utf8");
		await applyLicence({ root: dir, client: clientReturning("MIT text") });
		expect(await readFile(join(dir, "LICENSE"), "utf8")).toBe(first);
	});

	test("always ends the file with a newline", async () => {
		const dir = await withManifest({ spdx: "MIT" });
		await applyLicence({ root: dir, client: clientReturning("MIT text") });
		expect((await readFile(join(dir, "LICENSE"), "utf8")).endsWith("\n")).toBe(true);
	});

	test("removes a LICENSE that contradicts a declaration of no licence", async () => {
		const dir = await withManifest(null);
		await writeFile(join(dir, "LICENSE"), "stale text");
		expect(await applyLicence({ root: dir, client: clientReturning(GPL) })).toBeUndefined();
		expect(existsSync(join(dir, "LICENSE"))).toBe(false);
	});

	test("writes nothing when no licence is declared and none is present", async () => {
		const dir = await withManifest(null);
		expect(await applyLicence({ root: dir, client: clientReturning(GPL) })).toBeUndefined();
		expect(existsSync(join(dir, "LICENSE"))).toBe(false);
	});

	test("refuses a licence outside the offered list", async () => {
		const dir = await withManifest({ spdx: "WTFPL-2.0" });
		const messages: string[] = [];
		expect(
			await applyLicence({ root: dir, client: clientReturning("x"), log: (m) => messages.push(m) }),
		).toBeUndefined();
		expect(existsSync(join(dir, "LICENSE"))).toBe(false);
		expect(messages[0]).toContain("not one of the offered licences");
	});

	test("writes nothing when the canonical text cannot be fetched", async () => {
		const dir = await withManifest({ spdx: "MIT" });
		const failing = {
			rest: async () => {
				throw new Error("offline");
			},
		} as unknown as GitHubClient;
		expect(await applyLicence({ root: dir, client: failing })).toBeUndefined();
		expect(existsSync(join(dir, "LICENSE"))).toBe(false);
	});

	test("the offered list is the short one, not all of SPDX", () => {
		expect(OFFERED_LICENCES).toContain("GPL-3.0");
		expect(OFFERED_LICENCES).not.toContain("WTFPL-2.0");
	});
});
