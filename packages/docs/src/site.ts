import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, posix, resolve, sep } from "node:path";
import { GUIDE_SECTIONS } from "./guides.ts";

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
	const path = input.endsWith("/") ? input : `${input}/`;
	if (
		!/^\/(?:[A-Za-z0-9._~-]+\/)*$/u.test(path) ||
		path.includes("//") ||
		path.split("/").some((part) => part === "." || part === "..")
	) {
		throw new Error(`Invalid Pages base path: ${input}`);
	}
	return path;
}

function unsafePathCharacter(path: string): boolean {
	return [...path].some(
		(character) => character === "\\" || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
	);
}

function safeAssetPath(path: string): boolean {
	return (
		!!path &&
		!unsafePathCharacter(path) &&
		path === posix.normalize(path) &&
		!path.startsWith("/") &&
		!path.split("/").some((part) => part === ".." || part === "." || part.startsWith(".")) &&
		!/(^|\/)(?:docs|site-manifest\.json|404\.html|darkfactory-web-manifest\.json)(?:\/|$)/iu.test(path) &&
		!/\.(?:map|pem|key|p12|pfx)$/iu.test(path) &&
		!/(?:^|\/)(?:\.env[^/]*|credentials?[^/]*|secrets?[^/]*|private-key[^/]*)$/iu.test(path)
	);
}

/** Require every authored guide and generated entry point in a publishable Pages artifact. */
export function requiredDocumentationRoutes(): readonly string[] {
	return [
		"docs/index.html",
		"docs/content.json",
		"docs/search.json",
		"docs/reference-cli/index.html",
		"docs/reference-config/index.html",
		"docs/reference-typescript-exports/index.html",
		"docs/reference-runtime-contracts/index.html",
		...GUIDE_SECTIONS.flatMap((section) =>
			section.pages.map((page) => `docs/guide-${section.id}-${page.slug}/index.html`),
		),
	];
}

function sha256(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex");
}

async function regularFile(path: string): Promise<Uint8Array> {
	const stat = await lstat(path);
	if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Site asset must be a regular file: ${path}`);
	return new Uint8Array(await readFile(path));
}

async function filePaths(root: string, sub = ""): Promise<string[]> {
	const entries = await readdir(join(root, sub), { withFileTypes: true });
	const paths: string[] = [];
	for (const entry of entries) {
		if (entry.isSymbolicLink()) throw new Error(`Site symlink forbidden: ${entry.name}`);
		const path = sub ? `${sub}/${entry.name}` : entry.name;
		if (entry.isDirectory()) paths.push(...(await filePaths(root, path)));
		else if (entry.isFile()) paths.push(path);
		else throw new Error(`Site contains non-regular entry: ${path}`);
	}
	return paths.sort();
}

function verifyNoCredentials(path: string, bytes: Uint8Array): void {
	if (!/\.(?:html|js|mjs|json|css|svg|txt|xml)$/iu.test(path)) return;
	const content = new TextDecoder().decode(bytes);
	if (
		/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/iu.test(content) ||
		/gh[pousr]_[a-zA-Z0-9]{20,}/u.test(content) ||
		/github_pat_[a-zA-Z0-9_]{20,}/u.test(content)
	) {
		throw new Error(`Credential-like material in site artifact: ${path}`);
	}
}

/** Stage only a complete, explicitly declared frontend with exact digest coverage. */
export async function stageWebBundle(
	sourceDir: string,
	outputDir: string,
	basePath: string,
	expectedSourceSha?: string,
): Promise<WebBundleManifest> {
	const root = resolve(sourceDir);
	const output = resolve(outputDir);
	if (root === output || root.startsWith(output + sep) || output.startsWith(root + sep)) {
		throw new Error("Frontend source and output directories overlap");
	}
	const raw = JSON.parse(
		await readFile(join(root, "darkfactory-web-manifest.json"), "utf8"),
	) as Partial<WebBundleManifest>;
	if (
		raw.schemaVersion !== 1 ||
		raw.kind !== "darkfactory-operator" ||
		raw.status !== "candidate" ||
		raw.entry !== "index.html" ||
		(raw.routeMode !== "history" && raw.routeMode !== "hash") ||
		raw.basePath !== normalizedBasePath(basePath) ||
		typeof raw.sourceSha !== "string" ||
		!/^[a-f0-9]{40}$/iu.test(raw.sourceSha) ||
		!Array.isArray(raw.assets) ||
		raw.assets.length < 2
	) {
		throw new Error("DF-03 Web handoff manifest missing or incomplete");
	}
	if (expectedSourceSha && raw.sourceSha !== expectedSourceSha)
		throw new Error("Web source SHA does not match release checkout");
	const assets = raw.assets as WebAsset[];
	const names = new Set<string>();
	for (const asset of assets) {
		if (
			typeof asset?.path !== "string" ||
			!safeAssetPath(asset.path) ||
			names.has(asset.path) ||
			typeof asset.sha256 !== "string" ||
			!/^[0-9a-f]{64}$/u.test(asset.sha256)
		) {
			throw new Error("Unsafe or duplicate frontend manifest asset");
		}
		names.add(asset.path);
	}
	if (!names.has("index.html") || !assets.some((asset) => /\.m?js$/iu.test(asset.path)))
		throw new Error("Missing executable Web entry assets");
	const existing = (await filePaths(root)).filter((path) => path !== "darkfactory-web-manifest.json");
	if (existing.join("\n") !== [...names].sort().join("\n")) throw new Error("Frontend assets are not fully enumerated");
	const index = new TextDecoder().decode(await regularFile(join(root, "index.html")));
	// Base-path segments are deliberately limited to characters safe in a regex.
	const escaped = basePath.replaceAll(".", "\\.");
	if (!new RegExp(`<base\\s+href=["']${escaped}["']\\s*\\/?>`, "iu").test(index)) {
		throw new Error("Web entry lacks matching base href for Pages project routes");
	}
	if (basePath !== "/" && /<(?:script|link|img|source)[^>]*\b(?:src|href)=["']\/(?!\/)/iu.test(index)) {
		throw new Error("Root-absolute Web script breaks project-path deployment");
	}
	await mkdir(output, { recursive: true });
	for (const asset of assets) {
		const bytes = await regularFile(join(root, asset.path));
		if (sha256(bytes) !== asset.sha256) throw new Error(`Frontend asset digest mismatch: ${asset.path}`);
		verifyNoCredentials(asset.path, bytes);
		await mkdir(resolve(output, posix.dirname(asset.path)), { recursive: true });
		await copyFile(join(root, asset.path), join(output, asset.path));
	}
	return raw as WebBundleManifest;
}

/** Write the complete versioned candidate manifest after Docs rendering. */
export async function finalizeUnifiedSite(
	outputDir: string,
	web: WebBundleManifest,
	docsCount: number,
	productVersion: string,
): Promise<void> {
	if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(productVersion)) throw new Error("Invalid SemVer candidate version");
	const index = await regularFile(join(outputDir, "index.html"));
	if (web.routeMode === "history") await writeFile(join(outputDir, "404.html"), index);
	await writeFile(join(outputDir, ".nojekyll"), "");
	const paths = (await filePaths(outputDir)).filter((path) => path !== "site-manifest.json");
	for (const path of requiredDocumentationRoutes()) {
		if (!paths.includes(path)) throw new Error(`Required Docs route missing: ${path}`);
	}
	const files: WebAsset[] = [];
	for (const path of paths) {
		const bytes = await regularFile(join(outputDir, path));
		verifyNoCredentials(path, bytes);
		files.push({ path, sha256: sha256(bytes) });
	}
	await writeFile(
		join(outputDir, "site-manifest.json"),
		`${JSON.stringify(
			{
				schemaVersion: 1,
				status: "unpublished-candidate",
				productVersion,
				sourceSha: web.sourceSha,
				basePath: web.basePath,
				routeMode: web.routeMode,
				docsCount,
				webManifestSha256: sha256(new TextEncoder().encode(JSON.stringify(web))),
				files,
			},
			null,
			2,
		)}\n`,
	);
}

/** Verify every file after clean extraction; validates manifest integrity without a source checkout. */
export async function verifyUnifiedSite(
	outputDir: string,
	expected: { sourceSha?: string; basePath?: string } = {},
): Promise<void> {
	const root = resolve(outputDir);
	const raw = JSON.parse(await readFile(join(root, "site-manifest.json"), "utf8")) as Record<string, unknown>;
	if (
		raw.schemaVersion !== 1 ||
		raw.status !== "unpublished-candidate" ||
		typeof raw.sourceSha !== "string" ||
		!/^[a-f0-9]{40}$/iu.test(raw.sourceSha) ||
		typeof raw.productVersion !== "string" ||
		!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(raw.productVersion) ||
		typeof raw.basePath !== "string" ||
		raw.basePath !== normalizedBasePath(raw.basePath) ||
		(raw.routeMode !== "history" && raw.routeMode !== "hash") ||
		!Array.isArray(raw.files) ||
		typeof raw.docsCount !== "number" ||
		raw.docsCount < 17 ||
		typeof raw.webManifestSha256 !== "string" ||
		!/^[0-9a-f]{64}$/u.test(raw.webManifestSha256)
	) {
		throw new Error("Malformed or incompatible unified-site manifest");
	}
	if (expected.sourceSha && expected.sourceSha !== raw.sourceSha) throw new Error("Unified-site source SHA mismatch");
	if (expected.basePath && normalizedBasePath(expected.basePath) !== raw.basePath)
		throw new Error("Unified-site base path mismatch");
	const declared = raw.files as WebAsset[];
	const names = new Set<string>();
	for (const asset of declared) {
		if (
			typeof asset?.path !== "string" ||
			!asset.path ||
			unsafePathCharacter(asset.path) ||
			asset.path.startsWith("/") ||
			asset.path !== posix.normalize(asset.path) ||
			(asset.path !== ".nojekyll" && asset.path.split("/").some((component) => component.startsWith("."))) ||
			asset.path === "site-manifest.json" ||
			names.has(asset.path) ||
			typeof asset.sha256 !== "string" ||
			!/^[0-9a-f]{64}$/u.test(asset.sha256)
		) {
			throw new Error("Unsafe or duplicate site manifest asset");
		}
		names.add(asset.path);
	}
	for (const path of ["index.html", ".nojekyll", ...requiredDocumentationRoutes()]) {
		if (!names.has(path)) throw new Error(`Missing required site asset: ${path}`);
	}
	if (raw.routeMode === "history" && !names.has("404.html")) throw new Error("Missing history-routing fallback");
	const existing = await filePaths(root);
	const expectedPaths = [...names, "site-manifest.json"].sort();
	if (existing.join("\n") !== expectedPaths.join("\n")) throw new Error("Extracted site has unindexed files");
	for (const asset of declared) {
		const bytes = await regularFile(join(root, asset.path));
		if (sha256(bytes) !== asset.sha256) throw new Error(`Extracted site digest mismatch: ${asset.path}`);
		verifyNoCredentials(asset.path, bytes);
	}
}
