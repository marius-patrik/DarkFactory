import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
	CAPABILITY_ABI_VERSION,
	CapabilityAbiError,
	type CapabilityDefinition,
	type CapabilityRuntimeContext,
	createMcpAdapter,
	createNativeAdapter,
	createPiAdapter,
	defineCapability,
	type PiToolRegistration,
	supportsCapabilityAbi,
} from "../src/index.ts";
import { discoverCapabilities, resolveCapabilities } from "../src/loader.ts";

const temporary: string[] = [];
afterEach(async () => {
	await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const context: CapabilityRuntimeContext = {
	repositoryRoot: "/repo",
	domains: ["code", "paper"],
	credentials: {
		get: async (requirementId) => ({
			requirementId,
			account: "test",
			values: { token: "injected-by-keychain" },
		}),
	},
};

function fixture() {
	return defineCapability({
		abiVersion: CAPABILITY_ABI_VERSION,
		id: "fixture",
		version: "1.2.3",
		description: "Capability adapter fixture.",
		domains: ["code"],
		credentials: [{ id: "github", purpose: "test injected credentials", provider: "github", slots: ["token"] }],
		tools: [
			{
				name: "fixture.echo",
				description: "Returns its input with an injected credential marker.",
				inputSchema: { type: "object", properties: { value: { type: "string" } } },
				credentialRequirements: ["github"],
				async execute(input, runtime) {
					const credential = await runtime.credentials.get("github");
					return { input, account: credential?.account };
				},
			},
		],
	});
}

describe("capability ABI", () => {
	test("ABI compatibility is independent from capability SemVer", () => {
		expect(supportsCapabilityAbi(CAPABILITY_ABI_VERSION)).toBe(true);
		expect(supportsCapabilityAbi("2")).toBe(false);
		const definition = fixture();
		expect(definition.version).toBe("1.2.3");
		expect(() => createNativeAdapter({ ...definition, abiVersion: "2" }, context)).toThrow(CapabilityAbiError);
	});

	test("one canonical tool definition drives native, Pi and MCP adapters", async () => {
		const definition = fixture();
		const native = createNativeAdapter(definition, context);
		expect(await native.invokeTool("fixture.echo", { value: "native" })).toEqual({
			input: { value: "native" },
			account: "test",
		});

		const registered: PiToolRegistration[] = [];
		const pi = createPiAdapter(definition, context);
		pi.install({ registerTool: (tool) => registered.push(tool) });
		expect(registered.map((tool) => tool.name)).toEqual(["fixture.echo"]);
		expect(await registered[0]?.execute({ value: "pi" })).toEqual({
			input: { value: "pi" },
			account: "test",
		});

		const mcp = createMcpAdapter(definition, context);
		expect(mcp.listTools().map((tool) => tool.name)).toEqual(["fixture.echo"]);
		expect(await mcp.callTool("fixture.echo", { value: "mcp" })).toEqual({
			input: { value: "mcp" },
			account: "test",
		});
		expect(pi.manifest).toEqual(native.manifest);
		expect(mcp.manifest).toEqual(native.manifest);
	});

	test("domain resolution is deterministic without depending on the repository capability inventory", () => {
		const definitions: CapabilityDefinition[] = [
			{ abiVersion: "1", id: "code-only", version: "1.0.0", description: "code", domains: ["code"] },
			{ abiVersion: "1", id: "paper-only", version: "1.0.0", description: "paper", domains: ["paper"] },
			{ abiVersion: "1", id: "global", version: "1.0.0", description: "global" },
		];
		expect(resolveCapabilities(definitions, ["paper", "code"]).capabilities.map((item) => item.id)).toEqual([
			"code-only",
			"global",
			"paper-only",
		]);
		expect(resolveCapabilities(definitions, ["math"]).capabilities.map((item) => item.id)).toEqual(["global"]);
	});

	test("a project capability loads from disk without modifying a registry", async () => {
		const root = await mkdtemp(resolve(tmpdir(), "df-capability-"));
		temporary.push(root);
		const project = resolve(root, "project-specific");
		await mkdir(project);
		await writeFile(
			resolve(project, "capability.mjs"),
			`export default {
				abiVersion: "1",
				id: "project-specific",
				version: "0.1.0",
				description: "Project-local capability.",
				domains: ["code"]
			};\n`,
			"utf8",
		);
		const definitions = await discoverCapabilities(root);
		expect(definitions.map((item) => item.id)).toEqual(["project-specific"]);
	});
});
