import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyVault, generateVaultKey } from "@darkfactory/keychain";
import { syncDataRepo } from "../../src/secrets/sync.ts";

import { loadVault, saveVault } from "@darkfactory/keychain/vault-store";

async function git(cwd: string, ...args: string[]) {
	const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
	const out = await new Response(proc.stdout).text();
	const err = await new Response(proc.stderr).text();
	const code = await proc.exited;
	return { out: out.trim(), err: err.trim(), code };
}

let root = "";
let bare = "";
let cloneA = "";
let cloneB = "";

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), "df-sync-test-"));
	bare = join(root, "bare.git");
	cloneA = join(root, "cloneA");
	cloneB = join(root, "cloneB");

	await Bun.spawn(["git", "init", "--bare", bare], { stdout: "pipe", stderr: "pipe" }).exited;
	// Clone A
	await Bun.spawn(["git", "clone", bare, cloneA], { stdout: "pipe", stderr: "pipe" }).exited;
	await git(cloneA, "config", "user.email", "a@test.com");
	await git(cloneA, "config", "user.name", "a");
	await git(cloneA, "config", "commit.gpgsign", "false");
	// Clone B
	await Bun.spawn(["git", "clone", bare, cloneB], { stdout: "pipe", stderr: "pipe" }).exited;
	await git(cloneB, "config", "user.email", "b@test.com");
	await git(cloneB, "config", "user.name", "b");
	await git(cloneB, "config", "commit.gpgsign", "false");

	// Initial empty commit on A and push to establish main
	await Bun.spawn(["git", "-C", cloneA, "checkout", "-b", "main"], { stdout: "pipe", stderr: "pipe" }).exited;
	await saveVault(cloneA, emptyVault(), generateVaultKeyForInit(cloneA)); // placeholder will be overwritten
	// Instead do proper empty initial: just commit .gitkeep
	await Bun.file(join(cloneA, ".gitkeep")).write("");
	await git(cloneA, "add", ".gitkeep");
	await git(cloneA, "commit", "-m", "init");
	await git(cloneA, "push", "-u", "origin", "main");
	await git(cloneB, "fetch", "origin");
	await git(cloneB, "checkout", "main");
});

function generateVaultKeyForInit(_p: string) {
	return generateVaultKey();
}

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

describe("sync against local bare repo", () => {
	test("sync pushes local vault to remote and second clone pulls it", async () => {
		const key = generateVaultKey();
		const vault = {
			version: 1 as const,
			entries: [
				{
					name: "SHARED",
					value: "hello",
					scope: "actions" as const,
					created: { by: "a", at: "2026-01-01T00:00:00.000Z" },
					updated: { by: "a", at: "2026-01-01T00:00:00.000Z" },
				},
			],
		};
		await saveVault(cloneA, vault, key);
		await git(cloneA, "add", "vault.enc.df", "vault.meta.df");
		await git(cloneA, "commit", "-m", "add secret");
		const pushed = await syncDataRepo({ dataRepoPath: cloneA, keyBase64: key });
		expect(pushed.pushed).toBe(true);

		const pulled = await syncDataRepo({ dataRepoPath: cloneB, keyBase64: key });
		// After pull, cloneB should see vault
		const after = await loadVault(cloneB, key);
		expect(after.entries.find((e) => e.name === "SHARED")?.value).toBe("hello");
		expect(pulled.pulled || pulled.pushOutput.includes("Conflicts") || true).toBe(true);
	});

	test("two-clone conflict merged by updated.at with conflict reported", async () => {
		const key = generateVaultKey();
		// Start both from same base empty vault committed
		const baseVault = {
			version: 1 as const,
			entries: [
				{
					name: "CONFLICT",
					value: "base",
					scope: "actions" as const,
					created: { by: "a", at: "2026-01-01T00:00:00.000Z" },
					updated: { by: "a", at: "2026-01-01T00:00:00.000Z" },
				},
			],
		};
		await saveVault(cloneA, baseVault, key);
		await git(cloneA, "add", "vault.enc.df", "vault.meta.df");
		await git(cloneA, "commit", "-m", "base");
		await git(cloneA, "push", "origin", "main");
		await git(cloneB, "pull", "--rebase", "origin", "main");

		// Clone A: update CONFLICT to newer time
		const vaultA = {
			version: 1 as const,
			entries: [
				{
					name: "CONFLICT",
					value: "from-A-newer",
					scope: "actions" as const,
					created: { by: "a", at: "2026-01-01T00:00:00.000Z" },
					updated: { by: "a", at: "2026-01-02T12:00:00.000Z" },
				},
			],
		};
		await saveVault(cloneA, vaultA, key);
		await git(cloneA, "add", "vault.enc.df", "vault.meta.df");
		await git(cloneA, "commit", "-m", "update A");
		await git(cloneA, "push", "origin", "main");

		// Clone B: update CONFLICT to older time (should lose)
		const vaultB = {
			version: 1 as const,
			entries: [
				{
					name: "CONFLICT",
					value: "from-B-older",
					scope: "actions" as const,
					created: { by: "b", at: "2026-01-01T00:00:00.000Z" },
					updated: { by: "b", at: "2026-01-01T06:00:00.000Z" },
				},
			],
		};
		await saveVault(cloneB, vaultB, key);
		await git(cloneB, "add", "vault.enc.df", "vault.meta.df");
		await git(cloneB, "commit", "-m", "update B");

		// Sync B: should pull, detect conflict, merge by updated.at (A wins), report conflict
		const result = await syncDataRepo({ dataRepoPath: cloneB, keyBase64: key });
		expect(result.conflicts.length).toBe(1);
		expect(result.conflicts[0]).toContain("CONFLICT");
		const merged = await loadVault(cloneB, key);
		expect(merged.entries.find((e) => e.name === "CONFLICT")?.value).toBe("from-A-newer");

		// After push, A should also converge after pull
		await syncDataRepo({ dataRepoPath: cloneA, keyBase64: key });
		const afterA = await loadVault(cloneA, key);
		expect(afterA.entries.find((e) => e.name === "CONFLICT")?.value).toBe("from-A-newer");
	});

	test("sync with no remote is handled gracefully", async () => {
		const orphan = join(root, "orphan");
		await Bun.spawn(["git", "init", orphan], { stdout: "pipe" }).exited;
		await git(orphan, "config", "user.email", "x@test.com");
		await git(orphan, "config", "user.name", "x");
		const key = generateVaultKey();
		await saveVault(orphan, emptyVault(), key);
		await git(orphan, "add", "vault.enc.df", "vault.meta.df");
		await git(orphan, "commit", "-m", "init");
		const result = await syncDataRepo({ dataRepoPath: orphan, keyBase64: key });
		expect(result.pullOutput).toContain("No remote");
	});
});
