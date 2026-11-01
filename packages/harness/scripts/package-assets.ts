import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

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
	const legacy =
		platform === "darwin" ? "darwin-modifiers.node" : platform === "win32" ? "win32-console-mode.node" : undefined;
	return [current, ...(legacy ? [legacy] : [])].map((file) => ({
		platform,
		arch,
		file,
		relativePath: `${directory}/${file}`,
	}));
}

/**
 * Resolve an installed dependency asset from either a standalone harness install or the root Bun workspace.
 *
 * Bun is free to hoist workspace dependencies to the repository root. Packaging must therefore not encode one
 * node_modules layout as part of the df release contract.
 */
export function dependencyAssetPath(root: string, ...segments: string[]): string {
	const moduleRoots = [join(root, "node_modules"), join(dirname(root), "node_modules")];
	for (const moduleRoot of moduleRoots) {
		const candidate = join(moduleRoot, ...segments);
		if (existsSync(candidate)) return candidate;
	}
	return join(moduleRoots[0]!, ...segments);
}

export async function packageAssets(
	root = process.cwd(),
	platform: string = process.platform,
	arch: string = process.arch,
): Promise<void> {
	// The assets and the dist output belong to the harness, which is no longer the caller's cwd now
	// that there is one package and the build runs from the repository root.
	const harnessRoot = join(root, "packages", "harness");
	const source = existsSync(join(harnessRoot, "assets")) ? harnessRoot : root;
	const dist = existsSync(harnessRoot) ? join(harnessRoot, "dist") : join(root, "dist");
	await mkdir(dist, { recursive: true });
	await copyFile(
		dependencyAssetPath(root, "@silvia-odwyer", "photon-node", "photon_rs_bg.wasm"),
		join(dist, "photon_rs_bg.wasm"),
	);
	await cp(join(source, "assets"), join(dist, "assets"), { recursive: true });
	// The canonical graph's JSON Schema must resolve within the installed bundle,
	// never to the original packages/harness/src tree.
	const schemaDist = join(dist, "schemas");
	await mkdir(schemaDist, { recursive: true });
	await copyFile(join(harnessRoot, "src", "graph", "graph.schema.json"), join(schemaDist, "graph.schema.json"));
	const graphFile = join(dist, "assets", "graph.darkfactory.json");
	const graph = JSON.parse(await readFile(graphFile, "utf8")) as { $schema?: string };
	graph.$schema = "../schemas/graph.schema.json";
	await writeFile(graphFile, JSON.stringify(graph, null, 2) + "\n");

	// The official plugins are TypeScript modules importing internal source paths. Copying those
	// files is not a source-free installation: the imports would reference packages/ absent from
	// an installed consumer. Bundle each official capability as a standalone Bun-loadable module.
	const pluginRoot = join(root, ".darkfactory", "plugins");
	if (existsSync(pluginRoot)) {
		const entries = (await readdir(pluginRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());
		for (const entry of entries) {
			const input = join(pluginRoot, entry.name, "capability.ts");
			if (!existsSync(input)) continue;
			const pluginDist = join(dist, "plugins", entry.name);
			await mkdir(pluginDist, { recursive: true });
			// The compiled capability alone is not an installed agent plugin: host adapters,
			// manifests, skills, hooks and declarative resources are part of the contract.
			// Never ship source TypeScript (its relative monorepo imports cannot run in an
			// extracted candidate); Bun compiles the capability entrypoint below.
			await cp(join(pluginRoot, entry.name), pluginDist, {
				recursive: true,
				filter: (path) => !path.endsWith(".ts") && !path.endsWith(".tsx"),
			});
			const child = Bun.spawn(
				["bun", "build", input, "--target=bun", "--outfile", join(pluginDist, "capability.mjs")],
				{ cwd: root, stdout: "pipe", stderr: "pipe" },
			);
			const [status, output, diagnostics] = await Promise.all([
				child.exited,
				new Response(child.stdout).text(),
				new Response(child.stderr).text(),
			]);
			if (status !== 0) throw new Error(`Cannot bundle capability ${entry.name}: ${diagnostics || output}`);
		}
	}

	const candidates = nativeAssetCandidates(platform, arch);
	if (candidates.length === 0) return;
	const selected = candidates.find((candidate) =>
		existsSync(dependencyAssetPath(root, "@earendil-works", "pi-tui", candidate.relativePath)),
	);
	if (!selected) {
		// pi-tui ships prebuilt native helpers only for some platforms (none for Linux today); it runs without them.
		console.warn(`pi-tui has no native module for ${platform}-${arch}; building without it`);
		return;
	}
	const target = join(dist, selected.relativePath);
	await mkdir(join(target, ".."), { recursive: true });
	await copyFile(dependencyAssetPath(root, "@earendil-works", "pi-tui", selected.relativePath), target);
}

if (import.meta.main) await packageAssets();
