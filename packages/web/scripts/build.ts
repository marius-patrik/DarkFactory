/** Deterministic source-identified Web bundle, validated by DF-04's stageWebBundle. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { normalizeSiteBasePath, repositoryIdentity, type WebAsset, type WebBundleManifest, type WebSiteRuntimeConfig } from "../src/site-contract.ts";

const root = resolve(import.meta.dir, "../../..");
const outdir = resolve(process.argv[2] ?? join(root, "packages/web/dist"));
if (outdir === root || !outdir.endsWith("/dist") && !outdir.includes("/site-"))
	throw new Error("Refusing unsafe Web output directory");
const basePath = normalizeSiteBasePath(process.env.DF_WEB_BASE_PATH ?? "/DarkFactory/");
const slug = process.env.DF_WEB_REPOSITORY ?? process.env.GITHUB_REPOSITORY ?? "marius-patrik/DarkFactory";
repositoryIdentity(slug);
const currentSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
if (!/^[a-f0-9]{40}$/u.test(currentSha) ||
	(process.env.GITHUB_SHA && process.env.GITHUB_SHA !== currentSha))
	throw new Error("Web artifact source SHA does not match checkout");
const auth = process.env.DF_WEB_CLIENT_ID && process.env.DF_WEB_BROKER_URL
	? { clientId: process.env.DF_WEB_CLIENT_ID, scope: process.env.DF_WEB_SCOPE ?? "",
		redirectUri: process.env.DF_WEB_REDIRECT_URI ?? "", brokerUrl: process.env.DF_WEB_BROKER_URL }
	: undefined;
if ((process.env.DF_WEB_CLIENT_ID || process.env.DF_WEB_BROKER_URL || process.env.DF_WEB_REDIRECT_URI) && !auth)
	throw new Error("Incomplete public OAuth configuration");
const runtime: WebSiteRuntimeConfig = { version: 1, repository: slug, docsContentUrl: "./docs/content.json",
	...(auth ? { auth } : {}) };
if (auth && (!/^https:\/\//u.test(auth.brokerUrl) || !/^https:\/\//u.test(auth.redirectUri)))
	throw new Error("Confidential broker and redirect must use HTTPS");
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
const built = await Bun.build({
	entrypoints: [resolve(root, "packages/web/src/browser.tsx")],
	outdir, target: "browser", format: "esm", minify: true, splitting: false,
	naming: { entry: "app.js", chunk: "chunk-[hash].js", asset: "asset-[hash].[ext]" },
	sourcemap: "none",
});
if (!built.success) {
	for (const log of built.logs) console.error(log);
	throw new Error("DarkFactory Web browser compilation failed");
}
await writeFile(join(outdir, "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base href="${basePath}"><meta name="darkfactory-base-path" content="${basePath}">
<title>DarkFactory · Operator</title></head><body><div id="darkfactory-app"></div>
<script type="module" src="./app.js"></script></body></html>\n`);
await writeFile(join(outdir, "darkfactory-web.json"), JSON.stringify(runtime, null, 2) + "\n");
async function assetsIn(sub = ""): Promise<WebAsset[]> {
	const found: WebAsset[] = [];
	for (const entry of await readdir(join(outdir, sub), { withFileTypes: true })) {
		const path = sub ? `${sub}/${entry.name}` : entry.name;
		if (entry.isDirectory()) found.push(...await assetsIn(path));
		else if (entry.isFile()) {
			const bytes = await readFile(join(outdir, path));
			found.push({ path, sha256: createHash("sha256").update(bytes).digest("hex") });
		} else throw new Error("Web output must contain regular files only");
	}
	return found;
}
const manifest: WebBundleManifest = {
	schemaVersion: 1, kind: "darkfactory-operator", status: "candidate", entry: "index.html",
	basePath, routeMode: "hash", sourceSha: currentSha,
	assets: (await assetsIn()).sort((a, b) => a.path.localeCompare(b.path)),
};
if (manifest.assets.length < 3 || !manifest.assets.some(a => a.path === "app.js"))
	throw new Error("Incomplete frontend bundle");
await writeFile(join(outdir, "darkfactory-web-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Web candidate ${relative(root, outdir)}: ${manifest.assets.length} assets, ${currentSha}, ${basePath}`);
