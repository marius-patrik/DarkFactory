/** Versioned Request snapshot captured for Planning. */
export interface PlanningRequestSnapshot {
	issue: number;
	body: string;
	version: string;
	acceptanceCriteria: readonly string[];
	parent?: number;
}

/** Dependency state captured into Planning context. */
export interface PlanningDependencySnapshot {
	id: string;
	state: string;
	version?: string;
}

/** Repository base revision used to validate Planning freshness. */
export interface PlanningBaseSnapshot {
	sha: string;
	defaultBranch: string;
}

/** Durable authoritative context supplied to planner/reviewer/fixer stages. */
export interface PlanningContextPacket {
	request: PlanningRequestSnapshot;
	relationships: Readonly<Record<string, unknown>>;
	dependencies: readonly PlanningDependencySnapshot[];
	approvedDecisions: readonly string[];
	base: PlanningBaseSnapshot;
	shippedInterfaces: readonly string[];
	recovery: readonly string[];
}

/** Reviewed unified Planning artifact governing implementation. */
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

export { planningResultSchema, alignmentResultSchema } from "./result-capture.ts";
