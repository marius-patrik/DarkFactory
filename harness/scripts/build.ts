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

// Bun appends `.exe` for a Windows target, so the requested and produced names have to be compared
// rather than assumed. A name that drifts would publish an asset no installer resolves.
await $`bun build ./src/cli.ts ./src/image-resize-worker.ts --compile --target=${target.bunTarget} --outfile ${join("dist", asset)}`;
if (!existsSync(join("dist", asset))) {
	throw new Error(`bun build reported success but produced no dist/${asset} for target ${target.name}.`);
}

await packageAssets(process.cwd(), target.platform, target.arch);
console.log(`built dist/${asset} for ${target.name} (${target.bunTarget})`);

