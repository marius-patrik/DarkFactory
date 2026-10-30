/** GitHub is the durable control plane; this module never accepts or persists GitHub tokens. */
export type OperatorResource =
	| "repository"
	| "requests"
	| "planning"
	| "approvals"
	| "epics"
	| "pulls"
	| "checks"
	| "runs"
	| "graph"
	| "recovery"
	| "projects"
	| "capabilities"
	| "configuration"
	| "releases"
	| "audit"
	| "docs"
	| "quota";

export type ResourceState<T> =
	| { status: "idle" | "loading" }
	| { status: "live"; data: T; fetchedAt: number; limited: boolean }
	| { status: "unauthorized" | "rate-limited" | "blocked" | "failed"; detail: string; retryAt?: string };

export interface RepositoryIdentity {
	owner: string;
	name: string;
	slug: string;
}
export interface OperatorItem {
	id: number | string;
	title: string;
	url: string;
	subtitle?: string;
	state?: string;
	labels?: string[];
	updatedAt?: string;
	body?: string;
	head?: string;
	base?: string;
	sha?: string;
}
export interface OperatorCollection {
	items: OperatorItem[];
	limit: number;
	note?: string;
}
export interface OperatorRepository {
	fullName: string;
	description?: string;
	defaultBranch: string;
	private: boolean;
	url: string;
	openIssues: number;
	updatedAt: string;
	permissions?: { admin: boolean; push: boolean; pull: boolean };
}
export interface OperatorConfig {
	content: string;
	path: string;
	sha: string;
	url: string;
}
export type OperatorResourceData = OperatorCollection | OperatorRepository | OperatorConfig;
export interface OperatorReadSource {
	read(resource: Operator¶»§q«^