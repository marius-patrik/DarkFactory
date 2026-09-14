import { existsSync } from "node:fs";
import { copyFile, cp, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface NativeAssetCandidate {
	platform: string;
	arch: string;
	file: string;
	relativePath: string;
}

export function nativeAssetCandidates(platform: string, arch: string): NativeAssetCandidate[] {
	if (!["darwin", "linux", "win32"].includes(platform) || !["arm64", "x64"].includes(arch)) return [];
	const directory = `native/${platform}/prebuilds/${platform}-${arch}`;
	const current = platform === "linux" ? "linux-platform-x11.node" : `${platform}-platform.node`;
	const legacy = platform === "darwin" ? "darwin-modifiers.node" : platform === "win32" ? "win32-console-mode.node" : undefined;
	return [current, ...(legacy ? [legacy] : [])].map((file) => ({ platform, arch, file, relativePath: `${directory}/${file}` }));
}

export async function packageAssets(root = process.cwd(), platform = process.platform, arch = process.arch): Promise<void> {
	const dist = join(root, "dist");
	await mkdir(dist, { recursive: true });
	await copyFile(join(root, "node_modules", "@silvia-odwyer", "photon-node", "photon_rs_bg.wasm"), join(dist, "photon_rs_bg.wasm"));
	await cp(join(root, "assets"), join(dist, "assets"), { recursive: true });

	const candidates = nativeAssetCandidates(platform, arch);
	if (candidates.length === 0) return;
	const selected = candidates.find((candidate) => existsSync(join(root, "node_modules", "@earendil-works", "pi-tui", candidate.relativePath)));
	if (!selected) {
		// pi-tui ships prebuilt native helpers only for some platforms (none for Linux today); it runs without them.
		console.warn(`pi-tui has no native module for ${platform}-${arch}; building without it`);
		return;
	}
	const target = join(dist, selected.relativePath);
	await mkdir(join(target, ".."), { recursive: true });
	await copyFile(join(root, "node_modules", "@earendil-works", "pi-tui", selected.relativePath), target);
}

if (import.meta.main) await packageAssets();
