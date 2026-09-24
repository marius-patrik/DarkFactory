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

/** Optional expected provenance supplied by an installer or fleet-acceptance caller. */
export interface ReleaseArtifactVerificationOptions {
	releaseVersion?: string;
	sourceCommit?: string;
	capabilityAbi?: string;
}

/** One fail-closed release artifact verification finding. */
export interface ReleaseArtifactVerificationFinding {
	code:
		| "manifest-version"
		| "release-version"
		| "source-commit"
		| "capability-abi"
		| "duplicate-path"
		| "invalid-record"
		| "artifact-unavailable"
		| "size-mismatch"
		| "sha256-mismatch";
	path?: string;
	message: string;
}

/** Result of validating one release manifest against the bytes on disk. */
export interface ReleaseArtifactVerificationResult {
	valid: boolean;
	findings: readonly ReleaseArtifactVerificationFinding[];
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

/**
 * Verifies a release manifest against installed/downloaded bytes and expected provenance.
 *
 * Verification never trusts paths or record metadata from the manifest. Every artifact path is
 * resolved through the same containment guard used at manifest generation time and every file is
 * rehashed from disk.
 */
export async function verifyReleaseArtifactManifest(
	rootDir: string,
	manifest: ReleaseArtifactManifest,
	expected: ReleaseArtifactVerificationOptions = {},
): Promise<ReleaseArtifactVerificationResult> {
	const findings: ReleaseArtifactVerificationFinding[] = [];
	const root = await realpath(resolve(rootDir));

	if (manifest.version !== 1) {
		findings.push({ code: "manifest-version", message: `Unsupported release manifest version: ${String(manifest.version)}` });
	}
	try {
		assertReleaseVersion(manifest.releaseVersion);
	} catch (error) {
		findings.push({ code: "release-version", message: error instanceof Error ? error.message : String(error) });
	}
	try {
		assertSourceCommit(manifest.sourceCommit);
	} catch (error) {
		findings.push({ code: "source-commit", message: error instanceof Error ? error.message : String(error) });
	}

	if (manifest.capabilityAbi !== CAPABILITY_ABI_VERSION) {
		findings.push({
			code: "capability-abi",
			message: `Manifest capability ABI ${manifest.capabilityAbi} does not match runtime ABI ${CAPABILITY_ABI_VERSION}.`,
		});
	}
	if (expected.releaseVersion !== undefined && manifest.releaseVersion !== expected.releaseVersion) {
		findings.push({
			code: "release-version",
			message: `Manifest release version ${manifest.releaseVersion} does not match expected ${expected.releaseVersion}.`,
		});
	}
	if (expected.sourceCommit !== undefined && manifest.sourceCommit !== expected.sourceCommit) {
		findings.push({
			code: "source-commit",
			message: `Manifest source commit ${manifest.sourceCommit} does not match expected ${expected.sourceCommit}.`,
		});
	}
	if (expected.capabilityAbi !== undefined && manifest.capabilityAbi !== expected.capabilityAbi) {
		findings.push({
			code: "capability-abi",
			message: `Manifest capability ABI ${manifest.capabilityAbi} does not match expected ${expected.capabilityAbi}.`,
		});
	}

	const seen = new Set<string>();
	for (const record of manifest.artifacts) {
		if (
			!record ||
			typeof record.path !== "string" ||
			!Number.isSafeInteger(record.bytes) ||
			record.bytes < 0 ||
			!/^[0-9a-f]{64}$/u.test(record.sha256)
		) {
			findings.push({
				code: "invalid-record",
				...(typeof record?.path === "string" ? { path: record.path } : {}),
				message: "Release artifact record has invalid path, byte count, or SHA-256 digest.",
			});
			continue;
		}

		let artifact: { absolute: string; path: string };
		try {
			artifact = await resolveArtifact(root, record.path);
		} catch (error) {
			findings.push({
				code: "artifact-unavailable",
				path: record.path,
				message: error instanceof Error ? error.message : String(error),
			});
			continue;
		}

		if (seen.has(artifact.path)) {
			findings.push({
				code: "duplicate-path",
				path: artifact.path,
				message: `Duplicate release artifact path: ${artifact.path}`,
			});
			continue;
		}
		seen.add(artifact.path);

		const content = await readFile(artifact.absolute);
		if (content.byteLength !== record.bytes) {
			findings.push({
				code: "size-mismatch",
				path: artifact.path,
				message: `Artifact byte count mismatch: expected ${record.bytes}, got ${content.byteLength}.`,
			});
		}
		const sha256 = createHash("sha256").update(content).digest("hex");
		if (sha256 !== record.sha256) {
			findings.push({
				code: "sha256-mismatch",
				path: artifact.path,
				message: `Artifact SHA-256 mismatch for ${artifact.path}.`,
			});
		}
	}

	return { valid: findings.length === 0, findings };
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
