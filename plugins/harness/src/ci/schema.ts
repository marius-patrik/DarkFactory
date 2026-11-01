export interface ResolvedCheck {
	name: string;
	required: boolean;
	workflow?: string;
	job?: string;
}

export type CheckState = "green" | "pending" | "failed";

export interface CheckRunItem {
	name: string;
	status: string;
	conclusion: string | null;
	started_at?: string;
	completed_at?: string;
	html_url?: string;
}

export interface RequiredChecksResult {
	state: CheckState;
	failing: string[];
	pending: string[];
	missing: string[];
	passed: string[];
	details: Record<string, { required: boolean; status?: string; conclusion?: string | null }>;
}
