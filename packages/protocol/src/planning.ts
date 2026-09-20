export interface PlanningRequestSnapshot {
	issue: number;
	body: string;
	version: string;
	acceptanceCriteria: readonly string[];
	parent?: number;
}

export interface PlanningDependencySnapshot {
	id: string;
	state: string;
	version?: string;
}

export interface PlanningBaseSnapshot {
	sha: string;
	defaultBranch: string;
}

export interface PlanningContextPacket {
	request: PlanningRequestSnapshot;
	relationships: Readonly<Record<string, unknown>>;
	dependencies: readonly PlanningDependencySnapshot[];
	approvedDecisions: readonly string[];
	base: PlanningBaseSnapshot;
	shippedInterfaces: readonly string[];
	recovery: readonly string[];
}

export interface PlanningArtifact {
	contextFingerprint: string;
	verbatimRequest: string;
	acceptanceCriteria: readonly string[];
	behavioralContract: readonly string[];
	scope: readonly string[];
	exclusions: readonly string[];
	dependencies: readonly string[];
	sequencing: readonly string[];
	verification: readonly string[];
	implementation: {
		knownOwners: readonly string[];
		discoveryRequired: readonly string[];
	};
	hold?: {
		kind: "dependency" | "recovery";
		refs: readonly string[];
		reason: string;
	};
}
