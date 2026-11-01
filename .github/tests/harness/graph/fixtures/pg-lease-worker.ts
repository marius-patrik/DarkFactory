import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { FileProductionEffectJournal } from "../../../../../packages/harness/src/graph/durable-effects.ts";
import { runGraph, type NodeHandlers } from "../../../../../packages/harness/src/graph/executor.ts";
import type { WorkflowGraph } from "../../../../../packages/harness/src/graph/types.ts";
import { join } from "node:path";
import { PostgresGraphLease } from "../../../../../packages/harness/src/graph/postgres-lease.ts";

const [mode, actor, directory, namespace] = process.argv.slice(2);
const connectionString = process.env.DF21_TEST_DATABASE_URL;
if (!mode || !actor || !directory || !namespace || !connectionString) throw new Error("Missing worker arguments");
await mkdir(directory, { recursive: true });
const lease = new PostgresGraphLease({
	connectionString,
	namespace,
	runKey: () => "shared-request",
	ttlMs: 1500,
	renewMs: 200,
	acquireTimeoutMs: 8000,
});
try {
	if (mode === "graph-crash" || mode === "graph-recover") {
		const runDir = join(directory, "durable-run");
		const effects = new FileProductionEffectJournal(join(runDir, "effects"));
		const remote = join(directory, "remote-observed.jsonl");
		const graph: WorkflowGraph = {
			version: 1,
			checks: [],
			nodes: [{ id: "apply", kind: "automation", script: "board-sync", trigger: { event: "issues.opened" } }],
			edges: [],
		};
		const handlers: NodeHandlers = {
			agent: async () => { throw new Error("unexpected agent stage"); },
			automation: async (_node, ctx) => {
				if (!ctx.effect) throw new Error("missing durable effect");
				const result = await ctx.effect("external.write", {
					observe: async (effectId) => {
						let found: { id: string; value: string } | undefined;
						try {
							const rows = (await readFile(remote, "utf8")).trim().split("\n")
								.filter(Boolean).map((entry) => JSON.parse(entry) as { id: string; value: string });
							found = rows.find((item) => item.id === effectId);
						} catch (error) {
							if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
						}
						return found ? { value: found.value, evidence: found.id } : undefined;
					},
					execute: async (effectId) => {
						await appendFile(remote, JSON.stringify({ id: effectId, value: "committed" }) + "\n");
						if (mode === "graph-crash") process.exit(67);
						return { value: "committed", evidence: effectId };
					},
				});
				return { outcome: "success", outputs: { mutation: result.value } };
			},
		};
		await runGraph(graph, runDir, handlers, {
			type: "issues.opened",
			actor: { login: "owner", association: "OWNER", is_bot: false },
		}, {
			distributedLease: lease,
			effects,
			eventId: "stable-remote-delivery",
			recoverableAutomations: ["board-sync"],
		});
		await writeFile(join(directory, "completed-" + actor), "completed");
	} else {
		await lease.withLease(join(directory, "different-local-path-" + actor), async (claim) => {
		await writeFile(join(directory, "acquired-" + actor), "acquired");
		if (mode === "hold") await Bun.sleep(10_000);
		await claim.assertOwned();
		await writeFile(join(directory, "completed-" + actor), "completed");
		});
	}
} catch (error) {
	await writeFile(join(directory, "lost-" + actor), error instanceof Error ? error.message : String(error));
	process.exitCode = 2;
}
