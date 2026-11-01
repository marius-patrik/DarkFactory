/** Assemble the existing Node/npm distribution from all five verified native bundles. No publication. */
import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { RELEASE_TARGETS, releaseAssetName } from "./release-targets.ts";
import { collectReleaseChecksums } from "./release-checksums.ts";

function option(name: string): string | undefined {
	const i = process.argv.indexOf(name);
	return i < 0 ? undefined : process.argv[i + 1];
}
const source = resolve(option("--native") ?? "candidate/native");
const destination = resolve(option("--out") ?? "candidate/npm");
const version = (await Bun.file("VERSION").text()).trim();
if (version !== "1.0.0") throw new Error("Only the frozen v1.0.0 candidate can be packed");
const declared = RELEASE_TARGETS.flatMap((t) => [releaseAssetName(t.name), `${releaseAssetName(t.name)}.tar.gz`]);
const verified = await collectReleaseChecksums(source);
for (const name of declared)
	if (!verified.assets.includes(name)) throw new Error(`Missing verified native artifact ${name}`);
const stage = await mkdtemp(join(tmpdir(), "df-npm-candidate-"));
try {
	const bin = join(stage, "bin");
	await mkdir(bin, { recursive: true });
	await copyFile(resolve("LICENSE"), join(stage, "LICENSE"));
	const runtime = join(stage, "runtime");
	for (const target of RELEASE_TARGETS) {
		const asset = releaseAssetName(target.name);
		const dest = join(runtime, target.name);
		await mkdir(dest, { recursive: true });
		const process = Bun.spawn(["tar", "-xzf", join(source, `${asset}.tar.gz`), "-C", dest], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const [exit, out, err] = await Promise.all([
			process.exited,
			new Response(process.stdout).text(),
			new Response(process.stderr).text(),
		]);
		if (exit !== 0) throw new Error(`Failed to unpack ${target.name}: ${err || out}`);
		const actual = createHash("sha256")
			.update(await readFile(join(dest, asset)))
			.digest("hex");
		const built = verified.checksums.split("\n").find((line) => line.endsWith(`  ${asset}`));
		if (!built || !built.startsWith(actual)) throw new Error(`Extracted ${asset} does not match build-time hash`);
		for (const required of ["assets", "plugins", "photon_rs_bg.wasm"])
			if (!(await Bun.file(join(dest, required)).exists()) && !(await isDirectory(join(dest, required))))
				throw new Error(`Native npm payload lacks ${target.name}/${required}`);
	}
	const wrapper = `#!/usr/bin/env node
"use strict";
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");
const { existsSync } = require("node:fs");
const platform = process.platform + "-" + process.arch;
const supported = ${JSON.stringify(RELEASE_TARGETS.map((t) => t.name))};
if (!supported.includes(platform)) {
  console.error("df: unsupported target " + platform + "; supported: " + supported.join(", "));
  process.exit(1);
}
const asset = "df-" + platform + (process.platform === "win32" ? ".exe" : "");
const binary = join(__dirname, "..", "runtime", platform, asset);
if (!existsSync(binary)) {
  console.error("df: npm payload missing native runtime " + asset);
  process.exit(127);
}
const child = spawnSync(binary, process.argv.slice(2), { stdio: "inherit", env: process.env, windowsHide: false });
if (child.error) { console.error(child.error.message); process.exit(127); }
if (child.signal) { console.error("df stopped by signal " + child.signal); process.exit(1); }
process.exit(child.status === null ? 1 : child.status);
`;
	await writeFile(join(bin, "df.cjs"), wrapper);
	await chmod(join(bin, "df.cjs"), 0o755);
	await writeFile(
		join(stage, "package.json"),
		JSON.stringify(
			{
				name: "@darkfactory/cli",
				version,
				description: "Unpublished DarkFactory native CLI candidate",
				license: "GPL-3.0",
				bin: { df: "bin/df.cjs" },
				engines: { node: ">=20" },
				files: ["bin", "runtime"],
			},
			null,
			2,
		) + "\n",
	);
	await mkdir(destination, { recursive: true });
	const pack = Bun.spawn(["npm", "pack", stage, "--pack-destination", destination, "--json", "--ignore-scripts"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [status, stdout, stderr] = await Promise.all([
		pack.exited,
		new Response(pack.stdout).text(),
		new Response(pack.stderr).text(),
	]);
	if (status !== 0) throw new Error(`npm pack failed: ${stderr || stdout}`);
	const results = JSON.parse(stdout) as Array<{ filename: string }>;
	const filename = results[0]?.filename;
	if (!filename || (await readdir(destination)).filter((x) => x.endsWith(".tgz")).length !== 1)
		throw new Error("npm pack did not create exactly one candidate tarball");
	const bytes = await readFile(join(destination, filename));
	const digest = createHash("sha256").update(bytes).digest("hex");
	await writeFile(join(destination, `${filename}.sha256`), `${digest}  ${filename}\n`);
	console.log(
		JSON.stringify(
			{ package: filename, bytes: bytes.length, sha256: digest, targets: RELEASE_TARGETS.map((t) => t.name) },
			null,
			2,
		),
	);
} finally {
	await rm(stage, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
async function isDirectory(path: string): Promise<boolean> {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}
