/** One first-party package/capability version participating in a lockstep release. */
export interface ReleasePackageVersion {
	name: string;
	version: string;
}

/** One deterministic lockstep-version validation finding. */
export interface LockstepVersionFinding {
	code: "invalid-canonical-version" | "invalid-package-version" | "version-mismatch" | "duplicate-package";
	packageName?: string;
	message: string;
}

/** Result of checking a first-party package set against one canonical version. */
export interface LockstepVersionValidation {
	valid: boolean;
	canonicalVersion: string;
	findings: readonly LockstepVersionFinding[];
}

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;
const FINAL_SEMVER = /^\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?$/u;

/**
 * Reads the canonical DarkFactory version from root package metadata.
 *
 * The caller owns file IO. Keeping this parser pure allows release code to consume the root
 * manifest without introducing a second package-discovery mechanism.
 */
export function canonicalVersionFromPackageJson(packageJson: string): string {
	let parsed: unknown;
	try {
		parsed = JSON.parse(packageJson);
	} catch {
		throw new Error("Canonical root package metadata is not valid JSON.");
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("Canonical root package metadata must be an object.");
	}
	const version = (parsed as Record<string, unknown>).version;
	if (typeof version !== "string" || !SEMVER.test(version)) {
		throw new Error("Canonical root package version must be valid SemVer.");
	}
	return version;
}

/** Validates an explicit detected first-party package set against one lockstep version. */
export function validateLockstepPackageVersions(
	canonicalVersion: string,
	packages: readonly ReleasePackageVersion[],
): LockstepVersionValidation {
	const findings: LockstepVersionFinding[] = [];
	if (!SEMVER.test(canonicalVersion)) {
		findings.push({
			code: "invalid-canonical-version",
			message: `Canonical release version is not valid SemVer: ${canonicalVersion}`,
		});
	}

	const seen = new Set<string>();
	for (const pkg of packages) {
		if (seen.has(pkg.name)) {
			findings.push({
				code: "duplicate-package",
				packageName: pkg.name,
				message: `Duplicate package in lockstep release set: ${pkg.name}`,
			});
			continue;
		}
		seen.add(pkg.name);

		if (!SEMVER.test(pkg.version)) {
			findings.push({
				code: "invalid-package-version",
				packageName: pkg.name,
				message: `Package ${pkg.name} has invalid SemVer: ${pkg.version}`,
			});
			continue;
		}
		if (pkg.version !== canonicalVersion) {
			findings.push({
				code: "version-mismatch",
				packageName: pkg.name,
				message: `Package ${pkg.name} version ${pkg.version} does not match canonical ${canonicalVersion}.`,
			});
		}
	}

	return { valid: findings.length === 0, canonicalVersion, findings };
}

/** Throws when a first-party package set is not lockstep-versioned. */
export function assertLockstepPackageVersions(
	canonicalVersion: string,
	packages: readonly ReleasePackageVersion[],
): void {
	const result = validateLockstepPackageVersions(canonicalVersion, packages);
	if (!result.valid) {
		throw new Error(result.findings.map((finding) => finding.message).join("\n"));
	}
}

/**
 * Validates a version for the single final supported publication.
 *
 * Development sentinel 0.0.0 and prerelease identifiers are rejected so this gate cannot
 * accidentally publish an intermediate/canary/pre-release artifact.
 */
export function assertFinalReleaseVersion(version: string): string {
	if (!FINAL_SEMVER.test(version)) {
		throw new Error(`Final release version must be non-prerelease SemVer: ${version}`);
	}
	if (version === "0.0.0") {
		throw new Error("Final release version must not use the 0.0.0 development sentinel.");
	}
	return version;
}
