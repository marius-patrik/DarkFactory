import type { AttributionResult, ManifestIdentities } from "./types.ts";

export function botCommitAuthor(identities: ManifestIdentities): string {
	const app = identities.app;
	if (!app) {
		throw new Error("Missing app identity in identities");
	}
	const email = app.commit_author_email || `${app.user_id}+${app.login}@users.noreply.github.com`;
	return `${app.login} <${email}>`;
}

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
