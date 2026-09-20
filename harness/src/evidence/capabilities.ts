/** @packageDocumentation
 * Capability-resolved Action Resolution for DarkFactory Packages.
 * Combines repository evidence and loaded capabilities to build a deterministic action map.
 */

import { stat } from "node:fs/promises";
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
		docs_check: (path) => path === "." ? "bun scripts/build-docs.ts --check" : `bun scripts/build-docs.ts --check --path ${path}`,
		docs_extract: (path) => path === "." ? "bun scripts/build-docs.ts" : `bun scripts/build-docs.ts --path ${path}`,
		setup: (path) => path === "." ? "bun install" : `bun install --cwd ${path}`,
	},
	python: {
		test: (path) => path === "." ? "pytest" : `pytest ${path}`,
		lint: (path) => path === "." ? "flake8 ." : `flake8 ${path}`,
		format_check: (path) => path === "." ? "black --check ." : `black --check ${path}`,
		docs_check: (path) => path === "." ? "sphinx-build -M html docs/source docs/build" : `sphinx-build -M html ${path}/docs/source ${path}/docs/build`,
		docs_extract: (path) => path === "." ? "sphinx-build -M html docs/source docs/build" : `sphinx-build -M html ${path}/docs/source ${path}/docs/build`,
		setup: (path) => path === "." ? "pip install -r requirements.txt" : `pip install -r ${path}/requirements.txt`,
	},
	rust: {
		test: (path) => path === "." ? "cargo test" : `cargo test --manifest-path ${path}/Cargo.toml`,
		lint: (path) => path === "." ? "cargo clippy" : `cargo clippy --manifest-path ${path}/Cargo.toml`,
		format_check: (path) => path === "." ? "cargo fmt -- --check" : `cargo fmt --manifest-path ${path}/Cargo.toml -- --check`,
		docs_check: (path) => path === "." ? "cargo doc" : `cargo doc --manifest-path ${path}/Cargo.toml`,
		docs_extract: (path) => path === "." ? "cargo doc" : `cargo doc --manifest-path ${path}/Cargo.toml`,
		setup: (path) => path === "." ? "cargo fetch" : `cargo fetch --manifest-path ${path}/Cargo.toml`,
	},
	go: {
		test: (path) => path === "." ? "go test ./..." : `go test ${path}/...`,
		lint: (path) => path === "." ? "go vet ./..." : `go vet ${path}/...`,
		format_check: (path) => path === "." ? "gofmt -l ." : `gofmt -l ${path}`,
		docs_check: (path) => path === "." ? "go doc" : `go doc ${path}`,
		docs_extract: (path) => path === "." ? "go doc" : `go doc ${path}`,
		setup: (path) => path === "." ? "go mod download" : `go mod download -C ${path}`,
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
	let dirExists = false;
	try {
		const s = await stat(resolvedCapDir);
		dirExists = s.isDirectory();
	} catch {}

	if (dirExists) {
		try {
			const definitions = await discoverCapabilities(resolvedCapDir);
			const resolution = resolveCapabilities(definitions, evidence.domains);
			capabilities = [...resolution.capabilities];
		} catch (error: any) {
			console.warn(`Failed to load capabilities from ${resolvedCapDir}: ${error?.message || error}`);
		}
	}

	const packages: Record<string, PackageActionSet> = {};

	// Sort capabilities once (ascending by priority, then id) so that sequentially higher priority actions override lower ones.
	const sortedCapabilities = [...capabilities].sort((a, b) => {
		const prioA = (a as any).priority ?? 0;
		const prioB = (b as any).priority ?? 0;
		if (prioB !== prioA) {
			return prioA - prioB;
		}
		return a.id.localeCompare(b.id);
	});

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
			for (const cap of sortedCapabilities) {
				const capAction = cap.actions?.[actionKey];
				if (capAction) {
					// Remove warning: sorting ensures higher priority overrides, so warnings are misleading.
					supported = true;
					description = capAction.description ?? `Capability-contributed ${actionKey}`;
					if (typeof capAction.command === "function") {
						try {
							command = (capAction.command as (p: string) => string)(pkg.path);
						} catch (error: any) {
							console.error(`Failed to resolve command from capability action: ${error.message}`);
							command = "";
							supported = false;
						}
					} else {
						command = capAction.command;
					}
				}
			}

			// 2. Try repo.df / override configuration
			const env = evidence.repoDf.environment;
			const override = 
				(actionKey === "test" && env?.testing?.[pkg.ecosystem]) ||
				(actionKey === "lint" && env?.linting?.[pkg.ecosystem]) ||
				(actionKey === "format_check" && env?.formatting?.[pkg.ecosystem]) ||
				(actionKey === "docs_check" && env?.docs_check?.[pkg.ecosystem]) ||
				(actionKey === "docs_extract" && env?.docs_extract?.[pkg.ecosystem]) ||
				(actionKey === "setup" && env?.setup?.[pkg.ecosystem]) ||
				(actionKey === "release" && env?.release?.[pkg.ecosystem]);
			
			if (override) {
				command = override.command.replace(/\{path\}/g, pkg.path);
				description = `Declared in repo.df environment.${actionKey}`;
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

		packages[pkg.name] = actionSet as PackageActionSet;
	}

	return {
		evidence,
		capabilities,
		packages,
	};
}
