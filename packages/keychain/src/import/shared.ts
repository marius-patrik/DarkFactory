// Helpers ported from dsh-stack `src/packages/credential-vault/src/vault/cli/`
// (scan-finding.ts:111-196, material-from-input.ts:169-172). Rules are copied
// verbatim so an importer here behaves like the detector it replaces.

/** `record` port (scan-finding.ts:192-196). */
export function record(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** `stringField` port (material-from-input.ts:169-172). */
export function stringField(document: Record<string, unknown>, field: string): string | null {
	const value = document[field];
	return typeof value === "string" && value.length > 0 ? value : null;
}

/** `claimString` port (scan-finding.ts:141-144). */
export function claimString(claims: Record<string, unknown> | null, key: string): string | null {
	const value = claims?.[key];
	return typeof value === "string" && value ? value : null;
}

/** `jwtClaims` port (scan-finding.ts:123-134). Non-secret JWT claims only. */
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

/** `parseJson` port (scan-finding.ts:179-189). */
export function parseJson(raw: string | null, source = "credential file"): Record<string, unknown> | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
		return parsed as Record<string, unknown>;
	} catch {
		throw new Error(`Invalid JSON in ${source}`);
	}
}

/** `isoFromMilliseconds` port turned to an epoch-millisecond timestamp. */
export function epochMsFromMilliseconds(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** `isoFromSeconds` port turned to an epoch-millisecond timestamp (scan-finding.ts:151-155). */
export function epochMsFromSeconds(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value * 1_000 : undefined;
}

/** `isoFromText` port turned to an epoch-millisecond timestamp (scan-finding.ts:168-172). */
export function epochMsFromText(value: unknown): number | undefined {
	if (typeof value !== "string" || !value) return undefined;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

/** `slugify` port (scan-finding.ts:111-120). */
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
