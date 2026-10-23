/**
 * Proves one built `df` actually runs, and records what was built.
 *
 * Compiling for a platform is not the same as working on it: a bundle can build for all five
 * targets and still fail on one of them because a native module is missing, a worker cannot be
 * found, or the file landed under a name nothing executes. Each target is therefore built on a
 * runner that is natively that platform and architecture, and the binary is run here before it is
 * allowed to become a release artifact.
 */
import { copyFile, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { RECORD_SUFFIX, writeReleaseChecksums } from "./release-checksums.ts";
import { releaseAssetName, requireReleaseTarget } from "./release-targets.ts";

const harnessRoot = dirname(import.meta.dir);
// The wrapper is a repository-level script, two directories above packages/harness.
const repositoryRoot = resolve(harnessRoot, "..", "..");
const dist = join(harnessRoot, "dist");
const args = process.argv.slice(2);
const targetName = args[args.indexOf("--target") + 1] ?? `${process.platform}-${process.arch}`;
const target = requireReleaseTarget(targetName);
const asset = releaseAssetName(target.name);
const binary = join(dist, asset);

async function run(command: string[], label: string, quiet = false, cwd = harnessRoot): Promise<void> {
	// The image-resize worker is resolved against the working directory at run time, so the smoke
	// runs from the harness root where that path exists. A packaged df installed anywhere else
	// cannot find it; that is a separate defect and not something this step should hide.
	const child = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" });
	const [code, out, err] = await Promise.all([
		child.exited,
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	if (code !== 0) {
		throw new Error(`${label} failed for ${target.name} with exit ${code}: ${(err || out).trim()}`);
	}
	process.stdout.write(`${label}: ${quiet ? "ok" : (out || "").trim() || "ok"}\n`);
}

// `--help` is a multi-page usage dump, so only its exit status is interesting here.
await run([binary, "--help"], "help", true);
await run([binary, "__packaging-smoke"], "packaging smoke");

/**
 * Windows may keep a transient executable mapped briefly after the launched
 * wrapper exits. Limit cleanup retries to disposable verification staging only.
 */
async function removeWrapperStage(stage: string): Promise<void> {
	for (let attempt = 0; attempt < 12; attempt++) {
		try {
			await rm(stage, { recursive: true, force: true });
			return;
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (process.platform !== "win32" || (code !== "EBUSY" && code !== "EPERM")) throw error;
			if (attempt === 11) {
				console.warn(`Windows retained temporary smoke executable: ${stage}`);
				return;
			}
			await Bun.sleep(250);
		}
	}
}

if (target.platform === "win32") {
	// The Windows wrapper is only executable on Windows, so this is the one place its contract can
	// actually be checked rather than read. It is staged the way an install stages it: the wrapper
	// named `df` on PATH with the DarkFactory binary beside it as `df-bin.exe`.
	const stage = await mkdtemp(join(tmpdir(), "df-wrapper-"));
	try {
		await copyFile(join(repositoryRoot, "scripts", "df-wrapper.cmd"), join(stage, "df.cmd"));
		await copyFile(binary, join(stage, "df-bin.exe"));
		const child = Bun.spawn([join(stage, "df.cmd"), "providers"], { cwd: stage, stdout: "pipe", stderr: "pipe" });
		const [code, , err] = await Promise.all([
			child.exited,
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
		]);
		if (code !== 0) throw new Error(`df.cmd providers failed for ${target.name} with exit ${code}: ${err.trim()}`);
		process.stdout.write("df.cmd: reached the DarkFactory binary\n");
	} finally {
		await removeWrapperStage(stage);
	}
}

// Ship the complete runtime, not only a compiled executable: the image worker, assets,
// wasm and optional native prebuilds are resolved next to the running binary.
const bundle = `${asset}.tar.gz`;
const contents = (await readdir(dist))
	.filter((entry) => entry !== bundle && !entry.endsWith(RECORD_SUFFIX) && entry !== "checksums.txt")
	.sort();
for (const required of [asset, "assets", "plugins", "photon_rs_bg.wasm"]) {
	if (!contents.includes(required)) throw new Error(`df bundle is missing ${required}`);
}
async function tarCommand(args: string[], cwd: string): Promise<void> {
	const child = Bun.spawn(["tar", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
	const [exit, stdout, stderr] = await Promise.all([
		child.exited,
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	if (exit !== 0) throw new Error(`tar ${args[0]} failed: ${stderr || stdout}`);
}
await tarCommand(["-czf", bundle, ...contents], dist);

// Unpack in an unrelated temporary directory and execute from there. This catches source-tree
// relative lookups and archive layout problems before publishing the release.
const standalone = await mkdtemp(join(tmpdir(), "df-standalone-"));
try {
	await tarCommand(["-xzf", join(dist, bundle), "-C", standalone], standalone);
	await run([join(standalone, asset), "__packaging-smoke"], "standalone packaging smoke", true, standalone);
	// Official capabilities are bundled JS: this invocation must work without the source tree
	// and prove that ci matrix can discover them dynamically from the installed executable.
	await writeFile(
		join(standalone, "package.json"),
		JSON.stringify({
			name: "df-release-smoke",
			scripts: { test: "echo ok", lint: "echo ok", typecheck: "echo ok", "format:check": "echo ok" },
		}),
	);
	await run(
		[join(standalone, asset), "ci", "matrix", "--repo", standalone],
		"standalone capability smoke",
		true,
		standalone,
	);
} finally {
	await rm(standalone, { recursive: true, force: true, maxRetries: 12, retryDelay: 250 });
}

// One per-target digest record includes both backwards-compatible raw binary and complete bundle.
await writeReleaseChecksums(dist, [asset, bundle], `${asset}${RECORD_SUFFIX}`);
process.stdout.write(`verified dist/${asset} and dist/${bundle} with recorded digests\n`);
