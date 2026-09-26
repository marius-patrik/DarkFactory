import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";

const roots: string[] = [];
afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});
<<<<<<< HEAD

const shellPath = (path: string) =>
	process.platform === "win32"
		? path.replace(/^([A-Za-z]):/u, (_match, drive: string) => `/${drive.toLowerCase()}`).replaceAll("\\", "/")
		: path;
=======
>>>>>>> origin/develop

describe("Unix df wrapper", () => {
	test("uses DF_BIN for DarkFactory subcommands and a later PATH df for flags and non-interactive bare calls", async () => {
		if (process.platform === "win32" && !Bun.which("sh")) return;
		const root = await mkdtemp(join(process.cwd(), ".wrapper-test-"));
		roots.push(root);
		const wrapperDir = join(root, "wrapper");
		const systemDir = join(root, "system");
		await mkdir(wrapperDir, { recursive: true });
		await mkdir(systemDir, { recursive: true });
		await Bun.write(join(wrapperDir, "df"), Bun.file(join(process.cwd(), "scripts", "df-wrapper.sh")));
		await Bun.write(join(root, "df-bin"), "#!/bin/sh\nprintf 'dark:%s\\n' \"$*\"\n");
		await Bun.write(join(systemDir, "df"), "#!/bin/sh\nprintf 'system:%s\\n' \"$*\"\n");
		await Promise.all([
			chmod(join(wrapperDir, "df"), 0o755),
			chmod(join(root, "df-bin"), 0o755),
			chmod(join(systemDir, "df"), 0o755),
		]);
<<<<<<< HEAD
=======
		const shellPath = (path: string) =>
			process.platform === "win32"
				? path.replace(/^([A-Za-z]):/u, (_match, drive: string) => `/${drive.toLowerCase()}`).replaceAll("\\", "/")
				: path;
>>>>>>> origin/develop
		const env = {
			...process.env,
			PATH: `${shellPath(wrapperDir)}:${shellPath(systemDir)}`,
			DF_BIN: shellPath(join(root, "df-bin")),
		};
		const invoke = async (args: string[]) => {
			const child = Bun.spawn([Bun.which("sh")!, shellPath(join(wrapperDir, "df")), ...args], {
				env,
				stdin: "pipe",
				stdout: "pipe",
				stderr: "pipe",
			});
			child.stdin.end();
			return { out: await new Response(child.stdout).text(), exit: await child.exited };
		};
		expect(await invoke(["run", "hello"])).toEqual({ out: "dark:run hello\n", exit: 0 });
		expect(await invoke(["--human-readable"])).toEqual({ out: "system:--human-readable\n", exit: 0 });
		expect(await invoke([])).toEqual({ out: "system:\n", exit: 0 });
	});

	/** Stages the wrapper plus a fake system df, and returns a spawn helper. */
	const stage = async (options: { binary?: boolean; source?: boolean; bun?: boolean }) => {
		const root = await mkdtemp(join(process.cwd(), ".wrapper-test-"));
		roots.push(root);
		const wrapperDir = join(root, "wrapper");
		const systemDir = join(root, "system");
		await mkdir(wrapperDir, { recursive: true });
		await mkdir(systemDir, { recursive: true });
		await Bun.write(join(wrapperDir, "df"), Bun.file(join(process.cwd(), "scripts", "df-wrapper.sh")));
		await Bun.write(join(systemDir, "df"), "#!/bin/sh\nprintf 'system:%s\\n' \"$*\"\n");
		await chmod(join(wrapperDir, "df"), 0o755);
		await chmod(join(systemDir, "df"), 0o755);
		if (options.binary) {
			await Bun.write(join(wrapperDir, "df-bin"), "#!/bin/sh\nprintf 'dark:%s\\n' \"$*\"\n");
			await chmod(join(wrapperDir, "df-bin"), 0o755);
		}
		if (options.source) {
			await Bun.write(join(root, "cli.ts"), "export {};\n");
		}
		if (options.bun) {
			await Bun.write(join(root, "bun"), `#!/bin/sh\nprintf 'bun:%s\\n' "$*"\n`);
			await chmod(join(root, "bun"), 0o755);
		}
		const env: Record<string, string | undefined> = {
			...process.env,
			// The wrapper resolves its own directory with `dirname`, so the staged layout has to be
			// found alongside the real utilities rather than in isolation.
			PATH: `${shellPath(wrapperDir)}:${shellPath(systemDir)}${options.bun ? `:${shellPath(root)}` : ""}:/usr/bin:/bin`,
		};
		delete env.DF_BIN;
		if (options.source) env.DF_SOURCE = shellPath(join(root, "cli.ts"));
		const invoke = async (args: string[]) => {
			const child = Bun.spawn([Bun.which("sh")!, shellPath(join(wrapperDir, "df")), ...args], {
				env,
				stdin: "pipe",
				stdout: "pipe",
				stderr: "pipe",
			});
			child.stdin.end();
			return {
				out: await new Response(child.stdout).text(),
				err: await new Response(child.stderr).text(),
				exit: await child.exited,
			};
		};
		return { invoke, wrapperDir, root };
	};

	test("a staged install is found beside the wrapper without DF_BIN", async () => {
		if (process.platform === "win32" && !Bun.which("sh")) return;
		const { invoke } = await stage({ binary: true });
		expect(await invoke(["run", "hello"])).toMatchObject({ out: "dark:run hello\n", exit: 0 });
	});

	test("the image layout runs the TypeScript entrypoint through Bun", async () => {
		if (process.platform === "win32" && !Bun.which("sh")) return;
		const { invoke } = await stage({ source: true, bun: true });
		const result = await invoke(["run", "hello"]);
		expect(result.out).toContain("bun:");
		expect(result.out).toContain("cli.ts run hello");
		expect(result.exit).toBe(0);
	});

	test("a compiled binary wins over a source entrypoint", async () => {
		if (process.platform === "win32" && !Bun.which("sh")) return;
		const { invoke } = await stage({ binary: true, source: true, bun: true });
		expect(await invoke(["models"])).toMatchObject({ out: "dark:models\n", exit: 0 });
	});

	test("no runtime at all exits 127 and says how to get one", async () => {
		if (process.platform === "win32" && !Bun.which("sh")) return;
		const { invoke } = await stage({});
		const result = await invoke(["run", "hello"]);
		expect(result.exit).toBe(127);
		expect(result.err).toContain("no DarkFactory runtime found");
		expect(result.err).toContain("install:df");
	});

	test("disk-free flags still reach the system df when no runtime is installed", async () => {
		if (process.platform === "win32" && !Bun.which("sh")) return;
		const { invoke } = await stage({});
		expect(await invoke(["--human-readable"])).toMatchObject({ out: "system:--human-readable\n", exit: 0 });
	});
});
