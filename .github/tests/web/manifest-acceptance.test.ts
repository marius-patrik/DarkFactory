import { afterAll, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { WebBundleManifest } from "../../../packages/web/src/site-contract.ts";

const root = resolve(import.meta.dir, "../../..");
const tmp = mkdtempSync(join(tmpdir(), "df-web-site-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
function run(args: string[], env: Record<string, string> = {}): void {
	const result = Bun.spawnSync([process.execPath, ...args], {
		cwd: root,
		stdout: "pipe",
		stderr: "pipe",
		env: { ...process.env, ...env },
	});
	if (result.exitCode !== 0)
		throw new Error(`Command failed: ${args.join(" ")}\n${result.stdout.toString()}\n${result.stderr.toString()}`);
}
function sha(path: string): string {
	return createHash("sha256").update(readFileSync(path)).digest("hex");
}
test("real Web bundle and DF-04 site accept identical source SHA, routes and asset hashes", async () => {
	const dist = join(tmp, "dist");
	const site = join(tmp, "site");
	const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
	run(["packages/web/scripts/build.ts", dist], {
		DF_WEB_BASE_PATH: "/DarkFactory/",
		DF_WEB_REPOSITORY: "marius-patrik/DarkFactory",
	});
	const manifest = JSON.parse(readFileSync(join(dist, "darkfactory-web-manifest.json"), "utf8")) as WebBundleManifest;
	expect(manifest).toMatchObject({
		schemaVersion: 1,
		kind: "darkfactory-operator",
		status: "candidate",
		entry: "index.html",
		basePath: "/DarkFactory/",
		routeMode: "hash",
		sourceSha,
	});
	for (const asset of manifest.assets) expect(sha(join(dist, asset.path))).toBe(asset.sha256);
	expect(manifest.assets.some((a) => a.path === "app.js")).toBe(true);
	const config = JSON.parse(readFileSync(join(dist, "darkfactory-web.json"), "utf8")) as { docsContentUrl: string };
	expect(config.docsContentUrl).toBe("./docs/content.json");
	run(["scripts/build-docs.ts", "--web-dist", dist, "--base-path", "/DarkFactory/", "--out", site]);
	expect(existsSync(join(site, "docs/content.json"))).toBe(true);
	expect(existsSync(join(site, "docs/index.html"))).toBe(true);
	const final = JSON.parse(readFileSync(join(site, "site-manifest.json"), "utf8")) as {
		sourceSha: string;
		files: Array<{ path: string; sha256: string }>;
	};
	expect(final.sourceSha).toBe(sourceSha);
	for (const asset of final.files) expect(sha(join(site, asset.path))).toBe(asset.sha256);
	const server = Bun.serve({
		port: 0,
		fetch(req) {
			const url = new URL(req.url);
			if (!url.pathname.startsWith("/DarkFactory/")) return new Response("Not found", { status: 404 });
			const relative = url.pathname.slice("/DarkFactory/".length);
			const path = relative === "" ? "index.html" : relative.endsWith("/") ? `${relative}index.html` : relative;
			if (!final.files.some((asset) => asset.path === path)) return new Response("Not found", { status: 404 });
			return new Response(Bun.file(join(site, path)));
		},
	});
	try {
		const origin = new URL(server.url).origin;
		const rootPage = await fetch(`${origin}/DarkFactory/`);
		expect(rootPage.status).toBe(200);
		expect(await rootPage.text()).toContain('<base href="/DarkFactory/">');
		const js = await fetch(`${origin}/DarkFactory/app.js`);
		expect(js.status).toBe(200);
		expect((await js.text()).length).toBeGreaterThan(1000);
		const docs = await fetch(`${origin}/DarkFactory/docs/`);
		expect(docs.status).toBe(200);
		expect(await docs.text()).toContain("<html");
		const graph = await fetch(`${origin}/DarkFactory/docs/content.json`);
		expect(graph.status).toBe(200);
		expect(((await graph.json()) as { pages: unknown[] }).pages.length).toBeGreaterThan(0);
		expect((await fetch(`${origin}/DarkFactory/requests`)).status).toBe(404);
		expect((await fetch(`${origin}/DarkFactory/#/requests`)).status).toBe(200);
	} finally {
		server.stop(true);
	}
});
