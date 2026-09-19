import { CAPABILITY_ABI_VERSION, type CapabilityDefinition, type CapabilityModule } from "./abi.ts";

export class CapabilityAbiError extends Error {
	constructor(
		readonly capabilityId: string,
		readonly requestedAbi: string,
	) {
		super(`Capability ${capabilityId} requires unsupported ABI ${requestedAbi}; supported ABI is ${CAPABILITY_ABI_VERSION}`);
		this.name = "CapabilityAbiError";
	}
}

export function supportsCapabilityAbi(version: string): boolean {
	return version === CAPABILITY_ABI_VERSION;
}

export function assertCapabilityCompatible(definition: CapabilityDefinition): CapabilityDefinition {
	if (!supportsCapabilityAbi(definition.abiVersion)) throw new CapabilityAbiError(definition.id, definition.abiVersion);
	return definition;
}

export function definitionFromModule(module: CapabilityModule): CapabilityDefinition {
	const definition = module.capability ?? module.default;
	if (!definition) throw new Error("Capability module must export capability or default");
	return assertCapabilityCompatible(definition);
}
