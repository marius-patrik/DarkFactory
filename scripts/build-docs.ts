import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
	assertCurrentDocumentation,
	assertStrictDocumentation,
	compileDocsContentGraphWithDetectedApi,
	docsSearchIndex,
	finalizeUnifiedSite,
	normalizedBasePath,
	stageWebBundle,
} from "../packages/docs/src/index.ts";
import { renderDocsSite } from "../packages/web/src/docs.ts";

function option(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

const repoRoot = resolve(option("--repo-root") ?? process.cwd());
const outputDir = resolve(option("--out") ?? join(repoRoot, "site"));
const check = process.argv.includes("--check");
const docsOnly = process.argv.includes("--docs-only");
const webDist = option("--web-dist");
const configuredBasePath =
	option("--base-path") ??
	process.env.DF_PAGES_BASE_PATH ??
	(process.env.GITHUB_REPOSITORY ? "/" + process.env.GITHUB_REPOSITORY.split("/").at(-1) + "/" : "/");
const basePath = normalizedBasePath(configuredBasePath);

if (check && (docsOnly || webDist))
	throw new Error("--check validates documentation; do not combine it with packaging flags");
if (docsOnly && webDist) throw new Error("--docs-only is an isolated preview mode, not a unified-site bundle");
if (!check && !docsOnly && !webDist) {
	throw new Error(
		"Unified Pages build requires a DF-03 --web-dist with verified darkfactory-web-manifest.json; use --docs-only for nonpublishable previews",
	);
}

const graph = await compileDocsContentGraphWithDetectedApi(repoRoot, {
	capabilitiesRoot: resolve(repoRoot, ".darkfactory", "plugins"),
});
assertCurrentDocumentation(repoRoot, graph);
assertStrictDocumentation(graph);
if (check) {
	console.log(
		"Strict documentation validated: " +
			graph.pages.length +
			" pages, " +
			(graph.navigation?.length ?? 0) +
			" navigation groups",
	);
	process.exit(0);
}

await mkdir(dirname(outputDir), { recursive: true });
const stage = await mkdtemp(join(dirname(outputDir), ".darkfactory-site-"));
try {
	if (docsOnly) {
		await renderDocsSite(graph, stage);
		await writeFile(join(stage, "search.json"), JSON.stringify(docsSearchIndex(graph), null, 2) + "\n");
	} else {
		const web = await stageWebBundle(resolve(webDist!), stage, basePath, process.env.GITHUB_SHA);
		await renderDocsSite(graph, join(stage, "docs"));
		await writeFile(join(stage, "docs", "search.json"), JSON.stringify(docsSearchIndex(graph), null, 2) + "\n");
		await finalizeUnifiedSite(stage, web, graph.pages.length);
	}
	await rm(outputDir, { recursive: true, force: true });
	await rename(stage, outputDir);
	await mkdir(join(repoRoot, ".darkfactory", "generated"), { recursive: true });
	await writeFile(join(repoRoot, ".darkfactory", "generated", "docs.json"), JSON.stringify(graph, null, 2) + "\n");
	console.log(
		(docsOnly ? "Built nonpublishable documentation preview" : "Packaged unpublished Web + Docs candidate") +
			" with " +
			graph.pages.length +
			" pages into " +
			outputDir,
	);
} finally {
	await rm(stage, { recursive: true, force: true });
}
