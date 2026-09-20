import type { TaskKind } from "@darkfactory/protocol/model";

/** Current capability ABI compatibility version. */
export const CAPABILITY_ABI_VERSION = "1" as const;
/** Literal type of the supported capability ABI version. */
export type CapabilityAbiVersion = typeof CAPABILITY_ABI_VERSION;

/** JSON Schema object used to describe capability tool inputs. */
export type JsonSchema = Readonly<Record<string, unknown>>;

/** Declares a scoped credential requirement for a capability. */
export interface CapabilityCredentialRequirement {
	id: string;
	purpose: string;
	provider?: string;
	slots?: readonly string[];
	optional?: boolean;
}

/** Credential values resolved for one declared requirement. */
export interface CapabilityCredentialHandle {
	requirementId: string;
	account?: string;
	values: Readonly<Record<string, string>>;
}

/** Runtime interface that resolves scoped credential handles. */
export interface CapabilityCredentialBroker {
	get(requirementId: string): Promise<CapabilityCredentialHandle | undefined>;
}

/** Structured audit event emitted by a capability. */
export interface CapabilityAuditEvent {
	capability: string;
	action: string;
	details?: Readonly<Record<string, unknown>>;
}

/** Runtime services and repository context supplied to capability code. */
export interface CapabilityRuntimeContext {
	repositoryRoot: string;
	domains: readonly string[];
	credentials: CapabilityCredentialBroker;
	audit?(event: CapabilityAuditEvent): void | Promise<void>;
}

/** Defines a callable capability tool. */
export interface CapabilityToolDefinition {
	name: string;
	description: string;
	inputSchema: JsonSchema;
	taskKinds?: readonly TaskKind[];
	credentialRequirements?: readonly string[];
	execute(input: unknown, context: CapabilityRuntimeContext): Promise<unknown> | unknown;
}

/** Defines a capability-contributed df command. */
export interface CapabilityCommandDefinition {
	name: string;
	description: string;
	taskKind?: TaskKind;
	credentialRequirements?: readonly string[];
	execute(args: readonly string[], context: CapabilityRuntimeContext): Promise<unknown> | unknown;
}

/** Defines evidence used to activate a capability. */
export interface CapabilityDetectorDefinition {
	id: string;
	description: string;
	domains?: readonly string[];
}

/** Declares graph-node kinds contributed by a capability. */
export interface CapabilityGraphContribution {
	id: string;
	nodeKinds: readonly string[];
}

/** Declares a deterministic verification action. */
export interface CapabilityVerificationDefinition {
	id: string;
	description: string;
}

/** Declares a hook contributed by a capability. */
export interface CapabilityHookDefinition {
	id: string;
	event: string;
}

/** Action definition for quality-resolved capability actions. */
export interface CapabilityActionDefinition {
	/** Shell command to execute for this action, or a function resolving it. */
	command: string | ((packagePath: string) => string);
	/** Human-readable description of what this action does. */
	description?: string;
}

/** Predefined capability actions for quality/repository operations. */
export interface CapabilityActions {
	/** Action to run tests for a package. */
	test?: CapabilityActionDefinition;
	/** Action to run linter for a package. */
	lint?: CapabilityActionDefinition;
	/** Action to run formatting check for a package. */
	format_check?: CapabilityActionDefinition;
	/** Action to run documentation verification for a package. */
	docs_check?: CapabilityActionDefinition;
	/** Action to run API extraction / documentation building. */
	docs_extract?: CapabilityActionDefinition;
	/** Action to run workspace / package setup. */
	setup?: CapabilityActionDefinition;
	/** Action to release / publish a package. */
	release?: CapabilityActionDefinition;
}

/** Metadata for documentation, web, release, and audit surfaces. */
export interface CapabilitySurfaceMetadata {
	docs?: readonly string[];
	web?: readonly string[];
	release?: readonly string[];
	audit?: readonly string[];
}

/** Canonical versioned definition of one DarkFactory capability. */
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
	/** Contributed quality actions for packages in the supported domains. */
	actions?: CapabilityActions;
}

/** Supported module export shape for a capability package. */
export interface CapabilityModule {
	default?: CapabilityDefinition;
	capability?: CapabilityDefinition;
}

function identifier(value: string, label: string): string {
	const trimmed = value.trim();
	if (!/^[a-z][a-z0-9-]*$/u.test(trimmed)) throw new Error(`${label} must be a lowercase kebab-case identifier`);
	return trimmed;
}

/** Validates and returns a canonical capability definition. */
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
