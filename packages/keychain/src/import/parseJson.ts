// Reading a credential file that is a JSON object. A missing file is an absent
// login and returns null; a file that exists and is not a JSON object is a
// corrupt one, and naming the path is the only way the operator can act on it.
//
// Ported verbatim from dsh-stack `src/packages/credential-vault/src/vault/cli/`
// (scan-finding.ts). Rules are copied unchanged so an importer here behaves
// like the detector it replaces.

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
