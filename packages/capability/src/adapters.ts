import type {
	CapabilityDefinition,
	CapabilityRuntimeContext,
	CapabilityToolDefinition,
	JsonSchema,
} from "./abi.ts";
import { assertCapabilityCompatible } from "./compatibility.ts";

export interface CapabilityToolManifest {
	name: string;
	description: string;
	inputSchema: JsonSchema;
}

export interface CapabilityAdapterManifest {
	abiVersion: string;
	id: string;
	version: string;
	description: string;
	domains: readonly string[];
	credentials: readonly string[];
	tools: readonly CapabilityToolManifest[];
}

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

export interface NativeCapabilityAdapter {
	manifest: CapabilityAdapterManifest;
	invokeTool(name: string, input: unknown): Promise<unknown>;
}

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

export interface PiToolRegistration {
	name: string;
	description: string;
	parameters: JsonSchema;
	execute(input: unknown): Promise<unknown>;
}

export interface PiExtensionApi {
	registerTool(tool: PiToolRegistration): void;
}

export interface PiCapabilityAdapter {
	manifest: CapabilityAdapterManifest;
	install(api: PiExtensionApi): void;
}

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

export interface McpToolDescriptor {
	name: string;
	description: string;
	inputSchema: JsonSchema;
}

export interface McpCapabilityAdapter {
	manifest: CapabilityAdapterManifest;
	listTools(): readonly McpToolDescriptor[];
	callTool(name: string, input: unknown): Promise<unknown>;
}

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
