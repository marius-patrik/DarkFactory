import { afterEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	assetForPlatform,
	executableReleaseVersion,
	managedWrapper,
	runReleasedInstaller,
	selectPublishedBinary,
} from "../../../../packages/harness/src/install/released-df.ts";

const asset = assetForPlatform(process.platform, process.arch);
const root = "https://github.com/marius-patrik/DarkFactory/releases/download";
const tempDirs: string[] = [];
afterEach(() => {
	for (const path of tempDirs.splice(0)) rmSync(path, { recursive: true, force: true });
});

interface Bundle {
	binary: Buffer;
	archive: Buffer;
}

function bundle(binary: Buffer): Bundle {
	const temp = mkdtempSync(join(tmpdir(), "df-archive-fixture-"));
	try {
		writeFileSync(join(temp, asset), binary);
		mkdirSync(join(temp, "assets"));
		writeFileSync(join(temp, "assets", "test.txt"), "asset data");
		mkdirSync(join(temp, "plugins"));
		mkdirSync(join(temp, "plugins", "code"));
		writeFileSync(join(temp, "plugins", "code", "capability.mjs"), "export default {};");

		writeFileSync(join(temp, "photon_rs_bg.wasm"), "wasm data");
		const output = spawnSync("tar", ["-czf", "runtime.tar.gz", asset, "assets", "plugins", "photon_rs_bg.wasm"], {
			cwd: temp,
			encoding: "utf8",
		});
		if (output.status !== 0) throw new Error(`Unable to create test runtime bundle: ${output.stderr}`);
		return { binary, archive: readFileSync(join(temp, "runtime.tar.gz")) };
	} finally {
		rmSync(temp, { recursive: true, force: true });
	}
}
const original = bundle(Buffer.from("#!/bin/sh\necho df fixture\n"));
const updated = bundle(Buffer.from("#!/bin/sh\necho df updated\n"));

function assetMetadata(name: string, tag: string, bytes: Buffer) {
	return {
		name,
		browser_download_url: `${root}/${tag}/${name}`,
		size: bytes.length,
		digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
	};
}
function release(tag: string, fixture: Bundle) {
	return {
		tag_name: tag,
		draft: false,
		prerelease: false,
		assets: [assetMetadata(asset, tag, fixture.binary), assetMetadata(`${asset}.tar.gz`, tag, fixture.archive)],
	};
}
function apiFixture(getRelease: () => ReturnType<typeof release>, getBytes: () => Buffer): typeof fetch {
	return (async (input: string | URL | Request) => {
		const url = String(input);
		if (url.endsWith("/releases/latest")) return Response.json(getRelease());
		if (url.includes("/releases/download/")) {
			const body = new Blob([Uint8Array.from(getBytes())]);
			return new Response(body, { status: 200 });
		}
		throw new Error(`Unexpected URL: ${url}`);
	}) as typeof fetch;
}

describe("source-free complete release installer", () => {
	it("selects only published bundles plus matching raw executable digest", () => {
		const metadata = release("v0.3.3", original);
		const selected = selectPublishedBinary(metadata, asset);
		expect(selected.tag).toBe("v0.3.3");
		expect(selected.digest).toHaveLength(64);
		expect(selected.binaryDigest).toHaveLength(64);
		expect(() => selectPublishedBinary({ ...metadata, prerelease: true }, asset)).toThrow();
		expect(() => selectPublishedBinary({ ...metadata, tag_name: "../escape" }, asset)).toThrow();
		expect(() => selectPublishedBinary({ ...metadata, assets: [metadata.assets[0]] }, asset)).toThrow();
	});

	it("requires an explicitly published platform target", () => {
		expect(assetForPlatform("linux", "x64")).toBe("df-linux-x64");
		expect(assetForPlatform("darwin", "arm64")).toBe("df-darwin-arm64");
		expect(assetForPlatform("win32", "x64")).toBe("df-win32-x64.exe");
		expect(() => assetForPlatform("win32", "arm64")).toThrow();
	});

	it("keeps stable platform shims independent of the installed version", () => {
		expect(managedWrapper("linux", "df-linux-x64")).toContain("current.txt");
		expect(managedWrapper("win32", "df-win32-x64.exe")).toContain("%DF_RELEASE%");
		expect(executableReleaseVersion("/home/example/.darkfactory/versions/v0.3.3/df-linux-x64")).toBe("v0.3.3");
	});

	it("installs and updates whole bundles without touching credentials or customized wrappers", async () => {
		const prefix = mkdtempSync(join(tmpdir(), "df-source-free-"));
		tempDirs.push(prefix);
		let tag = "v0.3.3",
			current = original;
		const http = apiFixture(
			() => release(tag, current),
			() => current.archive,
		);
		const args = ["--prefix", prefix];
		await runReleasedInstaller("install", args, http);
		const wrapper = join(prefix, "bin", process.platform === "win32" ? "df.cmd" : "df");
		expect(existsSync(wrapper)).toBe(true);
		expect(existsSync(join(prefix, "versions", tag, "assets", "test.txt"))).toBe(true);
		expect(readFileSync(join(prefix, "current.txt"), "utf8").trim()).toBe("v0.3.3");
		writeFileSync(join(prefix, "credentials.bin"), "preserve credentials");
		tag = "v0.3.4";
		current = updated;
		await runReleasedInstaller("update", args, http);
		expect(readFileSync(join(prefix, "current.txt"), "utf8").trim()).toBe("v0.3.4");
		expect(readFileSync(join(prefix, "credentials.bin"), "utf8")).toBe("preserve credentials");
		expect(readFileSync(wrapper, "utf8")).toBe(managedWrapper(process.platform, asset));
		writeFileSync(wrapper, "# customized wrapper\n");
		await expect(runReleasedInstaller("update", args, http)).rejects.toThrow("Unmanaged or modified wrapper");
	});

	it("does not activate a release when the download is tampered with", async () => {
		const prefix = mkdtempSync(join(tmpdir(), "df-source-free-"));
		tempDirs.push(prefix);
		await runReleasedInstaller(
			"install",
			["--prefix", prefix],
			apiFixture(
				() => release("v0.3.3", original),
				() => original.archive,
			),
		);
		const tampered = apiFixture(
			() => release("v0.3.4", updated),
			() => original.archive,
		);
		await expect(runReleasedInstaller("update", ["--prefix", prefix], tampered)).rejects.toThrow();
		expect(readFileSync(join(prefix, "current.txt"), "utf8").trim()).toBe("v0.3.3");
	});

	it("reports available release without installing during --check", async () => {
		const prefix = mkdtempSync(join(tmpdir(), "df-source-free-"));
		tempDirs.push(prefix);
		const fixture = apiFixture(
			() => release("v0.3.3", original),
			() => original.archive,
		);
		await runReleasedInstaller("install", ["--prefix", prefix, "--check"], fixture);
		expect(existsSync(join(prefix, "current.txt"))).toBe(false);
		await expect(runReleasedInstaller("update", ["--prefix", prefix], fixture)).rejects.toThrow(
			"No managed installation",
		);
	});
});
