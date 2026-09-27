export interface AppIdentity {
	slug: string;
	login: string;
	user_id: number;
	commit_author_email?: string;
	name?: string;
}

export interface ProviderIdentity {
	name: string;
	display_name?: string;
	trailer: string | null;
	note?: string;
	account_link: string | null;
	verified: boolean;
}

export interface ManifestIdentities {
	app: AppIdentity;
	providers: Record<string, ProviderIdentity>;
}

export interface AttributionResult {
	trailers: string[];
	footer: string;
}

export interface CandidateRef {
	provider: string;
	model: string;
	account?: string;
}
