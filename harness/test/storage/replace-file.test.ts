import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { replaceFile } from "../../src/storage/replace-file.ts";

function errno(code: string): NodeJS.ErrnoException {
	return Object.assign(new Error(`${code}: operation not permitted, rename`), { code });
}

test("replaceFile retries while the target is locked by another process, then succeeds", async () => {
	const failures = ["EPERM", "EBUSY", "EACCES"];
	const renames: [string, string][] = [];
	const waits: number[] = [];
	await replaceFile("state.json.tmp", "state.json", {
		rename: async (from, to) => { renames.push([from, to]); const code = failures.shift(); if (code) throw errno(code); },
		delaysMs: [1, 2, 3, 4],
		sleep: async (ms) => { waits.push(ms); },
	});
	expect(renames).toHaveLength(4);
	expect(waits).toEqual([1, 2, 3]);
});

test("replaceFile gives up after the last retry with the lock error", async () => {
	let attempts = 0;
	const replacing = replaceFile("a.tmp", "a", { rename: async () => { attempts++; throw errno("EPERM"); }, delaysMs: [1, 1], sleep: async () => undefined });
	await expect(replacing).rejects.toMatchObject({ code: "EPERM" });
	expect(attempts).toBe(3);
});

test("replaceFile does not retry errors that are not a lock", async () => {
	let attempts = 0;
	const replacing = replaceFile("a.tmp", "a", { rename: async () => { attempts++; throw errno("ENOENT"); }, sleep: async () => undefined });
	await expect(replacing).rejects.toMatchObject({ code: "ENOENT" });
	expect(attempts).toBe(1);
});

test("replaceFile replaces the target on disk", async () => {
	const dir = await mkdtemp(join(tmpdir(), "df-replace-"));
	try {
		const target = join(dir, "limits.json");
		await writeFile(target, "old");
		await writeFile(`${target}.tmp`, "new");
		await replaceFile(`${target}.tmp`, target);
		expect(await readFile(target, "utf8")).toBe("new");
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});

test("concurrent writers and readers of one ledger file all finish", async () => {
	const dir = await mkdtemp(join(tmpdir(), "df-replace-"));
	try {
		const target = join(dir, "limits.json");
		await writeFile(target, "0");
		const writers = Array.from({ length: 20 }, async (_, index) => {
			const temporary = `${target}.${index}.tmp`;
			await writeFile(temporary, String(index));
			await replaceFile(temporary, target);
		});
		const readers = Array.from({ length: 40 }, () => readFile(target, "utf8").catch(() => ""));
		await Promise.all([...writers, ...readers]);
		expect(Number(await readFile(target, "utf8"))).toBeGreaterThanOrEqual(0);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
