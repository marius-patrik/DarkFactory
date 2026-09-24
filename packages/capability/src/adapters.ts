import type {
	CapabilityDefinition,
	CapabilityRuntimeContext,
	CapabilityToolDefinition,
	JsonSchema,
} from "./abi.ts";
import { assertCapabilityCompatible } from "./abi-version.ts";

/** Serializable tool metadata exposed by generated adapters. */
export interface CapabilityToolManifest {
	name: string;
	description: string;
	inputSchema: JsonSchema;
}

/** Serializable metadata shared by all adapter forms. */
export interface CapabilityAdapterManifest {
	abiVersion: string;
	id: string;
	version: string;
	description: string;
	domains: readonly string[];
	credentials: readonly string[];
	tools: readonly CapabilityToolManifest[];
}

/** Builds deterministic adapter metadata from a capability definition. */
export function capabilityAdapterManifest(definition: CapabilityDefinition): CapabilityAdapterManifest {
	assertCapabilityCompatible(definition);
	return {
		abiVersion: definition.abiVersion,
		id: definition.id,
		version: definition.version,
		description: definition.description,
		domains: [...(definition.domains ?? [])].sort(),
		credentials: [...(definition.credentials ?? [])].map((item) => item.id).sort(),
		tools: [...(definition.tools ?? [])]
			.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema }))
			.sort((a, b) => a.name.localeCompare(b.name)),
	};
}

function tool(definition: CapabilityDefinition, name: string): CapabilityToolDefinition {
	const item = definition.tools?.find((candidate) => candidate.name === name);
	if (!item) throw new Error(`Capability ${definition.id} does not provide tool ${name}`);
	return item;
}

/** In-process adapter for invoking capability tools. */
export interface NativeCapabilityAdapter {
	manifest: CapabilityAdapterManifest;
	invokeTool(name: string, input: unknown): Promise<unknown>;
}

/** Creates an in-process capability adapter. */
export function createNativeAdapter(
	definition: CapabilityDefinition,
	context: CapabilityRuntimeContext,
): NativeCapabilityAdapter {
	assertCapabilityCompatible(definition);
	return {
		manifest: capabilityAdapterManifest(definition),
		invokeTool: async (name, input) => tool(definition, name).execute(input, context),
	};
}

/** Tool registration shape consumed by the Pi extension API. */
export interface PiToolRegistration {
	name: string;
	description: string;
	parameters: JsonSchema;
	execute(input: unknown): Promise<unknown>;
}

/** Minimal Pi extension API required by generated capability adapters. */
export interface PiExtensionApi {
	registerTool(tool: PiToolRegistration): void;
}

/** Adapter that installs capability tools into Pi. */
export interface PiCapabilityAdapter {
	manifest: CapabilityAdapterManifest;
	install(api: PiExtensionApi): void;
}

/** Creates a Pi adapter from the canonical capability definition. */
export function createPiAdapter(
	definition: CapabilityDefinition,
	context: CapabilityRuntimeContext,
): PiCapabilityAdapter {
	assertCapabilityCompatible(definition);
	return {
		manifest: capabilityAdapterManifest(definition),
		install(api) {
			for (const item of definition.tools ?? []) {
				api.registerTool({
					name: item.name,
					description: item.description,
					parameters: item.inputSchema,
					execute: async (input) => item.execute(input, context),
				});
			}
		},
	};
}

/** MCP-visible tool metadata. */
export interface McpToolDescriptor {
	name: string;
	description: string;
	inputSchema: JsonSchema;
}

/** MCP adapter surface for listing and invoking capability tools. */
export interface McpCapabilityAdapter {
	manifest: CapabilityAdapterManifest;
	listTools(): readonly McpToolDescriptor[];
	callTool(name: string, input: unknown): Promise<unknown>;
}

/** Creates an MCP adapter from the canonical capability definition. */
export function createMcpAdapter(
	definition: CapabilityDefinition,
	context: CapabilityRuntimeContext,
): McpCapabilityAdapter {
	assertCapabilityCompatible(definition);
	const manifest = capabilityAdapterManifest(definition);
	return {
		manifest,
		listTools: () => manifest.tools,
		callTool: async (name, input) => tool(definition, name).execute(input, context),
	};
}
