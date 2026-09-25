import { readFileSync } from "node:fs";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "@darkfactory/protocol/config-document";

/** Site metadata carried by the documentation content graph. */
export interface DocsSiteConfig {
	name: string;
	description?: string;
}

/** TypeScript API extraction settings owned by the combined configuration's docs block. */
export interface DocsTypeScriptApiConfig {
	entryPoints?: string[];
	tsconfig: string;
	name?: string;
}

/** API extraction configuration owned by the combined configuration's docs block. */
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

/** Resolves the combined configuration document that may contain the docs block. */
export function resolveDocsConfigPath(repoRoot: string): string {
	const candidate = resolveConfigDocumentPath(repoRoot);
	if (!candidate) throw new Error("No combined DarkFactory configuration found for documentation.");
	return candidate;
}

function parseTypeScriptApiConfig(value: unknown): DocsTypeScriptApiConfig | undefined {
	if (value === undefined) return undefined;
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new Error("docs block api.typescript must be an object.");
	const record = value as Record<string, unknown>;
	if (
		record.entryPoints !== undefined &&
		(!Array.isArray(record.entryPoints) ||
			record.entryPoints.some((entry) => typeof entry !== "string" || !entry.trim()))
	) {
		throw new Error("docs block api.typescript.entryPoints must be a string array when supplied.");
	}
	if (typeof record.tsconfig !== "string" || !record.tsconfig.trim())
		throw new Error("docs block api.typescript.tsconfig must be a non-empty string.");
	if (record.name !== undefined && (typeof record.name !== "string" || !record.name.trim()))
		throw new Error("docs block api.typescript.name must be a non-empty string.");
	return {
		...(Array.isArray(record.entryPoints) && record.entryPoints.length > 0
			? { entryPoints: record.entryPoints.map((entry) => String(entry).trim().replaceAll("\\", "/")) }
			: {}),
		tsconfig: record.tsconfig.trim().replaceAll("\\", "/"),
		...(typeof record.name === "string" ? { name: record.name.trim() } : {}),
	};
}

/** Parses and validates the JSON-encoded docs block contract. */
export function parseDocsConfig(source: string): DocsConfig {
	let value: unknown;
	try {
		value = JSON.parse(source);
	} catch (error) {
		throw new Error(`docs block is not valid JSON: ${String(error)}`);
	}
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new Error("docs block must contain an object.");
	const record = value as Record<string, unknown>;
	if (record.version !== 1) throw new Error("docs block version must be 1.");
	if (!record.site || typeof record.site !== "object" || Array.isArray(record.site))
		throw new Error("docs block site must be an object.");
	const site = record.site as Record<string, unknown>;
	if (typeof site.name !== "string" || !site.name.trim())
		throw new Error("docs block site.name must be a non-empty string.");
	if (site.description !== undefined && typeof site.description !== "string")
		throw new Error("docs block site.description must be a string.");
	if (typeof record.home !== "string" || !record.home.trim())
		throw new Error("docs block home must be a non-empty repository-relative path.");
	let api: DocsApiConfig | undefined;
	if (record.api !== undefined) {
		if (!record.api || typeof record.api !== "object" || Array.isArray(record.api))
			throw new Error("docs block api must be an object.");
		const typescript = parseTypeScriptApiConfig((record.api as Record<string, unknown>).typescript);
		api = typescript ? { typescript } : {};
	}
	return {
		version: 1,
		site: {
			name: site.name.trim(),
			...(typeof site.description === "string" && site.description.trim()
				? { description: site.description.trim() }
				: {}),
		},
		home: record.home.trim().replaceAll("\\", "/"),
		...(api ? { api } : {}),
	};
}

/** Loads and validates the docs block from the combined DarkFactory configuration. */
export function loadDocsConfig(repoRoot: string): DocsConfig {
	const path = resolveDocsConfigPath(repoRoot);
	const document = parseConfigDocument(readFileSync(path, "utf8"), path);
	const docs = configBlock(document, "docs", path);
	if (!docs) throw new Error(`No docs block found in DarkFactory configuration at ${path}.`);
	return parseDocsConfig(JSON.stringify(docs));
}
