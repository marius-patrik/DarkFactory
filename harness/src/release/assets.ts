/** @packageDocumentation
 * Release asset planning and collection.
 */

import { glob } from "node:glob";
import { resolve } from "node:path";
import { $ } from "bun";
import { loadRepoManifest } from "./manifest.ts";

/** A build step for a release asset. */
export interface BuildStep {
	command: string | undefined;
	globs: string[];
	cwd: string;
	ecosystem: string;
}

/** Reads bespoke asset definitions from the manifest.
 *
 * @param repoRoot - Repository root.
 * @returns A list of `{"command": ..., "path": ...}` entries; `command` may be absent.
 */
export function declaredAssets(repoRoot: string): ReadonlyArray<{ command?: string; path: string }> {
	const manifest = loadRepoManifest(repoRoot);
	const entries = (manifest.release?.assets ?? []) as ReadonlyArray<string | { path: string; command?: string }>;
	const resolved: { command?: string; path: string }[] = [];
	for (const entry of entries) {
		if (typeof entry === "string") {
			resolved.push({ path: entry });
		} else if (entry && typeof entry === "object" && "path" in entry) {
			resolved.push({ path: String(entry.path), ...(entry.command ? { command: String(entry.command) } : {}) });
		}
	}
	return resolved;
}

/** Builds the complete list of build steps and artifact globs for a release.
 *
 * Detection and declaration compose: everything `environment` found is built with its
 * ecosystem's command, and anything declared in the manifest is appended.
 *
 * @param repoRoot - Repository root.
 * @returns Steps as `{"command": ..., "globs": [...], "cwd": ...}`.
 */
export async function planAssets(repoRoot: string): Promise<BuildStep[]> {
	// Reuse the environment configuration from the harness
	const { configure } = await import("../config.ts");
	const env = configure(repoRoot);
	const steps: BuildStep[] = [];

	for (const [ecosystem, entry] of Object.entries(env.buildPlan())) {
		const packages = env.packagesFor(ecosystem);
		// A workspace root builds its members, so building each member as well duplicates work.
		const roots = packages.filter((p) => p.isWorkspaceRoot).length > 0
			? packages.filter((p) => p.isWorkspaceRoot)
			: packages;
		for (const pkg of roots) {
			steps.push({
				command: entry.command,
				cwd: pkg.path,
				globs: [...(entry.artifacts ?? [])],
				ecosystem,
			});
		}
	}

	for (const entry of declaredAssets(repoRoot)) {
		steps.push({
			command: entry.command,
			cwd: ".",
			globs: [entry.path],
			ecosystem: "declared",
		});
	}
	return steps;
}

/** Resolves the artifact globs produced by a set of build steps.
 *
 * @param repoRoot - Repository root.
 * @param steps - Steps from `planAssets`.
 * @returns Existing file paths, relative to the repository root, deduplicated and sorted.
 */
export async function collectAssets(repoRoot: string, steps: ReadonlyArray<BuildStep>): Promise<string[]> {
	const found: string[] = [];
	for (const step of steps) {
		const base = resolve(repoRoot, step.cwd ?? ".");
		for (const pattern of step.globs) {
			const matches = await glob(pattern, { cwd: base, absolute: false, nodir: true });
			for (const match of matches) {
				found.push(match.replace(/\\/g, "/"));
			}
		}
	}
	return [...new Set(found)].sort();
}