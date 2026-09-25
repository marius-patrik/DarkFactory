/** @packageDocumentation
 * Release metadata checking and synchronization.
 */

import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { $ } from "bun";
import { loadRepoManifest } from "./manifest.ts";

/** Represents a package with its manifest path and version. */
interface PackageInfo {
	manifest: string;
	version: string | null;
	isWorkspaceRoot: boolean;
	path: string;
}

/** Verifies every package manifest agrees with the version being released.
 *
 * A monorepo carries the same version in several files, and nothing keeps them in step. A
 * release that tags `1.4.0` while `packages/cli/package.json` still says `1.3.9` publishes an
 * artifact whose own metadata contradicts its tag.
 *
 * @param repoRoot - Repository root.
 * @param version - The version being released.
 * @returns Human-readable descriptions of each disagreement. Empty means conformant.
 */
export function checkMetadata(repoRoot: string, version: string): string[] {
	const manifest = loadRepoManifest(repoRoot);
	const policy = String(manifest.release?.metadata ?? "warn");
	if (policy === "ignore") return [];

	const env = configureEnvironment(repoRoot);
	const problems: string[] = [];
	for (const pkg of env.packages) {
		if (pkg.version === null) continue;
		if (pkg.version !== version) {
			problems.push(
				`${pkg.manifest} declares version ${JSON.stringify(pkg.version)}, but the release is ${JSON.stringify(version)}`,
			);
		}
	}
	return problems;
}

/** Rewrites each package manifest's version in place.
 *
 * Only the version field is touched, and only in formats where it can be replaced without
 * reserialising the document - reformatting a manifest as a side effect of a release is a
 * diff nobody asked for.
 *
 * @param repoRoot - Repository root.
 * @param version - The version to write.
 * @returns The manifests that were changed.
 */
export function syncMetadata(repoRoot: string, version: string): string[] {
	const env = configureEnvironment(repoRoot);
	const changed: string[] = [];
	for (const pkg of env.packages) {
		if (pkg.version === null || pkg.version === version) continue;
		const path = resolve(repoRoot, pkg.manifest);
		let content: string;
		try {
			content = readFileSync(path, "utf8");
		} catch {
			continue;
		}

		let updated: string;
		if (pkg.manifest.endsWith(".json")) {
			updated = content.replace(/"version"\s*:\s*"[^"]*"/, `"version": "${version}"`);
		} else {
			// TOML-like: version = "1.2.3"
			updated = content.replace(/^(\s*version\s*=\s*)"[^"]*"/m, `$1"${version}"`);
		}

		if (updated !== content) {
			writeFileSync(path, updated, "utf8");
			changed.push(pkg.manifest);
		}
	}
	return changed;
}

/** Configures the environment to get package information.
 * This is a simplified version that reuses the existing environment configuration.
 */
function configureEnvironment(repoRoot: string): { packages: PackageInfo[] } {
	const manifest = loadRepoManifest(repoRoot);
	// Parse package information from the manifest
	const packages: PackageInfo[] = [];

	// Find package.json files
	const pkgJsonFiles = findPackageJsonFiles(repoRoot);
	for (const file of pkgJsonFiles) {
		const relPath = file.slice(repoRoot.length + 1);
		const content = readFileSync(file, "utf8");
		const parsed = JSON.parse(content);
		const version = parsed.version ?? null;
		const isWorkspaceRoot = Array.isArray(parsed.workspaces) && parsed.workspaces.length > 0;
		packages.push({
			manifest: relPath,
			version,
			isWorkspaceRoot,
			path: relPath === "package.json" ? "." : relPath.replace(/\/package\.json$/, ""),
		});
	}

	return { packages };
}

function findPackageJsonFiles(root: string): string[] {
	const files: string[] = [];
	function walk(dir: string) {
		for (const entry of $`ls -1 ${dir}`.text().trim().split("\n")) {
			const full = resolve(dir, entry);
			if (entry === "package.json") {
				files.push(full);
			} else if (entry !== "node_modules" && !entry.startsWith(".")) {
				try {
					const stat = $`test -d ${full} && echo dir`.text();
					if (stat.includes("dir")) walk(full);
				} catch {
					// not a directory
				}
			}
		}
	}
	walk(root);
	return files;
}