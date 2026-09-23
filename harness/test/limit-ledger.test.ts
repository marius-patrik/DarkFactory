import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LimitLedger } from "../src/limits/ledger.ts";
import { withFileLock } from "../src/storage/file-lock.ts";

const temporary: string[] = [];
const candidate = { provider: "provider", model: "model", account: "work" };

async function home(): Promise<string> {
	const path = await mkdtemp(join(process.cwd(), ".limit-ledger-"));
	temporary.push(path);
	return path;
}

afterEach(async () => {
	for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true });
});

describe("LimitLedger authoritative limit state", () => {
	test("a limit blocks only until its explicit reset", async () => {
		const ledger = new LimitLedger(await home());
		await ledger.record([
			{
				...candidate,
				type: "auth",
				observedAt: 1_000,
				resetAt: 1_100,
				source: "rule",
				remaining: 0,
			},
		]);
		expect(await ledger.blocking(candidate, 1_099)).toHaveLength(1);
		expect(await ledger.blocking(candidate, 1_100)).toHaveLength(0);
	});

	test("clearing an account removes every model limit for only that account", async () => {
		const root = await home();
		const ledger = new LimitLedger(root);
		await ledger.record([
			{ ...candidate, type: "auth", observedAt: 1_000, resetAt: 9_000, source: "rule", remaining: 0 },
			{ ...candidate, model: "other", type: "daily", observedAt: 1_000, resetAt: 9_000, source: "rule", remaining: 0 },
			{ ...candidate, account: "personal", type: "auth", observedAt: 1_000, resetAt: 9_000, source: "rule", remaining: 0 },
		]);
		await ledger.clearAccount("provider", "work");
		expect(await ledger.forCandidate(candidate, 1_001)).toHaveLength(0);
		expect(await ledger.forCandidate({ ...candidate, model: "other" }, 1_001)).toHaveLength(0);
		expect(await ledger.forCandidate({ ...candidate, account: "personal" }, 1_001)).toHaveLength(1);
	});

	test("an explicit reset remains authoritative", async () => {
		const ledger = new LimitLedger(await home());
		await ledger.record([
			{
				...candidate,
				type: "daily",
				observedAt: 1_000,
				resetAt: 5_000,
				source: "rule",
				remaining: 0,
			},
		]);
		expect(await ledger.forCandidate(candidate, 2_000)).toMatchObject([{ resetAt: 5_000 }]);
	});

	test("non-persisted candidates never create authoritative state", async () => {
		const root = await home();
		const ledger = new LimitLedger(root, { persist: (entry) => entry.provider !== "faux" });
		await ledger.record([
			{
				provider: "faux",
				model: "echo",
				account: "test",
				type: "daily",
				observedAt: 1_000,
				resetAt: 2_000,
				source: "rule",
				remaining: 0,
			},
		]);
		expect(await Bun.file(join(root, "limits.df")).exists()).toBe(false);
	});

	test("concurrent processes preserve every independently recorded candidate", async () => {
		const root = await home();
		const workers = Array.from({ length: 12 }, (_, index) =>
			Bun.spawn(
				[process.execPath, join(import.meta.dir, "fixtures", "store-writer.ts"), "quota", root, String(index)],
				{ stdout: "pipe", stderr: "pipe" },
			),
		);
		const exits = await Promise.all(workers.map((worker) => worker.exited));
		expect(exits).toEqual(Array(12).fill(0));
		const stored = JSON.parse(await Bun.file(join(root, "limits.df")).text()) as { entries: Record<string, unknown> };
		expect(Object.keys(stored.entries)).toHaveLength(12);
	});

	test("a stale lock owned by a dead process can be recovered", async () => {
		const root = await home();
		const lock = join(root, "fixture.lock");
		await writeFile(lock, JSON.stringify({ pid: 999_999_999, token: "stale" }));
		await utimes(lock, new Date(0), new Date(0));
		let entered = false;
		await withFileLock(
			lock,
			async () => {
				entered = true;
			},
			{ staleMs: 1, timeoutMs: 100 },
		);
		expect(entered).toBe(true);
	});
});
