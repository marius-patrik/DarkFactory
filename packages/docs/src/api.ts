import type { CapabilityDefinition } from "@darkfactory/capability";
import { resolveRepositoryActions } from "@darkfactory/capability/actions";
import { discoverCapabilities, resolveCapabilities } from "@darkfactory/capability/loader";
import { detectRepositoryEvidence, type RepositoryEvidence } from "@darkfactory/core/repository-evidence";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { Application, ReflectionKind, type JSONOutput } from "typedoc";
import {
	compileDocsContentGraph,
	includeCapabilityDocumentation,
	type DocsApiReference,
	type DocsApiSymbol,
	type DocsCapabilitySummary,
	type DocsContentGraph,
	type DocsRepositorySummary,
} from "./content.ts";
import { loadDocsConfig, type DocsConfig, type DocsTypeScriptApiConfig } from "./config.ts";

/** Inputs required to extract a TypeScript API model. */
export interface TypeScriptApiExtractionOptions {
	entryPoints: readonly string[];
	tsconfig: string;
	name?: string;
}

/** Strictly extracts TypeScript/TSDoc API metadata as TypeDoc JSON without rendering HTML. */
export async function extractTypeScriptApi(options: TypeScriptApiExtractionOptions): Promise<JSONOutput.ProjectReflection> {
	const app = await Application.bootstrap({
		name: options.name,
		entryPoints: [...options.entryPoints],
		tsconfig: options.tsconfig,
		skipErrorChecking: false,
		emit: "none",
		validation: { notExported: true, invalidLink: true, invalidPath: true, rewrittenLink: false, notDocumented: true, unusedMergeModuleWith: false },
		requiredToBeDocumented: ["Class", "Interface", "Function", "TypeAlias", "Variable", "Enum", "EnumMember", "Accessor"],
		treatWarningsAsErrors: true,
		treatValidationWarningsAsErrors: true,
		readme: "none",
	});
	const project = await app.convert();
	if (!project || app.logger.hasErrors()) throw new Error("TypeDoc conversion failed.");
	app.validate(project);
	if (app.logger.hasErrors() || app.logger.hasWarnings()) throw new Error("TypeDoc validation produced errors or warnings.");
	const directory = await mkdtemp(join(tmpdir(), "darkfactory-typedoc-"));
	const output = join(directory, "api.json");
	try {
		await app.generateJson(project, output);
		if (app.logger.hasErrors() || app.logger.hasWarnings()) throw new Error("TypeDoc JSON generation produced errors or warnings.");
		return JSON.parse(await readFile(output, "utf8")) as JSONOutput.ProjectReflection;
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

function commentSummary(reflection: any): string | undefined {
	const parts = reflection?.comment?.summary;
	if (!Array.isArray(parts)) return undefined;
	const summary = parts.map((part) => (typeof part?.text === "string" ? part.text : "")).join("").trim();
	return summary || undefined;
}

function apiSymbol(reflection: any): DocsApiSymbol {
	const nested = [...(Array.isArray(reflection?.children) ? reflection.children : []), ...(Array.isArray(reflection?.signatures) ? reflection.signatures : [])];
	const kind = typeof reflection?.kind === "number" ? (ReflectionKind[reflection.kind] ?? String(reflection.kind)) : "Unknown";
	const summary = commentSummary(reflection);
	return {
		name: typeof reflection?.name === "string" ? reflection.name : "anonymous",
		kind,
		...(summary ? { summary } : {}),
		children: nested.map(apiSymbol),
	};
}

/** Converts strict TypeDoc JSON into the browser-safe API reference carried by the docs graph. */
export function apiReferenceFromTypeDoc(project: JSONOutput.ProjectReflection): DocsApiReference {
	return { name: project.name || "API", symbols: (project.children ?? []).map(apiSymbol) };
}

function extractionOptions(repoRoot: string, api: DocsTypeScriptApiConfig): TypeScriptApiExtractionOptions {
	return {
		entryPoints: (api.entryPoints ?? []).map((entry) => resolve(repoRoot, entry)),
		tsconfig: resolve(repoRoot, api.tsconfig),
		...(api.name ? { name: api.name } : {}),
	};
}

/** Compiles the canonical documentation graph including configured TypeScript API metadata. */
export async function compileDocsContentGraphWithApi(repoRoot: string, config: DocsConfig = loadDocsConfig(repoRoot)): Promise<DocsContentGraph> {
	const typescript = config.api?.typescript;
	if (!typescript?.entryPoints?.length) return compileDocsContentGraph(repoRoot, config);
	const project = await extractTypeScriptApi(extractionOptions(repoRoot, typescript));
	return compileDocsContentGraph(repoRoot, config, apiReferenceFromTypeDoc(project));
}

/** Projects canonical repository evidence and applicable capability definitions into browser-safe docs metadata. */
export function documentationMetadata(
	evidence: RepositoryEvidence,
	definitions: readonly CapabilityDefinition[],
): { repository: DocsRepositorySummary; capabilities: readonly DocsCapabilitySummary[] } {
	const defaultBranch = evidence.repoDf.identity?.default_branch;
	const repository: DocsRepositorySummary = {
		...(evidence.repoDfPath
			? { repoDfPath: (relative(evidence.root, evidence.repoDfPath) || ".").replaceAll("\\", "/") }
			: {}),
		...(typeof defaultBranch === "string" ? { defaultBranch } : {}),
		ecosystems: evidence.ecosystems,
		domains: evidence.domains,
		packages: evidence.packages.map((pkg) => ({
			id: pkg.id,
			path: pkg.path,
			name: pkg.name,
			ecosystem: pkg.ecosystem,
			packageManager: pkg.packageManager,
			domains: pkg.domains,
			apiEntryPoints: pkg.apiEntryPoints,
		})),
	};
	const capabilities = definitions.map((definition) => ({
		id: definition.id,
		version: definition.version,
		description: definition.description,
		domains: definition.domains ?? [],
		detectors: (definition.detectors ?? []).map((entry) => entry.id),
		commands: (definition.commands ?? []).map((entry) => entry.name),
		graph: (definition.graph ?? []).map((entry) => ({ id: entry.id, nodeKinds: entry.nodeKinds })),
		hooks: (definition.hooks ?? []).flatMap((entry) => entry.events.map((event) => `${entry.id}:${event}`)),
		verification: (definition.verification ?? []).map((entry) => entry.id),
		docs: definition.surfaces?.docs ?? [],
	}));
	return { repository, capabilities };
}

/**
 * Compiles documentation using TypeScript API entry points from the canonical repository detector/action resolver.
 * docs.df continues to own TypeDoc settings; detected package evidence owns which exported APIs are present.
 */
export async function compileDocsContentGraphWithDetectedApi(
	repoRoot: string,
	options: { config?: DocsConfig; capabilitiesRoot?: string } = {},
): Promise<DocsContentGraph> {
	const config = options.config ?? loadDocsConfig(repoRoot);
	const evidence = await detectRepositoryEvidence(repoRoot);
	const capabilitiesRoot = options.capabilitiesRoot ?? resolve(repoRoot, "capabilities");
	const definitions = await discoverCapabilities(capabilitiesRoot);
	const applicable = resolveCapabilities(definitions, evidence.domains).capabilities;
	const resolution = resolveRepositoryActions(evidence, applicable);
	const metadata = documentationMetadata(evidence, applicable);
	const configured = config.api?.typescript;
	const finalize = (graph: DocsContentGraph): DocsContentGraph => ({
		...includeCapabilityDocumentation(repoRoot, graph, metadata.capabilities),
		...metadata,
	});

	if (!configured) return finalize(compileDocsContentGraph(repoRoot, config));

	const entryPoints = resolution.packages.flatMap(({ actions }) => {
		const action = actions.docs_extract;
		const actionMetadata = action.metadata;
		if (!action.supported || actionMetadata?.extractor !== "typedoc" || !Array.isArray(actionMetadata.entryPoints)) return [];
		return actionMetadata.entryPoints.filter((entry): entry is string => typeof entry === "string");
	});
	const uniqueEntryPoints = [...new Set(entryPoints)].sort();
	if (uniqueEntryPoints.length === 0) return finalize(compileDocsContentGraph(repoRoot, config));

	const detectedConfig: DocsConfig = {
		...config,
		api: {
			...config.api,
			typescript: {
				...configured,
				entryPoints: uniqueEntryPoints,
			},
		},
	};
	return finalize(await compileDocsContentGraphWithApi(repoRoot, detectedConfig));
}

