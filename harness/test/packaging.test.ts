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
