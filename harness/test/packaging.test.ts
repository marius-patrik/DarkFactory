import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
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
		expect(await readFile(new URL("../scripts/build.ts", import.meta.url), "utf8")).toContain(
			"./src/utils/image-resize-worker.ts",
		);
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

describe("biome configuration", () => {
	const harnessDir = join(import.meta.dir, "..");

	test("uses tabs, width 120, double quotes and blocks unused imports and variables", async () => {
		const json = JSON.parse(await readFile(new URL("../biome.json", import.meta.url), "utf8"));
		expect(json.formatter).toMatchObject({ indentStyle: "tab", lineWidth: 120 });
		expect(json.javascript.formatter.quoteStyle).toBe("double");
		expect(json.linter.rules.preset ?? json.linter.rules.recommended).toBe("recommended");
		expect(json.linter.rules.correctness).toMatchObject({ noUnusedImports: "error", noUnusedVariables: "error" });
	});

	test("the pinned Biome accepts the configuration and formats with it", () => {
		const result = Bun.spawnSync([process.execPath, "x", "biome", "format", "--stdin-file-path=sample.ts"], {
			cwd: harnessDir,
			stdin: Buffer.from("const a = 'x'; export function f() { return a }\n"),
		});
		expect(result.exitCode).toBe(0);
		expect(result.stdout.toString()).toBe('const a = "x";\nexport function f() {\n\treturn a;\n}\n');
	});

	test("package.json pins Biome and exposes format, lint and check", async () => {
		const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
		expect(pkg.devDependencies["@biomejs/biome"]).toMatch(/^\d+\.\d+\.\d+$/);
		expect(pkg.scripts).toMatchObject({ format: "biome format --write .", lint: "biome lint .", check: "biome ci ." });
	});
});
