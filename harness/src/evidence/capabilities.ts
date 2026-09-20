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
		docs_check: (path) => "bun scripts/build-docs.ts --check",
		docs_extract: (path) => "bun scripts/build-docs.ts",
		setup: (path) => "bun install",
	},
	python: {
		test: (path) => "pytest",
		lint: (path) => "flake8 .",
		format_check: (path) => "black --check .",
		docs_check: (path) => "sphinx-build -M html docs/source docs/build",
		docs_extract: (path) => "sphinx-build -M html docs/source docs/build",
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
	} catch {
		// Fallback if capabilities are missing or can't be loaded (e.g. standalone test runs)
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

			// 1. Try retrieving command from capabilities
			for (const cap of capabilities) {
				const capAction = cap.actions?.[actionKey];
				if (capAction) {
					supported = true;
					description = capAction.description ?? `Capability-contributed ${actionKey}`;
					if (typeof capAction.command === "function") {
						command = (capAction.command as (p: string) => string)(pkg.path);
					} else {
						command = capAction.command;
					}
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
