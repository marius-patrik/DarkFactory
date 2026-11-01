import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SQL } from "bun";
import { FencedGraphLeaseError, PostgresGraphLease } from "../../../../packages/harness/src/graph/postgres-lease.ts";

const connectionString = process.env.DF21_TEST_DATABASE_URL;
const databaseTest = connectionString ? test : test.skip;
const roots: string[] = [];
const processes: Array<ReturnType<typeof Bun.spawn>> = [];
const worker = join(import.meta.dir, "fixtures", "pg-lease-worker.ts");

async function started(mode: string, actor: string, directory: string, namespace: string) {
	const child = Bun.spawn([process.execPath, worker, mode, actor, directory, namespace], {
		env: { ...Bun.env, DF21_TEST_DATABASE_URL: connectionString ?? "" },
		stdout: "pipe",
		stderr: "pipe",
	});
	processes.push(child);
	return child;
}

async function visible(path: string, limitMs = 9000): Promise<void> {
	const deadline = performance.now() + limitMs;
	while (!existsSync(path)) {
		if (performance.now() > deadline) throw new Error("Timed out waiting for " + path);
		await Bun.sleep(40);
	}
}

afterEach(async () => {
	for (const process of processes.splice(0)) {
		try {
			process.kill("SIGCONT");
			process.kill("SIGKILL");
		} catch {
			// Already exited.
		}
	}
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("PostgreSQL distributed ownership (independent OS processes)", () => {
	databaseTest("only one process owns the Request; generation survives a crashed winner", async () => {
		const root = await mkdtemp(join(tmpdir(), "df21-crash-"));
		roots.push(root);
		const namespace = "df21-crash-" + crypto.randomUUID();
		const winner = await started("hold", "winner", root, namespace);
		await visible(join(root, "acquired-winner"));
		const contender = await started("quick", "replacement", root, namespace);
		await Bun.sleep(400);
		expect(existsSync(join(root, "acquired-replacement"))).toBe(false);
		winner.kill("SIGKILL");
		await winner.exited;
		await visible(join(root, "completed-replacement"));
		expect(await contender.exited).toBe(0);
		const sql = new SQL(connectionString!);
		try {
			const records = await sql<{ generation: string }[]>`
				SELECT generation::text AS generation FROM darkfactory_graph_leases
				WHERE run_key = ${namespace + ":shared-request"}
			`;
			expect(Number(records[0]?.generation)).toBeGreaterThanOrEqual(2);
		} finally {
			await sql.close();
		}
	});

	databaseTest(
		"paused stale runner cannot commit after an expired lease is handed over",
		async () => {
			if (process.platform !== "linux") return;
			const root = await mkdtemp(join(tmpdir(), "df21-stale-"));
			roots.push(root);
			const namespace = "df21-stale-" + crypto.randomUUID();
			const stale = await started("hold", "stale", root, namespace);
			await visible(join(root, "acquired-stale"));
			stale.kill("SIGSTOP");
			await Bun.sleep(1750);
			const replacement = await started("quick", "fresh", root, namespace);
			await visible(join(root, "completed-fresh"));
			expect(await replacement.exited).toBe(0);
			stale.kill("SIGCONT");
			await visible(join(root, "lost-stale"), 12000);
			expect(existsSync(join(root, "completed-stale"))).toBe(false);
			expect(await readFile(join(root, "lost-stale"), "utf8")).toMatch(/lease|ownership/iu);
			expect(await stale.exited).toBe(2);
		},
		20_000,
	);

	databaseTest(
		"a new OS process reconciles a remotely committed effect after the previous process crashes",
		async () => {
			const root = await mkdtemp(join(tmpdir(), "df21-graph-"));
			roots.push(root);
			const namespace = "df21-graph-" + crypto.randomUUID();
			const first = await started("graph-crash", "writer", root, namespace);
			expect(await first.exited).toBe(67);
			const remote = join(root, "remote-observed.jsonl");
			const original = await readFile(remote, "utf8");
			expect(original.trim().split("\n")).toHaveLength(1);
			const second = await started("graph-recover", "replacement", root, namespace);
			await visible(join(root, "completed-replacement"));
			expect(await second.exited).toBe(0);
			expect(await readFile(remote, "utf8")).toBe(original);
			expect(JSON.parse(await readFile(join(root, "durable-run", "state.df"), "utf8")).outputs.mutation).toBe(
				"committed",
			);
		},
		20_000,
	);

	databaseTest("a stale generation cannot renew or release a newer owner's claim", async () => {
		const root = await mkdtemp(join(tmpdir(), "df21-generation-"));
		roots.push(root);
		const namespace = "df21-generation-" + crypto.randomUUID();
		const lease = new PostgresGraphLease({
			connectionString: connectionString!,
			namespace,
			runKey: () => "subject",
			ttlMs: 1500,
			renewMs: 200,
		});
		await lease.withLease(join(root, "first"), async (claim) => claim.assertOwned());
		const sql = new SQL(connectionString!);
		try {
			const rows = await sql<{ generation: string }[]>`
				SELECT generation::text AS generation FROM darkfactory_graph_leases
				WHERE run_key = ${namespace + ":subject"}
			`;
			const oldGeneration = rows[0]?.generation;
			expect(oldGeneration).toBe("1");
			await lease.withLease(join(root, "other-host"), async (claim) => claim.assertOwned());
			const staleMutation = await sql<{ generation: string }[]>`
				UPDATE darkfactory_graph_leases SET expires_at = clock_timestamp()
				WHERE run_key = ${namespace + ":subject"} AND generation = ${oldGeneration}
				RETURNING generation::text AS generation
			`;
			expect(staleMutation).toHaveLength(0);
		} finally {
			await sql.close();
		}
	});

	test("rejects local databases, unstable key identities and unsafe expiry settings", async () => {
		expect(
			() => new PostgresGraphLease({ connectionString: "sqlite://test", namespace: "repo", runKey: () => "7" }),
		).toThrow("requires PostgreSQL");
		expect(
			() =>
				new PostgresGraphLease({
					connectionString: "postgres://example.invalid/test",
					namespace: "repo",
					runKey: () => "7",
					ttlMs: 1000,
					renewMs: 500,
				}),
		).toThrow("expiry");
		const lease = new PostgresGraphLease({
			connectionString: "postgres://example.invalid/test",
			namespace: "repo",
			runKey: () => "",
		});
		await expect(lease.withLease("somewhere", async () => "never")).rejects.toThrow("runKey");
		expect(new FencedGraphLeaseError("lost").name).toBe("FencedGraphLeaseError");
	});
});
