// Narrowing an untrusted credential document. Everything an importer parses
// arrives as `unknown`, so these two are the only sanctioned ways to reach a
// field of it: `record` decides whether a value is an object at all, and
// `stringField` reads a required string out of one.
//
// Ported verbatim from dsh-stack `src/packages/credential-vault/src/vault/cli/`
// (scan-finding.ts, material-from-input.ts). Rules are copied unchanged so an
// importer here behaves like the detector it replaces.

/** `record` port (scan-finding.ts:192-196). */
export function record(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** `stringField` port (material-from-input.ts:169-172). */
export function stringField(document: Record<string, unknown>, field: string): string | null {
	const value = document[field];
	return typeof value === "string" && value.length > 0 ? value : null;
}
