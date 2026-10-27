import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const testsRoot = join(root, ".github", "tests");
if (!existsSync(testsRoot)) throw new Error("Canonical .github/tests directory is missing");

const files: string[] = [];
function collect(directory: string): void {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) collect(path);
		else if (entry.isFile() && /(?:\.test|\.spec|_test|_spec)\.(?:js|jsx|ts|tsx|mjs|cjs)$/u.test(entry.name))
			files.push("./" + relative(root, path).replaceAll("\\", "/"));
	}
}
collect(testsRoot);
files.sort();
if (files.length === 0) throw new Error("No runnable tests found under .github/tests");
console.log(`Running ${files.length} test files from .github/tests`);
const proc = Bun.spawn([process.execPath, "test", "--timeout=30000", ...files], {
	cwd: root,
	stdin: "inherit",
	stdout: "inherit",
	stderr: "inherit",
});
process.exit(await proc.exited);
