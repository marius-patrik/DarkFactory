import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { QuotaStore } from "../src/harness/quota-store.ts";
import { withFileLock } from "../src/storage/file-lock.ts";

const temporary: string[] = [];
const candidate = { provider: "provider", model: "model", account: "work" };

async function home(): Promise<string> {
	const path = await mkdtemp(join(process.cwd(), ".quota-store-"));
	temporary.push(path);
	return path;
}

afterEach(async () => {
	for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true });
});

describe("QuotaStore cooldown lifecycle", () => {
	test("success: an undated auth cooldown expires at the configured fallback TTL", async () => {
		const store = new QuotaStore(await home(), { fallbackTtlMs: 100 });
		await store.mark(candidate, "auth", undefined, 1_000);
		expect(await store.active(candidate, 1_099)).toBeDefined();
		expect(await store.active(candidate, 1_100)).toBeUndefined();
	});

	test("edge-input: clearing an account removes every model cooldown for only that account", async () => {
		const root = await home();
		const store = new QuotaStore(root);
		await store.mark(candidate, "auth", undefined, 1_000);
		await store.mark({ ...candidate, model: "other" }, "quota_exhausted", 9_000, 1_000);
		await store.mark({ ...candidate, account: "personal" }, "auth", undefined, 1_000);
		await store.clearAccount("provider", "work");
		expect(await store.active(candidate, 1_001)).toBeUndefined();
		expect(await store.active({ ...candidate, model: "other" }, 1_001)).toBeUndefined();
		expect(await store.active({ ...candidate, account: "personal" }, 1_001)).toBeDefined();
	});

	test("failure: an explicit reset remains authoritative over the fallback TTL", async () => {
		const store = new QuotaStore(await home(), { fallbackTtlMs: 100 });
		await store.mark(candidate, "quota_exhausted", 5_000, 1_000);
		expect(await store.active(candidate, 2_000)).toMatchObject({ resetAt: 5_000 });
	});

	test("faux entries can be kept ephemeral", async () => {
		const root = await home();
		const store = new QuotaStore(root, { persist: (entry) => entry.provider !== "faux" });
		await store.mark({ provider: "faux", model: "echo", account: "test" }, "quota_exhausted", undefined, 1_000);
		expect(await Bun.file(join(root, "quota.json")).exists()).toBe(false);
	});

	test("cross-process quota writers preserve every candidate", async () => {
		const root = await home();
		const workers = Array.from({ length: 12 }, (_, index) => Bun.spawn([
			process.execPath,
			join(import.meta.dir, "fixtures", "store-writer.ts"),
			"quota",
			root,
			String(index),
		], { stdout: "pipe", stderr: "pipe" }));
		const exits = await Promise.all(workers.map((worker) => worker.exited));
		expect(exits).toEqual(Array(12).fill(0));
		const stored = JSON.parse(await Bun.file(join(root, "quota.json")).text()) as { entries: Record<string, unknown> };
		expect(Object.keys(stored.entries)).toHaveLength(12);
	});

	test("recovers a stale lock whose owner process is gone", async () => {
		const root = await home();
		const lock = join(root, "fixture.lock");
		await writeFile(lock, JSON.stringify({ pid: 999_999_999, token: "stale" }));
		await utimes(lock, new Date(0), new Date(0));
		let entered = false;
		await withFileLock(lock, async () => { entered = true; }, { staleMs: 1, timeoutMs: 100 });
		expect(entered).toBe(true);
	});
});
