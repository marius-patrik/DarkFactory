import {
	defineCapability,
	CAPABILITY_ABI_VERSION,
} from "@darkfactory/capability";
import { readdir, readFile } from "node:fs/promises";
import { join, relative as relpath, sep } from "node:path";
import { readRepoConfig, DEFAULT_MANIFESTS } from "../quality/utils";

/**
 * Repository detection capability.
 * Identifies ecosystems and packages and resolves their respective capabilities.
 */
interface PackageEntry {
	name?: string;
	path?: string;
	ecosystem?: string;
}

export const capability = defineCapability({
	abiVersion: CAPABILITY_ABI_VERSION,
	id: "detection",
	version: "0.1.0",
	description: "Durable repository, package, and capability detection.",
	domains: ["code"],
	detectors: [
		{
			id: "repo-detector",
			description: "Detects repository packages and their ecosystems.",
			domains: ["code"],
		},
	],
	tools: [
		{
			name: "detect_packages",
			description: "Detects all supported packages and ecosystems in the repository. Standard default pruned directories can be overridden or un-ignored by prefixing with '!' in environment.ignore (e.g., environment.ignore: ['!node_modules']).",
			inputSchema: {
				type: "object",
				properties: {},
				required: [],
			},
			execute: async (_, context) => {
				const root = context.repositoryRoot;
				const repoConfig = await readRepoConfig(root);

				const environment = repoConfig.environment || {};
				if (environment.packages && Array.isArray(environment.packages)) {
					return {
						detected: environment.packages.map((p: PackageEntry) => ({
							name: p.name || p.path,
							ecosystem: p.ecosystem,
							path: p.path,
						})),
					};
				}

				const packages: { name: string; ecosystem: string; path: string }[] = [];
				const defaultPruned = [
					".git",
					".venv",
					"venv",
					"node_modules",
					"target",
					"dist",
					"build",
					"vendor",
					"__pycache__",
				];
				const ignoreList = environment.ignore || [];
				const pruned = new Set<string>();
				for (const item of defaultPruned) {
					if (!ignoreList.includes(`!${item}`)) {
						pruned.add(item);
					}
				}
				for (const item of ignoreList) {
					if (typeof item === "string" && !item.startsWith("!")) {
						pruned.add(item);
					}
				}

				const manifests: Record<string, string> = {
					...DEFAULT_MANIFESTS,
					...(environment.manifests || repoConfig.manifests || {}),
				};

				const MAX_DEPTH = Number.isInteger(environment.maxDepth) ? environment.maxDepth : 8;
				let maxDepthReached = false;
				let scannedCount = 0;
				const MAX_SCANNED = 2000; // Safeguard against resource exhaustion

				async function scan(dir: string, depth = 0) {
					if (depth > MAX_DEPTH) {
						maxDepthReached = true;
						return;
					}
					scannedCount++;
					if (scannedCount > MAX_SCANNED) {
						maxDepthReached = true;
						return;
					}
					let entries;
					try {
						entries = await readdir(dir, { withFileTypes: true });
					} catch (e: any) {
						console.warn(`Warning: Failed to read directory during package detection at ${dir}:`, e?.message || e);
						return;
					}
					const files = entries.filter((e) => e.isFile()).map((e) => e.name);

					for (const [manifest, ecosystem] of Object.entries(manifests)) {
						if (files.includes(manifest)) {
							const rel = relpath(root, dir).split(sep).join("/") || ".";
							// Standardize on forward slashes and sanitize for name
							let pkgName = rel === "." ? "root" : rel.replace(/[^a-zA-Z0-9-]/g, "-");

							// Attempt to read manifest name if possible
							if (manifest === "package.json") {
								try {
									const rawPkg = await readFile(join(dir, manifest), "utf8");
									const parsed = JSON.parse(rawPkg);
									if (parsed.name && typeof parsed.name === "string") {
										pkgName = parsed.name;
									}
								} catch (err) {
									if (!(err instanceof SyntaxError)) {
										throw err;
									}
									// malformed json fallback: ignore
								}
							}

							packages.push({
								name: pkgName,
								ecosystem,
								path: rel,
							});
							break;
						}
					}

					const subDirs: string[] = [];
					for (const entry of entries) {
						if (entry.isSymbolicLink()) continue;
						if (entry.isDirectory() && !entry.name.startsWith(".") && !pruned.has(entry.name)) {
							subDirs.push(join(dir, entry.name));
						}
					}
					await Promise.all(subDirs.map((fullPath) => scan(fullPath, depth + 1)));
				}

				try {
					await scan(root);
				} catch (e) {
					console.error(`Error scanning repository at ${root}:`, e);
					throw e;
				}

				return { 
					detected: packages,
					status: maxDepthReached ? "pruned" : "complete",
					warning: maxDepthReached ? `Scanning reached maximum depth (${MAX_DEPTH}) or directory limit (${MAX_SCANNED}). Some packages might be missing.` : undefined
				};
			},
		},
	],
});

export default capability;
