import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";

const roots: string[] = [];
afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

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
		const shellPath = (path: string) =>
			process.platform === "win32"
				? path.replace(/^([A-Za-z]):/u, (_match, drive: string) => `/${drive.toLowerCase()}`).replaceAll("\\", "/")
				: path;
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
});
