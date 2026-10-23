import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const scripts = import.meta.dir;
const read = (name: string) => Bun.file(join(scripts, name)).text();

describe("DarkFactory CLI wrappers", () => {
	test("Windows uses .cmd so both cmd and PowerShell resolve df on PATH", async () => {
		const source = await read("df-wrapper.cmd");
		expect(source.startsWith("@echo off")).toBe(true);
	});

	test("POSIX forwards every command to the same installed binary or TypeScript CLI", async () => {
		const source = await read("df-wrapper.sh");
		expect(source).toContain('run_df "$@"');
		expect(source).not.toContain("case ${1-} in");
		expect(source).not.toContain("exec /bin/df");
		expect(source).toContain('exec "$df_bin" "$@"');
		expect(source).toContain('exec bun "$df_source" "$@"');
	});

	test("Windows forwards arbitrary commands without duplicating CLI dispatch rules", async () => {
		const source = await read("df-wrapper.cmd");
		expect(source).toContain('"%DF_BIN%" %*');
		expect(source).not.toContain("goto unsupported");
		expect(source).not.toContain("is not a df command");
	});

	test("Windows retains DF_BIN discovery and bare df chat behavior", async () => {
		const source = await read("df-wrapper.cmd");
		expect(source).toContain('if not defined DF_BIN set "DF_BIN=%~dp0df-bin.exe"');
		expect(source).toContain('if not exist "%DF_BIN%"');
		expect(source).toContain("exit /b 127");
		expect(source).toContain('if "%~1"=="" goto chat');
		expect(source).toContain('"%DF_BIN%" chat');
	});
});
