import { describe, expect, test } from "bun:test";
import { join } from "node:path";

/**
 * The Windows wrapper is a second file, in a second language, implementing the contract
 * `df-wrapper.sh` implements. There is no Windows runner here to execute it on, so this holds the
 * two to one contract by reading them: a subcommand added to one and forgotten in the other is
 * exactly the drift that leaves a Windows host unable to run `df`.
 */
const scripts = import.meta.dir;
const read = (name: string) => Bun.file(join(scripts, name)).text();

/** Reads the subcommands a wrapper claims for the DarkFactory binary, sorted for comparison. */
const claimedSubcommands = (source: string, pattern: RegExp): string[] =>
	[...source.matchAll(pattern)]
		.flatMap((match) => (match[1] ?? "").split("|"))
		.filter(Boolean)
		.sort();

describe("Windows df wrapper", () => {
	// A `.ps1` would need a PowerShell execution-policy decision and would not be found by cmd at
	// all; `.cmd` is the one extension both shells run without configuration.
	test("is a .cmd so both cmd and PowerShell resolve df on PATH through PATHEXT", async () => {
		expect(await Bun.file(join(scripts, "df-wrapper.cmd")).exists()).toBe(true);
		expect((await read("df-wrapper.cmd")).startsWith("@echo off")).toBe(true);
	});

	test("claims exactly the subcommands the POSIX wrapper claims", async () => {
		const posix = claimedSubcommands(await read("df-wrapper.sh"), /^\t([a-z|]+)\)$/gmu);
		const windows = claimedSubcommands(await read("df-wrapper.cmd"), /^if \/I "%~1"=="([a-z]+)" goto darkfactory$/gmu);
		expect(posix.length).toBeGreaterThan(0);
		expect(windows).toEqual(posix);
		expect(windows).toEqual([
			"account",
			"accounts",
			"ask",
			"chat",
			"help",
			"login",
			"logout",
			"models",
			"providers",
			"run",
		]);
	});

	test("honours the same DF_BIN contract, defaulting to the binary beside the wrapper", async () => {
		const source = await read("df-wrapper.cmd");
		// `defined` rather than a string compare, so an empty DF_BIN falls back instead of
		// resolving to the current directory.
		expect(source).toContain('if not defined DF_BIN set "DF_BIN=%~dp0df-bin.exe"');
		expect(source).toContain('if not exist "%DF_BIN%"');
		expect(source).toContain("exit /b 127");
	});

	// cmd.exe cannot tell a terminal from a pipe, so a bare `df` is always `df chat`. The refusal
	// is the deliberate half of the missing POSIX PATH fallback: an argument meant for another tool
	// that also answers to `df` is reported, not silently captured.
	test("runs chat for a bare df and refuses an argument it does not implement", async () => {
		const source = await read("df-wrapper.cmd");
		expect(source).toContain('if "%~1"=="" goto chat');
		expect(source).toContain(":unsupported");
		expect(source).toContain("is not a df command");
	});
});
