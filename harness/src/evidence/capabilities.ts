/** @packageDocumentation
 * Capability-resolved Action Resolution for DarkFactory Packages.
 * Combines repository evidence and loaded capabilities to build a deterministic action map.
 */

import { join, resolve } from "node:path";
import { type CapabilityDefinition, discoverCapabilities, resolveCapabilities } from "@darkfactory/capability";
import { detectRepositoryEvidence, type DiscoveredPackage, type RepositoryEvidence } from "./detector.ts";

/** Resolved action execution command. */
export interface ResolvedAction {
	/** Shell command to execute. */
	command: string;
	/** Human-readable description. */
	description: string;
	/** Whether this action is supported by the capability system. */
	supported: boolean;
}

/** Predefined and resolved actions for a single package. */
export interface PackageActionSet {
	test: ResolvedAction;
	lint: ResolvedAction;
	format_check: ResolvedAction;
	docs_check: ResolvedAction;
	docs_extract: ResolvedAction;
	setup: ResolvedAction;
	release: ResolvedAction;
}

/** Complete normalized repository action resolution. */
export interface ResolvedRepositoryActions {
	/** Repository evidence results. */
	evidence: RepositoryEvidence;
	/** Resolved capabilities. */
	capabilities: CapabilityDefinition[];
	/** Actions grouped by package name. */
	packages: Record<string, PackageActionSet>;
}

/** Default action generators for different ecosystems when capability doesn't define them or override them. */
const DEFAULT_ECOSYSTEM_ACTIONS: Record<string, Partial<Record<keyof PackageActionSet, (path: string) => string>>> = {
	bun: {
		test: (path) => path === "." ? "bun test" : `bun test --cwd ${path}`,
		lint: (path) => path === "." ? "bun run lint" : `bun run --cwd ${path} lint`,
		format_check: (path) => path === "." ? "bun run format" : `bun run --cwd ${path} format`,
		docs_check: (path) => path === "." ? "bun run docs-check" : `bun run --cwd ${path} docs-check`,
		docs_extract: (path) => path === "." ? "bun run docs-extract" : `bun run --cwd ${path} docs-extract`,
		setup: (path) => path === "." ? "bun install" : `bun install --cwd ${path}`,
	},
	python: {
		test: (path) => path === "." ? "pytest" : `pytest ${path}`,
		lint: (path) => path === "." ? "flake8 ." : `flake8 ${path}`,
		format_check: (path) => path === "." ? "black --check ." : `black --check ${path}`,
		docs_check: (path) => path === "." ? "sphinx-build -M html docs/source docs/build" : `sphinx-build -M html ${join(path, "docs/source")} ${join(path, "docs/build")}`,
		docs_extract: (path) => path === "." ? "sphinx-build -M html docs/source docs/build" : `sphinx-build -M html ${join(path, "docs/source")} ${join(path, "docs/build")}`,
	},
};

/**
 * Resolves all quality actions for each package using repository evidence
 * and capabilities.
 *
 * @param rootDir The repository root directory.
 * @param capabilitiesDir Optional custom directory to load capabilities from.
 */
export async function resolveRepositoryActions(
	rootDir = process.cwd(),
	capabilitiesDir?: string,
): Promise<ResolvedRepositoryActions> {
	const evidence = await detectRepositoryEvidence(rootDir);
	const resolvedCapDir = capabilitiesDir ? resolve(capabilitiesDir) : join(evidence.root, "capabilities");

	let capabilities: CapabilityDefinition[] = [];
	try {
		const definitions = await discoverCapabilities(resolvedCapDir);
		const resolution = resolveCapabilities(definitions, evidence.domains);
		capabilities = [...resolution.capabilities];
	} catch (error: any) {
		// If the capabilities directory does not exist, it's not an error.
		if (error?.code !== "ENOENT") {
			console.warn(`Failed to load capabilities from ${resolvedCapDir}: ${error.message}`);
			// Rethrow or handle as a fatal error if required by the plan
			throw error;
		}
	}

	const packages: Record<string, PackageActionSet> = {};

	for (const pkg of evidence.packages) {
		const actionSet = {} as PackageActionSet;
		const actionKeys: (keyof PackageActionSet)[] = [
			"test",
			"lint",
			"format_check",
			"docs_check",
			"docs_extract",
			"setup",
			"release",
		];

		for (const actionKey of actionKeys) {
			let command = "";
			let description = "";
			let supported = false;

			// 1. Try retrieving command from capabilities (ordered by capability priority/definition)
			// Sort capabilities to ensure deterministic resolution, e.g., by name
			for (const cap of [...capabilities].sort((a, b) => a.name.localeCompare(b.name))) {
				const capAction = cap.actions?.[actionKey];
				if (capAction) {
					// Check for overlap: warn if multiple capabilities try to override the same action
					// For now, we keep the first one but maybe add a warning if it's already set
					if (supported) {
						console.warn(`Multiple capabilities defining action ${actionKey}. Overriding with ${cap.name}`);
					}
					supported = true;
					description = capAction.description ?? `Capability-contributed ${actionKey}`;
					if (typeof capAction.command === "function") {
						command = (capAction.command as (p: string) => string)(pkg.path);
					} else {
						command = capAction.command;
					}
					// Not breaking allows us to see all, but the loop logic might need change if we want just first
					// With the current structure, we need to decide if we want precedence or merge
					// Precedence by sorting is one way to achieve deterministic results.
					break; 
				}
			}

			// 2. Try repo.df / override configuration
			if (actionKey === "test" && evidence.repoDf.environment?.testing?.[pkg.ecosystem]) {
				const override = evidence.repoDf.environment.testing[pkg.ecosystem];
				command = override.command;
				description = `Declared in repo.df environment.testing`;
				supported = true;
			} else if (actionKey === "format_check" && evidence.repoDf.environment?.formatting?.[pkg.ecosystem]) {
				const override = evidence.repoDf.environment.formatting[pkg.ecosystem];
				command = override.command;
				description = `Declared in repo.df environment.formatting`;
				supported = true;
			}

			// 3. Apply ecosystem defaults if not resolved yet
			if (!command) {
				const defaultGen = DEFAULT_ECOSYSTEM_ACTIONS[pkg.ecosystem]?.[actionKey];
				if (defaultGen) {
					command = defaultGen(pkg.path);
					description = `Default action for ecosystem ${pkg.ecosystem}`;
					supported = true;
				}
			}

			// 4. Default fallback if unsupported
			if (!command) {
				command = "echo 'Unsupported action'";
				description = `Action '${actionKey}' is unsupported or missing command`;
				supported = false;
			}

			actionSet[actionKey] = { command, description, supported };
		}

		packages[pkg.name] = actionSet;
	}

	return {
		evidence,
		capabilities,
		packages,
	};
}
