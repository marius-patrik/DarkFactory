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

/** Hook trigger points owned by the deterministic df invocation layer. */
export type CapabilityHookEvent = "pre-tool" | "post-edit" | "pre-commit" | "pre-push" | "pr-open" | "ci";

/** Deterministic change/effect evidence supplied to capability-owned hook behavior. */
export interface CapabilityHookContext {
	/** Repository/worktree root for this hook invocation. */
	repositoryRoot: string;
	/** Repository-relative changed paths already observed by the deterministic owner. */
	changedFiles: readonly string[];
	/** Source paths classified by the canonical repository/action evidence layer. */
	sourceFiles?: readonly string[];
	/** Test paths classified by the canonical repository/action evidence layer. */
	testFiles?: readonly string[];
	/** Commit message being validated, when applicable. */
	commitMessage?: string;
	/** Branch being validated, when applicable. */
	branch?: string;
	/** Pull-request body being validated, when applicable. */
	prBody?: string;
	/** Tool invocation being validated, when applicable. */
	toolCall?: { name: string; input: Readonly<Record<string, unknown>> };
}

/** Deterministic outcome returned by one capability-owned hook rule. */
export interface CapabilityHookResult {
	status: "pass" | "fix" | "fail";
	message?: string;
}

/** Declares product/rule hook behavior contributed by a capability. */
export interface CapabilityHookDefinition {
	id: string;
	/** Human-readable purpose shown in diagnostics and generated documentation. */
	description?: string;
	/** Legacy single-event declaration retained for ABI-v1 compatibility. */
	event?: CapabilityHookEvent;
	/** Preferred declaration for hooks that apply to multiple deterministic trigger points. */
	events?: readonly CapabilityHookEvent[];
	/** Capability-owned rule behavior. Invocation timing/effect ownership remains in core. */
	execute?(
		input: CapabilityHookContext,
		context: CapabilityRuntimeContext,
	): Promise<CapabilityHookResult> | CapabilityHookResult;
}

/** Repository/package context supplied while resolving contributed deterministic actions. */
export interface CapabilityPackageContext {
	id: string;
	path: string;
	name: string;
	ecosystem: string;
	packageManager: string;
	packageManagerRoot: string;
	manifest: string;
	domains: readonly string[];
	scripts: readonly string[];
	apiEntryPoints: readonly string[];
}

/** Deterministic repository action kinds shared by doctor, CI, verification and docs. */
export type CapabilityActionKind =
	| "test"
	| "lint"
	| "format_check"
	| "docs_check"
	| "docs_extract"
	| "setup"
	| "release";

/** Action contribution supplied by a capability for applicable package evidence. */
export interface CapabilityActionDefinition {
	kind: CapabilityActionKind;
	description: string;
	ecosystems?: readonly string[];
	packageManagers?: readonly string[];
	domains?: readonly string[];
	requiredScripts?: readonly string[];
	command?: string | ((pkg: CapabilityPackageContext) => string | undefined);
	metadata?: Readonly<Record<string, unknown>> | ((pkg: CapabilityPackageContext) => Readonly<Record<string, unknown>> | undefined);
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
	actions?: readonly CapabilityActionDefinition[];
	surfaces?: CapabilitySurfaceMetadata;
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

	const hookIds = new Set<string>();
	for (const hook of definition.hooks ?? []) {
		identifier(hook.id, "hook id");
		if (hookIds.has(hook.id)) throw new Error(`capability ${definition.id} contains duplicate hook ${hook.id}`);
		hookIds.add(hook.id);
		if (hook.event && hook.events) throw new Error(`hook ${hook.id} must declare event or events, not both`);
		const events = hook.events ?? (hook.event ? [hook.event] : []);
		if (events.length === 0) throw new Error(`hook ${hook.id} must declare at least one event`);
		if (new Set(events).size !== events.length) throw new Error(`hook ${hook.id} contains duplicate events`);
	}
	return definition;
}
