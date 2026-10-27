// Coercing whatever a credential file wrote as an expiry into the epoch
// milliseconds a df vault slot stores. The three ports took the same value in
// three shapes — milliseconds, seconds, an ISO string — because the files they
// read disagreed; keeping them apart keeps a caller from having to guess which
// one a field uses.
//
// Ported verbatim from dsh-stack `src/packages/credential-vault/src/vault/cli/`
// (scan-finding.ts). Rules are copied unchanged so an importer here behaves
// like the detector it replaces.

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
