import { expect, test, describe } from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { storeVaultKey, loadVaultKey, deleteVaultKey, type CommandRunner } from "../../src/secrets/keychain.ts";

describe("Keychain with Injected Command Runner", () => {
  test("stores and loads macOS key via injected runner without touching real keychain", async () => {
    const commands: Array<{ cmd: string; args: string[] }> = [];
    let storedPassword = "";

    const runner: CommandRunner = async (cmd, args) => {
      commands.push({ cmd, args });
      if (cmd === "security" && args[0] === "add-generic-password") {
        const wIdx = args.indexOf("-w");
        storedPassword = args[wIdx + 1]!;
        return { stdout: "", exitCode: 0 };
      }
      if (cmd === "security" && args[0] === "find-generic-password") {
        return { stdout: storedPassword, exitCode: storedPassword ? 0 : 1 };
      }
      if (cmd === "security" && args[0] === "delete-generic-password") {
        storedPassword = "";
        return { stdout: "", exitCode: 0 };
      }
      return { stdout: "", exitCode: 0 };
    };

    const options = { dfHome: "/tmp/df-test", platform: "darwin" as const, runner };
    await storeVaultKey("test-key-darwin", options);
    expect(storedPassword).toBe("test-key-darwin");
    expect(commands.some((c) => c.cmd === "security" && c.args.includes("add-generic-password"))).toBe(true);

    const loaded = await loadVaultKey(options);
    expect(loaded).toBe("test-key-darwin");

    await deleteVaultKey(options);
    expect(storedPassword).toBe("");
  });

  test("stores and loads Linux key via injected runner (secret-tool)", async () => {
    let storedPassword = "";

    const runner: CommandRunner = async (cmd, args, stdinInput) => {
      if (cmd === "secret-tool" && args[0] === "store") {
        storedPassword = stdinInput ?? "";
        return { stdout: "", exitCode: 0 };
      }
      if (cmd === "secret-tool" && args[0] === "lookup") {
        return { stdout: storedPassword, exitCode: storedPassword ? 0 : 1 };
      }
      if (cmd === "secret-tool" && args[0] === "clear") {
        storedPassword = "";
        return { stdout: "", exitCode: 0 };
      }
      return { stdout: "", exitCode: 0 };
    };

    const options = { dfHome: "/tmp/df-test", platform: "linux" as const, runner };
    await storeVaultKey("test-key-linux", options);
    expect(storedPassword).toBe("test-key-linux");

    const loaded = await loadVaultKey(options);
    expect(loaded).toBe("test-key-linux");

    await deleteVaultKey(options);
    expect(storedPassword).toBe("");
  });

  test("stores and loads Windows key via injected runner (powershell WinRT)", async () => {
    const commands: Array<{ cmd: string; args: string[] }> = [];
    let storedPassword = "";

    const runner: CommandRunner = async (cmd, args) => {
      commands.push({ cmd, args });
      const script = args[args.length - 1] ?? "";
      if (script.includes("PasswordCredential") && script.includes("Add")) {
        const match = script.match(/PasswordCredential\]::new\('.*?','.*?','(.*?)'\)/);
        storedPassword = match?.[1] ?? "";
        return { stdout: "", exitCode: 0 };
      }
      if (script.includes("RetrievePassword")) {
        return { stdout: storedPassword, exitCode: storedPassword ? 0 : 1 };
      }
      if (script.includes("Remove")) {
        storedPassword = "";
        return { stdout: "", exitCode: 0 };
      }
      return { stdout: "", exitCode: 0 };
    };

    const options = { dfHome: "/tmp/df-test", platform: "win32" as const, runner };
    await storeVaultKey("test-key-win", options);
    expect(storedPassword).toBe("test-key-win");

    const loaded = await loadVaultKey(options);
    expect(loaded).toBe("test-key-win");

    await deleteVaultKey(options);
    expect(storedPassword).toBe("");
  });

  test("fails if OS keychain is unavailable and --insecure-file-key is NOT allowed", async () => {
    const failingRunner: CommandRunner = async () => ({ stdout: "", exitCode: 1 });
    const options = { dfHome: "/tmp/df-test", platform: "darwin" as const, runner: failingRunner, allowFileKey: false };

    expect(storeVaultKey("secret", options)).rejects.toThrow("OS keychain unavailable");
  });

  test("falls back to 0600 file if --insecure-file-key is allowed", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "df-keychain-test-"));
    try {
      const failingRunner: CommandRunner = async () => ({ stdout: "", exitCode: 1 });
      const options = { dfHome: tempDir, platform: "darwin" as const, runner: failingRunner, allowFileKey: true };

      await storeVaultKey("fallback-key-value", options);

      const loaded = await loadVaultKey(options);
      expect(loaded).toBe("fallback-key-value");

      const fileStat = await stat(join(tempDir, "vault-key.df"));
      expect(fileStat.isFile()).toBe(true);

      // Verify not loaded if allowFileKey is false
      const noFallbackOptions = { dfHome: tempDir, platform: "darwin" as const, runner: failingRunner, allowFileKey: false };
      const notLoaded = await loadVaultKey(noFallbackOptions);
      expect(notLoaded).toBeUndefined();

      await deleteVaultKey(options);
      expect(await loadVaultKey(options)).toBeUndefined();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
