import { join } from "node:path";
import { discoverCapabilities, resolveCapabilities } from "./loader.ts";
import type {
	CapabilityActionDefinition,
	CapabilityActionKind,
	CapabilityDefinition,
	CapabilityPackageContext,
} from "./abi.ts";

/** Structural repository evidence consumed by capability action resolution. */
export interface RepositoryActionEvidence {
	root: string;
	domains: readonly string[];
	packages: readonly CapabilityPackageContext[];
	repoDf: {
		environment?: {
			testing?: Readonly<Record<string, { command?: string; enabled?: boolean }>>;
			linting?: Readonly<Record<string, { command?: string; enabled?: boolean }>>;
			formatting?: Readonly<Record<string, { command?: string; enabled?: boolean }>>;
			docs_check?: Readonly<Record<string, { command?: string; enabled?: boolean }>>;
			docs_extract?: Readonly<Record<string, { command?: string; enabled?: boolean }>>;
			setup?: Readonly<Record<string, { command?: string; enabled?: boolean }>>;
			release?: Readonly<Record<string, { command?: string; enabled?: boolean }>>;
		};
	};
}

/** One deterministic action selected for one detected package. */
export interface ResolvedRepositoryAction {
	kind: CapabilityActionKind;
	packageId: string;
	cwd: string;
	supported: boolean;
	description: string;
	command?: string;
	metadata?: Readonly<Record<string, unknown>>;
	source: "repo.df" | "capability" | "unsupported";
	capabilityId?: string;
	reason?: string;
}

/** All deterministic actions for one detected package. */
export interface ResolvedPackageActions {
	package: CapabilityPackageContext;
	actions: Readonly<Record<CapabilityActionKind, ResolvedRepositoryAction>>;
}

/** One normalized resolution consumed by doctor, CI, verification, protection and docs. */
export interface ResolvedRepositoryActions {
	packages: readonly ResolvedPackageActions[];
	gaps: readonly ResolvedRepositoryAction[];
}

const ACTION_KINDS: readonly CapabilityActionKind[] = [
	"test",
	"lint",
	"format_check",
	"docs_check",
	"docs_extract",
	"setup",
	"release",
];

const REQUIRED_QUALITY_ACTIONS = new Set<CapabilityActionKind>([
	"test",
	"lint",
	"format_check",
	"docs_check",
	"docs_extract",
]);

function overrideGroup(
	evidence: RepositoryActionEvidence,
	kind: CapabilityActionKind,
): Readonly<Record<string, { command?: string; enabled?: boolean }>> | undefined {
	const environment = evidence.repoDf.environment;
	if (!environment) return undefined;
	switch (kind) {
		case "test": return environment.testing;
		case "lint": return environment.linting;
		case "format_check": return environment.formatting;
		case "docs_check": return environment.docs_check;
		case "docs_extract": return environment.docs_extract;
		case "setup": return environment.setup;
		case "release": return environment.release;
	}
}

function explicitOverride(
	evidence: RepositoryActionEvidence,
	pkg: CapabilityPackageContext,
	kind: CapabilityActionKind,
): { command?: string; enabled?: boolean } | undefined {
	const group = overrideGroup(evidence, kind);
	return group?.[pkg.packageManager] ?? group?.[pkg.ecosystem];
}

function applies(action: CapabilityActionDefinition, pkg: CapabilityPackageContext): boolean {
	if (action.ecosystems && !action.ecosystems.includes(pkg.ecosystem)) return false;
	if (action.packageManagers && !action.packageManagers.includes(pkg.packageManager)) return false;
	if (action.domains && !action.domains.some((domain) => pkg.domains.includes(domain))) return false;
	if (action.requiredScripts && !action.requiredScripts.every((script) => pkg.scripts.includes(script))) return false;
	return true;
}

function contributionResult(
	action: CapabilityActionDefinition,
	pkg: CapabilityPackageContext,
): Pick<ResolvedRepositoryAction, "command" | "metadata"> | undefined {
	const command = typeof action.command === "function" ? action.command(pkg) : action.command;
	const metadata = typeof action.metadata === "function" ? action.metadata(pkg) : action.metadata;
	if (!command && !metadata) return undefined;
	return {
		...(command ? { command } : {}),
		...(metadata ? { metadata } : {}),
	};
}

function resolveOne(
	evidence: RepositoryActionEvidence,
	definitions: readonly CapabilityDefinition[],
	pkg: CapabilityPackageContext,
	kind: CapabilityActionKind,
): ResolvedRepositoryAction {
	const override = explicitOverride(evidence, pkg, kind);
	if (override) {
		if (override.enabled === false) {
			return {
				kind, packageId: pkg.id, cwd: pkg.path, supported: false,
				description: `${kind} disabled by repo.df`, source: "repo.df", reason: "disabled",
			};
		}
		if (typeof override.command === "string" && override.command.trim()) {
			return {
				kind, packageId: pkg.id, cwd: pkg.path, supported: true,
				description: `${kind} declared in repo.df`, command: override.command, source: "repo.df",
			};
		}
	}

	const matches: { capability: CapabilityDefinition; action: CapabilityActionDefinition; result: Pick<ResolvedRepositoryAction, "command" | "metadata"> }[] = [];
	for (const capability of [...definitions].sort((a, b) => a.id.localeCompare(b.id))) {
		for (const action of capability.actions ?? []) {
			if (action.kind !== kind || !applies(action, pkg)) continue;
			const result = contributionResult(action, pkg);
			if (result) matches.push({ capability, action, result });
		}
	}
	if (matches.length > 1) {
		const ids = matches.map((match) => match.capability.id).join(", ");
		return {
			kind, packageId: pkg.id, cwd: pkg.path, supported: false,
			description: `Ambiguous ${kind} action`, source: "unsupported",
			reason: `multiple capability contributions apply: ${ids}`,
		};
	}
	const match = matches[0];
	if (match) {
		return {
			kind, packageId: pkg.id, cwd: pkg.path, supported: true,
			description: match.action.description, source: "capability", capabilityId: match.capability.id,
			...match.result,
		};
	}
	return {
		kind, packageId: pkg.id, cwd: pkg.path, supported: false,
		description: `No applicable ${kind} action`, source: "unsupported",
		reason: "missing action",
	};
}

/** Resolves deterministic actions exclusively from explicit repo.df overrides and applicable capability contributions. */
export function resolveRepositoryActions(
	evidence: RepositoryActionEvidence,
	definitions: readonly CapabilityDefinition[],
): ResolvedRepositoryActions {
	const packages = evidence.packages.map((pkg) => {
		const actions = Object.fromEntries(
			ACTION_KINDS.map((kind) => [kind, resolveOne(evidence, definitions, pkg, kind)]),
		) as Record<CapabilityActionKind, ResolvedRepositoryAction>;
		return { package: pkg, actions };
	});
	const gaps = packages.flatMap(({ actions }) =>
		ACTION_KINDS
			.filter((kind) => REQUIRED_QUALITY_ACTIONS.has(kind) && !actions[kind].supported)
			.map((kind) => actions[kind]),
	);
	return { packages, gaps };
}

/** Returns executable quality actions for only packages touched by repository-relative paths. */
export function actionsForTouchedFiles(
	resolution: ResolvedRepositoryActions,
	changedFiles: readonly string[],
	kinds: readonly CapabilityActionKind[] = ["test", "lint", "format_check"],
): ResolvedRepositoryAction[] {
	const touched = (packagePath: string) =>
		packagePath === "."
			? changedFiles.length > 0
			: changedFiles.some((file) => file === packagePath || file.startsWith(`${packagePath}/`));
	const result: ResolvedRepositoryAction[] = [];
	for (const entry of resolution.packages) {
		if (!touched(entry.package.path)) continue;
		for (const kind of kinds) result.push(entry.actions[kind]);
	}
	return result;
}

/** Deterministic matrix used by CI generators and required-check synchronization. */
export function qualityMatrix(resolution: ResolvedRepositoryActions): readonly {
	id: string;
	packageId: string;
	kind: CapabilityActionKind;
	command?: string;
	cwd: string;
	supported: boolean;
}[] {
	return resolution.packages.flatMap(({ package: pkg, actions }) =>
		(["test", "lint", "format_check", "docs_check"] as const).map((kind) => ({
			id: `${pkg.id}:${kind}`,
			packageId: pkg.id,
			kind,
			...(actions[kind].command ? { command: actions[kind].command } : {}),
			cwd: actions[kind].cwd,
			supported: actions[kind].supported,
		})),
	);
}

/** Loads applicable capability definitions and resolves the canonical repository action result. */
export async function resolveDetectedRepositoryActions(
	evidence: RepositoryActionEvidence,
	capabilitiesRoot = join(evidence.root, "capabilities"),
): Promise<ResolvedRepositoryActions> {
	const definitions = await discoverCapabilities(capabilitiesRoot);
	const applicable = resolveCapabilities(definitions, evidence.domains).capabilities;
	return resolveRepositoryActions(evidence, applicable);
}
