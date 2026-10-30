/** Deterministic shared Web bundle, built once and copied unchanged into consumer Pages artifacts. */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const outdir = resolve(process.argv[2] ?? "packages/web/dist");
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
const output = await Bun.build({
	entrypoints: [resolve("packages/web/src/browser.tsx")],
	outdir, target: "browser", format: "esm", minify: true, splitting: false,
	naming: { entry: "app.js", chunk: "chunk-[hash].js", asset: "asset-[hash].[ext]" },
	sourcemap: "none",
});
if (!output.success) {
	for (const log of output.logs) console.error(log);
	throw new Error("DarkFactory Web browser compilation failed");
}
await writeFile(join(outdir, "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DarkFactory · Operator</title></head><body><div id="darkfactory-app"></div>
<script type="module" src="./app.js"></script></body></html>\n`);
await writeFile(join(outdir, "darkfactory-web.example.json"), JSON.stringify({
	version: 1,
	repository: "OWNER/REPOSITORY",
	docsContentUrl: "./content.json",
}, null, 2) + "\n");
// There is intentionally no darkfactory-web.json. Deployment must supply repository-specific public config.
const assets = await readdir(outdir);
const manifest: Record<string, { sha256: string; size: number }> = {};
for (const asset of assets.sort()) {
	const data = await readFile(join(outdir, asset));
	manifest[asset] = { sha256: createHash("sha256").update(data).digest("hex"), size: data.length };
}
await writeFile(join(outdir, "web-manifest.json"), JSON.stringify({ version: 1, assets: manifest }, null, 2) + "\n");
console.log(`Built shared DarkFactory Web bundle at ${outdir} (${assets.length} files).`);
