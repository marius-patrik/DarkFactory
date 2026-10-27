import { afterEach, describe, expect, test } from "bun:test";
import { appendFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	FileProductionEffectJournal,
	IndeterminateEffectError,
	StaleEffectError,
	productionEffectId,
	runObservedProductionEffect,
} from "../../../../packages/harness/src/graph/durable-effects.ts";

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), "df-observed-effect-"));
	roots.push(root);
	const journal = new FileProductionEffectJournal(join(root, "journal"));
	const remote = join(root, "external-effects.jsonl");
	const observe = async (id: string) => {
		let lines: Array<{ id: string; evidence: string; value: number }> = [];
		try { lines = (await readFile(remote, "utf8")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)); }
		catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
		const matches = lines.filter((line) => line.id === id);
		if (matches.length > 1) throw new Error("duplicate external mutation");
		return matches[0] ? { evidence: matches[0].evidence, value: matches[0].value } : undefined;
	};
	const mutate = async (id: string) => {
		const value = 17;
		const evidence = `remote-commit:${id}`;
		await appendFile(remote, `${JSON.stringify({ id, evidence, value })}\n`);
		return { value, evidence };
	};
	return { root, journal, remote, observe, mutate };
}

describe("observed production effects", () => {
	test("stable identity ignores event redelivery while distinguishing iterations and children", () => {
		const id = productionEffectId("request/5", "merge", 1, "github.merge", "pr:5");
		expect(id).toMatch(/^[0-9a-f]{64}$/);
		expect(id).toBe(productionEffectId("request/5", "merge", 1, "github.merge", "pr:5"));
		expect(id).not.toBe(productionEffectId("request/5", "merge", 2, "github.merge", "pr:5"));
		expect(id).not.toBe(productionEffectId("request/5/child/0", "merge", 1, "github.merge", "pr:5"));
	});

	test("observes a real persisted external effect and never repeats it on redelivery or restart", async () => {
		const f = await fixture();
		const id = productionEffectId("request-5", "merge", 1, "github.merge");
		let writes = 0;
		const ops = {
			observe: () => f.observe(id),
			execute: async () => { writes++; return f.mutate(id); },
		};
		const first = await runObservedProductionEffect(f.journal, id, "github.merge", ops);
		expect(first).toMatchObject({ status: "completed", value: 17, evidence: `remote-commit:${id}` });
		const restarted = new FileProductionEffectJournal(f.journal.directory);
		const second = await runObservedProductionEffect(restarted, id, "github.merge", ops);
		expect(second).toEqual(first);
		expect(writes).toBe(1);
		expect((await readFile(f.remote, "utf8")).trim().split("\n")).toHaveLength(1);
	});

	test("serializes simultaneous delivery against an actual file mutation", async () => {
		const f = await fixture();
		const id = productionEffectId("request-6", "push", 1, "git.push");
		let entered = 0;
		const ops = {
			observe: () => f.observe(id),
			execute: async () => {
				entered++;
				await Bun.sleep(45);
				return f.mutate(id);
			},
		};
		const both = await Promise.all(
			Array.from({ length: 3 }, () => runObservedProductionEffect(f.journal, id, "git.push", ops)),
		);
		expect(entered).toBe(1);
		expect(both.every((entry) => entry.evidence === both[0]?.evidence)).toBe(true);
		expect((await readFile(f.remote, "utf8")).trim().split("\n")).toHaveLength(1);
	});

	test("crash after mutation but before recording completion resumes only from observed remote evidence", async () => {
		const f = await fixture();
		const id = productionEffectId("request-7", "comment", 1, "github.comment");
		let entered = 0;
		await expect(runObservedProductionEffect(f.journal, id, "github.comment", {
			observe: () => f.observe(id),
			execute: async () => {
				entered++;
				await f.mutate(id);
				throw new Error("process crashed after HTTP success");
			},
		})).rejects.toBeInstanceOf(IndeterminateEffectError);
		expect(await f.journal.read(id)).toMatchObject({ status: "pending" });
		const restarted = new FileProductionEffectJournal(f.journal.directory);
		const committed = await runObservedProductionEffect(restarted, id, "github.comment", {
			observe: () => f.observe(id),
			execute: async () => { entered++; return f.mutate(id); },
		});
		expect(committed.status).toBe("completed");
		expect(entered).toBe(1);
	});

	test("crash before external completion and unobservable remote outcome fails closed", async () => {
		const f = await fixture();
		const id = productionEffectId("request-8", "pr", 1, "github.pr");
		await f.journal.write({ id, kind: "github.pr", status: "pending", startedAt: new Date().toISOString() });
		let executed = false;
		await expect(runObservedProductionEffect(f.journal, id, "github.pr", {
			observe: () => f.observe(id),
			execute: async () => { executed = true; return f.mutate(id); },
		})).rejects.toBeInstanceOf(IndeterminateEffectError);
		expect(executed).toBe(false);
		expect(await f.journal.read(id)).toMatchObject({ status: "pending" });
	});

	test("stale external state and mismatched kind cannot reuse committed evidence", async () => {
		const f = await fixture();
		const id = productionEffectId("request-9", "push", 1, "git.push");
		const ops = { observe: () => f.observe(id), execute: () => f.mutate(id) };
		await runObservedProductionEffect(f.journal, id, "git.push", ops);
		await expect(runObservedProductionEffect(f.journal, id, "github.merge", ops)).rejects.toThrow("belongs to");
		await rm(f.remote);
		await expect(runObservedProductionEffect(f.journal, id, "git.push", ops)).rejects.toBeInstanceOf(StaleEffectError);
	});

	test("invalid IDs and non-durable mutation evidence are rejected", async () => {
		const f = await fixture();
		await expect(f.journal.read("../escape")).rejects.toThrow("Invalid graph effect identity");
		const id = productionEffectId("request-10", "apply", 1, "mutation");
		await expect(runObservedProductionEffect(f.journal, id, "mutation", {
			observe: async () => undefined,
			execute: async () => ({ value: 1, evidence: "" }),
		})).rejects.toBeInstanceOf(IndeterminateEffectError);
		expect(await f.journal.read(id)).toMatchObject({ status: "pending" });
	});
});
