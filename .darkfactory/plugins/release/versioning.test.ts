import { describe, expect, test } from "bun:test";
import {
	assertFinalReleaseVersion,
	assertLockstepPackageVersions,
	canonicalVersionFromPackageJson,
	validateLockstepPackageVersions,
} from "./versioning.ts";

describe("release lockstep versioning", () => {
	test("reads the canonical version from root package metadata", () => {
		expect(canonicalVersionFromPackageJson('{"name":"darkfactory-workspace","version":"0.0.0"}')).toBe("0.0.0");
		expect(() => canonicalVersionFromPackageJson('{"name":"darkfactory-workspace"}')).toThrow("must be valid SemVer");
		expect(() => canonicalVersionFromPackageJson("{")).toThrow("not valid JSON");
	});

	test("accepts one exact version across first-party packages and capabilities", () => {
		const result = validateLockstepPackageVersions("1.4.0", [
			{ name: "@darkfactory/protocol", version: "1.4.0" },
			{ name: "@darkfactory/core", version: "1.4.0" },
			{ name: "@darkfactory/capability-release", version: "1.4.0" },
		]);
		expect(result).toEqual({ valid: true, canonicalVersion: "1.4.0", findings: [] });
	});

	test("reports mismatches, invalid versions and duplicate package identities", () => {
		const result = validateLockstepPackageVersions("1.4.0", [
			{ name: "@darkfactory/core", version: "1.3.0" },
			{ name: "@darkfactory/web", version: "latest" },
			{ name: "@darkfactory/core", version: "1.4.0" },
		]);
		expect(result.valid).toBe(false);
		expect(result.findings.map((finding) => finding.code)).toEqual([
			"version-mismatch",
			"invalid-package-version",
			"duplicate-package",
		]);
		expect(() => assertLockstepPackageVersions("1.4.0", [{ name: "@darkfactory/core", version: "1.3.0" }])).toThrow(
			"does not match canonical",
		);
	});

	test("final publication rejects development and prerelease versions", () => {
		expect(assertFinalReleaseVersion("1.0.0")).toBe("1.0.0");
		expect(assertFinalReleaseVersion("1.0.0+build.7")).toBe("1.0.0+build.7");
		expect(() => assertFinalReleaseVersion("0.0.0")).toThrow("development sentinel");
		expect(() => assertFinalReleaseVersion("1.0.0-rc.1")).toThrow("non-prerelease SemVer");
	});
});
