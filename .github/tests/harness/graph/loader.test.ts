import { expect, test } from "bun:test";
import { join } from "node:path";
import { loadGraph, loadManifestGraph } from "../../src/graph/index.ts";

test("loads a standalone graph", async () =>
	expect((await loadGraph(join(import.meta.dir, "../../assets/graph.darkfactory.json"))).version).toBe(1));
test("loads the graph section of a manifest", async () => {
	const path = join(import.meta.dir, "manifest.tmp.json");
	await Bun.write(
		path,
		JSON.stringify({
			name: "ignored",
			graph: await Bun.file(join(import.meta.dir, "../../assets/graph.darkfactory.json")).json(),
		}),
	);
	try {
		expect((await loadManifestGraph(path)).nodes.length).toBeGreaterThan(0);
	} finally {
		await Bun.file(path).delete();
	}
});
