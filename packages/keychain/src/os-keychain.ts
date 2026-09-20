import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SERVICE = "df-vault";
const ACCOUNT = "vault-key";

/** Command execution abstraction used by OS-native keychain adapters. */
export type CommandRunner = (
	cmd: string,
	args: string[],
	stdin?: string,
) => Promise<{ stdout: string; exitCode: number }>;

/** Options for resolving and storing the machine vault key. */
export interface KeychainOptions {
	dfHome: string;
	allowFileKey?: boolean;
	platform?: NodeJS.Platform;
	runner?: CommandRunner;
}

const fileKeyPath = (home: string) => join(home, "vault-key.df");

async function defaultRunner(
	cmd: string,
	args: string[],
	stdin?: string,
): Promise<{ stdout: string; exitCode: number }> {
	if (stdin !== undefined) {
		const proc = Bun.spawn([cmd, ...args], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
		proc.stdin.write(stdin);
		proc.stdin.end();
		const stdout = await new Response(proc.stdout).text();
		const exitCode = await proc.exited;
		return { stdout: stdout.trim(), exitCode };
	}
	const proc = Bun.spawn([cmd, ...args], { stdout: "pipe", stderr: "pipe" });
	const stdout = await new Response(proc.stdout).text();
	const exitCode = await proc.exited;
	return { stdout: stdout.trim(), exitCode };
}

function getRunner(options: KeychainOptions): CommandRunner {
	return options.runner ?? defaultRunner;
}

function getPlatform(options: KeychainOptions): string {
	return options.platform ?? process.platform;
}

// macOS
async function storeMac(key: string, runner: CommandRunner): Promise<void> {
	await runner("security", ["delete-generic-password", "-s", SERVICE, "-a", ACCOUNT]);
	const { exitCode } = await runner("security", [
		"add-generic-password",
		"-s",
		SERVICE,
		"-a",
		ACCOUNT,
		"-w",
		key,
		"-U",
	]);
	if (exitCode !== 0) throw new Error("Failed to store vault key in macOS Keychain");
}

async function loadMac(runner: CommandRunner): Promise<string | undefined> {
	const { stdout, exitCode } = await runner("security", ["find-generic-password", "-s", SERVICE, "-a", ACCOUNT, "-w"]);
	return exitCode === 0 && stdout ? stdout : undefined;
}

async function deleteMac(runner: CommandRunner): Promise<void> {
	await runner("security", ["delete-generic-password", "-s", SERVICE, "-a", ACCOUNT]);
}

// Linux
async function storeLinux(key: string, runner: CommandRunner): Promise<void> {
	const { exitCode } = await runner(
		"secret-tool",
		["store", "--label", SERVICE, "service", SERVICE, "account", ACCOUNT],
		key,
	);
	if (exitCode !== 0) throw new Error("Failed to store vault key via secret-tool");
}

async function loadLinux(runner: CommandRunner): Promise<string | undefined> {
	const { stdout, exitCode } = await runner("secret-tool", ["lookup", "service", SERVICE, "account", ACCOUNT]);
	return exitCode === 0 && stdout ? stdout : undefined;
}

async function deleteLinux(runner: CommandRunner): Promise<void> {
	await runner("secret-tool", ["clear", "service", SERVICE, "account", ACCOUNT]);
}

// Windows
function psEscape(s: string): string {
	return s.replace(/'/g, "''");
}

async function storeWindows(key: string, runner: CommandRunner): Promise<void> {
	await deleteWindows(runner);
	const script = `
[void][Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime]
$vault = [Windows.Security.Credentials.PasswordVault]::new()
$cred = [Windows.Security.Credentials.PasswordCredential]::new('${psEscape(SERVICE)}','${psEscape(ACCOUNT)}','${psEscape(key)}')
$vault.Add($cred)
`.trim();
	const { exitCode } = await runner("powershell", ["-NoProfile", "-NonInteractive", "-Command", script]);
	if (exitCode !== 0) throw new Error("Failed to store vault key in Windows Credential Manager");
}

async function loadWindows(runner: CommandRunner): Promise<string | undefined> {
	const script = `
[void][Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime]
$vault = [Windows.Security.Credentials.PasswordVault]::new()
try {
  $cred = $vault.Retrieve('${psEscape(SERVICE)}','${psEscape(ACCOUNT)}')
  $cred.RetrievePassword()
  Write-Output $cred.Password
} catch { }
`.trim();
	const { stdout, exitCode } = await runner("powershell", ["-NoProfile", "-NonInteractive", "-Command", script]);
	return exitCode === 0 && stdout ? stdout : undefined;
}

async function deleteWindows(runner: CommandRunner): Promise<void> {
	const script = `
[void][Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime]
$vault = [Windows.Security.Credentials.PasswordVault]::new()
try {
  $cred = $vault.Retrieve('${psEscape(SERVICE)}','${psEscape(ACCOUNT)}')
  $vault.Remove($cred)
} catch { }
`.trim();
	await runner("powershell", ["-NoProfile", "-NonInteractive", "-Command", script]);
}

// File fallback
async function storeFile(key: string, home: string): Promise<void> {
	await mkdir(home, { recursive: true });
	await writeFile(fileKeyPath(home), key, { encoding: "utf8", mode: 0o600 });
}

async function loadFile(home: string): Promise<string | undefined> {
	try {
		return (await readFile(fileKeyPath(home), "utf8")).trim();
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw error;
	}
}

async function deleteFile(home: string): Promise<void> {
	try {
		await unlink(fileKeyPath(home));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}
}

export async function storeVaultKey(keyBase64: string, options: KeychainOptions): Promise<void> {
	const platform = getPlatform(options);
	const runner = getRunner(options);
	try {
		if (platform === "darwin") {
			await storeMac(keyBase64, runner);
			return;
		}
		if (platform === "win32") {
			await storeWindows(keyBase64, runner);
			return;
		}
		if (platform === "linux") {
			await storeLinux(keyBase64, runner);
			return;
		}
	} catch {
		if (!options.allowFileKey) {
			throw new Error("OS keychain unavailable. Use --insecure-file-key to allow file-based key storage.");
		}
		// fall through to file fallback
	}
	if (options.allowFileKey) return storeFile(keyBase64, options.dfHome);
	throw new Error("OS keychain unavailable and file-based key storage not allowed. Use --insecure-file-key.");
}

export async function loadVaultKey(options: KeychainOptions): Promise<string | undefined> {
	const platform = getPlatform(options);
	const runner = getRunner(options);
	try {
		let key: string | undefined;
		if (platform === "darwin") key = await loadMac(runner);
		else if (platform === "win32") key = await loadWindows(runner);
		else if (platform === "linux") key = await loadLinux(runner);
		if (key) return key;
	} catch {
		/* fall through to file */
	}
	if (options.allowFileKey) return loadFile(options.dfHome);
	return undefined;
}

export async function deleteVaultKey(options: KeychainOptions): Promise<void> {
	const runner = getRunner(options);
	const platform = getPlatform(options);
	try {
		if (platform === "darwin") await deleteMac(runner);
		else if (platform === "win32") await deleteWindows(runner);
		else if (platform === "linux") await deleteLinux(runner);
	} catch {
		/* ignore */
	}
	await deleteFile(options.dfHome).catch(() => undefined);
}
