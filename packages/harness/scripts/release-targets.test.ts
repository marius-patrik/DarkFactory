import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	CHECKSUMS_FILE,
	checksumFile,
	collectReleaseChecksums,
	RECORD_SUFFIX,
	renderChecksums,
	verifyReleaseChecksums,
	writeReleaseChecksums,
} from "./release-checksums.ts";
import {
	findReleaseTarget,
	RELEASE_TARGETS,
	releaseAssetName,
	releaseAssetNames,
	releaseBuildMatrix,
	requireReleaseTarget,
	resolveHostTarget,
} from "./release-targets.ts";

describe("df release target matrix", () => {
	// The five platforms a release ships. Adding a target here is what makes it build, so this list
	// is the contract: an installer resolving a sixth platform has nothing to fetch.
	test("publishes exactly the five supported platform-architecture pairs", () => {
		expect(RELEASE_TARGETS.map((target) => target.name)).toEqual([
			"darwin-arm64",
			"darwin-x64",
			"linux-arm64",
			"linux-x64",
			"win32-x64",
		]);
	});

	test("names every asset after its platform and architecture, and only Windows carries .exe", () => {
		expect(releaseAssetNames()).toEqual([
			"df-darwin-arm64",
			"df-darwin-x64",
			"df-linux-arm64",
			"df-linux-x64",
			"df-win32-x64.exe",
		]);
		expect(releaseAssetNames().filter((name) => name.endsWith(".exe"))).toEqual(["df-win32-x64.exe"]);
	});

	// One `df` per operating system is what made Apple Silicon vs Intel and x64 vs arm64 Linux
	// indistinguishable. The name has to differ, or the wrong bytes are fetched under the right one.
	test("gives an Intel and an Apple Silicon host different files", () => {
		expect(releaseAssetName("darwin-arm64")).not.toBe(releaseAssetName("darwin-x64"));
		expect(releaseAssetName("linux-x64")).not.toBe(releaseAssetName("linux-arm64"));
	});

	test("gives every target a distinct runner of its own platform and architecture", () => {
		const runners = RELEASE_TARGETS.map((target) => target.runner);
		expect(new Set(runners).size).toBe(RELEASE_TARGETS.length);
		// Node calls macOS `darwin` and Windows `win32`; the runner labels call them `macos` and
		// `windows`. A runner of a different platform would build on hardware that cannot run the
		// artifact it just produced, which is the one mistake this matrix must not make.
		const runnerPrefix = { darwin: "macos", linux: "ubuntu", win32: "windows" } as const;
		for (const target of RELEASE_TARGETS) {
			expect(target.runner.startsWith(runnerPrefix[target.platform as keyof typeof runnerPrefix])).toBe(true);
		}
		// Bun spells Windows `windows` where Node and the asset name spell it `win32`, so the two
		// vocabularies are mapped per target rather than derived from the name.
		expect(Object.fromEntries(RELEASE_TARGETS.map((t) => [t.name, t.bunTarget]))).toEqual({
			"darwin-arm64": "bun-darwin-arm64",
			"darwin-x64": "bun-darwin-x64",
			"linux-arm64": "bun-linux-arm64",
			"linux-x64": "bun-linux-x64",
			"win32-x64": "bun-windows-x64",
		});
	});

	test("derives the workflow job matrix from the same table", () => {
		expect(releaseBuildMatrix()).toEqual({
			include: [
				{ target: "darwin-arm64", runner: "macos-15", asset: "df-darwin-arm64" },
				{ target: "darwin-x64", runner: "macos-15-intel", asset: "df-darwin-x64" },
				{ target: "linux-arm64", runner: "ubuntu-24.04-arm", asset: "df-linux-arm64" },
				{ target: "linux-x64", runner: "ubuntu-24.04", asset: "df-linux-x64" },
				{ target: "win32-x64", runner: "windows-2025", asset: "df-win32-x64.exe" },
			],
		});
	});

	test("resolves every published host to its own target", () => {
		for (const target of RELEASE_TARGETS) {
			expect(resolveHostTarget(target.platform, target.arch).name).toBe(target.name);
		}
	});

	// An unsupported host has to be told what was detected and what exists, or it fails later at
	// exec with an opaque error from a binary that was never the right one.
	test("names the detected platform, the detected architecture and the assets that do exist", () => {
		let message = "";
		try {
			resolveHostTarget("freebsd", "riscv64");
		} catch (error) {
			message = error instanceof Error ? error.message : String(error);
		}
		expect(message).toContain("freebsd-riscv64");
		expect(message).toContain("darwin-arm64, darwin-x64, linux-arm64, linux-x64, win32-x64");
		for (const asset of releaseAssetNames()) expect(message).toContain(asset);
	});

	test("rejects an architecture that is not published for an operating system that is", () => {
		expect(() => resolveHostTarget("darwin", "ia32")).toThrow("df is not published for darwin-ia32");
		expect(() => resolveHostTarget("linux", "arm")).toThrow("df is not published for linux-arm");
	});

	test("rejects an unknown target by name when a build asks for one", () => {
		expect(() => requireReleaseTarget("win32-arm64")).toThrow("Unknown df release target win32-arm64");
		expect(findReleaseTarget("win32-arm64")).toBeUndefined();
		expect(() => releaseAssetName("win32-arm64")).toThrow("Unknown df release target win32-arm64");
	});
});

describe("df release checksums", () => {
	async function stage(files: Record<string, string>): Promise<string> {
		const root = await mkdtemp(join(tmpdir(), "df-checksums-"));
		for (const [name, content] of Object.entries(files)) await writeFile(join(root, name), content);
		return root;
	}

	test("writes a sha256sum -c record and verifies the bytes that arrived", async () => {
		const root = await stage({ "df-linux-x64": "linux\n", "df-win32-x64.exe": "windows\n" });
		try {
			const text = await writeReleaseChecksums(root, ["df-win32-x64.exe", "df-linux-x64"]);
			expect(text).toBe(
				`${(await checksumFile(root, "df-linux-x64")).sha256}  df-linux-x64\n` +
					`${(await checksumFile(root, "df-win32-x64.exe")).sha256}  df-win32-x64.exe\n`,
			);
			expect(await readFile(join(root, CHECKSUMS_FILE), "utf8")).toBe(text);
			expect(await verifyReleaseChecksums(root, text)).toEqual({ checked: 2, findings: [] });
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("fails the release when a downloaded artifact does not match the digest that was built", async () => {
		const root = await stage({ "df-linux-x64": "linux\n" });
		try {
			const text = await writeReleaseChecksums(root, ["df-linux-x64"]);
			await writeFile(join(root, "df-linux-x64"), "corrupted in transit\n");
			const result = await verifyReleaseChecksums(root, text);
			expect(result.findings).toHaveLength(1);
			expect(result.findings[0]).toStartWith("df-linux-x64: expected sha256 ");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("fails the release when an artifact the record names never arrived", async () => {
		const root = await stage({ "df-linux-x64": "linux\n", "df-win32-x64.exe": "windows\n" });
		try {
			const text = await writeReleaseChecksums(root, ["df-linux-x64", "df-win32-x64.exe"]);
			await rm(join(root, "df-win32-x64.exe"));
			const result = await verifyReleaseChecksums(root, text);
			expect(result.findings).toEqual([
				"df-win32-x64.exe: listed in checksums.txt but missing from the downloaded release",
			]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("renders nothing for an empty artifact set rather than a bare digest line", () => {
		expect(renderChecksums([])).toBe("");
	});

	test("merges every target's record into one release-wide checksum file", async () => {
		const root = await stage({
			"df-darwin-arm64": "apple silicon\n",
			"df-linux-x64": "linux\n",
			"df-win32-x64.exe": "windows\n",
		});
		try {
			for (const asset of ["df-darwin-arm64", "df-linux-x64", "df-win32-x64.exe"]) {
				await writeReleaseChecksums(root, [asset], `${asset}${RECORD_SUFFIX}`);
			}
			const result = await collectReleaseChecksums(root);
			expect(result.assets).toEqual(["df-darwin-arm64", "df-linux-x64", "df-win32-x64.exe"]);
			expect(result.checksums).toBe(await readFile(join(root, CHECKSUMS_FILE), "utf8"));
			expect(result.checksums.split("\n").filter(Boolean)).toHaveLength(3);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("writes no release checksums at all when an artifact does not match its record", async () => {
		const root = await stage({ "df-linux-x64": "linux\n" });
		try {
			await writeReleaseChecksums(root, ["df-linux-x64"], `df-linux-x64${RECORD_SUFFIX}`);
			await writeFile(join(root, "df-linux-x64"), "corrupted in transit\n");
			await expect(collectReleaseChecksums(root)).rejects.toThrow("do not match the digests recorded at build time");
			expect(existsSync(join(root, CHECKSUMS_FILE))).toBe(false);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("refuses to publish when no target recorded a digest", async () => {
		const root = await stage({ "df-linux-x64": "linux\n" });
		try {
			await expect(collectReleaseChecksums(root)).rejects.toThrow("nothing was built to publish");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
