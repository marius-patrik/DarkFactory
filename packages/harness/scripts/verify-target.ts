/**
 * Proves one built `df` actually runs, and records what was built.
 *
 * Compiling for a platform is not the same as working on it: a bundle can build for all five
 * targets and still fail on one of them because a native module is missing, a worker cannot be
 * found, or the file landed under a name nothing executes. Each target is therefore built on a
 * runner that is natively that platform and architecture, and the binary is run here before it is
 * allowed to become a release artifact.
 */
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { RECORD_SUFFIX, writeReleaseChecksums } from "./release-checksums.ts";
import { releaseAssetName, requireReleaseTarget } from "./release-targets.ts";

const harnessRoot = dirname(import.meta.dir);
const dist = join(harnessRoot, "dist");
const args = process.argv.slice(2);
const targetName = args[args.indexOf("--target") + 1] ?? `${process.platform}-${process.arch}`;
const target = requireReleaseTarget(targetName);
const asset = releaseAssetName(target.name);
const binary = join(dist, asset);

async function run(command: string[], label: string, quiet = false): Promise<void> {
	// The image-resize worker is resolved against the working directory at run time, so the smoke
	// runs from the harness root where that path exists. A packaged df installed anywhere else
	// cannot find it; that is a separate defect and not something this step should hide.
	const child = Bun.spawn(command, { cwd: harnessRoot, stdout: "pipe", stderr: "pipe" });
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

if (target.platform === "win32") {
	// The Windows wrapper is only executable on Windows, so this is the one place its contract can
	// actually be checked rather than read. It is staged the way an install stages it: the wrapper
	// named `df` on PATH with the DarkFactory binary beside it as `df-bin.exe`.
	const stage = await mkdtemp(join(tmpdir(), "df-wrapper-"));
	try {
		await copyFile(join(repositoryRoot, "scripts", "df-wrapper.cmd"), join(stage, "df.cmd"));
		await copyFile(binary, join(stage, "df-bin.exe"));
		const child = Bun.spawn([join(stage, "df.cmd"), "providers"], { cwd: stage, stdout: "pipe", stderr: "pipe" });
		const [code, err] = await Promise.all([child.exited, new Response(child.stderr).text()]);
		if (code !== 0) throw new Error(`df.cmd providers failed for ${target.name} with exit ${code}: ${err.trim()}`);
		process.stdout.write("df.cmd: reached the DarkFactory binary\n");
	} finally {
		await rm(stage, { recursive: true, force: true });
	}
}

// The digest is taken here, over the bytes that were just built and run, so the publish job can
// re-check what arrived rather than checksum whatever it happened to receive. The record is named
// after the asset so five targets can be merged into one directory without overwriting each other.
await writeReleaseChecksums(dist, [asset], `${asset}${RECORD_SUFFIX}`);
process.stdout.write(`verified dist/${asset} and recorded dist/${asset}${RECORD_SUFFIX}\n`);
