import { readFile } from "node:fs/promises";
import {
	configBlock,
	type DarkFactoryConfigDocument,
	parseConfigDocument,
	resolveConfigDocumentPath,
} from "@darkfactory/protocol/config-document";
import { IdentitiesValidationError, validateIdentities } from "./schema.ts";
import type { ManifestIdentities } from "./types.ts";

export type ManifestReader = (path: string) => Promise<string>;

export async function loadIdentities(
	manifestPath?: string,
	reader: ManifestReader = (p) => readFile(p, "utf8"),
): Promise<ManifestIdentities> {
	const path = manifestPath ?? resolveConfigDocumentPath(process.cwd());
	if (!path) throw new IdentitiesValidationError(["No combined DarkFactory configuration found"]);
	let raw: string;
	try {
		raw = await reader(path);
	} catch (error) {
		throw new IdentitiesValidationError([`Could not read manifest at ${path}: ${(error as Error).message}`]);
	}

	let parsed: DarkFactoryConfigDocument;
	try {
		parsed = parseConfigDocument(raw, path);
	} catch (error) {
		throw new IdentitiesValidationError([(error as Error).message]);
	}

	const repo = configBlock(parsed, "repo", path);
	return validateIdentities(repo ?? {});
}
