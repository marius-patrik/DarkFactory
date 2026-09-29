/**
 * The repository shape a release needs, and nothing else.
 *
 * A release asks three questions about a repository: which ecosystems are in it, how each one is
 * built, and what version each of its manifests declares. This answers exactly those, and nothing
 * about testing, linting, formatting or the capability matrix — those belong to the CI surface, not
 * to the release.
 *
 * **This is a scoped view, not the whole environment.** The full detection, declaration-override
 * and planning surface is larger than a release uses, and the pipeline's environment module is being
 * ported separately. When that port lands, this file's tables and walk are expected to be absorbed
 * into it and this module deleted, rather than left as a second answer to "what is in here". Until
 * then it is the only TypeScript that can see a package's `version` or its workspace members, which
 * is what makes a release tag and a release's asset list agree with the tree they claim to describe.
 */
import { type Dirent, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "../../../protocol/src/config-document.ts";

/** Directories never worth descending into when looking for package manifests. */
const PRUNED: ReadonlySet<string> = new Set([
	".git",
	".venv",
	"venv",
	"node_modules",
	"target",
	"dist",
	"build",
	"site",
	"__pycache__",
	".pytest_cache",
	".mypy_cache",
	".ruff_cache",
	"vendor",
]);

/** Manifest filename -> the ecosystem it declares. */
const MANIFESTS: Readonly<Record<string, string>> = {
	"pyproject.toml": "python",
	"setup.py": "python",
	"setup.cfg": "python",
	"package.json": "node",
	"Cargo.toml": "rust",
	"go.mod": "go",
	"deno.json": "deno",
	"deno.jsonc": "deno",
	"lakefile.lean": "lean",
	"lakefile.toml": "lean",
	"typst.toml": "typst",
	// LaTeX has no manifest convention as settled as the others. `.latexmkrc` is the closest thing
	// to one and is already read by latexmk, so a repository that builds with latexmk is detected
	// without being asked to carry a file it would not otherwise have.
	".latexmkrc": "latex",
};

/** How far below the root to look for member packages when no workspace globs are declared. */
const MAX_DEPTH = 4;

/** The package manager a lockfile identifies, per ecosystem, most specific first. */
const LOCKFILES: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
	node: [
		["bun.lock", "bun"],
		["bun.lockb", "bun"],
		["pnpm-lock.yaml", "pnpm"],
		["yarn.lock", "yarn"],
		["package-lock.json", "npm"],
	],
	deno: [["deno.lock", "deno"]],
	python: [
		["uv.lock", "uv"],
		["poetry.lock", "poetry"],
		["Pipfile.lock", "pipenv"],
	],
	rust: [["Cargo.lock", "cargo"]],
	go: [["go.sum", "go"]],
};

/** The manager value meaning "no lockfile identified one", which is what the tables below key on. */
const NO_MANAGER = "";

/** Default release-build command per ecosystem, keyed by package manager where it decides. */
const BUILD_COMMANDS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
	python: { uv: "uv build", poetry: "poetry build", [NO_MANAGER]: "python -m build" },
	node: {
		bun: "bun run build",
		pnpm: "pnpm run build",
		yarn: "yarn build",
		npm: "npm run build",
		[NO_MANAGER]: "npm run build",
	},
	deno: { [NO_MANAGER]: "deno compile -A" },
	rust: { [NO_MANAGER]: "cargo build --release --workspace" },
	go: { [NO_MANAGER]: "go build ./..." },
	// Same command as the test: there is no separate release build of a document.
	typst: { [NO_MANAGER]: "typst compile main.typ out/paper.pdf" },
	latex: { [NO_MANAGER]: "latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex" },
};

/** Where each ecosystem leaves the artifacts a release should attach, relative to the package. */
const ARTIFACT_GLOBS: Readonly<Record<string, readonly string[]>> = {
	python: ["dist/*.whl", "dist/*.tar.gz"],
	node: ["dist/**", "build/**"],
	deno: ["dist/**"],
	rust: ["target/release/*.tar.gz", "target/release/*.zip"],
	go: ["bin/*"],
	// The document itself is the release. `out/` is where both engines are told to put it above;
	// the bare glob catches a repository that typesets in place.
	typst: ["out/*.pdf", "*.pdf"],
	latex: ["out/*.pdf", "*.pdf"],
	// A proof releases nothing: its value is that it checked, not that it produced a file.
	lean: [],
};

/** One buildable unit inside a repository. */
interface ReleasePackage {
	/** Directory holding the package, relative to the repository root (`"."` for the root). */
	path: string;
	/** One of the values in the manifest table above. */
	ecosystem: string;
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
}

/** How one ecosystem's release artifacts are produced. */
interface ReleaseBuildPlanEntry {
	/** The build command, or `null` when neither detection nor declaration names one. */
	command: string | null;
	/** The package manager the command was chosen for. */
	manager: string | null;
	/** Artifact globs relative to each package directory. */
	artifacts: string[];
}

/** The `repo.environment` block, as far as a release reads it. */
interface DeclaredEnvironment {
	ignore?: string[];
	packages?: {
		path?: string;
		ecosystem?: string;
		manifest?: string;
		name?: string;
		version?: string;
	}[];
	release?: Record<string, { command?: string; artifacts?: string[]; enabled?: boolean }>;
}

/** Reads and parses a TOML file, tolerating an absent or malformed document. */
function loadToml(path: string): Record<string, unknown> {
	try {
		return Bun.TOML.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
	} catch {
		return {};
	}
}

/** Parses a JSON file, tolerating malformed content. */
function loadJson(path: string): Record<string, unknown> {
	try {
		const loaded = JSON.parse(readFileSync(path, "utf8")) as unknown;
		return loaded && typeof loaded === "object" && !Array.isArray(loaded) ? (loaded as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

/** Reads a `[table]` from a parsed TOML document, or an empty mapping when it is absent. */
function table(document: Record<string, unknown>, key: string): Record<string, unknown> {
	const value = document[key];
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** A string field, or `null` when the document does not state one. */
function text(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

/** A string list, or an empty list when the document states none. */
function texts(value: unknown): string[] {
	return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

/** Builds a package from one manifest file, or `null` when the file declares nothing useful. */
function readPackage(root: string, directory: string, filename: string): ReleasePackage | null {
	const ecosystem = MANIFESTS[filename] ?? "";
	const relativeManifest = directory === "." ? filename : `${directory}/${filename}`;
	const absolute = join(root, relativeManifest);
	let name: string | null = null;
	let version: string | null = null;
	let members: string[] = [];

	if (filename === "package.json") {
		const data = loadJson(absolute);
		name = text(data.name);
		version = text(data.version);
		const workspaces = data.workspaces;
		members = Array.isArray(workspaces) ? texts(workspaces) : texts(table(data, "workspaces").packages);
	} else if (filename === "pyproject.toml") {
		const data = loadToml(absolute);
		const project = table(data, "project");
		const poetry = table(table(data, "tool"), "poetry");
		name = text(project.name) ?? text(poetry.name);
		version = text(project.version) ?? text(poetry.version);
		const uv = table(table(data, "tool"), "uv");
		members = texts(table(uv, "workspace").members);
	} else if (filename === "Cargo.toml") {
		const data = loadToml(absolute);
		const declared = table(data, "package");
		name = text(declared.name);
		const versionValue = declared.version;
		// `version.workspace = true` inherits the version rather than declaring one.
		version = typeof versionValue === "string" ? versionValue : null;
		members = texts(table(data, "workspace").members);
		// A Cargo file with neither a package nor a workspace is configuration for something else.
		if (!name && members.length === 0) return null;
	} else if (filename === "typst.toml") {
		// Typst declares a package the same way Cargo does, under a [package] table. A document is
		// not obliged to declare one - `typst.toml` is optional for a plain paper - so an empty
		// table still yields a package, unlike Cargo above.
		const declared = table(loadToml(absolute), "package");
		name = text(declared.name);
		version = text(declared.version);
	} else if (filename === "lakefile.toml") {
		// A Lean build file names its targets in Lean or TOML respectively. Only the TOML form is
		// worth parsing; the Lean form is a program, and its presence is the signal.
		const data = loadToml(absolute);
		name = text(data.name);
		version = text(data.version);
	} else if (filename === ".latexmkrc") {
		// A latexmk configuration is Perl, not a manifest: it names no package and carries no
		// version. Its presence is the whole signal.
	} else if (filename === "go.mod") {
		try {
			name = /^module\s+(\S+)/mu.exec(readFileSync(absolute, "utf8"))?.[1] ?? null;
		} catch {
			return null;
		}
	} else if (filename === "deno.json" || filename === "deno.jsonc") {
		const data = loadJson(absolute);
		name = text(data.name);
		version = text(data.version);
		members = texts(data.workspace);
	}
	// `setup.py` and `setup.cfg` are marker formats: presence is the signal, contents are not read.

	return {
		path: directory,
		ecosystem,
		manifest: relativeManifest,
		name,
		version,
		isWorkspaceRoot: members.length > 0,
		members,
	};
}

/** Reads workspace globs from `pnpm-workspace.yaml` without a YAML dependency. */
function pnpmMembers(root: string): string[] {
	const path = join(root, "pnpm-workspace.yaml");
	if (!existsSync(path)) return [];
	const globs: string[] = [];
	let inPackages = false;
	for (const line of readFileSync(path, "utf8").split("\n")) {
		const stripped = line.trim();
		if (stripped.startsWith("packages:")) {
			inPackages = true;
			continue;
		}
		if (!inPackages) continue;
		if (stripped.startsWith("- "))
			globs.push(
				stripped
					.slice(2)
					.trim()
					.replace(/^['"]|['"]$/gu, ""),
			);
		else if (stripped && !stripped.startsWith("#")) break;
	}
	return globs;
}

/**
 * Reads the submodule paths declared in `.gitmodules`.
 *
 * A submodule is a separate repository with its own pipeline and its own releases. Detecting its
 * packages here would make a super-repository claim work that is already built elsewhere, and
 * publish two copies of a thesis that can disagree.
 */
function submodulePaths(root: string): ReadonlySet<string> {
	const path = join(root, ".gitmodules");
	if (!existsSync(path)) return new Set();
	return new Set(
		[...readFileSync(path, "utf8").matchAll(/^\s*path\s*=\s*(?<path>.+?)\s*$/gmu)].map(
			(match) => match.groups?.path ?? "",
		),
	);
}

/** Matches a repository-relative path against a shell-style glob, as the ignore list is written. */
function matchesGlob(name: string, pattern: string): boolean {
	const source = pattern
		.replace(/[.+^${}()|\\]/gu, "\\$&")
		.replace(/\*/gu, ".*")
		.replace(/\?/gu, ".")
		.replace(/\[!/gu, "[^")
		.replace(/\[/gu, "([")
		.replace(/\]/gu, "])");
	try {
		return new RegExp(`^${source}$`, "u").test(name);
	} catch {
		// A character class the pattern does not close is a typo in the ignore list, not a reason
		// for the release job to fail; an unmatchable pattern excludes nothing.
		return name === pattern;
	}
}

/** Walks a repository and reports every package manifest it holds. */
function detect(root: string): ReleasePackage[] {
	const submodules = submodulePaths(root);
	const found: ReleasePackage[] = [];

	const walk = (directory: string): void => {
		const rel = relative(root, directory).replaceAll("\\", "/") || ".";
		const depth = rel === "." ? 0 : rel.split("/").length;
		if (depth > MAX_DEPTH) return;
		let entries: Dirent[];
		try {
			entries = readdirSync(directory, { withFileTypes: true });
		} catch {
			return;
		}
		// A stable order makes the result independent of the filesystem's, which the Python's
		// directory listing was not whenever one directory held two manifests of a kind.
		for (const entry of [...entries].sort((left, right) => left.name.localeCompare(right.name))) {
			if (!entry.isFile() || !(entry.name in MANIFESTS)) continue;
			const candidate = readPackage(root, rel, entry.name);
			if (candidate) found.push(candidate);
		}
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			if (PRUNED.has(entry.name) || entry.name.startsWith(".")) continue;
			if (submodules.has(relative(root, join(directory, entry.name)).replaceAll("\\", "/"))) continue;
			walk(join(directory, entry.name));
		}
	};
	walk(root);

	// A directory with both pyproject.toml and setup.py is one Python package, not two.
	const deduplicated = new Map<string, ReleasePackage>();
	for (const candidate of found) {
		const key = `${candidate.path} ${candidate.ecosystem}`;
		const existing = deduplicated.get(key);
		if (!existing || (existing.name === null && candidate.name !== null)) deduplicated.set(key, candidate);
	}

	const packages = [...deduplicated.values()].sort((left, right) => {
		if (left.path !== right.path) {
			if (left.path === ".") return -1;
			if (right.path === ".") return 1;
			return left.path.localeCompare(right.path);
		}
		return 0;
	});

	const pnpm = pnpmMembers(root);
	if (pnpm.length > 0) {
		for (const candidate of packages) {
			if (candidate.path !== "." || candidate.ecosystem !== "node") continue;
			if (candidate.members.length > 0) continue;
			candidate.members = pnpm;
			candidate.isWorkspaceRoot = true;
		}
	}
	return packages;
}

/** The `repo.environment` block, defaulted to empty. */
function declaredEnvironment(root: string): DeclaredEnvironment {
	const path = resolveConfigDocumentPath(root);
	if (!path) return {};
	const declared = configBlock(parseConfigDocument(readFileSync(path, "utf8"), path), "repo", path)?.environment;
	return declared && typeof declared === "object" && !Array.isArray(declared) ? (declared as DeclaredEnvironment) : {};
}

/** Everything a release needs to know about a repository's shape. */
interface ReleaseEnvironment {
	readonly root: string;
	readonly packages: readonly ReleasePackage[];
	readonly ecosystems: readonly string[];
	/** The packages belonging to one ecosystem, in discovery order. */
	packagesFor(ecosystem: string): ReleasePackage[];
	/** Identifies the package manager in use for an ecosystem, from its lockfile. */
	packageManager(ecosystem: string): string | null;
	/** How to build each ecosystem's release artifacts. */
	buildPlan(): Record<string, ReleaseBuildPlanEntry>;
}

/**
 * Detects the repository's shape, then applies the manifest's declared overrides.
 *
 * Declared entries extend what detection found and can exclude paths detection picked up. A
 * repository that declares nothing gets pure detection.
 */
export function configure(rootDir: string): ReleaseEnvironment {
	const root = resolve(rootDir);
	const declared = declaredEnvironment(root);
	let packages = detect(root);

	const ignore = Array.isArray(declared.ignore) ? declared.ignore : [];
	if (ignore.length > 0) {
		packages = packages.filter((candidate) => !ignore.some((pattern) => matchesGlob(candidate.path, pattern)));
	}

	for (const entry of Array.isArray(declared.packages) ? declared.packages : []) {
		const path = String(entry.path ?? ".");
		const ecosystem = String(entry.ecosystem ?? "");
		const existing = packages.find((candidate) => candidate.path === path && candidate.ecosystem === ecosystem);
		if (existing) {
			if (entry.name) existing.name = entry.name;
			if (entry.version) existing.version = entry.version;
			if (entry.manifest) existing.manifest = entry.manifest;
		} else {
			packages.push({
				path,
				ecosystem,
				manifest: String(entry.manifest ?? ""),
				name: entry.name ?? null,
				version: entry.version ?? null,
				isWorkspaceRoot: false,
				members: [],
			});
		}
	}

	packages.sort((left, right) => {
		if (left.path !== right.path) {
			if (left.path === ".") return -1;
			if (right.path === ".") return 1;
			return left.path.localeCompare(right.path);
		}
		return left.ecosystem.localeCompare(right.ecosystem);
	});

	const environment: ReleaseEnvironment = {
		root,
		packages,
		ecosystems: [...new Set(packages.map((candidate) => candidate.ecosystem))].sort(),
		packagesFor: (ecosystem) => packages.filter((candidate) => candidate.ecosystem === ecosystem),
		packageManager: (ecosystem) => {
			for (const candidate of packages.filter((entry) => entry.ecosystem === ecosystem)) {
				for (const [filename, manager] of LOCKFILES[ecosystem] ?? []) {
					if (existsSync(join(root, candidate.path, filename))) return manager;
				}
			}
			return null;
		},
		buildPlan: () => {
			const declaredOverrides = declared.release;
			const overrides =
				declaredOverrides && typeof declaredOverrides === "object" && !Array.isArray(declaredOverrides)
					? declaredOverrides
					: {};
			const plan: Record<string, ReleaseBuildPlanEntry> = {};
			for (const ecosystem of environment.ecosystems) {
				const settings = overrides[ecosystem] ?? {};
				if (settings.enabled === false) continue;
				const manager = environment.packageManager(ecosystem);
				const commands = BUILD_COMMANDS[ecosystem] ?? {};
				plan[ecosystem] = {
					command: settings.command ?? commands[manager ?? NO_MANAGER] ?? null,
					manager,
					artifacts: [...(settings.artifacts ?? ARTIFACT_GLOBS[ecosystem] ?? [])],
				};
			}
			// An ecosystem the repository does not contain can still be declared, for work detection
			// cannot see; `$comment` keys carry prose rather than settings.
			for (const [ecosystem, settings] of Object.entries(overrides)) {
				if (ecosystem.startsWith("$") || ecosystem in plan) continue;
				if (settings.enabled === false || !settings.command) continue;
				plan[ecosystem] = { command: settings.command, manager: null, artifacts: [...(settings.artifacts ?? [])] };
			}
			return plan;
		},
	};
	return environment;
}
