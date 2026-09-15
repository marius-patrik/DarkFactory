/**
 * Represents an application identity used for GitHub interactions.
 *
 * @property slug - Optional identifier used for naming resources; defaults to "darkfactory-pipeline" if omitted.
 * @property login - GitHub login name of the application.
 * @property user_id - GitHub numeric user ID; must be a positive integer.
 * @property commit_author_email - Optional email used for commit authorship; generated if omitted.
 * @property name - Optional display name for the application.
 */
export interface AppIdentity {
	slug: string;
	login: string;
	user_id: number;
	commit_author_email?: string;
	name?: string;
}

/**
 * Represents a provider identity used in the manifest.
 *
 * @property name - Primary display name of the provider (used when `display_name` is absent).
 * @property display_name - Optional alternate display name.
 * @property trailer - Optional short string appended to generated footers; null if none.
 * @property note - Optional note string included in generated footers.
 * @property account_link - Optional URL linking to the provider account; null if none.
 * @property verified - Indicates whether the provider identity has been verified.
 */
export interface ProviderIdentity {
	name: string;
	display_name?: string;
	trailer: string | null;
	note?: string;
	account_link: string | null;
	verified: boolean;
}

/**
 * Collection of resolved identities extracted from a manifest.
 * Contains exactly one application identity and zero or more provider identities.
 * @property {AppIdentity} app - The resolved application identity.
 * @property {Record<string, ProviderIdentity>} providers - Mapping of provider keys to their resolved identities.
 */
export interface ManifestIdentities {
	app: AppIdentity;
	providers: Record<string, ProviderIdentity>;
}

/**
 * Result of attribution processing, containing generated trailer strings and a footer.
 * @property {string[]} trailers - Array of generated trailer strings for each provider.
 * @property {string} footer - Complete attribution footer string combining all trailers.
 */
export interface AttributionResult {
	trailers: string[];
	footer: string;
}

/**
 * Reference to a candidate model provider used for attribution.
 *
 * @property provider - Name of the provider (e.g., "anthropic").
 * @property model - Model identifier (e.g., "claude-3-sonnet").
 * @property account - Optional account identifier associated with the provider.
 */
export interface CandidateRef {
	provider: string;
	model: string;
	account?: string;
}
