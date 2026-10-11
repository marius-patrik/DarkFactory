import { afterEach, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	assetForPlatform,
	executableReleaseVersion,
	managedWrapper,
	runReleasedInstaller,
	selectPublishedBinary,
} from "../../src/install/released-df.ts";

const original = Buffer.from("#!/bin/sh\necho df fixture\n");
const next = Buffer.from("#!/bin/sh\necho df updated\n");
const asset = assetForPlatform(process.platform, process.arch);
const root = "https://github.com/marius-patrik/DarkFactory/releases/download";

const tempDirs: string[] = [];
afterEach(() => {
	for (const path of tempDirs.splice(0)) rmSync(path, { recursive: true, force: true });
});

function release(tag: string, bytes: Buffer) {
	return {
		tag_name: tag,
		draft: false,
		prerelease: false,
		assets: [
			{
				name: asset,
				browser_download_url: `${root}/${tag}/${asset}`,
				size: bytes.length,
				digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
			},
		],
	};
}

function apiFixture(getRelease: () => ReturnType<typeof release>, getBytes: () => Buffer): typeof fetch {
	return (async (input: string | URL | Request) => {
		const url = String(input);
		if (url.endsWith("/releases/latest")) return Response.json(getRelease());
		if (url.includes("/releases/download/")) return new Response(new TextDecoder().decode(getBytes()), { status: 200 });
		throw new Error(`Unexpected URL: ${url}`);
	}) as typeof fetch;
}

describe("source-free release installer", () => {
	it("selects only published binary assets with an exact SHA-256 digest", () => {
		const metadata = release("v0.3.3", original);
		const selected = selectPublishedBinary(metadata, asset);
		expect(selected.tag).toBe("v0.3.3");
		expect(selected.digest).toHaveLength(64);
		expect(() => selectPublishedBinary({ ...metadata, prerelease: true }, asset)).toThrow();
		expect(() => selectPublishedBinary({ ...metadata, tag_name: "../escape" }, asset)).toThrow();
		expect(() =>
			selectPublishedBinary({ ...metadata, assets: [{ ...metadata.assets[0], digest: "unknown" }] }, asset),
		).toThrow();
	});

	it("requires a published target for the current OS/architecture", () => {
		expect(assetForPlatform("linux", "x64")).toBe("df-linux-x64");
		expect(assetForPlatform("darwin", "arm64")).toBe("df-darwin-arm64");
		expect(assetForPlatform("win32", "x64")).toBe("df-win32-x64.exe");
		expect(() => assetForPlatform("win32", "arm64")).toThrow();
	});

	it("keeps stable shims independent of the release version", () => {
		expect(managedWrapper("linux", "df-linux-x64")).toContain("current.txt");
		expect(managedWrapper("win32", "df-win32-x64.exe")).toContain("%DF_RELEASE%");
		expect(executableReleaseVersion("/home/example/.darkfactory/versions/v0.3.3/df-linux-x64")).toBe("v0.3.3");
	});

	it("installs, updates, preserves credentials and refuses customized wrappers", async () => {
		const prefix = mkdtempSync(join(tmpdir(), "df-source-free-"));
		tempDirs.push(prefix);
		let tag = "v0.3.3",
			binary = original;
		const http = apiFixture(
			() => release(tag, binary),
			() => binary,
		);
		const args = ["--prefix", prefix];
		await runReleasedInstaller("install", args, http);
		const wrapper = join(prefix, "bin", process.platform === "win32" ? "df.cmd" : "df");
		expect(existsSync(wrapper)).toBe(true);
		expect(readFileSync(join(prefix, "current.txt"), "utf8").trim()).toBe("v0.3.3");
		writeFileSync(join(prefix, "my-local-state"), "keep untouched");
		tag = "v0.3.4";
		binary = next;
		await runReleasedInstaller("update", args, http);
		expect(readFileSync(join(prefix, "current.txt"), "utf8").trim()).toBe("v0.3.4");
		expect(readFileSync(join(prefix, "my-local-state"), "utf8")).toBe("keep untouched");
		expect(readFileSync(wrapper, "utf8")).toBe(managedWrapper(process.platform, asset));
		writeFileSync(wrapper, "# customized wrapper\n");
		await expect(runReleasedInstaller("update", args, http)).rejects.toThrow("Unmanaged or modified wrapper");
	});

	it("keeps current version unchanged if the release checksum is wrong", async () => {
		const prefix = mkdtempSync(join(tmpdir(), "df-source-free-"));
		tempDirs.push(prefix);
		const previous = apiFixture(
			() => release("v0.3.3", original),
			() => original,
		);
		await runReleasedInstaller("install", ["--prefix", prefix], previous);
		const bad = apiFixture(
			() => release("v0.3.4", next),
			() => original,
		);
		await expect(runReleasedInstaller("update", ["--prefix", prefix], bad)).rejects.toThrow();
		expect(readFileSync(join(prefix, "current.txt"), "utf8").trim()).toBe("v0.3.3");
	});

	it("will not modify files during --check and refuses update without install", async () => {
		const prefix = mkdtempSync(join(tmpdir(), "df-source-free-"));
		tempDirs.push(prefix);
		const fixture = apiFixture(
			() => release("v0.3.3", original),
			() => original,
		);
		await runReleasedInstaller("install", ["--prefix", prefix, "--check"], fixture);
		expect(existsSync(join(prefix, "current.txt"))).toBe(false);
		await expect(runReleasedInstaller("update", ["--prefix", prefix], fixture)).rejects.toThrow(
			"No managed installation",
		);
	});
});
