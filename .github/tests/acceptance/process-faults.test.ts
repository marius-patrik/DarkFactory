import { afterEach, describe, expect, test } from "bun:test";
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	FileProductionEffectJournal,
	productionEffectId,
	runObservedProductionEffect,
	withGraphFileLock,
} from "../../../packages/harness/src/graph/durable-effects.ts";

const tempRoots: string[] = [];
const moduleUrl = new URL("../../../packages/harness/src/graph/durable-effects.ts", import.meta.url).href;

afterEach(async () => {
	await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function temporary(): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), "df14-fault-"));
	tempRoots.push(path);
	return path;
}

async function child(source: string): Promise<{ exit: number; stdout: string; stderr: string }> {
	const processChild = Bun.spawn([process.execPath, "-e", source], {
		cwd: process.cwd(),
		stdout: "pipe",
		stderr: "pipe",
	});
	const [exit, stdout, stderr] = await Promise.all([
		processChild.exited,
		new Response(processChild.stdout).text(),
		new Response(processChild.stderr).text(),
	]);
	return { exit, stdout, stderr };
}

describe("DF-14 real-process fault acceptance", () => {
	test("FAULT-01: crashed owner leaves reclaimable PID-bound lock; next process acquires exactly once", async () => {
		const root = await temporary();
		const marker = join(root, "entered");
		const script = `
			import { writeFile } from "node:fs/promises";
			import { withGraphFileLock } from ${JSON.stringify(moduleUrl)};
			await withGraphFileLock(${JSON.stringify(root)}, "mutation", async () => {
				await writeFile(${JSON.stringify(marker)}, "owner exited without finally");
				process.exit(71);
			});
		`;
		const crashed = await child(script);
		expect(crashed.exit).toBe(71);
		expect(await readFile(marker, "utf8")).toBe("owner exited without finally");
		let count = 0;
		await withGraphFileLock(root, "mutation", async () => {
			count++;
		}, { waitMs: 2_000 });
		expect(count).toBe(1);
	});

	test("FAULT-02: separate competing Bun runners serialize a shared persistent mutation", async () => {
		const root = await temporary();
		const log = join(root, "side-effects.log");
		const script = `
			import { appendFile } from "node:fs/promises";
			import { withGraphFileLock } from ${JSON.stringify(moduleUrl)};
			await withGraphFileLock(${JSON.stringify(root)}, "shared", async () => {
				await appendFile(${JSON.stringify(log)}, "begin\\n");
				await Bun.sleep(75);
				await appendFile(${JSON.stringify(log)}, "end\\n");
			}, { waitMs: 3_000 });
		`;
		const results = await Promise.all([child(script), child(script), child(script)]);
		for (const result of results) expect(result).toMatchObject({ exit: 0 });
		expect((await readFile(log, "utf8")).trim().split("\n")).toEqual([
			"begin",
			"end",
			"begin",
			"end",
			"begin",
			"end",
		]);
	});

	test("FAULT-03: actual process death after remote write but before journal completion never repeats mutation", async () => {
		const root = await temporary();
		const directory = join(root, "effects");
		const remote = join(root, "remote");
		const id = productionEffectId("request-72", "github-comment", 1, "github.comment");
		const script = `
			import { writeFile } from "node:fs/promises";
			import { FileProductionEffectJournal, runObservedProductionEffect } from ${JSON.stringify(moduleUrl)};
			const journal = new FileProductionEffectJournal(${JSON.stringify(directory)});
			await runObservedProductionEffect(journal, ${JSON.stringify(id)}, "github.comment", {
				observe: async () => undefined,
				execute: async () => {
					await writeFile(${JSON.stringify(remote)}, "remote:72");
					process.exit(72);
				},
			});
		`;
		const crashed = await child(script);
		expect(crashed.exit).toBe(72);
		const journal = new FileProductionEffectJournal(directory);
		expect(await journal.read(id)).toMatchObject({ id, status: "pending" });
		let retries = 0;
		const recovered = await runObservedProductionEffect(journal, id, "github.comment", {
			observe: async () => ({
				value: await readFile(remote, "utf8"),
				evidence: "remote-comment:72",
			}),
			execute: async () => {
				retries++;
				throw new Error("must not send a second comment");
			},
		});
		expect(recovered).toMatchObject({
			status: "completed",
			evidence: "remote-comment:72",
			value: "remote:72",
		});
		expect(retries).toBe(0);
	});

	test("FAULT-04: torn journal JSON does not authorize replay or get mistaken for absent intent", async () => {
		const root = await temporary();
		const directory = join(root, "effects");
		await mkdir(directory, { recursive: true });
		const id = productionEffectId("request-torn", "push", 1, "git.push");
		await writeFile(join(directory, `${id}.df`), '{"id":', "utf8");
		let mutations = 0;
		await expect(
			runObservedProductionEffect(new FileProductionEffectJournal(directory), id, "git.push", {
				observe: async () => undefined,
				execute: async () => {
					mutations++;
					return { value: 1, evidence: "remote" };
				},
			}),
		).rejects.toThrow();
		expect(mutations).toBe(0);
	});
});
