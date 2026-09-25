import type {
	CapabilityDefinition,
	CapabilityGraphHandler,
} from "./abi.ts";

/** One executable graph-node registration resolved from a capability definition. */
export interface CapabilityGraphRegistration {
	capabilityId: string;
	contributionId: string;
	nodeKind: string;
	handler: CapabilityGraphHandler;
}

/** Resolves capability-owned graph-node handlers by node kind. */
export interface CapabilityGraphRegistry {
	/** Resolves the single registered handler for a node kind, if one exists. */
	resolve(nodeKind: string): CapabilityGraphHandler | undefined;
	/** Returns registrations in deterministic node-kind order. */
	registrations(): readonly CapabilityGraphRegistration[];
}

/** Composes capability graph contributions while enforcing one owner per node kind. */
export function createCapabilityGraphRegistry(
	definitions: readonly CapabilityDefinition[],
): CapabilityGraphRegistry {
	const byNodeKind = new Map<string, CapabilityGraphRegistration>();
	for (const definition of definitions) {
		for (const contribution of definition.graph ?? []) {
			if (!contribution.handler) {
				throw new Error(`Capability ${definition.id} graph contribution ${contribution.id} must declare a handler`);
			}
			for (const nodeKind of contribution.nodeKinds) {
				const previous = byNodeKind.get(nodeKind);
				if (previous) {
					throw new Error(
						`Ambiguous graph node kind ${nodeKind}: ${previous.capabilityId}/${previous.contributionId} and ${definition.id}/${contribution.id}`,
					);
				}
				byNodeKind.set(nodeKind, {
					capabilityId: definition.id,
					contributionId: contribution.id,
					nodeKind,
					handler: contribution.handler,
				});
			}
		}
	}
	const registrations = [...byNodeKind.values()].sort((a, b) => a.nodeKind.localeCompare(b.nodeKind));
	return {
		resolve: (nodeKind) => byNodeKind.get(nodeKind)?.handler,
		registrations: () => registrations,
	};
}
