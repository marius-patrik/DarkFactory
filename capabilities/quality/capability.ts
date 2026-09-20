import {
	defineCapability,
	CAPABILITY_ABI_VERSION,
} from "@darkfactory/capability";
import { capability as detectionCapability } from "../detection/capability.ts";
import { readRepoConfig, checkToolExists, parseShellCommand, createQualityCommand } from "./utils";

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
			execute: async (input, context) => {
				const { action, package: pkgName } = input as { action: string; package: string };

				let detected: { name: string; ecosystem?: string; path?: string }[] = [];
				const detectTool = detectionCapability.tools?.find((tool) => tool.name === "detect_packages");
				if (!detectTool) throw new Error("Detection capability does not provide detect_packages");
				try {
					const detectionResult = await detectTool.execute({}, context);
					if (Array.isArray(detectionResult)) {
						detected = detectionResult;
					} else if (
						detectionResult &&
						typeof detectionResult === "object" &&
						Array.isArray((detectionResult as { detected?: unknown }).detected)
					) {
						detected = (detectionResult as { detected: { name: string; ecosystem?: string; path?: string }[] }).detected;
					}
				} catch (error) {
					throw new Error(`Package detection failed while resolving quality action: ${String(error)}`);
				}

				if (detected.length === 0) {
					// Fallback package if detection is unavailable or returned nothing
					detected = [{ name: pkgName, ecosystem: "javascript", path: "." }];
				}

				const pkg = detected.find((p) => p.name === pkgName || p.path === pkgName || (pkgName === "root" && (p.path === "." || p.path === ""))) || (detected.length === 1 ? detected[0] : undefined);
				if (!pkg) {
					throw new Error(`Package ${pkgName} not found in detected packages. Available packages: ${detected.map(p => p.name).join(", ")}`);
				}

				const ecosystem = pkg.ecosystem || "javascript";
				const repoConfig = await readRepoConfig(context.repositoryRoot);
				const registry = JSON.parse(JSON.stringify(DEFAULT_REGISTRY));

				// Override with repo.df environment settings if available
				const env = repoConfig.environment || repoConfig.quality || {};
				for (const eco of Object.keys(registry)) {
					const ecoRegistry = registry[eco];
					if (!ecoRegistry) continue;
					const testingCmd = env.testing?.[eco]?.command || env.testing?.command;
					if (testingCmd) ecoRegistry.test = parseShellCommand(testingCmd);
					const lintingCmd = env.linting?.[eco]?.command || env.linting?.command;
					if (lintingCmd) ecoRegistry.lint = parseShellCommand(lintingCmd);
					const formattingCmd = env.formatting?.[eco]?.command || env.formatting?.command;
					if (formattingCmd) ecoRegistry.format_check = parseShellCommand(formattingCmd);
					const docsCmd = env.docs?.[eco]?.command || env.docs?.command;
					if (docsCmd) ecoRegistry.docs_check = parseShellCommand(docsCmd);
				}

				const ecoRegistry = registry[ecosystem] || registry["javascript"];
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

				return {
					tool: actionSpec.tool,
					args: actionSpec.args,
					command,
				};
			},
		},
	],
});

export default capability;
