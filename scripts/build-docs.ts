import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { compileDocsContentGraphWithDetectedApi, renderReadmeMarkdown } from "../packages/docs/src/index.ts";
import { renderDocsSite } from "../packages/web/src/docs.ts";

function option(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

const repoRoot = resolve(option("--repo-root") ?? process.cwd());
const outputDir = resolve(option("--out") ?? join(repoRoot, "site"));
const graph = await compileDocsContentGraphWithDetectedApi(repoRoot, { capabilitiesRoot: resolve(import.meta.dir, "..", "capabilities") });

await renderDocsSite(graph, outputDir);
await writeFile(join(repoRoot, "README.md"), renderReadmeMarkdown(graph));
await mkdir(join(repoRoot, ".darkfactory", "generated"), { recursive: true });
await writeFile(join(repoRoot, ".darkfactory", "generated", "docs.json"), JSON.stringify(graph, null, 2) + "\n");

console.log(`Built ${graph.pages.length} documentation pages${graph.api ? " plus API reference" : ""} into ${outputDir}`);
