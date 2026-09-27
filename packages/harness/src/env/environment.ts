/** @packageDocumentation
 * What a repository is actually made of, detected once and configured by declaration.
 *
 * The pipeline is shared across repositories that look nothing alike: a Python package, a Rust and
 * TypeScript desktop application, a template repository with no build at all. Every part of the
 * pipeline needs the same answer to "what is in here" - which CI jobs are worth running, what the
 * release job should package, which manifests must agree on the version - so that question is
 * answered once, here, instead of being re-guessed with `hashFiles` in each workflow.
 *
 * Detection is the default because it cannot drift: a repository that grows a `Cargo.toml` starts
 * building Rust without anyone remembering to declare it. Declaration is available for the cases
 * detection cannot see - a package deliberately excluded, a build command that is not the
 * ecosystem's default, an artifact produced by something bespoke. The two compose: the `environment`
 * block of the repository declaration overrides and extends what detection found without restating
 * detected facts.
 *
 * Workspaces are first-class. npm, Bun, pnpm, Yarn and Cargo all express monorepos as a root manifest
 * listing member globs, so a repository is walked as a tree of packages rather than a single one, and
 * {@link Environment.isMonorepo} reports what was found rather than what was assumed.
 *
 * ## Relationship to repository evidence
 *
 * `packages/core/repository-evidence` answers a narrower question: which packages exist, so capability
 * resolution can decide which toolchain commands are real. It normalises rather than plans - it has
 * no test/format/build tables, no workspace globs, no submodules, and it folds an unrecognised
 * ecosystem into `node`. This module answers the wider question - what to *run* and *ship* - and
 * keeps an unrecognised ecosystem as itself under {@link DEFAULT_DOMAIN}. Both read the same `repo`
 * block through `packages/protocol/config-document`; neither reads the other's output.
 */

import { type Dirent, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "@darkfactory/protocol/config-document";
import {
	ARTIFACT_GLOBS,
	BUILD_COMMANDS,
	DEFAULT_DOMAIN,
	defaultCommand,
	ECOSYSTEM_DOMAINS,
	FORMAT_COMMANDS,
	FORMATTER_MARKERS,
	LOCKFILES,
	MANIFEST_ECOSYSTEMS,
	MAX_DEPTH,
	type ManagerCommands,
	PRUNED_DIRECTORIES,
	TEST_COMMANDS,
	TEST_MATRIX,
} from "./tables.ts";

/** The domain an ecosystem falls back to when {@link ECOSYSTEM_DOMAINS} does not name it. */
/** The manifest filenames that make a directory a package, and the ecosystems they declare. */
export { DEFAULT_DOMAIN, MANIFEST_ECOSYSTEMS } from "./tables.ts";

/** One planned command for an ecosystem: what to run, on which runtimes, with which manager. */
export interface PlannedCommand {
	/** The command, or `null` when neither declaration nor defaults named one. */
	command: string | null;
	/** Runtime versions to run it on; empty means "one job, whatever the runner provides". */
	versions: string[];
	/** The package manager that decided the command, or `null` when no lockfile identified one. */
	manager: string | null;
}

/** One planned release build, carrying the globs of what it leaves behind. */
export interface PlannedBuild extends PlannedCommand {
	/** Artifact globs relative to each package directory. */
	artifacts: string[];
}

/** One package as plain data. */
export interface PackageData {
	path: string;
	ecosystem: string;
	domain: string;
	manifest: string;
	name: string | null;
	version: string | null;
	is_workspace_root: boolean;
	members: string[];
}

/** The whole environment as plain data, for a workflow step to consume. */
export interface EnvironmentData {
	ecosystems: string[];
	domains: string[];
	is_monorepo: boolean;
	is_multi_domain: boolean;
	packages: PackageData[];
	package_managers: Record<string, string | null>;
	test_plan: Record<string, PlannedCommand>;
	format_plan: Record<string, PlannedCommand>;
	build_plan: Record<string, PlannedBuild>;
}

/** One buildable unit inside a repository. */
export class Package {
	/** Directory holding the package, relative to the repository root (`.` for the root). */
	readonly path: string;
	/** The ecosystem the manifest declares. */
	readonly ecosystem: string;
	/** The manifest file, relative to the repository root. */
	manifest: string;
	/** Declared package name, when the manifest states one. */
	name: string | null;
	/** Declared version, when the manifest states one. */
	version: string | null;
	/** Whether this manifest declares workspace members. */
	isWorkspaceRoot: boolean;
	/** Raw member globs declared by a workspace root. */
	members: string[];

	constructor(
		path: string,
		ecosystem: string,
		manifest: string,
		name: string | null = null,
		version: string | null = null,
		isWorkspaceRoot = false,
		members: string[] = [],
	) {
		this.path = path;
		this.ecosystem = ecosystem;
		this.manifest = manifest;
		this.name = name;
		this.version = version;
		this.isWorkspaceRoot = isWorkspaceRoot;
		this.members = members;
	}

	/**
	 * The kind of governance this package answers to, derived from its ecosystem.
	 *
	 * @returns The mapped domain, or {@link DEFAULT_DOMAIN} for an ecosystem the table does not name.
	 */
	get domain(): string {
		return ECOSYSTEM_DOMAINS[this.ecosystem] ?? DEFAULT_DOMAIN;
	}

	/** @returns The package as plain data, for a workflow step to consume. */
	toJSON(): PackageData {
		return {
			path: this.path,
			ecosystem: this.ecosystem,
			domain: this.domain,
			manifest: this.manifest,
			name: this.name,
			version: this.version,
			is_workspace_root: this.isWorkspaceRoot,
			members: [...this.members],
		};
	}
}

/** Everything the pipeline needs to know about a repository's shape. */
export class Environment {
	constructor(
		/** Absolute path to the repository root. */
		readonly root: string,
		/** Every package found, root first. */
		readonly packages: Package[],
		/** The `environment` block from the repository declaration, if any. */
		readonly declared: Record<string, unknown>,
	) {}

	/** @returns The distinct ecosystems present, e.g. `python` and `rust`. */
	get ecosystems(): Set<string> {
		return new Set(this.packages.map((entry) => entry.ecosystem));
	}

	/** @returns The distinct domains present, e.g. `code` and `paper`. */
	get domains(): Set<string> {
		return new Set(this.packages.map((entry) => entry.domain));
	}

	/**
	 * Whether the repository spans more than one domain.
	 *
	 * The companion to being polyglot. A repository is polyglot when it holds several ecosystems
	 * within one domain, and multi-domain when it holds several kinds of work at once - a thesis
	 * beside the software it documents - each of which must be governed on its own terms.
	 *
	 * @returns `true` when packages from more than one domain were found.
	 */
	get isMultiDomain(): boolean {
		return this.domains.size > 1;
	}

	/**
	 * Whether the repository holds more than one package.
	 *
	 * @returns `true` when a workspace root declares members, or several packages were found.
	 */
	get isMonorepo(): boolean {
		if (this.packages.some((entry) => entry.isWorkspaceRoot && entry.members.length > 0)) return true;
		return new Set(this.packages.map((entry) => entry.path)).size > 1;
	}

	/**
	 * @param domain Domain name.
	 * @returns Matching packages, in discovery order.
	 */
	packagesIn(domain: string): Package[] {
		return this.packages.filter((entry) => entry.domain === domain);
	}

	/**
	 * @param domain Domain name.
	 * @returns `true` when at least one package belongs to it.
	 */
	hasDomain(domain: string): boolean {
		return this.domains.has(domain);
	}

	/**
	 * @param ecosystem Ecosystem name.
	 * @returns Matching packages, in discovery order.
	 */
	packagesFor(ecosystem: string): Package[] {
		return this.packages.filter((entry) => entry.ecosystem === ecosystem);
	}

	/**
	 * @param ecosystem Ecosystem name.
	 * @returns `true` when at least one package declares it.
	 */
	has(ecosystem: string): boolean {
		return this.ecosystems.has(ecosystem);
	}

	/**
	 * Identifies the package manager in use for an ecosystem, from its lockfile.
	 *
	 * @param ecosystem Ecosystem name.
	 * @returns The manager's name, or `null` when no lockfile identifies one.
	 */
	packageManager(ecosystem: string): string | null {
		const declared = record(this.declared.package_managers);
		const override = declared?.[ecosystem];
		if (override !== undefined && override !== null) return String(override);
		for (const entry of this.packagesFor(ecosystem)) {
			for (const [filename, manager] of LOCKFILES[ecosystem] ?? []) {
				if (existsSync(join(this.root, entry.path, filename))) return manager;
			}
		}
		return null;
	}

	/** @returns How to test each ecosystem present. */
	testPlan(): Record<string, PlannedCommand> {
		return this.plan("testing", TEST_COMMANDS, TEST_MATRIX);
	}

	/** @returns How to format each ecosystem present. Formatting has no runtime matrix by default. */
	formatPlan(): Record<string, PlannedCommand> {
		return this.plan("formatting", FORMAT_COMMANDS);
	}

	/** @returns How to build each ecosystem's release artifacts, and where they leave them. */
	buildPlan(): Record<string, PlannedBuild> {
		const plan = this.plan("release", BUILD_COMMANDS);
		const declared = record(this.declared.release) ?? {};
		const builds: Record<string, PlannedBuild> = {};
		for (const [ecosystem, entry] of Object.entries(plan)) {
			const settings = record(declared[ecosystem]) ?? {};
			builds[ecosystem] = {
				...entry,
				artifacts: stringArray(settings.artifacts ?? ARTIFACT_GLOBS[ecosystem] ?? []),
			};
		}
		return builds;
	}

	/** @returns The whole environment as plain data, suitable for a workflow output. */
	toJSON(): EnvironmentData {
		const ecosystems = [...this.ecosystems].sort();
		const packageManagers: Record<string, string | null> = {};
		for (const ecosystem of ecosystems) packageManagers[ecosystem] = this.packageManager(ecosystem);
		return {
			ecosystems,
			domains: [...this.domains].sort(),
			is_monorepo: this.isMonorepo,
			is_multi_domain: this.isMultiDomain,
			packages: this.packages.map((entry) => entry.toJSON()),
			package_managers: packageManagers,
			test_plan: this.testPlan(),
			format_plan: this.formatPlan(),
			build_plan: this.buildPlan(),
		};
	}

	/**
	 * Builds a per-ecosystem command plan from detection plus declaration.
	 *
	 * The command is derived from what was detected - the package manager decides it, so a Bun
	 * workspace runs `bun test` without anyone saying so - and the named declaration block overrides
	 * it per ecosystem. Declaring `enabled: false` removes an ecosystem from the plan, and an
	 * ecosystem the repository does not contain can still be declared, for work detection cannot see.
	 *
	 * @param block Declaration key holding the overrides, e.g. `testing`.
	 * @param defaults Ecosystem then package-manager keyed command table.
	 * @param matrix Ecosystem to default runtime versions, for the plans that have a matrix.
	 * @returns Mapping of ecosystem to its planned command.
	 */
	private plan(
		block: string,
		defaults: ManagerCommands,
		matrix: Readonly<Record<string, readonly string[]>> = {},
	): Record<string, PlannedCommand> {
		const declared = record(this.declared[block]) ?? {};
		const plan: Record<string, PlannedCommand> = {};
		for (const ecosystem of [...this.ecosystems].sort()) {
			const settings = record(declared[ecosystem]) ?? {};
			if (settings.enabled === false) continue;
			const manager = this.packageManager(ecosystem);
			const declaredCommand = settings.command;
			const command =
				(declaredCommand ? String(declaredCommand) : undefined) ??
				this.markerCommand(ecosystem, block) ??
				defaultCommand(defaults, ecosystem, manager ?? undefined) ??
				null;
			plan[ecosystem] = {
				command,
				versions: stringArray(settings.versions ?? matrix[ecosystem] ?? []),
				manager,
			};
		}
		for (const [ecosystem, raw] of Object.entries(declared)) {
			// `$comment` keys carry prose rather than settings, and every block in the declaration
			// may hold one; treating a string as an ecosystem crashes the plan.
			if (ecosystem.startsWith("$")) continue;
			const settings = record(raw);
			if (!settings || plan[ecosystem] !== undefined || settings.enabled === false) continue;
			if (settings.command) {
				plan[ecosystem] = {
					command: String(settings.command),
					versions: stringArray(settings.versions ?? []),
					manager: null,
				};
			}
		}
		return plan;
	}

	/**
	 * Finds a formatter named outright by a configuration file in the tree.
	 *
	 * A repository carrying `biome.json` has chosen Biome regardless of which package manager
	 * installed it, so the marker outranks the manager default.
	 *
	 * @param ecosystem Ecosystem name.
	 * @param block Block being planned; only `formatting` consults markers.
	 * @returns The command, or `null` when no marker applies.
	 */
	private markerCommand(ecosystem: string, block: string): string | null {
		if (block !== "formatting") return null;
		for (const [filename, markerEcosystem, command] of FORMATTER_MARKERS) {
			if (markerEcosystem !== ecosystem) continue;
			for (const entry of this.packagesFor(ecosystem)) {
				if (existsSync(join(this.root, entry.path, filename))) return command;
			}
		}
		return null;
	}
}

/** Narrows a declared value to a mapping, the way the declaration's own blocks are shaped. */
function record(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
}

/** Renders a declared list as strings; anything that is not a list yields nothing. */
function stringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.map((entry) => String(entry));
}

/** Renders a declared scalar as a string, or `null` when it is absent or not a string. */
function optionalString(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

/**
 * Matches a path against one shell-style pattern, where `*` matches across `/` and `[seq]`, `?` and
 * `[!seq]` are honoured too.
 */
function fnmatch(name: string, pattern: string): boolean {
	let source = "";
	for (let index = 0; index < pattern.length; index += 1) {
		const character = pattern[index] ?? "";
		if (character === "*") {
			source += ".*";
			continue;
		}
		if (character === "?") {
			source += ".";
			continue;
		}
		if (character === "[") {
			const close = pattern.indexOf("]", index + 1);
			if (close === -1) {
				source += "\\[";
				continue;
			}
			const body = pattern.slice(index + 1, close);
			source += `[${body.startsWith("!") ? `^${body.slice(1)}` : body}]`;
			index = close;
			continue;
		}
		source += character.replace(/[.+^${}()|\\]/u, `\\${character}`);
	}
	return new RegExp(`^${source}$`, "u").test(name);
}

/** Reads a JSON object, tolerating malformed content. */
function loadJson(path: string): Record<string, unknown> {
	try {
		return record(JSON.parse(readFileSync(path, "utf8"))) ?? {};
	} catch {
		return {};
	}
}

/** Reads a TOML document, tolerating malformed content. */
function loadToml(path: string): Record<string, unknown> {
	try {
		return record(Bun.TOML.parse(readFileSync(path, "utf8"))) ?? {};
	} catch {
		return {};
	}
}

/** Reads a workspace's member globs out of a `[key]` table holding a `members` list. */
function memberGlobs(document: unknown, key: string): string[] {
	const table = record(record(document)?.[key]);
	return table ? stringArray(table.members) : [];
}

/**
 * Builds a {@link Package} from one manifest file.
 *
 * `.latexmkrc`, `setup.py`, `setup.cfg` and `lakefile.lean` are marker formats rather than manifests:
 * their presence is the whole signal, so nothing is parsed from them.
 *
 * @param root Absolute repository root.
 * @param directory Repository-relative directory holding the manifest.
 * @param filename Manifest filename.
 * @returns The package, or `undefined` when the file declares nothing useful.
 */
function readPackage(root: string, directory: string, filename: string): Package | undefined {
	const ecosystem = MANIFEST_ECOSYSTEMS[filename];
	if (ecosystem === undefined) return undefined;
	const relative = directory === "." ? filename : `${directory}/${filename}`;
	const absolute = join(root, relative);
	let name: string | null = null;
	let version: string | null = null;
	let globs: string[] = [];

	if (filename === "package.json") {
		const data = loadJson(absolute);
		name = optionalString(data.name);
		version = optionalString(data.version);
		const declared = data.workspaces;
		globs = stringArray(Array.isArray(declared) ? declared : record(declared)?.packages);
	} else if (filename === "pyproject.toml") {
		const data = loadToml(absolute);
		const project = record(data.project) ?? {};
		const poetry = record(record(data.tool)?.poetry) ?? {};
		name = optionalString(project.name);
		version = optionalString(project.version);
		if (!name) {
			name = optionalString(poetry.name);
			version = version || optionalString(poetry.version);
		}
		globs = memberGlobs(record(data.tool)?.uv, "workspace");
	} else if (filename === "Cargo.toml") {
		const data = loadToml(absolute);
		const declared = record(data.package) ?? {};
		name = optionalString(declared.name);
		// `version.workspace = true` inherits from the workspace rather than declaring a version.
		version = optionalString(declared.version);
		globs = memberGlobs(data, "workspace");
		// A `Cargo.toml` that names neither a package nor a workspace is a member's dependencies
		// being restated, not a crate.
		if (!name && globs.length === 0) return undefined;
	} else if (filename === "typst.toml") {
		// Typst declares a package the same way Cargo does, under a [package] table. A document is
		// not obliged to declare one - `typst.toml` is optional for a plain paper - so an empty
		// table still yields a package, unlike Cargo above.
		const declared = record(loadToml(absolute).package) ?? {};
		name = optionalString(declared.name);
		version = optionalString(declared.version);
	} else if (filename === "lakefile.toml") {
		// A Lean build file names its targets in Lean or TOML respectively. Only the TOML form is
		// worth parsing; the Lean form is a program, and its presence is the signal.
		const data = loadToml(absolute);
		name = optionalString(data.name);
		version = optionalString(data.version);
	} else if (filename === "go.mod") {
		let source: string;
		try {
			source = readFileSync(absolute, "utf8");
		} catch {
			return undefined;
		}
		name = /^module\s+(\S+)/mu.exec(source)?.[1] ?? null;
	} else if (filename === "deno.json" || filename === "deno.jsonc") {
		const data = loadJson(absolute);
		name = optionalString(data.name);
		version = optionalString(data.version);
		globs = stringArray(data.workspace);
	}

	return new Package(directory, ecosystem, relative, name, version, globs.length > 0, globs);
}

/**
 * Reads workspace globs from `pnpm-workspace.yaml` without a YAML dependency.
 *
 * @param root Absolute repository root.
 * @returns The declared globs, or an empty list.
 */
function pnpmMembers(root: string): string[] {
	const path = join(root, "pnpm-workspace.yaml");
	if (!existsSync(path)) return [];
	let source: string;
	try {
		source = readFileSync(path, "utf8");
	} catch {
		return [];
	}
	const globs: string[] = [];
	let inPackages = false;
	for (const line of source.split("\n")) {
		const stripped = line.trim();
		if (stripped.startsWith("packages:")) {
			inPackages = true;
			continue;
		}
		if (!inPackages) continue;
		if (stripped.startsWith("- ")) {
			globs.push(
				stripped
					.slice(2)
					.trim()
					.replace(/^['"]|['"]$/gu, ""),
			);
		} else if (stripped && !stripped.startsWith("#")) {
			break;
		}
	}
	return globs;
}

/**
 * Reads the submodule paths declared in `.gitmodules`.
 *
 * A submodule is a separate repository with its own pipeline, its own required checks and its own
 * releases. Detecting its packages here would make a super-repository claim work that is already
 * built elsewhere - typesetting the same thesis twice, and publishing two copies that can disagree.
 *
 * @param root Absolute repository root.
 * @returns Repository-relative submodule paths; empty when there are none.
 */
export function submodulePaths(root: string): Set<string> {
	const path = join(root, ".gitmodules");
	if (!existsSync(path)) return new Set();
	let source: string;
	try {
		source = readFileSync(path, "utf8");
	} catch {
		return new Set();
	}
	return new Set(
		[...source.matchAll(/^[ \t]*path[ \t]*=[ \t]*(.+?)[ \t]*$/gmu)].map((match) => (match[1] ?? "").trim()),
	);
}

/** Collects the manifests in one directory, then descends into the subdirectories worth entering. */
function walk(root: string, directory: string, submodules: ReadonlySet<string>, found: Package[]): void {
	if ((directory === "." ? 0 : directory.split("/").length) > MAX_DEPTH) return;
	const absolute = directory === "." ? root : join(root, directory);
	let entries: Dirent[];
	try {
		entries = readdirSync(absolute, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		if (!entry.isFile() || MANIFEST_ECOSYSTEMS[entry.name] === undefined) continue;
		const found0 = readPackage(root, directory, entry.name);
		if (found0) found.push(found0);
	}
	for (const entry of entries) {
		if (!entry.isDirectory() || PRUNED_DIRECTORIES.has(entry.name) || entry.name.startsWith(".")) continue;
		const child = directory === "." ? entry.name : `${directory}/${entry.name}`;
		if (!submodules.has(child)) walk(root, child, submodules, found);
	}
}

/**
 * Walks a repository and reports every package manifest it holds.
 *
 * @param root Absolute or relative path to the repository root.
 * @returns Packages, root-level ones first, then by path and ecosystem.
 */
export function detect(root: string): Package[] {
	const repositoryRoot = resolve(root);
	const submodules = submodulePaths(repositoryRoot);
	const found: Package[] = [];
	walk(repositoryRoot, ".", submodules, found);

	// A directory with both pyproject.toml and setup.py is one Python package, not two. A later
	// manifest that names the package wins over an earlier one that does not.
	const deduplicated = new Map<string, Package>();
	for (const entry of found) {
		const key = `${entry.path} ${entry.ecosystem}`;
		const existing = deduplicated.get(key);
		if (!existing || (existing.name === null && entry.name !== null)) deduplicated.set(key, entry);
	}

	const packages = [...deduplicated.values()].sort(byPackageOrder);
	const pnpm = pnpmMembers(repositoryRoot);
	if (pnpm.length > 0) {
		for (const entry of packages) {
			if (entry.path === "." && entry.ecosystem === "node" && entry.members.length === 0) {
				entry.members = pnpm;
				entry.isWorkspaceRoot = true;
			}
		}
	}
	return packages;
}

/** Root-level packages first, then by path and ecosystem, so the order never depends on readdir. */
function byPackageOrder(left: Package, right: Package): number {
	return (
		Number(left.path !== ".") - Number(right.path !== ".") ||
		left.path.localeCompare(right.path) ||
		left.ecosystem.localeCompare(right.ecosystem)
	);
}

/** The `environment` block of the repository declaration, or an empty mapping when there is none. */
function declaredEnvironment(root: string): Record<string, unknown> {
	const path = resolveConfigDocumentPath(root);
	if (!path) return {};
	return record(configBlock(parseConfigDocument(readFileSync(path, "utf8"), path), "repo", path)?.environment) ?? {};
}

/**
 * Detects the repository's shape, then applies the declared overrides.
 *
 * Declared entries extend what detection found and can exclude paths detection picked up. A
 * repository that declares nothing gets pure detection.
 *
 * @param root Absolute or relative path to the repository root.
 * @returns The configured environment.
 */
export function configure(root: string): Environment {
	const repositoryRoot = resolve(root);
	const declared = declaredEnvironment(repositoryRoot);
	let packages = detect(repositoryRoot);

	const ignore = stringArray(declared.ignore);
	if (ignore.length > 0) {
		packages = packages.filter((entry) => !ignore.some((pattern) => fnmatch(entry.path, pattern)));
	}

	for (const raw of Array.isArray(declared.packages) ? declared.packages : []) {
		const entry = record(raw);
		if (!entry) continue;
		const path = typeof entry.path === "string" ? entry.path : ".";
		const existing = packages.find(
			(candidate) => candidate.path === path && candidate.ecosystem === (entry.ecosystem ?? ""),
		);
		if (existing) {
			// A declaration may correct a detected package's identity, which is the case detection
			// cannot see: a manifest that names no version, or a vendored one standing in for a
			// real one.
			if (entry.name) existing.name = String(entry.name);
			if (entry.version) existing.version = String(entry.version);
			if (entry.manifest) existing.manifest = String(entry.manifest);
		} else {
			packages.push(
				new Package(
					path,
					String(entry.ecosystem ?? ""),
					typeof entry.manifest === "string" ? entry.manifest : "",
					optionalString(entry.name),
					optionalString(entry.version),
				),
			);
		}
	}

	packages.sort(byPackageOrder);
	return new Environment(repositoryRoot, packages, declared);
}
