import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { withGraphFileLock } from "../../../../packages/harness/src/graph/durable-effects.ts";

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "df-lock-recovery-"));
	roots.push(root);
	await mkdir(root, { recursive: true });
	return root;
}

const deadPid = 2147483647;
const deadOwner = (token: string) => ({ pid: deadPid, host: hostname(), token });

describe("filesystem run lock crash recovery", () => {
	test("one actor reclaims a dead primary owner and its orphaned cleanup guard", async () => {
		const dir = await fixture();
		await writeFile(join(dir, "run.lock"), JSON.stringify(deadOwner("dead-primary")));
		await writeFile(join(dir, "run.cleanup.lock"), JSON.stringify(deadOwner("dead-cleaner")));
		let ran = false;
		await withGraphFileLock(
			dir,
			"run",
			async () => {
				ran = true;
				const owner = JSON.parse(await readFile(join(dir, "run.lock"), "utf8"));
				expect(owner.pid).toBe(process.pid);
				expect(owner.host).toBe(hostname());
			},
			{ waitMs: 2_000 },
		);
		expect(ran).toBe(true);
		await expect(readFile(join(dir, "run.cleanup.lock"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
		await expect(readFile(join(dir, "run.lock"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
	});

	test("three contending actors serialize all critical sections", async () => {
		const dir = await fixture();
		let concurrent = 0;
		let completed = 0;
		await Promise.all(
			Array.from({ length: 3 }, () =>
				withGraphFileLock(dir, "run", async () => {
					concurrent++;
					expect(concurrent).toBe(1);
					await Bun.sleep(35);
					completed++;
					concurrent--;
				}),
			),
		);
		expect(completed).toBe(3);
	});

	test("never steals a cross-host primary lock even when its PID is absent locally", async () => {
		const dir = await fixture();
		await writeFile(
			join(dir, "run.lock"),
			JSON.stringify({ ...deadOwner("other-host"), host: "different-machine.example" }),
		);
		await expect(withGraphFileLock(dir, "run", async () => {}, { waitMs: 80 })).rejects.toThrow(
			"Graph lock contention timeout",
		);
		expect(JSON.parse(await readFile(join(dir, "run.lock"), "utf8")).token).toBe("other-host");
	});

	test("an unidentifiable cleanup guard fails closed instead of being unlinked", async () => {
		const dir = await fixture();
		await writeFile(join(dir, "run.lock"), JSON.stringify(deadOwner("primary")));
		await writeFile(join(dir, "run.cleanup.lock"), "{}");
		await expect(withGraphFileLock(dir, "run", async () => {}, { waitMs: 80 })).rejects.toThrow();
		expect(await readFile(join(dir, "run.cleanup.lock"), "utf8")).toBe("{}");
	});
});
