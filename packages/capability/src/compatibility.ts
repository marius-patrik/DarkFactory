import { CAPABILITY_ABI_VERSION, type CapabilityDefinition, type CapabilityModule, defineCapability } from "./abi.ts";

/** Error thrown when a capability requires an unsupported ABI version. */
export class CapabilityAbiError extends Error {
	constructor(
		readonly capabilityId: string,
		readonly requestedAbi: string,
	) {
		super(
			`Capability ${capabilityId} requires unsupported ABI ${requestedAbi}; supported ABI is ${CAPABILITY_ABI_VERSION}`,
		);
		this.name = "CapabilityAbiError";
	}
}

/** Reports whether a capability ABI version is supported by this runtime. */
export function supportsCapabilityAbi(version: string): boolean {
	return version === CAPABILITY_ABI_VERSION;
}

/** Validates a capability definition against the supported ABI. */
export function assertCapabilityCompatible(definition: CapabilityDefinition): CapabilityDefinition {
	if (!supportsCapabilityAbi(definition.abiVersion)) throw new CapabilityAbiError(definition.id, definition.abiVersion);
	return definition;
}

/** Extracts and validates a capability definition from a loaded module. */
export function definitionFromModule(module: CapabilityModule): CapabilityDefinition {
	const definition = module.capability ?? module.default;
	if (!definition) throw new Error("Capability module must export capability or default");
	return assertCapabilityCompatible(defineCapability(definition));
}
