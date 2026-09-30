import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
	assertCurrentDocumentation,
	compileDocsContentGraphWithDetectedApi,
	renderAgentsMarkdown,
	renderReadmeMarkdown,
} from "../packages/docs/src/index.ts";
import { renderDocsSite } from "../packages/web/src/docs.ts";

function option(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

const repoRoot = resolve(option("--repo-root") ?? process.cwd());
const outputDir = resolve(option("--out") ?? join(repoRoot, "site"));
const check = process.argv.includes("--check");
const graph = await compileDocsContentGraphWithDetectedApi(repoRoot, {
	capabilitiesRoot: resolve(import.meta.dir, "..", "capabilities"),
});

if (check) {
	assertCurrentDocumentation(repoRoot, graph);
	console.log(`Checked ${graph.pages.length} documentation pages${graph.api ? " plus API reference" : ""}`);
	process.exit(0);
}

const agentsMarkdown = renderAgentsMarkdown(graph);
await mkdir(join(repoRoot, ".agents"), { recursive: true });
await writeFile(join(repoRoot, ".agents", "AGENTS.md"), agentsMarkdown);
// The README is the home page projected to the repository root, so it cannot drift from
// `docs/home.md`. It carried a renderer with no caller until now: the build wrote AGENTS.md and the
// site and left README.md to be edited by hand, which is what the marker on the projection exists to
// prevent.
await writeFile(join(repoRoot, "README.md"), renderReadmeMarkdown(graph));
await renderDocsSite(graph, outputDir);
await mkdir(join(repoRoot, ".darkfactory", "generated"), { recursive: true });
await writeFile(join(repoRoot, ".darkfactory", "generated", "docs.json"), JSON.stringify(graph, null, 2) + "\n");

console.log(
	`Built ${graph.pages.length} documentation pages${graph.api ? " plus API reference" : ""} into ${outputDir}`,
);
