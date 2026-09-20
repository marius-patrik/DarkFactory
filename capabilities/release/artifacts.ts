import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { CAPABILITY_ABI_VERSION } from "@darkfactory/capability";

/** Integrity record for one file included in a DarkFactory release artifact set. */
export interface ReleaseArtifactRecord {
	path: string;
	bytes: number;
	sha256: string;
}

/** Deterministic source/integrity manifest shipped with one release artifact set. */
export interface ReleaseArtifactManifest {
	version: 1;
	releaseVersion: string;
	sourceCommit: string;
	capabilityAbi: string;
	artifacts: readonly ReleaseArtifactRecord[];
}

/** Inputs required to derive deterministic release provenance. */
export interface ReleaseArtifactManifestOptions {
	releaseVersion: string;
	sourceCommit: string;
}

function assertReleaseVersion(version: string): void {
	if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(version)) {
		throw new Error(`Release version must be SemVer: ${version}`);
	}
}

function assertSourceCommit(commit: string): void {
	if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(commit)) {
		throw new Error("Source commit must be a full lowercase hexadecimal Git object id.");
	}
}

function portableRelativePath(root: string, absolute: string): string {
	return relative(root, absolute).split(sep).join("/");
}

async function resolveArtifact(root: string, requested: string): Promise<{ absolute: string; path: string }> {
	if (!requested.trim()) throw new Error("Release artifact path must not be empty.");
	if (isAbsolute(requested)) throw new Error(`Release artifact path must be repository-relative: ${requested}`);

	const absolute = resolve(root, requested);
	const rootReal = await realpath(root);
	const artifactReal = await realpath(absolute);
	const rootPrefix = rootReal.endsWith(sep) ? rootReal : `${rootReal}${sep}`;
	if (artifactReal !== rootReal && !artifactReal.startsWith(rootPrefix)) {
		throw new Error(`Release artifact escapes the release root: ${requested}`);
	}
	const info = await stat(artifactReal);
	if (!info.isFile()) throw new Error(`Release artifact is not a regular file: ${requested}`);
	const path = portableRelativePath(rootReal, artifactReal);
	if (!path || path.startsWith("../")) throw new Error(`Invalid release artifact path: ${requested}`);
	return { absolute: artifactReal, path };
}

/**
 * Computes a deterministic release-integrity manifest from an explicit artifact list.
 *
 * The caller owns artifact selection. This function deliberately performs no glob expansion or
 * publication so release packaging has one explicit, auditable input set.
 */
export async function buildReleaseArtifactManifest(
	rootDir: string,
	files: readonly string[],
	options: ReleaseArtifactManifestOptions,
): Promise<ReleaseArtifactManifest> {
	assertReleaseVersion(options.releaseVersion);
	assertSourceCommit(options.sourceCommit);
	const root = await realpath(resolve(rootDir));
	const records: ReleaseArtifactRecord[] = [];
	const seen = new Set<string>();

	for (const requested of files) {
		const artifact = await resolveArtifact(root, requested);
		if (seen.has(artifact.path)) throw new Error(`Duplicate release artifact: ${artifact.path}`);
		seen.add(artifact.path);
		const content = await readFile(artifact.absolute);
		records.push({
			path: artifact.path,
			bytes: content.byteLength,
			sha256: createHash("sha256").update(content).digest("hex"),
		});
	}

	records.sort((a, b) => a.path.localeCompare(b.path));
	return {
		version: 1,
		releaseVersion: options.releaseVersion,
		sourceCommit: options.sourceCommit,
		capabilityAbi: CAPABILITY_ABI_VERSION,
		artifacts: records,
	};
}

/** Renders portable sha256sum-compatible lines from a deterministic release manifest. */
export function renderSha256Sums(manifest: ReleaseArtifactManifest): string {
	return manifest.artifacts.map((artifact) => `${artifact.sha256}  ${artifact.path}`).join("\n") +
		(manifest.artifacts.length > 0 ? "\n" : "");
}

/** Serializes a release manifest with stable indentation and trailing newline. */
export function serializeReleaseArtifactManifest(manifest: ReleaseArtifactManifest): string {
	return `${JSON.stringify(manifest, null, 2)}\n`;
}
