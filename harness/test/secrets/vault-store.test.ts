import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateVaultKey } from "../../src/secrets/crypto.ts";
import { emptyVault } from "../../src/secrets/vault.ts";
import {
	loadPushMap,
	loadVault,
	mergeVaults,
	resolveDataRepoPath,
	savePushMap,
	saveVault,
	vaultGet,
	vaultList,
	vaultRm,
	vaultSet,
} from "../../src/secrets/vault-store.ts";

let tempRoot = "";
let dfHome = "";
let dataRepo = "";

beforeEach(async () => {
	tempRoot = await mkdtemp(join(tmpdir(), "df-vault-store-"));
	dfHome = join(tempRoot, "home");
	dataRepo = join(tempRoot, "data-df");
	await Bun.spawn(["git", "init", dataRepo], { stdout: "pipe", stderr: "pipe" }).exited;
	// git config for commits
	await Bun.spawn(["git", "-C", dataRepo, "config", "user.email", "test@test.com"], { stdout: "pipe" }).exited;
	await Bun.spawn(["git", "-C", dataRepo, "config", "user.name", "test"], { stdout: "pipe" }).exited;
});

afterEach(async () => {
	await rm(tempRoot, { recursive: true, force: true });
});

describe("vault file format and atomic writes", () => {
	test("saves vault.enc.df encrypted and vault.meta.df without values", async () => {
		const key = generateVaultKey();
		const vault = {
			version: 1 as const,
			entries: [
				{
					name: "MY_SECRET",
					value: "super-secret-value",
					scope: "actions" as const,
					created: { by: "h", at: new Date().toISOString() },
					updated: { by: "h", at: new Date().toISOString() },
				},
			],
		};
		await saveVault(dataRepo, vault, key);

		const encRaw = JSON.parse(await readFile(join(dataRepo, "vault.enc.df"), "utf8"));
		expect(encRaw.version).toBe(1);
		expect(encRaw.algorithm).toBe("aes-256-gcm");
		expect(typeof encRaw.iv).toBe("string");
		expect(typeof encRaw.ciphertext).toBe("string");
		expect(JSON.stringify(encRaw)).not.toContain("super-secret-value");

		const metaRaw = JSON.parse(await readFile(join(dataRepo, "vault.meta.df"), "utf8"));
		expect(metaRaw.version).toBe(1);
		expect(metaRaw.entries[0].name).toBe("MY_SECRET");
		expect(JSON.stringify(metaRaw)).not.toContain("super-secret-value");
		expect(metaRaw.entries[0].value).toBeUndefined();
	});

	test("loadVault decrypts correctly and malformed envelope is rejected", async () => {
		const key = generateVaultKey();
		await saveVault(dataRepo, emptyVault(), key);
		const loaded = await loadVault(dataRepo, key);
		expect(loaded.entries).toHaveLength(0);

		await writeFile(
			join(dataRepo, "vault.enc.df"),
			JSON.stringify({ version: 1, algorithm: "bad", iv: "x", tag: "y", ciphertext: "z" }),
			"utf8",
		);
		await expect(loadVault(dataRepo, key)).rejects.toThrow();
	});

	test("malformed JSON is rejected", async () => {
		const key = generateVaultKey();
		await writeFile(join(dataRepo, "vault.enc.df"), "not-json", "utf8");
		await expect(loadVault(dataRepo, key)).rejects.toThrow();
	});

	test("atomic writes under lockfile helper preserve concurrent sets", async () => {
		const key = generateVaultKey();
		await saveVault(dataRepo, emptyVault(), key);
		const opts = { dfHome, dataRepoPath: dataRepo };
		await Promise.all([
			vaultSet(opts, key, "SECRET_A", "value-a"),
			vaultSet(opts, key, "SECRET_B", "value-b"),
			vaultSet(opts, key, "SECRET_C", "value-c"),
		]);
		const vault = await loadVault(dataRepo, key);
		expect(vault.entries.map((e) => e.name).sort()).toEqual(["SECRET_A", "SECRET_B", "SECRET_C"]);
		// Check lock file is cleaned up
		const lockExists = await Bun.file(join(dfHome, ".secrets-lock.df")).exists();
		expect(lockExists).toBe(false);
		// Verify 0600 on vault file (stat mode)
		const st = await stat(join(dataRepo, "vault.enc.df"));
		// Mode check: must not have group/other read on unix; skip strict on win32
		if (process.platform !== "win32") {
			expect(st.mode & 0o077).toBe(0);
		}
	});

	test("vaultGet, vaultList, vaultRm use meta index without values", async () => {
		const key = generateVaultKey();
		const opts = { dfHome, dataRepoPath: dataRepo };
		await vaultSet(opts, key, "A", "val-a");
		await vaultSet(opts, key, "B", "val-b");
		const entry = await vaultGet(opts, key, "A");
		expect(entry?.value).toBe("val-a");
		const meta = await vaultList(dataRepo);
		expect(meta.entries.map((e) => e.name).sort()).toEqual(["A", "B"]);
		expect((meta.entries[0] as unknown as { value?: string }).value).toBeUndefined();
		const removed = await vaultRm(opts, key, "A");
		expect(removed).toBe(true);
		expect((await vaultList(dataRepo)).entries.map((e) => e.name)).toEqual(["B"]);
		expect(await vaultRm(opts, key, "NONEXIST")).toBe(false);
	});

	test("push-map is stored separately and atomic", async () => {
		await savePushMap(dataRepo, { MY_SECRET: { repos: ["o/r"], ghName: "MY_SECRET" } });
		const map = await loadPushMap(dataRepo);
		expect(map.MY_SECRET?.ghName).toBe("MY_SECRET");
	});

	test("resolveDataRepoPath respects config dataRepo", async () => {
		const custom = join(tempRoot, "custom-data");
		await Bun.spawn(["mkdir", "-p", custom]).exited;
		await Bun.spawn(["mkdir", "-p", dfHome], { stdout: "pipe" }).exited;
		await writeFile(join(dfHome, "config.df"), JSON.stringify({ dataRepo: custom }), "utf8");
		const resolved = await resolveDataRepoPath(dfHome);
		expect(resolved).toBe(custom);
		const def = await resolveDataRepoPath(join(tempRoot, "nonexistent-home"));
		expect(def.endsWith("data-df")).toBe(true);
	});

	test("mergeVaults last writer wins by updated.at and reports conflicts", () => {
		const local = {
			version: 1 as const,
			entries: [
				{
					name: "X",
					value: "local-val",
					scope: "actions" as const,
					created: { by: "h", at: "2026-01-01T00:00:00.000Z" },
					updated: { by: "h", at: "2026-01-01T00:00:00.000Z" },
				},
				{
					name: "ONLY_LOCAL",
					value: "a",
					scope: "actions" as const,
					created: { by: "h", at: "2026-01-01T00:00:00.000Z" },
					updated: { by: "h", at: "2026-01-01T00:00:00.000Z" },
				},
			],
		};
		const remote = {
			version: 1 as const,
			entries: [
				{
					name: "X",
					value: "remote-val",
					scope: "actions" as const,
					created: { by: "h", at: "2026-01-01T00:00:00.000Z" },
					updated: { by: "h", at: "2026-01-02T00:00:00.000Z" },
				},
				{
					name: "ONLY_REMOTE",
					value: "b",
					scope: "actions" as const,
					created: { by: "h", at: "2026-01-02T00:00:00.000Z" },
					updated: { by: "h", at: "2026-01-02T00:00:00.000Z" },
				},
			],
		};
		const { merged, conflicts } = mergeVaults(local, remote);
		expect(merged.entries.find((e) => e.name === "X")?.value).toBe("remote-val");
		expect(merged.entries.map((e) => e.name).sort()).toEqual(["ONLY_LOCAL", "ONLY_REMOTE", "X"]);
		expect(conflicts.length).toBe(1);
		expect(conflicts[0]).toContain("remote");

		// Reverse: local newer wins
		const { merged: m2, conflicts: c2 } = mergeVaults(remote, local);
		expect(m2.entries.find((e) => e.name === "X")?.value).toBe("remote-val"); // remote is local in this call? Actually we swapped: now remote=local (older), so local (remote) newer wins
		expect(c2.length).toBe(1);
	});
});
