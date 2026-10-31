import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stageWebBundle } from "../../../packages/docs/src/site.ts";

const roots: string[] = [];
const trustedSha = "c".repeat(40);
const basePath = "/DarkFactory/";

afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function bundle() {
	const root = await mkdtemp(join(tmpdir(), "df14-artifact-"));
	roots.push(root);
	const source = join(root, "untrusted");
	const destination = join(root, "staged");
	await Bun.$`mkdir -p ${source}`.quiet();
	const assets = [
		{ path: "index.html", body: '<!DOCTYPE html><html><head><base href="/DarkFactory/"></head><body></body></html>' },
		{ path: "app.js", body: "console.log('release candidate')" },
	];
	const manifest = {
		schemaVersion: 1,
		kind: "darkfactory-operator",
		status: "candidate",
		entry: "index.html",
		basePath,
		routeMode: "hash",
		sourceSha: trustedSha,
		assets: assets.map((asset) => ({
			path: asset.path,
			sha256: createHash("sha256").update(asset.body).digest("hex"),
		})),
	};
	for (const asset of assets) await writeFile(join(source, asset.path), asset.body);
	const writeManifest = () => writeFile(join(source, "darkfactory-web-manifest.json"), JSON.stringify(manifest));
	await writeManifest();
	return { root, source, destination, manifest, writeManifest };
}

describe("DF-14 source-free candidate supply-chain acceptance", () => {
	test("SUPPLY-01: a complete manifest with matching exact source and hashes can stage", async () => {
		const f = await bundle();
		const result = await stageWebBundle(f.source, f.destination, basePath, trustedSha);
		expect(result.sourceSha).toBe(trustedSha);
		expect(await readFile(join(f.destination, "app.js"), "utf8")).toContain("release candidate");
	});

	test("SUPPLY-02: a different producer SHA cannot be substituted despite self-consistent asset digests", async () => {
		const f = await bundle();
		f.manifest.sourceSha = "d".repeat(40);
		await f.writeManifest();
		await expect(stageWebBundle(f.source, f.destination, basePath, trustedSha)).rejects.toThrow(
			"Web source SHA does not match release checkout",
		);
	});

	test("SUPPLY-03: tampering or traversal in the producer manifest fails before staging assets", async () => {
		const modified = await bundle();
		await writeFile(join(modified.source, "app.js"), "tampered");
		await expect(stageWebBundle(modified.source, modified.destination, basePath, trustedSha)).rejects.toThrow(
			"Frontend asset digest mismatch",
		);
		const traversal = await bundle();
		traversal.manifest.assets[1]!.path = "../escape.js";
		await traversal.writeManifest();
		await expect(stageWebBundle(traversal.source, traversal.destination, basePath, trustedSha)).rejects.toThrow(
			"Unsafe or duplicate frontend manifest asset",
		);
	});

	test("SUPPLY-04: a symlink or secret embedded in a candidate cannot reach the static site", async () => {
		const link = await bundle();
		await rm(join(link.source, "app.js"));
		await symlink(join(link.source, "index.html"), join(link.source, "app.js"));
		await expect(stageWebBundle(link.source, link.destination, basePath, trustedSha)).rejects.toThrow(
			"Site symlink forbidden",
		);
		const privateKey = await bundle();
		const payload = "-----BEGIN PRIVATE KEY-----" + "\n" + "not-a-real-key" + "\n";
		await writeFile(join(privateKey.source, "app.js"), payload);
		privateKey.manifest.assets[1]!.sha256 = createHash("sha256").update(payload).digest("hex");
		await privateKey.writeManifest();
		await expect(stageWebBundle(privateKey.source, privateKey.destination, basePath, trustedSha)).rejects.toThrow(
			"Credential-like material",
		);
	});
});
