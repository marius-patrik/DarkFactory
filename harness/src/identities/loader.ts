import { readFile } from "node:fs/promises";
import { validateIdentities, IdentitiesValidationError } from "./schema.ts";
import type { ManifestIdentities } from "./types.ts";

export type ManifestReader = (path: string) => Promise<string>;

export async function loadIdentities(
	manifestPath: string = ".darkfactory/manifest.json",
	reader: ManifestReader = (p) => readFile(p, "utf8"),
): Promise<ManifestIdentities> {
	let raw: string;
	try {
		raw = await reader(manifestPath);
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
