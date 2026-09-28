import { join } from "node:path";
import type {
	CapabilityActionDefinition,
	CapabilityActionKind,
	CapabilityDefinition,
	CapabilityPackageContext,
} from "./abi.ts";
import { discoverCapabilities, resolveCapabilities } from "./loader.ts";

/** Per-ecosystem command/versions override declared in the canonical repository contract. */
type ActionOverride = { command?: string; enabled?: boolean; versions?: readonly string[] };

/** Canonical exception declaring that one action has no implementation for one ecosystem. */
export interface NotApplicableDeclaration {
	reason: string;
}

/** Structural repository evidence consumed by capability action resolution. */
export interface RepositoryActionEvidence {
	root: string;
	domains: readonly string[];
	packages: readonly CapabilityPackageContext[];
	repoDf: {
		environment?: {
			testing?: Readonly<Record<string, ActionOverride>>;
			typecheck?: Readonly<Record<string, ActionOverride>>;
			linting?: Readonly<Record<string, ActionOverride>>;
			formatting?: Readonly<Record<string, ActionOverride>>;
			docs_extract?: Readonly<Record<string, ActionOverride>>;
			setup?: Readonly<Record<string, ActionOverride>>;
			release?: Readonly<Record<string, ActionOverride>>;
			/**
			 * Action kinds the repository explicitly exempts per ecosystem, with a reason. This is the
			 * only escape from a required gap: DF-RULE-006 permits a not-applicable exception solely
			 * from the canonical repository contract, and forbids inferring it from a missing tool.
			 */
			not_applicable?: Readonly<
				Partial<Record<CapabilityActionKind, Readonly<Record<string, NotApplicableDeclaration>>>>
			>;
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
	source: "repo.dfconfig" | "capability" | "unsupported";
	capabilityId?: string;
	reason?: string;
	/** Set only when the canonical contract exempted this action for the package's ecosystem. */
	notApplicable?: NotApplicableDeclaration & { ecosystem: string };
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
	/** Actions the canonical contract exempted, reported beside the gaps so a green matrix cannot hide one. */
	notApplicable: readonly ResolvedRepositoryAction[];
}

const ACTION_KINDS: readonly CapabilityActionKind[] = [
	"test",
	"lint",
	"typecheck",
	"format_check",
	"docs_extract",
	"setup",
	"release",
];

/** The required quality actions, in the order the executable matrix emits them. */
const REQUIRED_QUALITY_ACTIONS = ["test", "typecheck", "lint", "format_check"] as const;

/** Literal action kind carried by one executable matrix row. */
type QualityActionKind = (typeof REQUIRED_QUALITY_ACTIONS)[number];

function overrideGroup(
	evidence: RepositoryActionEvidence,
	kind: CapabilityActionKind,
): Readonly<Record<string, ActionOverride>> | undefined {
	const environment = evidence.repoDf.environment;
	if (!environment) return undefined;
	switch (kind) {
		case "test":
			return environment.testing;
		case "lint":
			return environment.linting;
		case "format_check":
			return environment.formatting;
		case "typecheck":
			return environment.typecheck;
		case "docs_extract":
			return environment.docs_extract;
		case "setup":
			return environment.setup;
		case "release":
			return environment.release;
	}
}

/**
 * Fails closed on a malformed not-applicable contract before any matrix is constructed, so an
 * exemption can never be a silent coverage hole: an unknown action kind, an ecosystem no detected
 * package belongs to, or a missing reason are all configuration errors rather than exemptions.
 */
function assertNotApplicableDeclarations(evidence: RepositoryActionEvidence): void {
	const declarations = evidence.repoDf.environment?.not_applicable;
	if (declarations === undefined) return;
	const detected = new Set(evidence.packages.map((pkg) => pkg.ecosystem));
	for (const [kind, group] of Object.entries(declarations)) {
		// `$comment` is this contract's established documentation key and appears in every other
		// environment block, so it is prose rather than a declaration.
		if (kind.startsWith("$")) continue;
		if (!ACTION_KINDS.includes(kind as CapabilityActionKind))
			throw new Error(`not_applicable declares unknown action kind ${kind}`);
		if (!group || typeof group !== "object" || Array.isArray(group))
			throw new Error(`not_applicable.${kind} must map ecosystems to a reason`);
		for (const [ecosystem, declaration] of Object.entries(group)) {
			if (!detected.has(ecosystem))
				throw new Error(`not_applicable.${kind} names ecosystem ${ecosystem}, which no detected package belongs to`);
			const reason = (declaration as Partial<NotApplicableDeclaration> | null)?.reason;
			if (typeof reason !== "string" || !reason.trim())
				throw new Error(`not_applicable.${kind}.${ecosystem} must state a reason`);
		}
	}
}

function notApplicableException(
	evidence: RepositoryActionEvidence,
	pkg: CapabilityPackageContext,
	kind: CapabilityActionKind,
): (NotApplicableDeclaration & { ecosystem: string }) | undefined {
	const declaration = evidence.repoDf.environment?.not_applicable?.[kind]?.[pkg.ecosystem];
	return declaration ? { ...declaration, ecosystem: pkg.ecosystem } : undefined;
}

function explicitOverride(
	evidence: RepositoryActionEvidence,
	pkg: CapabilityPackageContext,
	kind: CapabilityActionKind,
): ActionOverride | undefined {
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
	const exception = notApplicableException(evidence, pkg, kind);
	if (exception) {
		return {
			kind,
			packageId: pkg.id,
			cwd: pkg.path,
			supported: false,
			description: `${kind} has no implementation for ${pkg.ecosystem}`,
			source: "repo.dfconfig",
			notApplicable: exception,
			reason: `not applicable: ${exception.reason}`,
		};
	}
	const override = explicitOverride(evidence, pkg, kind);
	if (override) {
		if (override.enabled === false) {
			return {
				kind,
				packageId: pkg.id,
				cwd: pkg.path,
				supported: false,
				description: `${kind} disabled by repo block`,
				source: "repo.dfconfig",
				reason: "disabled",
			};
		}
		if (typeof override.command === "string" && override.command.trim()) {
			return {
				kind,
				packageId: pkg.id,
				cwd: pkg.path,
				supported: true,
				description: `${kind} declared in repo block`,
				command: override.command,
				source: "repo.dfconfig",
				metadata: override.versions ? { versions: override.versions } : undefined,
			};
		}
	}

	const matches: {
		capability: CapabilityDefinition;
		action: CapabilityActionDefinition;
		result: Pick<ResolvedRepositoryAction, "command" | "metadata">;
	}[] = [];
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
			kind,
			packageId: pkg.id,
			cwd: pkg.path,
			supported: false,
			description: `Ambiguous ${kind} action`,
			source: "unsupported",
			reason: `multiple capability contributions apply: ${ids}`,
		};
	}
	const match = matches[0];
	if (match) {
		const metadata = {
			...(match.result.metadata ?? {}),
			...(override?.versions ? { versions: override.versions } : {}),
		};
		return {
			kind,
			packageId: pkg.id,
			cwd: pkg.path,
			supported: true,
			description: match.action.description,
			source: "capability",
			capabilityId: match.capability.id,
			...(match.result.command ? { command: match.result.command } : {}),
			...(Object.keys(metadata).length > 0 ? { metadata } : {}),
		};
	}
	return {
		kind,
		packageId: pkg.id,
		cwd: pkg.path,
		supported: false,
		description: `No applicable ${kind} action`,
		source: "unsupported",
		reason: "missing action",
	};
}

/** Resolves deterministic actions exclusively from explicit repo-block overrides and applicable capability contributions. */
export function resolveRepositoryActions(
	evidence: RepositoryActionEvidence,
	definitions: readonly CapabilityDefinition[],
): ResolvedRepositoryActions {
	assertNotApplicableDeclarations(evidence);
	const packages = evidence.packages.map((pkg) => {
		const actions = Object.fromEntries(
			ACTION_KINDS.map((kind) => [kind, resolveOne(evidence, definitions, pkg, kind)]),
		) as Record<CapabilityActionKind, ResolvedRepositoryAction>;
		return { package: pkg, actions };
	});
	const every = packages.flatMap(({ actions }) => ACTION_KINDS.map((kind) => actions[kind]));
	const gaps = every.filter(
		(action) =>
			REQUIRED_QUALITY_ACTIONS.includes(action.kind as QualityActionKind) &&
			!action.notApplicable &&
			(!action.supported || typeof action.command !== "string" || !action.command.trim()),
	);
	return { packages, gaps, notApplicable: every.filter((action) => action.notApplicable) };
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

/** One executable CI quality matrix entry. */
export interface QualityMatrixEntry {
	id: string;
	packageId: string;
	kind: QualityActionKind;
	command: string;
	cwd: string;
	ecosystem: string;
	packageManager: string;
	version?: string;
	setupCommand?: string;
	setupCwd?: string;
}

/** Deterministic executable matrix consumed by CI and required-check synchronization. */
export function qualityMatrix(resolution: ResolvedRepositoryActions): readonly QualityMatrixEntry[] {
	const result: QualityMatrixEntry[] = [];
	for (const { package: pkg, actions } of resolution.packages) {
		const setup = actions.setup;
		for (const kind of REQUIRED_QUALITY_ACTIONS) {
			const action = actions[kind];
			if (!action || !action.supported || !action.command) continue;
			const rawVersions = action.metadata?.versions;
			const versions = Array.isArray(rawVersions)
				? rawVersions.filter((value): value is string => typeof value === "string" && value.length > 0)
				: [];
			const values = versions.length > 0 ? versions : [undefined];
			for (const version of values) {
				result.push({
					id: `${pkg.id}:${kind}${version ? `@${version}` : ""}`,
					packageId: pkg.id,
					kind,
					command: action.command,
					cwd: action.cwd,
					ecosystem: pkg.ecosystem,
					packageManager: pkg.packageManager,
					...(version ? { version } : {}),
					...(setup.supported && setup.command ? { setupCommand: setup.command } : {}),
					...(setup.supported && setup.command ? { setupCwd: pkg.packageManagerRoot } : {}),
				});
			}
		}
	}
	return result;
}

/** Loads applicable capability definitions and resolves the canonical repository action result. */
export async function resolveDetectedRepositoryActions(
	evidence: RepositoryActionEvidence,
	capabilitiesRoot = join(evidence.root, ".darkfactory", "plugins"),
): Promise<ResolvedRepositoryActions> {
	const definitions = await discoverCapabilities(capabilitiesRoot);
	const applicable = resolveCapabilities(definitions, evidence.domains).capabilities;
	return resolveRepositoryActions(evidence, applicable);
}

/** Stable aggregate GitHub status-check contract for detector-driven quality execution. */
export const QUALITY_REQUIRED_CHECK = "quality" as const;

/** Governance check that remains independent from language/package quality detection. */
export const REQUEST_BINDING_REQUIRED_CHECK = "verify-bound-issue" as const;

/** Required GitHub checks for one detected repository. */
export function requiredChecksForDetectedQuality(
	_resolution: ResolvedRepositoryActions,
): readonly { name: string; required: true; workflow: string; job: string }[] {
	return [
		{ name: QUALITY_REQUIRED_CHECK, required: true, workflow: "ci.yml", job: QUALITY_REQUIRED_CHECK },
		{
			name: REQUEST_BINDING_REQUIRED_CHECK,
			required: true,
			workflow: "verify-bound-issue.yml",
			job: REQUEST_BINDING_REQUIRED_CHECK,
		},
	];
}
