/**
 * The platforms `df` is published for, and the names its release assets carry.
 *
 * One table, one owner. The release workflow builds its job matrix from this module rather than
 * repeating the list in YAML, so a target added here is a target that is built, verified and
 * attached, and a target missing here is a platform `df` is not published for. The names are
 * derived rather than written down, because an asset name that disagrees with what the installer
 * resolves is how a wrong-architecture binary gets fetched and executed.
 */

/** One published `df` platform/architecture pair and the runner that can build and run it. */
interface ReleaseTarget {
	/** `<platform>-<arch>`, spelled as `process.platform` and `process.arch` report them. */
	readonly name: string;
	readonly platform: NodeJS.Platform;
	readonly arch: string;
	/** Bun's cross-compilation target for the same pair. */
	readonly bunTarget: string;
	/** A GitHub-hosted runner of exactly this platform and architecture. */
	readonly runner: string;
}

/**
 * Every target a release ships.
 *
 * A target is listed here only when a hosted runner exists that is natively that platform and
 * architecture, because the build verifies the artifact by running it (`df __packaging-smoke`).
 * A cross-compiled binary cannot be executed by the runner that produced it, so listing a target
 * with no native runner would mean shipping an artifact nothing ever ran.
 */
export const RELEASE_TARGETS: readonly ReleaseTarget[] = [
	{
		name: "darwin-arm64",
		platform: "darwin",
		arch: "arm64",
		bunTarget: "bun-darwin-arm64",
		runner: "macos-15",
	},
	{
		name: "darwin-x64",
		platform: "darwin",
		arch: "x64",
		bunTarget: "bun-darwin-x64",
		runner: "macos-15-intel",
	},
	{
		name: "linux-arm64",
		platform: "linux",
		arch: "arm64",
		bunTarget: "bun-linux-arm64",
		runner: "ubuntu-24.04-arm",
	},
	{
		name: "linux-x64",
		platform: "linux",
		arch: "x64",
		bunTarget: "bun-linux-x64",
		runner: "ubuntu-24.04",
	},
	{
		name: "win32-x64",
		platform: "win32",
		arch: "x64",
		bunTarget: "bun-windows-x64",
		runner: "windows-2025",
	},
];

/** Returns the published target with this name, or `undefined` when it is not published. */
export function findReleaseTarget(name: string): ReleaseTarget | undefined {
	return RELEASE_TARGETS.find((target) => target.name === name);
}

/** Returns the published target with this name, or throws naming the targets that are published. */
export function requireReleaseTarget(name: string): ReleaseTarget {
	const target = findReleaseTarget(name);
	if (!target) {
		throw new Error(
			`Unknown df release target ${name}. Supported targets: ${RELEASE_TARGETS.map((entry) => entry.name).join(", ")}.`,
		);
	}
	return target;
}

/**
 * The release asset name for a target.
 *
 * The architecture is part of the name on purpose. A single `df` per operating system cannot be
 * right for both an Apple Silicon and an Intel host, or for both an x64 and an arm64 Linux host,
 * because the bytes differ; only the name was shared, so the wrong one was silently correct.
 */
export function releaseAssetName(name: string): string {
	return executableName(requireReleaseTarget(name));
}

/** The file name a target's executable carries, which is its release asset name. */
function executableName(target: ReleaseTarget): string {
	return target.platform === "win32" ? `df-${target.name}.exe` : `df-${target.name}`;
}

/** Every release asset name, in matrix order, for the exact set a release must attach. */
export function releaseAssetNames(): readonly string[] {
	return RELEASE_TARGETS.map((target) => releaseAssetName(target.name));
}

/** The job matrix a workflow needs to build, verify and attach every target. */
export function releaseBuildMatrix(): { include: { target: string; runner: string; asset: string }[] } {
	return {
		include: RELEASE_TARGETS.map((target) => ({
			target: target.name,
			runner: target.runner,
			asset: releaseAssetName(target.name),
		})),
	};
}

/**
 * Resolves the published target matching a host, or explains why none does.
 *
 * The failure names the detected platform and architecture and lists the assets that do exist, so
 * a host outside the matrix is told what to build or request instead of failing later with an
 * opaque exec error from a binary that was never the right one.
 */
export function resolveHostTarget(platform: string, arch: string): ReleaseTarget {
	const target = RELEASE_TARGETS.find((entry) => entry.platform === platform && entry.arch === arch);
	if (target) return target;
	throw new Error(
		`df is not published for ${platform}-${arch}. ` +
			`Published targets: ${RELEASE_TARGETS.map((entry) => entry.name).join(", ")}. ` +
			`Release assets: ${releaseAssetNames().join(", ")}.`,
	);
}

if (import.meta.main) {
	console.log(JSON.stringify(releaseBuildMatrix()));
}
