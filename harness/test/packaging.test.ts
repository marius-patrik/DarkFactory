import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { nativeAssetCandidates } from "../scripts/package-assets.ts";

describe("standalone packaging", () => {
	test("selects native pi-tui layouts for Darwin, Linux, and Windows", () => {
		expect(nativeAssetCandidates("darwin", "arm64").map((entry) => entry.file)).toContain("darwin-platform.node");
		expect(nativeAssetCandidates("linux", "x64").map((entry) => entry.file)).toContain("linux-platform-x11.node");
		expect(nativeAssetCandidates("win32", "x64").map((entry) => entry.file)).toContain("win32-platform.node");
	});

	test("retains pinned-package legacy native layouts as compatible fallbacks", () => {
		expect(nativeAssetCandidates("darwin", "arm64").map((entry) => entry.file)).toContain("darwin-modifiers.node");
		expect(nativeAssetCandidates("win32", "arm64").map((entry) => entry.file)).toContain("win32-console-mode.node");
	});

	test("compiles the worker under the exact path used by pi at runtime", async () => {
		expect(await readFile(new URL("../scripts/build.ts", import.meta.url), "utf8")).toContain("./src/utils/image-resize-worker.ts");
	});
});

describe("packageAssets without a native pi-tui module", () => {
	test("builds instead of failing when the platform has no prebuilt helper (Linux CI)", async () => {
		const { mkdtemp, mkdir: makeDir, writeFile, rm } = await import("node:fs/promises");
		const { tmpdir } = await import("node:os");
		const { join } = await import("node:path");
		const { existsSync } = await import("node:fs");
		const { packageAssets } = await import("../scripts/package-assets.ts");
		const root = await mkdtemp(join(tmpdir(), "df-pack-"));
		try {
			await makeDir(join(root, "node_modules", "@silvia-odwyer", "photon-node"), { recursive: true });
			await writeFile(join(root, "node_modules", "@silvia-odwyer", "photon-node", "photon_rs_bg.wasm"), "wasm");
			await makeDir(join(root, "assets"), { recursive: true });
			await writeFile(join(root, "assets", "a.json"), "{}");
			await packageAssets(root, "linux", "x64");
			expect(existsSync(join(root, "dist", "photon_rs_bg.wasm"))).toBe(true);
			expect(existsSync(join(root, "dist", "assets", "a.json"))).toBe(true);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
