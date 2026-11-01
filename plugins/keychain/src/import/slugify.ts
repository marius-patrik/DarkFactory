// Turning arbitrary label text — a branch name, a provider name — into one
// path segment that is safe to create and stable enough to be recognised
// again. It never returns an empty segment, so a caller cannot accidentally
// build a path that collapses.
//
// Ported verbatim from dsh-stack `src/packages/credential-vault/src/vault/cli/`
// (scan-finding.ts). Rules are copied unchanged so an importer here behaves
// like the detector it replaces.

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
