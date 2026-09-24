import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileCredentialStore, generateVaultKey } from "@darkfactory/keychain";

const roots: string[] = [];
afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

async function run(home: string, args: string[], extraEnv: Record<string, string> = {}) {
	const child = Bun.spawn([process.execPath, "run", "src/cli.ts", ...args], {
		cwd: process.cwd(),
		env: {
			DF_HOME: home,
			DF_OFFLINE: "1",
			PATH: process.env.PATH ?? "",
			SYSTEMROOT: process.env.SYSTEMROOT ?? "C:\\Windows",
			...extraEnv,
		},
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	return { stdout, stderr, exitCode };
}

describe("df account encrypted transfer", () => {
	test("export never prints plaintext credentials and load restores through the vault key", async () => {
		const home = await mkdtemp(join(tmpdir(), "df-cli-account-transfer-"));
		roots.push(home);
		await writeFile(join(home, "vault-key.df"), generateVaultKey(), { encoding: "utf8", mode: 0o600 });
		const store = new FileCredentialStore(home);
		await store.modifyAccount("fixture:work", async () => ({
			id: "fixture:work",
			provider: "fixture",
			label: "work",
			metadata: { ownership: "df-owned" },
			slots: {
				oauth: {
					type: "oauth",
					access: "CLI-ACCESS-SECRET",
					refresh: "CLI-REFRESH-SECRET",
					expires: 2_000_000_000_000,
				},
			},
		}));

		const exported = await run(home, ["account", "export", "fixture:work"]);
		expect(exported.exitCode).toBe(0);
		expect(exported.stderr).toBe("");
		expect(exported.stdout).not.toContain("CLI-ACCESS-SECRET");
		expect(exported.stdout).not.toContain("CLI-REFRESH-SECRET");
		const envelope = JSON.parse(exported.stdout) as Record<string, unknown>;
		expect(envelope.algorithm).toBe("aes-256-gcm");

		const loaded = await run(home, ["account", "load", "fixture:copy", "--from-env", "DF_TEST_ACCOUNT_EXPORT"], {
			DF_TEST_ACCOUNT_EXPORT: exported.stdout.trim(),
		});
		expect(loaded.exitCode).toBe(0);
		expect(loaded.stderr).toBe("");
		const copy = await store.readAccount("fixture:copy");
		expect(copy?.metadata?.ownership).toBe("df-owned");
		expect(copy?.slots.oauth).toMatchObject({
			type: "oauth",
			access: "CLI-ACCESS-SECRET",
			refresh: "CLI-REFRESH-SECRET",
		});
	});
});
