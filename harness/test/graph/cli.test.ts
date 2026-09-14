import { expect, test } from "bun:test";
import { join } from "node:path";

test("df graph validate accepts the bundled standalone graph", () => {
	const result = Bun.spawnSync([process.execPath, "src/cli.ts", "graph", "validate", "assets/graph.darkfactory.json"], { cwd: join(import.meta.dir, "../..") });
	expect(result.exitCode).toBe(0);
	expect(result.stdout.toString()).toContain("valid workflow graph v1");
});

test("df graph plan reads event and state files", async () => {
	const root = join(import.meta.dir, "../..");
	const event = join(import.meta.dir, "event.tmp.json");
	const state = join(import.meta.dir, "state.tmp.json");
	await Bun.write(event, JSON.stringify({ type: "issues.opened", actor: { login: "owner", association: "OWNER", is_bot: false } }));
	await Bun.write(state, JSON.stringify({ run_id: "r1", current_node: "request-intake", outputs: {}, hints: [] }));
	try {
		const result = Bun.spawnSync([process.execPath, "src/cli.ts", "graph", "plan", "--graph", "assets/graph.darkfactory.json", "--event", event, "--state", state], { cwd: root });
		expect(result.exitCode).toBe(0);
		expect(JSON.parse(result.stdout.toString())).toEqual({ type: "run", nodes: ["request-intake"] });
	} finally { await Bun.file(event).delete(); await Bun.file(state).delete(); }
});
