// Reading the non-secret half of a JWT. An importer never verifies a token —
// the OAuth flow that owns the signature does — it only needs the payload
// segment to recover which plan, account and expiry the token asserts.
//
// Ported verbatim from dsh-stack `src/packages/credential-vault/src/vault/cli/`
// (scan-finding.ts). Rules are copied unchanged so an importer here behaves
// like the detector it replaces.

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

/** `claimString` port (scan-finding.ts:141-144). */
export function claimString(claims: Record<string, unknown> | null, key: string): string | null {
	const value = claims?.[key];
	return typeof value === "string" && value ? value : null;
}
