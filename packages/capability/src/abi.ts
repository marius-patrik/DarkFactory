import type { TaskKind } from "@darkfactory/protocol/model";

export const CAPABILITY_ABI_VERSION = "1" as const;
export type CapabilityAbiVersion = typeof CAPABILITY_ABI_VERSION;

export type JsonSchema = Readonly<Record<string, unknown>>;

export interface CapabilityCredentialRequirement {
	id: string;
	purpose: string;
	provider?: string;
	slots?: readonly string[];
	optional?: boolean;
}

export interface CapabilityCredentialHandle {
	requirementId: string;
	account?: string;
	values: Readonly<Record<string, string>>;
}

export interface CapabilityCredentialBroker {
	get(requirementId: string): Promise<CapabilityCredentialHandle | undefined>;
}

export interface CapabilityAuditEvent {
	capability: string;
	action: string;
	details?: Readonly<Record<string, unknown>>;
}

export interface CapabilityRuntimeContext {
	repositoryRoot: string;
	domains: readonly string[];
	credentials: CapabilityCredentialBroker;
	audit?(event: CapabilityAuditEvent): void | Promise<void>;
}

export interface CapabilityToolDefinition {
	name: string;
	description: string;
	inputSchema: JsonSchema;
	taskKinds?: readonly TaskKind[];
	credentialRequirements?: readonly string[];
	execute(input: unknown, context: CapabilityRuntimeContext): Promise<unknown> | unknown;
}

export interface CapabilityCommandDefinition {
	name: string;
	description: string;
	taskKind?: TaskKind;
	credentialRequirements?: readonly string[];
	execute(args: readonly string[], context: CapabilityRuntimeContext): Promise<unknown> | unknown;
}

export interface CapabilityDetectorDefinition {
	id: string;
	description: string;
	domains?: readonly string[];
}

export interface CapabilityGraphContribution {
	id: string;
	nodeKinds: readonly string[];
}

export interface CapabilityVerificationDefinition {
	id: string;
	description: string;
}

export interface CapabilityHookDefinition {
	id: string;
	event: string;
}

export interface CapabilitySurfaceMetadata {
	docs?: readonly string[];
	web?: readonly string[];
	release?: readonly string[];
	audit?: readonly string[];
}

export interface CapabilityDefinition {
	abiVersion: string;
	id: string;
	version: string;
	description: string;
	domains?: readonly string[];
	credentials?: readonly CapabilityCredentialRequirement[];
	detectors?: readonly CapabilityDetectorDefinition[];
	tools?: readonly CapabilityToolDefinition[];
	commands?: readonly CapabilityCommandDefinition[];
	graph?: readonly CapabilityGraphContribution[];
	verification?: readonly CapabilityVerificationDefinition[];
	hooks?: readonly CapabilityHookDefinition[];
	surfaces?: CapabilitySurfaceMetadata;
}

export interface CapabilityModule {
	default?: CapabilityDefinition;
	capability?: CapabilityDefinition;
}

function identifier(value: string, label: string): string {
	const trimmed = value.trim();
	if (!/^[a-z][a-z0-9-]*$/u.test(trimmed)) throw new Error(`${label} must be a lowercase kebab-case identifier`);
	return trimmed;
}

export function defineCapability<const T extends CapabilityDefinition>(definition: T): T {
	identifier(definition.id, "capability id");
	if (!definition.description.trim()) throw new Error("capability description must not be empty");
	if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(definition.version))
		throw new Error(`capability ${definition.id} version must be SemVer`);
	const toolNames = new Set<string>();
	for (const tool of definition.tools ?? []) {
		if (toolNames.has(tool.name)) throw new Error(`capability ${definition.id} contains duplicate tool ${tool.name}`);
		toolNames.add(tool.name);
	}
	const requirementIds = new Set((definition.credentials ?? []).map((requirement) => requirement.id));
	for (const tool of definition.tools ?? [])
		for (const requirement of tool.credentialRequirements ?? [])
			if (!requirementIds.has(requirement))
				throw new Error(`tool ${tool.name} references undeclared credential requirement ${requirement}`);
	for (const command of definition.commands ?? [])
		for (const requirement of command.credentialRequirements ?? [])
			if (!requirementIds.has(requirement))
				throw new Error(`command ${command.name} references undeclared credential requirement ${requirement}`);
	return definition;
}
