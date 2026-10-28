import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, posix, resolve, sep } from "node:path";

export interface WebAsset {
	path: string;
	sha256: string;
}

/** DF-03 frontend handoff; this cannot be substituted with an unfinished placeholder bundle. */
export interface WebBundleManifest {
	schemaVersion: 1;
	kind: "darkfactory-operator";
	status: "candidate";
	entry: "index.html";
	basePath: string;
	routeMode: "history" | "hash";
	sourceSha: string;
	assets: readonly WebAsset[];
}

export function normalizedBasePath(input: string): string {
	const path = input.endsWith("/") ? input : input + "/";
	if (!/^\/(?:[A-Za-z0-9._~-]+\/)*$/u.test(path) || path.includes("../") || path.includes("//")) {
		throw new Error("Invalid Pages base path: " + input);
	}
	return path;
}

function safeAssetPath(path: string): boolean {
	return !!path && path === posix.normalize(path) && !path.startsWith("/") &&
		!path.split("/").some((part) => part === ".." || part === "." || part.startsWith(".")) &&
		!/(^|\/)(?:docs|site-manifest\.json|404\.html|darkfactory-web-manifest\.json)(?:\/|$)/iu.test(path) &&
		!/\.(?:map|pem|key|p12|pfx)$/iu.test(path) &&
		!/(?:^|\/)(?:\.env[^/]*|credentials?[^/]*|secrets?[^/]*|private-key[^/]*)$/iu.test(path);
}

function sha256(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex");
}

async function regularFile(path: string): Promise<Uint8Array> {
	const stat = await lstat(path);
	if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Site asset must be a regular file: " + path);
	return new Uint8Array(await readFile(path));
}

async function filePaths(root: string, sub = ""): Promise<string[]> {
	const entries = await readdir(join(root, sub), { withFileTypes: true });
	const paths: string[] = [];
	for (const entry of entries) {
		if (entry.isSymbolicLink()) throw new Error("Site symlink forbidden: " + entry.name);
		const path = sub ? sub + "/" + entry.name : entry.name;
		if (entry.isDirectory()) paths.push(...await filePaths(root, path));
		else if (entry.isFile()) paths.push(path);
		else throw new Error("Site contains non-regular entry: " + path);
	}
	return paths.sort();
}

function verifyNoCredentials(path: string, bytes: Uint8Array): void {
	if (!/\.(?:html|js|mjs|json|css|svg|txt|xml)$/iu.test(path)) return;
	const content = new TextDecoder().decode(bytes);
	if (/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/iu.test(content) ||
		/gh[pousr]_[a-zA-Z0-9]{20,}/u.test(content) ||
		/github_pat_[a-zA-Z0-9_]{20,}/u.test(content)) {
		throw new Error("Credential-like material in site artifact: " + path);
	}
}

/** Stage only a complete, explicitly declared frontend with exact digest coverage. */
export async function stageWebBundle(sourceDir: string, outputDir: string, basePath: string, expectedSourceSha?: string): Promise<WebBundleManifest> {
	const root = resolve(sourceDir);
	const output = resolve(outputDir);
	if (root === output || root.startsWith(output + sep) || output.startsWith(root + sep)) {
		throw new Error("Frontend source and output directories overlap");
	}
	const raw = JSON.parse(await readFile(join(root, "darkfactory-web-manifest.json"), "utf8")) as Partial<WebBundleManifest>;
	if (raw.schemaVersion !== 1 || raw.kind !== "darkfactory-operator" || raw.status !== "candidate" ||
		raw.entry !== "index.html" || (raw.routeMode !== "history" && raw.routeMode !== "hash") ||
		raw.basePath !== normalizedBasePath(basePath) || typeof raw.sourceSha !== "string" ||
		!/^[a-f0-9]{40}$/iu.test(raw.sourceSha) || !Array.isArray(raw.assets) || raw.assets.length < 2) {
		throw new Error("DF-03 Web handoff manifest missing or incomplete");
	}
	if (expectedSourceSha && raw.sourceSha !== expectedSourceSha) throw new Error("Web source SHA does not match release checkout");
	const assets = raw.assets as WebAsset[];
	const names = new Set<string>();
	for (const asset of assets) {
		if (typeof asset?.path !== "string" || !safeAssetPath(asset.path) || names.has(asset.path) ||
			typeof asset.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(asset.sha256)) {
			throw new Error("Unsafe or duplicate frontend manifest asset");
		}
		names.add(asset.path);
	}
	if (!names.has("index.html")) throw new Error("Missing Web index entry");
	const existing = (await filePaths(root)).filter((path) => path !== "darkfactory-web-manifest.json");
	if (existing.join("\n") !== [...names].sort().join("\n")) throw new Error("Frontend assets are not fully enumerated");
	const index = new TextDecoder().decode(await regularFile(join(root, "index.html")));
	// Base-path segments are deliberately limited to characters safe in a regex.
	const escaped = basePath.replaceAll(".", "\\.");
	if (!new RegExp("<base\\s+href=[\"']" + escaped + "[\"']\\s*\\/?>", "iu").test(index)) {
		throw new Error("Web entry lacks matching base href for Pages project routes");
	}
	if (basePath !== "/" && /<script[^>]*\bsrc=["']\/(?!\/)/iu.test(index)) {
		throw new Error("Root-absolute Web script breaks project-path deployment");
	}
	await mkdir(output, { recursive: true });
	for (const asset of assets) {
		const bytes = await regularFile(join(root, asset.path));
		if (sha256(bytes) !== asset.sha256) throw new Error("Frontend asset digest mismatch: " + asset.path);
		verifyNoCredentials(asset.path, bytes);
		await mkdir(resolve(output, posix.dirname(asset.path)), { recursive: true });
		await copyFile(join(root, asset.path), join(output, asset.path));
	}
	return raw as WebBundleManifest;
}

/** Write the complete versioned candidate manifest after Docs rendering. */
export async function finalizeUnifiedSite(outputDir: string, web: WebBundleManifest, docsCount: number): Promise<void> {
	const index = await regularFile(join(outputDir, "index.html"));
	if (web.routeMode === "history") await writeFile(join(outputDir, "404.html"), index);
	await writeFile(join(outputDir, ".nojekyll"), "");
	const paths = (await filePaths(outputDir)).filter((path) => path !== "site-manifest.json");
	if (!paths.includes("docs/index.html") || !paths.includes("docs/content.json")) throw new Error("Required Docs output missing");
	const files: WebAsset[] = [];
	for (const path of paths) {
		const bytes = await regularFile(join(outputDir, path));
		verifyNoCredentials(path, bytes);
		files.push({ path, sha256: sha256(bytes) });
	}
	await writeFile(join(outputDir, "site-manifest.json"), JSON.stringify({
		schemaVersion: 1,
		status: "unpublished-candidate",
		sourceSha: web.sourceSha,
		basePath: web.basePath,
		routeMode: web.routeMode,
		docsCount,
		webManifestSha256: sha256(new TextEncoder().encode(JSON.stringify(web))),
		files,
	}, null, 2) + "\n");
}
