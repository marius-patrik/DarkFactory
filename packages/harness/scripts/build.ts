import { existsSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { packageAssets } from "./package-assets.ts";
import { releaseAssetName, requireReleaseTarget, resolveHostTarget } from "./release-targets.ts";

const args = process.argv.slice(2);

function flag(name: string): string | undefined {
	const prefix = `${name}=`;
	const inline = args.find((arg) => arg.startsWith(prefix));
	if (inline) return inline.slice(prefix.length);
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
}

// Without `--target` the build is for the machine running it, so `bun run build` keeps working on
// any host. Naming the target explicitly is what lets one build produce one arch-aware release
// asset instead of a `df` that is only correct for whichever machine happened to compile it.
const requested = flag("--target");
const target = requested ? requireReleaseTarget(requested) : resolveHostTarget(process.platform, process.arch);
const asset = releaseAssetName(target.name);

// `packages/harness/dist`, not `./dist`. The build runs from the repository root, so `dist/` was
// the *root* `dist/`, while `packageAssets` below, `verify-target.ts`, and the packaging smoke all
// resolve `packages/harness/dist`. The two halves disagreed and the release failed at
// `ENOENT ... posix_spawn '.../packages/harness/dist/df-linux-x64'` on all five targets — after
// `bun build` had reported success and after its own existence guard had passed, because the guard
// looked in the same wrong place. Root `dist/` is also what `.gitignore` line 17 covers, so the
// stray directory was invisible either way.
// One root, one dist: `packageAssets` below derives the same directory from the root it is given,
// and this script used `process.cwd()` twice for two different purposes, which is how they drifted.
const root = process.cwd();
const dist = join(root, "packages", "harness", "dist");
// Bun appends `.exe` for a Windows target, so the requested and produced names have to be compared
// rather than assumed. A name that drifts would publish an asset no installer resolves.
await $`bun build ./packages/harness/src/cli.ts ./packages/harness/src/image-resize-worker.ts --compile --target=${target.bunTarget} --outfile ${join(dist, asset)}`;
if (!existsSync(join(dist, asset))) {
	throw new Error(`bun build reported success but produced no dist/${asset} for target ${target.name}.`);
}

await packageAssets(root, target.platform, target.arch);
console.log(`built dist/${asset} for ${target.name} (${target.bunTarget})`);
