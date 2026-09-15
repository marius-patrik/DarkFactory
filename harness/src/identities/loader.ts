import { readFile } from "node:fs/promises";
import { validateIdentities, IdentitiesValidationError } from "./schema.ts";
import type { ManifestIdentities } from "./types.ts";

/** Reads a manifest file and returns its text content. */
export type ManifestReader = (path: string) => Promise<string>;

/**
 * Loads and validates identities from the manifest file.
 * @param manifestPath - Path to the manifest JSON file; defaults to `.darkfactory/manifest.json`.
 * @param reader - Optional custom reader; defaults to reading the file from disk as UTF-8.
 * @returns The validated manifest identities.
 * @throws When the manifest cannot be read, is invalid JSON, or fails validation.
 */
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
