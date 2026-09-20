/**
 * Shared internal utilities for credential importers and parser helpers.
 * @packageDocumentation
 */

/** Validates whether an unknown value is a record (object, not array, not null). */
export function record(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Extracts a non-empty string field from a document. */
export function stringField(document: Record<string, unknown>, field: string): string | null {
	const value = document[field];
	return typeof value === "string" && value.length > 0 ? value : null;
}

/** Safely reads a string from a claims record or nested dictionary. */
export function claimString(claims: Record<string, unknown> | null, key: string): string | null {
	const value = claims?.[key];
	return typeof value === "string" && value ? value : null;
}

/** Decodes and parses non-secret JWT claims. */
export function jwtClaims(token: string): Record<string, unknown> | null {
	const parts = token.split(".");
	if (parts.length < 2 || !parts[1]) return null;
	try {
		const parsed = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as unknown;
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

/** Safely parses JSON string and ensures it is an object. */
export function parseJson(raw: string | null, source = "credential source"): Record<string, unknown> | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
		return parsed as Record<string, unknown>;
	} catch {
		throw new Error(`Invalid JSON in ${source}`);
	}
}

/** Converts milliseconds to epoch-millisecond timestamp. */
export function epochMsFromMilliseconds(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Converts seconds to epoch-millisecond timestamp. */
export function epochMsFromSeconds(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value * 1_000 : undefined;
}

/** Parses ISO text or string timestamp to epoch-millisecond timestamp. */
export function epochMsFromText(value: unknown): number | undefined {
	if (typeof value !== "string" || !value) return undefined;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

/** Normalizes and creates a slug identifier from string parts. */
export function slugify(...parts: (string | null | undefined)[]): string {
	const joined = parts
		.filter((part): part is string => Boolean(part && part.trim()))
		.join("-")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	const slug = joined.replace(/^[^a-z]+/, "");
	return slug || "secret";
}
