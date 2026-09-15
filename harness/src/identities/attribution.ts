import type { AttributionResult, ManifestIdentities } from "./types.ts";

/**
 * Builds the commit author line for bot commits from the app identity.
 * @param identities - The manifest identities containing the app entry.
 * @returns A `Name <email>` string suitable for git commit author.
 * @throws When no app identity is configured.
 */
export function botCommitAuthor(identities: ManifestIdentities): string {
	const app = identities.app;
	if (!app) {
		throw new Error("Missing app identity in identities");
	}
	const email = app.commit_author_email || `${app.user_id}+${app.login}@users.noreply.github.com`;
	return `${app.login} <${email}>`;
}

/**
 * Renders attribution trailers and a footer for a set of used model candidates.
 * @param usedCandidates - The provider/model pairs actually used in this run.
 * @param identities - The manifest identities used to resolve trailers and notes.
 * @returns Attribution trailers and a footer string; empty when no candidates are given.
 * @throws When a candidate references a provider with no identity configured.
 */
export function renderAttribution(
	usedCandidates: readonly { provider: string; model: string }[],
	identities: ManifestIdentities,
): AttributionResult {
	if (!usedCandidates || usedCandidates.length === 0) {
		return { trailers: [], footer: "" };
	}

	const trailers: string[] = [];
	const seenTrailers = new Set<string>();

	for (const candidate of usedCandidates) {
		const identity = identities.providers[candidate.provider];
		if (!identity) {
			throw new Error(`No identity configured for provider: ${candidate.provider}`);
		}
		if (identity.verified && identity.trailer) {
			const trailer = identity.trailer.trim();
			if (!seenTrailers.has(trailer)) {
				seenTrailers.add(trailer);
				trailers.push(trailer);
			}
		}
	}

	const models: string[] = [];
	const seenModels = new Set<string>();
	for (const candidate of usedCandidates) {
		if (!seenModels.has(candidate.model)) {
			seenModels.add(candidate.model);
			models.push(candidate.model);
		}
	}

	const firstCandidate = usedCandidates[0]!;
	const firstIdentity = identities.providers[firstCandidate.provider];
	const noteTemplate = firstIdentity?.note ?? "Generated with {model}";

	const modelsStr = models.join(", ");
	const footer = noteTemplate.includes("{model}")
		? noteTemplate.replace("{model}", modelsStr)
		: `Generated with ${modelsStr}`;

	return { trailers, footer };
}
