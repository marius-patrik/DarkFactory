import { mkdir, writeFile } from "node:fs/promises";
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
	await lease.withLease(join(directory, "different-local-path-" + actor), async (claim) => {
		await writeFile(join(directory, "acquired-" + actor), "acquired");
		if (mode === "hold") await Bun.sleep(10_000);
		await claim.assertOwned();
		await writeFile(join(directory, "completed-" + actor), "completed");
	});
} catch (error) {
	await writeFile(join(directory, "lost-" + actor), error instanceof Error ? error.message : String(error));
	process.exitCode = 2;
}
