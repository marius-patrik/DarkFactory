import { readFile } from "node:fs/promises";
import { validateIdentities, IdentitiesValidationError } from "./schema.ts";
import { resolveDfFile } from "../utils/resolver.ts";
import type { ManifestIdentities } from "./types.ts";

export type ManifestReader = (path: string) => Promise<string>;

export async function loadIdentities(
	manifestPath?: string,
	reader: ManifestReader = (p) => readFile(p, "utf8"),
): Promise<ManifestIdentities> {
	const path = manifestPath ?? resolveDfFile(process.cwd(), "repo");
	let raw: string;
	try {
		raw = await reader(path);
	} catch (error) {
		throw new IdentitiesValidationError([
			`Could not read manifest at ${manifestPath}: ${(error as Error).message}`,
		]);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new IdentitiesValidationError([`Invalid JSON in manifest at ${manifestPath}`]);
	}

	return validateIdentities(parsed);
}
