import { describe, expect, test } from "bun:test";
import { type CapabilityRuntimeContext, defineCapability } from "@darkfactory/capability";
import {
	CommandRegistry,
	type CoreCliCommandDefinition,
	createCommandRegistry,
} from "../../packages/cli/src/registry.ts";

const context: CapabilityRuntimeContext = {
	repositoryRoot: "/repo",
	domains: ["code"],
	credentials: { get: async () => undefined },
};

describe("@darkfactory/cli command registry", () => {
	test("composes core and capability commands into deterministic metadata", async () => {
		const calls: string[] = [];
		const core: CoreCliCommandDefinition = {
			name: "doctor",
			description: "Diagnose repository state.",
			credentialRequirements: [],
			execute: () => calls.push("doctor"),
		};
		const capability = defineCapability({
			abiVersion: "1",
			id: "code",
			version: "1.0.0",
			description: "Code capability.",
			domains: ["code"],
			credentials: [{ id: "token", purpose: "Test token.", optional: true }],
			commands: [
				{
					name: "verify",
					description: "Verify code.",
					credentialRequirements: ["token"],
					execute: (args) => calls.push(`verify:${args.join(",")}`),
				},
			],
		});

		const registry = createCommandRegistry([core], [capability]);
		expect(registry.list()).toEqual([
			{
				name: "doctor",
				description: "Diagnose repository state.",
				credentialRequirements: [],
				source: "core",
			},
			{
				name: "verify",
				description: "Verify code.",
				credentialRequirements: ["token"],
				source: "capability",
				capabilityId: "code",
			},
		]);
		await registry.execute("verify", ["changed"], context);
		expect(calls).toEqual(["verify:changed"]);
	});

	test("rejects duplicate command ownership", () => {
		const registry = new CommandRegistry();
		registry.registerCore({
			name: "status",
			description: "Core status.",
			credentialRequirements: [],
			execute: () => undefined,
		});
		expect(() =>
			registry.registerCore({
				name: "status",
				description: "Duplicate status.",
				credentialRequirements: [],
				execute: () => undefined,
			}),
		).toThrow("Duplicate CLI command status");
	});

	test("fails closed for unknown commands", async () => {
		const registry = new CommandRegistry();
		await expect(registry.execute("missing", [], context)).rejects.toThrow("Unknown DarkFactory command: missing");
	});
});
