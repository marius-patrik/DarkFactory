import { CAPABILITY_ABI_VERSION, defineCapability } from "@darkfactory/capability";

/** Official code-domain capability definition. */
export const capability = defineCapability({
	abiVersion: CAPABILITY_ABI_VERSION,
	id: "code",
	version: "0.0.0",
	description: "Code repository detection and agentic software-engineering capability boundary.",
	domains: ["code"],
	detectors: [
		{
			id: "code-domain",
			description: "Activates when repository domain detection includes code.",
			domains: ["code"],
		},
	],
	actions: {
		test: {
			command: (path) => path === "." ? "bun test" : `bun test --cwd ${path}`,
			description: "Run unit tests for the package",
		},
		lint: {
			command: (path) => path === "." ? "bun run lint" : `bun run --cwd ${path} lint`,
			description: "Run linter for the package",
		},
		format_check: {
			command: (path) => path === "." ? "bun run format" : `bun run --cwd ${path} format`,
			description: "Verify code formatting",
		},
		docs_check: {
			command: (path) => "bun scripts/build-docs.ts --check",
			description: "Verify documentation build",
		},
		docs_extract: {
			command: (path) => "bun scripts/build-docs.ts",
			description: "Extract API docs",
		},
	},
});

export default capability;
