import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Site metadata carried by the documentation content graph. */
export interface DocsSiteConfig {
	name: string;
	description?: string;
}

/** TypeScript API extraction settings owned by .agents/docs.df. */
export interface DocsTypeScriptApiConfig {
	entryPoints?: string[];
	tsconfig: string;
	name?: string;
}

/** API extraction configuration owned by .agents/docs.df. */
export interface DocsApiConfig {
	typescript?: DocsTypeScriptApiConfig;
}

/** Native DarkFactory documentation configuration. */
export interface DocsConfig {
	version: 1;
	site: DocsSiteConfig;
	home: string;
	api?: DocsApiConfig;
}

const CONFIG_PATH = join(".agents", "docs.df");

/** Resolves the documentation configuration at .agents/docs.df. */
export function resolveDocsConfigPath(repoRoot: string): string {
	const candidate = join(repoRoot, CONFIG_PATH);
	if (!existsSync(candidate)) throw new Error("No .agents/docs.df found.");
	return candidate;
}

function parseTypeScriptApiConfig(value: unknown): DocsTypeScriptApiConfig | undefined {
	if (value === undefined) return undefined;
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(".agents/docs.df api.typescript must be an object.");
	const record = value as Record<string, unknown>;
	if (record.entryPoints !== undefined && (!Array.isArray(record.entryPoints) || record.entryPoints.some((entry) => typeof entry !== "string" || !entry.trim()))) {
		throw new Error(".agents/docs.df api.typescript.entryPoints must be a string array when supplied.");
	}
	if (typeof record.tsconfig !== "string" || !record.tsconfig.trim()) throw new Error(".agents/docs.df api.typescript.tsconfig must be a non-empty string.");
	if (record.name !== undefined && (typeof record.name !== "string" || !record.name.trim())) throw new Error(".agents/docs.df api.typescript.name must be a non-empty string.");
	return {
		...(Array.isArray(record.entryPoints) && record.entryPoints.length > 0 ? { entryPoints: record.entryPoints.map((entry) => String(entry).trim().replaceAll("\\", "/")) } : {}),
		tsconfig: record.tsconfig.trim().replaceAll("\\", "/"),
		...(typeof record.name === "string" ? { name: record.name.trim() } : {}),
	};
}

/** Parses and validates the JSON-encoded .agents/docs.df contract. */
export function parseDocsConfig(source: string): DocsConfig {
	let value: unknown;
	try {
		value = JSON.parse(source);
	} catch (error) {
		throw new Error(`.agents/docs.df is not valid JSON: ${String(error)}`);
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(".agents/docs.df must contain an object.");
	const record = value as Record<string, unknown>;
	if (record.version !== 1) throw new Error(".agents/docs.df version must be 1.");
	if (!record.site || typeof record.site !== "object" || Array.isArray(record.site)) throw new Error(".agents/docs.df site must be an object.");
	const site = record.site as Record<string, unknown>;
	if (typeof site.name !== "string" || !site.name.trim()) throw new Error(".agents/docs.df site.name must be a non-empty string.");
	if (site.description !== undefined && typeof site.description !== "string") throw new Error(".agents/docs.df site.description must be a string.");
	if (typeof record.home !== "string" || !record.home.trim()) throw new Error(".agents/docs.df home must be a non-empty repository-relative path.");
	let api: DocsApiConfig | undefined;
	if (record.api !== undefined) {
		if (!record.api || typeof record.api !== "object" || Array.isArray(record.api)) throw new Error(".agents/docs.df api must be an object.");
		const typescript = parseTypeScriptApiConfig((record.api as Record<string, unknown>).typescript);
		api = typescript ? { typescript } : {};
	}
	return {
		version: 1,
		site: {
			name: site.name.trim(),
			...(typeof site.description === "string" && site.description.trim() ? { description: site.description.trim() } : {}),
		},
		home: record.home.trim().replaceAll("\\", "/"),
		...(api ? { api } : {}),
	};
}

/** Loads and validates the repository's .agents/docs.df configuration. */
export function loadDocsConfig(repoRoot: string): DocsConfig {
	return parseDocsConfig(readFileSync(resolveDocsConfigPath(repoRoot), "utf8"));
}
