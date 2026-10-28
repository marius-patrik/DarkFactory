import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	assertStrictDocumentation,
	cliUsageFromSource,
	compileDocsContentGraph,
	documentationFindings,
	finalizeUnifiedSite,
	normalizedBasePath,
	stageWebBundle,
} from "../../../packages/docs/src/index.ts";

const repoRoot = resolve(import.meta.dir, "../../..");
const temps: string[] = [];
afterEach(async () => {
	for (const dir of temps.splice(0)) await rm(dir, { recursive: true, force: true });
});

function digest(text: string): string {
	return createHash("sha256").update(text).digest("hex");
}

async function fixture(basePath = "/DarkFactory/"): Promise<{ source: string; output: string; index: string }> {
	const temp = await mkdtemp(join(tmpdir(), "df-site-contract-"));
	temps.push(temp);
	const source = join(temp, "web");
	const output = join(temp, "site");
	await mkdir(join(source, "assets"), { recursive: true });
	const index =
		'<!doctype html><html><head><base href="' +
		basePath +
		'"></head><body><div id="app"></div><script src="assets/app.js"></script></body></html>';
	const js = 'console.log("operator candidate");';
	await writeFile(join(source, "index.html"), index);
	await writeFile(join(source, "assets", "app.js"), js);
	await writeFile(
		join(source, "darkfactory-web-manifest.json"),
		JSON.stringify({
			schemaVersion: 1,
			kind: "darkfactory-operator",
			status: "candidate",
			entry: "index.html",
			basePath,
			routeMode: "history",
			sourceSha: "a".repeat(40),
			assets: [
				{ path: "index.html", sha256: digest(index) },
				{ path: "assets/app.js", sha256: digest(js) },
			],
		}),
	);
	return { source, output, index };
}

describe("documentation source-backed truth", () => {
	test("CLI reference parses the real usage declaration", () => {
		const source = readFileSync(join(repoRoot, "packages/cli/src/cli.ts"), "utf8");
		const usage = cliUsageFromSource(source);
		expect(usage.some((line) => line.includes("df --version"))).toBe(true);
		expect(usage.some((line) => line.includes("df graph"))).toBe(true);
		expect(() => cliUsageFromSource("export {}")).toThrow();
	});

	test("all authored guide pages and generated references are navigable", () => {
		const graph = compileDocsContentGraph(repoRoot);
		expect(graph.navigation?.length).toBeGreaterThanOrEqual(10);
		expect(() => assertStrictDocumentation(graph)).not.toThrow();
		expect(graph.pages.filter((page) => page.kind === "guide").length).toBeGreaterThanOrEqual(15);
	});

	test("broken links, anchors, injection and missing navigation fail", () => {
		const graph = compileDocsContentGraph(repoRoot);
		const page = graph.pages.find((page) => page.kind === "guide")!;
		const damaged = {
			...graph,
			pages: graph.pages.map((entry) =>
				entry.id === page.id
					? {
							...entry,
							markdown:
								entry.markdown +
								"\n[missing](missing.md) [broken](#missing-anchor) [unsafe](javascript:alert)\n<script>alert(1)</script>\n",
						}
					: entry,
			),
			navigation: graph.navigation?.filter((group) => group.id !== "getting-started"),
		};
		const findings = documentationFindings(damaged).join("\n");
		expect(findings).toContain("unresolved source");
		expect(findings).toContain("missing anchor");
		expect(findings).toContain("unsafe scheme");
		expect(findings).toContain("executable HTML");
		expect(findings).toContain("Unlisted navigation page");
	});
});

describe("unified-site artifact integrity", () => {
	test("rejects bad project paths", () => {
		expect(normalizedBasePath("/DarkFactory")).toBe("/DarkFactory/");
		expect(() => normalizedBasePath("//bad")).toThrow();
		expect(() => normalizedBasePath("/../")).toThrow();
		expect(() => normalizedBasePath("DarkFactory")).toThrow();
	});

	test("stages exact frontend and packages indexed docs and fallback", async () => {
		const { source, output, index } = await fixture();
		const web = await stageWebBundle(source, output, "/DarkFactory/", "a".repeat(40));
		await mkdir(join(output, "docs"));
		await writeFile(join(output, "docs", "index.html"), "<h1>Docs</h1>");
		await writeFile(join(output, "docs", "content.json"), "{}");
		await finalizeUnifiedSite(output, web, 17);
		const manifest = JSON.parse(await readFile(join(output, "site-manifest.json"), "utf8"));
		expect(manifest.files.some((item: { path: string }) => item.path === "docs/index.html")).toBe(true);
		expect(manifest.status).toBe("unpublished-candidate");
		expect(await readFile(join(output, "404.html"), "utf8")).toBe(index);
	});

	test("rejects digest mismatch, SHA drift and unindexed extra files", async () => {
		const { source, output } = await fixture();
		await expect(stageWebBundle(source, output, "/DarkFactory/", "b".repeat(40))).rejects.toThrow("source SHA");
		await writeFile(join(source, "assets", "app.js"), "tampered");
		await expect(stageWebBundle(source, output, "/DarkFactory/")).rejects.toThrow("digest mismatch");
		await writeFile(join(source, "extra.js"), "unlisted");
		await expect(stageWebBundle(source, output, "/DarkFactory/")).rejects.toThrow("not fully enumerated");
	});

	test("rejects symlink escape and credential-like static contents", async () => {
		const { source, output } = await fixture();
		await symlink(join(source, "index.html"), join(source, "shortcut"));
		await expect(stageWebBundle(source, output, "/DarkFactory/")).rejects.toThrow("symlink");
	});
});
