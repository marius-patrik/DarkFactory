import { readdir } from "node:fs/promises";
import {
	defineCapability,
	CAPABILITY_ABI_VERSION,
	readRepoConfig,
	checkToolExists,
	parseShellCommand,
	createQualityCommand,
	detectRepositoryPackages,
	CapabilityRuntimeContext,
} from "@darkfactory/capability";

const DEFAULT_REGISTRY: Record<string, Record<string, { tool: string; args: string[] }>> = {
	javascript: {
		test: { tool: "npm", args: ["test"] },
		lint: { tool: "npm", args: ["run", "lint"] },
		format_check: { tool: "npm", args: ["run", "format:check"] },
		docs_check: { tool: "npm", args: ["run", "docs:check"] },
	},
	typescript: {
		test: { tool: "npm", args: ["test"] },
		lint: { tool: "npm", args: ["run", "lint"] },
		format_check: { tool: "npm", args: ["run", "format:check"] },
		docs_check: { tool: "npm", args: ["run", "docs:check"] },
	},
	python: {
		test: { tool: "pytest", args: [] },
		lint: { tool: "flake8", args: [] },
		format_check: { tool: "black", args: ["--check", "."] },
		docs_check: { tool: "sphinx-build", args: ["-b", "html", "docs/", "docs/_build/"] },
	},
	go: {
		test: { tool: "go", args: ["test", "./..."] },
		lint: { tool: "golangci-lint", args: ["run"] },
		format_check: { tool: "gofmt", args: ["-l", "."] },
		docs_check: { tool: "go", args: ["doc"] },
	},
	rust: {
		test: { tool: "cargo", args: ["test"] },
		lint: { tool: "cargo", args: ["clippy"] },
		format_check: { tool: "cargo", args: ["fmt", "--", "--check"] },
		docs_check: { tool: "cargo", args: ["doc", "--no-deps"] },
	},
	java: {
		test: { tool: "mvn", args: ["test"] },
		lint: { tool: "mvn", args: ["checkstyle:check"] },
		format_check: { tool: "mvn", args: ["spotless:check"] },
		docs_check: { tool: "mvn", args: ["javadoc:javadoc"] },
	},
};

/**
 * Repository quality assurance capability.
 * Manages test, lint, format, and documentation checks.
 */
export const capability = defineCapability({
	abiVersion: CAPABILITY_ABI_VERSION,
	id: "quality",
	version: "0.1.0",
	description: "Capability for enforcing quality actions like testing, linting, and docs checks.",
	domains: ["code"],
	tools: [
		{
			name: "run_quality_checks",
			description: "Resolves the command and arguments for quality checks. The return value MUST be executed using array-based spawning (e.g., child_process.spawn) and NOT a shell string to prevent injection.",
			inputSchema: {
				type: "object",
				properties: {
					action: {
						type: "string",
						enum: ["test", "lint", "format_check", "docs_check"],
					},
					package: {
						type: "string",
					},
				},
				required: ["action", "package"],
			},
			execute: async (input, context: CapabilityRuntimeContext) => {
				const { action, package: pkgName } = input as { action: string; package: string };

				let detected: { name: string; ecosystem?: string; path?: string }[] = [];
				try {
					const { detected: repoPackages } = await detectRepositoryPackages(context.repositoryRoot || process.cwd());
					detected = repoPackages;
				} catch (error) {
					throw new Error(`Package detection failed while resolving quality action: ${String(error)}`);
				}

				if (detected.length === 0) {
					// Fallback package if detection is unavailable or returned nothing
					// Inspect root for manifest files to determine ecosystem
					const rootFiles = await readdir(context.repositoryRoot || process.cwd());
					let detectedEcosystem = "javascript";
					if (rootFiles.includes("pyproject.toml") || rootFiles.includes("setup.py") || rootFiles.includes("requirements.txt")) detectedEcosystem = "python";
					else if (rootFiles.includes("go.mod")) detectedEcosystem = "go";
					else if (rootFiles.includes("Cargo.toml")) detectedEcosystem = "rust";
					else if (rootFiles.includes("pom.xml") || rootFiles.includes("build.gradle")) detectedEcosystem = "java";
					
					detected = [{ name: pkgName, ecosystem: detectedEcosystem, path: "." }];
				}

				const pkg = detected.find((p) => p.name === pkgName || p.path === pkgName || (pkgName === "root" && (p.path === "." || p.path === "")));
				if (!pkg) {
					throw new Error(`Package ${pkgName} not found in detected packages. Available packages: ${detected.map(p => p.name).join(", ")}`);
				}

				const ecosystem = pkg.ecosystem || "javascript";
				const repoConfig = await readRepoConfig(context.repositoryRoot, (event) => context.audit?.(event));
				const registry = structuredClone(DEFAULT_REGISTRY);

				// Override with repo.df environment settings if available
				const env = repoConfig.environment || repoConfig.quality || {};

				const ecoRegistry = registry[ecosystem] || registry["javascript"];

				const testOverride = env.testing;
				if (testOverride) {
					if (typeof testOverride === 'string') {
						ecoRegistry.test = parseShellCommand(testOverride);
					} else if (testOverride[ecosystem]) {
						const val = testOverride[ecosystem].command || testOverride[ecosystem];
						ecoRegistry.test = parseShellCommand(val);
					}
				}

				const lintOverride = env.linting;
				if (lintOverride) {
					if (typeof lintOverride === 'string') {
						ecoRegistry.lint = parseShellCommand(lintOverride);
					} else if (lintOverride[ecosystem]) {
						const val = lintOverride[ecosystem].command || lintOverride[ecosystem];
						ecoRegistry.lint = parseShellCommand(val);
					}
				}
				
				const formatOverride = env.formatting;
				if (formatOverride) {
					if (typeof formatOverride === 'string') {
						ecoRegistry.format_check = parseShellCommand(formatOverride);
					} else if (formatOverride[ecosystem]) {
						const val = formatOverride[ecosystem].command || formatOverride[ecosystem];
						ecoRegistry.format_check = parseShellCommand(val);
					}
				}
				
				const docsOverride = env.docs;
				if (docsOverride) {
					if (typeof docsOverride === 'string') {
						ecoRegistry.docs_check = parseShellCommand(docsOverride);
					} else if (docsOverride[ecosystem]) {
						const val = docsOverride[ecosystem].command || docsOverride[ecosystem];
						ecoRegistry.docs_check = parseShellCommand(val);
					}
				}

				const actionSpec = ecoRegistry?.[action];

				if (!actionSpec) {
					throw new Error(`Quality check action '${action}' is not supported or configured for ecosystem '${ecosystem}' (package: ${pkgName}). Please declare a custom command in repo.df environment.quality or environment.testing/linting/formatting.`);
				}

				const toolExists = await checkToolExists(actionSpec.tool);
				if (!toolExists) {
					throw new Error(
						`Quality check tool '${actionSpec.tool}' is not found in PATH for action '${action}' in ecosystem '${ecosystem}'.`
					);
				}

				const command = createQualityCommand(actionSpec.tool, actionSpec.args);
				const useShell = repoConfig.environment?.useShell ?? false;

				return {
					tool: actionSpec.tool,
					args: actionSpec.args,
					command,
					useShell,
				};
			},
		},
	],
});

export default capability;
