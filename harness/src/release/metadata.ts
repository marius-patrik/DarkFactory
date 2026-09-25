/** @packageDocumentation
 * Release metadata checking and synchronization.
 */

import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { loadRepoManifest } from "./manifest.ts";
import { configure } from "./environment.ts";

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

	const env = configure(repoRoot);
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
	const env = configure(repoRoot);
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
		} else if (pkg.manifest.endsWith(".toml")) {
			updated = content.replace(/^(\s*version\s*=\s*)"[^"]*"/m, `$1"${version}"`);
		} else {
			updated = content.replace(/(version\s*[:=]\s*["'])([^"']+)(["'])/, `$1${version}$3`);
		}

		if (updated !== content) {
			writeFileSync(path, updated, "utf8");
			changed.push(pkg.manifest);
		}
	}
	return changed;
}
