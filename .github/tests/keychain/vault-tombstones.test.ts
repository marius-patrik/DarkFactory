import { describe, expect, test } from "bun:test";
import { mergeVaults } from "../../../packages/keychain/src/vault-store.ts";
import { isValidVaultKey } from "../../../packages/keychain/src/vault-crypto.ts";
import type { Vault } from "../../../packages/keychain/src/vault.ts";

function entry(name: string, value: string, time: string) {
	return {
		name,
		value,
		scope: "actions" as const,
		created: { by: "fixture", at: time },
		updated: { by: "fixture", at: time },
	};
}
describe("vault deletion replication", () => {
	test("a stale replica cannot resurrect a deleted secret", () => {
		const old = "2026-10-30T00:00:00.000Z";
		const next = "2026-10-31T00:00:00.000Z";
		const local: Vault = {
			version: 1,
			entries: [],
			tombstones: [{ name: "REMOVED", removed: { by: "local", at: next } }],
		};
		const remote: Vault = { version: 1, entries: [entry("REMOVED", "SECRET", old)] };
		for (const [left, right] of [
			[local, remote],
			[remote, local],
		]) {
			const { merged } = mergeVaults(left!, right!);
			expect(merged.entries.find((candidate) => candidate.name === "REMOVED")).toBeUndefined();
			expect(merged.tombstones?.[0]?.name).toBe("REMOVED");
		}
	});
	test("an explicit newer recreation supersedes an older tombstone", () => {
		const stale: Vault = {
			version: 1,
			entries: [],
			tombstones: [{ name: "ROTATED", removed: { by: "local", at: "2026-10-30T00:00:00.000Z" } }],
		};
		const newer: Vault = { version: 1, entries: [entry("ROTATED", "new", "2026-10-31T00:00:00.000Z")] };
		expect(mergeVaults(stale, newer).merged.entries[0]?.value).toBe("new");
	});
	test("vault key validation rejects noncanonical base64 equivalents", () => {
		const key = Buffer.alloc(32, 3).toString("base64");
		expect(isValidVaultKey(key)).toBe(true);
		expect(isValidVaultKey(`${key}garbage`)).toBe(false);
	});
});
