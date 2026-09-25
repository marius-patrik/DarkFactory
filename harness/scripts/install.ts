import { existsSync } from "node:fs";
import { chmod, cp, mkdir } from "node:fs/promises";
import { join } from "node:path";

/** Name the staged wrapper takes on `PATH`. It dispatches; it is not the runtime. */
export const WRAPPER_NAME = "df";

/** Name the compiled runtime takes beside the wrapper, which is what `df-wrapper.sh` looks for. */
export const BINARY_NAME = "df-bin";

/**
 * Resources the compiled binary resolves beside itself.
 *
 * `harness/src/cli.ts` loads platform prebuilds from `dirname(process.execPath)`, and
 * `harness/src/ci/installer.ts` and `templates.ts` look for `assets/` next to the executable. A
 * staged install that omits either tree yields a `df` that loads and lists providers and then fails
 * at the first operation needing a bundled resource, so both travel with the binary.
 */
export const RESOURCE_DIRS = ["assets", "native"] as const;

export interface StageOptions {
	/** Harness root holding `dist/` and `scripts/`. */
	root: string;
	/** Destination prefix; the staged runtime lands in `<prefix>/bin`. */
	prefix: string;
}

export interface StageResult {
	/** Installed prefix. */
	prefix: string;
	/** Directory added to `PATH`. */
	bin: string;
	/** Paths written, relative to the prefix, in install order. */
	installed: string[];
}

/**
 * Stages a complete, self-contained `df` runtime into `<prefix>/bin`.
 *
 * DF-RULE-017 gives every concern one final owner, and `harness/scripts/df-wrapper.sh` is that
 * owner for the `PATH` contract. This is the only supported way to put it on `PATH`: it stages the
 * wrapper, the compiled binary, and the resource trees together, because a partial copy is a
 * runtime that fails later rather than one that fails now.
 *
 * @param options Stage destinations.
 * @returns What was written and where.
 * @throws Error when the harness has not been built, since that is the failure this exists to prevent.
 */
export async function stage({ root, prefix }: StageOptions): Promise<StageResult> {
	const dist = join(root, "dist");
	const binary = process.platform === "win32" ? join(dist, "df.exe") : join(dist, "df");
	if (!existsSync(binary)) {
		throw new Error(
			`No compiled df at ${binary}. Run \`bun run build\` in harness/ first, or use \`bun run install:df\` which builds before staging.`,
		);
	}

	const bin = join(prefix, "bin");
	await mkdir(bin, { recursive: true });

	await cp(binary, join(bin, process.platform === "win32" ? WRAPPER_NAME : BINARY_NAME));
	await cp(join(root, "scripts", "df-wrapper.sh"), join(bin, WRAPPER_NAME));
	if (process.platform !== "win32") {
		await chmod(join(bin, BINARY_NAME), 0o755);
		await chmod(join(bin, WRAPPER_NAME), 0o755);
	}

	const installed = [BINARY_NAME, WRAPPER_NAME];
	for (const directory of RESOURCE_DIRS) {
		const source = join(dist, directory);
		if (!existsSync(source)) continue;
		await cp(source, join(bin, directory), { recursive: true });
		installed.push(directory);
	}

	return { prefix, bin, installed };
}

if (import.meta.main) {
	const prefixArgument = process.argv.indexOf("--prefix");
	const prefix =
		prefixArgument === -1 ? join(process.env.HOME ?? process.cwd(), ".darkfactory") : process.argv[prefixArgument + 1]!;

	const { $ } = await import("bun");
	if (!existsSync(join(process.cwd(), "dist"))) {
		await $`bun run ./scripts/build.ts`.quiet();
	}

	const result = await stage({ root: process.cwd(), prefix });
	console.log(`Installed df into ${result.bin}`);
	for (const entry of result.installed) console.log(`  ${entry}`);
	console.log(`\nAdd it to PATH:\n  export PATH="${result.bin}:$PATH"`);
}
