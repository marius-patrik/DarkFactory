import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dependencyAssetPath, nativeAssetCandidates } from "../scripts/package-assets.ts";

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("package asset resolution", () => {
	test("prefers a standalone harness node_modules asset", async () => {
		const repository = await mkdtemp(join(tmpdir(), "df-assets-"));
		roots.push(repository);
		const harness = join(repository, "harness");
		const asset = join(harness, "node_modules", "vendor", "package", "asset.bin");
		await mkdir(join(asset, ".."), { recursive: true });
		await writeFile(asset, "standalone");
		expect(dependencyAssetPath(harness, "vendor", "package", "asset.bin")).toBe(asset);
	});

	test("falls back to a workspace-hoisted node_modules asset", async () => {
		const repository = await mkdtemp(join(tmpdir(), "df-assets-"));
		roots.push(repository);
		const harness = join(repository, "harness");
		const asset = join(repository, "node_modules", "vendor", "package", "asset.bin");
		await mkdir(join(asset, ".."), { recursive: true });
		await writeFile(asset, "workspace");
		expect(dependencyAssetPath(harness, "vendor", "package", "asset.bin")).toBe(asset);
	});

	test("native asset candidates remain platform-specific", () => {
		expect(nativeAssetCandidates("linux", "x64").map((item) => item.file)).toEqual(["linux-platform-x11.node"]);
		expect(nativeAssetCandidates("darwin", "arm64").map((item) => item.file)).toEqual([
			"darwin-platform.node",
			"darwin-modifiers.node",
		]);
		expect(nativeAssetCandidates("freebsd", "x64")).toEqual([]);
	});
});
