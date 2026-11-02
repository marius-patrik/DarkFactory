import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const repoRoot = join(import.meta.dir, "..", "..");
const testRoot = join(repoRoot, ".github", "tests");
async function collect(root: string): Promise<string[]> {
	const children = await readdir(root, { withFileTypes: true });
	const nested = await Promise.all(
		children.map(async (entry) => {
			const absolute = join(root, entry.name);
			if (entry.isDirectory()) return collect(absolute);
			if (!entry.isFile()) return [];
			return /\.(?:test|spec)\.(?:ts|tsx|js|mjs)$/u.test(entry.name) || entry.name === "test_action_resolution.ts"
				? [absolute]
				: [];
		}),
	);
	return nested.flat();
}
const files = (await collect(testRoot)).map((file) => "./" + relative(repoRoot, file)).sort();
if (!files.length) throw new Error("No tests under .github/tests");
console.log("DarkFactory centralized test files: " + files.length);
const run = Bun.spawnSync(["bun", "test", ...files, "--timeout=30000"], {
	cwd: repoRoot,
	stdout: "inherit",
	stderr: "inherit",
});
process.exit(run.exitCode ?? 1);
