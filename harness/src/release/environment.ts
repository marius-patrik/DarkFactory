/** @packageDocumentation
 * Environment detection for release planning - ported from Python environment.py.
 * Provides package detection, build planning, and ecosystem identification.
 */

import { existsSync, readFileSync } from "node:fs";
import { globSync } from "node:glob";
import { resolve, relative, sep } from "node:path";
import { loadRepoManifest } from "./manifest.ts";

/** Directories never worth descending into when looking for package manifests. */
const PRUNED = new Set([
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

/** Manifest filename -> ecosystem it declares. */
const MANIFESTS: Record<string, string> = {
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
	".latexmkrc": "latex",
};

/** Ecosystem -> the domain it belongs to. */
const DOMAINS: Record<string, string> = {
	python: "code",
	node: "code",
	deno: "code",
	rust: "code",
	go: "code",
	typst: "paper",
	latex: "paper",
	lean: "math",
};

const DEFAULT_DOMAIN = "code";

/** Ecosystem -> its lockfiles paired with the manager that writes them, most specific first. */
const LOCKFILES: Record<string, [string, string][]> = {
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

/** How far below the root to look for member packages when no workspace globs are declared. */
const MAX_DEPTH = 4;

/** Default release-build command per ecosystem, keyed by package manager where it decides. */
const BUILD_COMMANDS: Record<string, Record<string | null, string>> = {
	python: { uv: "uv build", poetry: "poetry build", null: "python -m build" },
	node: { bun: "bun run build", pnpm: "pnpm run build", yarn: "yarn build", npm: "npm run build", null: "npm run build" },
	deno: { null: "deno compile -A" },
	rust: { null: "cargo build --release --workspace" },
	go: { null: "go build ./..." },
	typst: { null: "typst compile main.typ out/paper.pdf" },
	latex: { null: "latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex" },
};

/** Where each ecosystem leaves the artifacts a release should attach, relative to the package. */
const ARTIFACT_GLOBS: Record<string, string[]> = {
	python: ["dist/*.whl", "dist/*.tar.gz"],
	node: ["dist/**", "build/**"],
	deno: ["dist/**"],
	rust: ["target/release/*.tar.gz", "target/release/*.zip"],
	go: ["bin/*"],
	typst: ["out/*.pdf", "*.pdf"],
	latex: ["out/*.pdf", "*.pdf"],
	lean: [],
};

/** Marker files that name a formatter outright, overriding the package-manager default. */
const FORMATTER_MARKERS: [string, string, string][] = [
	["biome.json", "node", "npx @biomejs/biome format --write ."],
	["biome.jsonc", "node", "npx @biomejs/biome format --write ."],
	["ruff.toml", "python", "ruff format ."],
	[".ruff.toml", "python", "ruff format ."],
];

/** One buildable unit inside a repository. */
export interface Package {
	path: string;
	ecosystem: string;
	domain: string;
	manifest: string;
	name: string | null;
	version: string | null;
	isWorkspaceRoot: boolean;
	members: string[];
}

/** Everything the pipeline needs to know about a repository's shape. */
export interface Environment {
	root: string;
	packages: Package[];
	declared: Record<string, unknown>;
	ecosystems: Set<string>;
	domains: Set<string>;
	isMonorepo: boolean;
	isMultiDomain: boolean;
	packagesIn(domain: string): Package[];
	hasDomain(domain: string): boolean;
	packagesFor(ecosystem: string): Package[];
	has(ecosystem: string): boolean;
	packageManager(ecosystem: string): string | null;
	buildPlan(): Record<string, { command: string | undefined; versions: string[]; manager: string | null; artifacts: string[] }>;
}

/** Builds a `Package` from one manifest file. */
function readPackage(root: string, directory: string, filename: string): Package | null {
	const ecosystem = MANIFESTS[filename];
	const relPath = directory === "." ? filename : `${directory}/${filename}`;
	const absolute = resolve(root, relPath);

	let name: string | null = null;
	let version: string | null = null;
	let members: string[] = [];

	try {
		if (filename === "package.json") {
			const content = readFileSync(absolute, "utf8");
			const data = JSON.parse(content);
			name = data.name ?? null;
			version = data.version ?? null;
			const workspaces = data.workspaces;
			if (typeof workspaces === "object" && workspaces !== null && "packages" in workspaces) {
				members = (workspaces.packages as string[]).map(String);
			} else if (Array.isArray(workspaces)) {
				members = workspaces.map(String);
			}
		} else if (filename === "pyproject.toml") {
			const content = readFileSync(absolute, "utf8");
			// Simple TOML parsing for project.name, project.version, tool.uv.workspace.members
			const projectMatch = content.match(/^\[project\]/m);
			if (projectMatch) {
				const afterProject = content.slice(projectMatch.index! + "[project]".length);
				const nameMatch = afterProject.match(/^name\s*=\s*"([^"]+)"/m);
				const versionMatch = afterProject.match(/^version\s*=\s*"([^"]+)"/m);
				if (nameMatch) name = nameMatch[1];
				if (versionMatch) version = versionMatch[1];
			}
			// tool.uv.workspace.members
			const uvMatch = content.match(/\[tool\.uv\.workspace\]/m);
			if (uvMatch) {
				const afterUv = content.slice(uvMatch.index! + "[tool.uv.workspace]".length);
				const membersMatch = afterUv.match(/members\s*=\s*\[([^\]]+)\]/m);
				if (membersMatch) {
					members = membersMatch[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
				}
			}
			// tool.poetry fallback
			if (!name) {
				const poetryMatch = content.match(/\[tool\.poetry\]/m);
				if (poetryMatch) {
					const afterPoetry = content.slice(poetryMatch.index! + "[tool.poetry]".length);
					const nameMatch = afterPoetry.match(/^name\s*=\s*"([^"]+)"/m);
					const versionMatch = afterPoetry.match(/^version\s*=\s*"([^"]+)"/m);
					if (nameMatch) name = nameMatch[1];
					if (versionMatch) version = versionMatch[1];
				}
			}
		} else if (filename === "Cargo.toml") {
			const content = readFileSync(absolute, "utf8");
			const pkgMatch = content.match(/^\[package\]/m);
			if (pkgMatch) {
				const afterPkg = content.slice(pkgMatch.index! + "[package]".length);
				const nameMatch = afterPkg.match(/^name\s*=\s*"([^"]+)"/m);
				const versionMatch = afterPkg.match(/^version\s*=\s*"([^"]+)"/m);
				if (nameMatch) name = nameMatch[1];
				if (versionMatch) version = versionMatch[1];
			}
			const wsMatch = content.match(/^\[workspace\]/m);
			if (wsMatch) {
				const afterWs = content.slice(wsMatch.index! + "[workspace]".length);
				const membersMatch = afterWs.match(/members\s*=\s*\[([^\]]+)\]/m);
				if (membersMatch) {
					members = membersMatch[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
				}
			}
			if (!name && members.length === 0) return null;
		} else if (filename === "typst.toml") {
			const content = readFileSync(absolute, "utf8");
			const pkgMatch = content.match(/^\[package\]/m);
			if (pkgMatch) {
				const afterPkg = content.slice(pkgMatch.index! + "[package]".length);
				const nameMatch = afterPkg.match(/^name\s*=\s*"([^"]+)"/m);
				const versionMatch = afterPkg.match(/^version\s*=\s*"([^"]+)"/m);
				if (nameMatch) name = nameMatch[1];
				if (versionMatch) version = versionMatch[1];
			}
		} else if (filename === "lakefile.toml") {
			const content = readFileSync(absolute, "utf8");
			const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m);
			const versionMatch = content.match(/^version\s*=\s*"([^"]+)"/m);
			if (nameMatch) name = nameMatch[1];
			if (versionMatch) version = versionMatch[1];
		} else if (filename === ".latexmkrc") {
			// presence is the signal
		} else if (filename === "go.mod") {
			const content = readFileSync(absolute, "utf8");
			const match = content.match(/^module\s+(\S+)/m);
			name = match ? match[1] : null;
		} else if (filename === "deno.json" || filename === "deno.jsonc") {
			const content = readFileSync(absolute, "utf8");
			const data = JSON.parse(content);
			name = data.name ?? null;
			version = data.version ?? null;
			if (Array.isArray(data.workspace)) {
				members = data.workspace.map(String);
			}
		}
	} catch {
		return null;
	}

	return {
		path: directory,
		ecosystem,
		domain: DOMAINS[ecosystem] ?? DEFAULT_DOMAIN,
		manifest: relPath,
		name,
		version,
		isWorkspaceRoot: members.length > 0,
		members,
	};
}

/** Reads workspace globs from `pnpm-workspace.yaml` without a YAML dependency. */
function readPnpmMembers(root: string): string[] {
	const path = resolve(root, "pnpm-workspace.yaml");
	if (!existsSync(path)) return [];
	const content = readFileSync(path, "utf8");
	const globs: string[] = [];
	let inPackages = false;
	for (const line of content.split("\n")) {
		const stripped = line.trim();
		if (stripped.startsWith("packages:")) {
			inPackages = true;
			continue;
		}
		if (inPackages) {
			if (stripped.startsWith("- ")) {
				globs.push(stripped.slice(2).trim().replace(/^["']|["']$/g, ""));
			} else if (stripped && !stripped.startsWith("#")) {
				break;
			}
		}
	}
	return globs;
}

/** Reads the submodule paths declared in `.gitmodules`. */
function submodulePaths(root: string): Set<string> {
	const path = resolve(root, ".gitmodules");
	if (!existsSync(path)) return new Set();
	try {
		const content = readFileSync(path, "utf8");
		const paths = new Set<string>();
		const regex = /^\s*path\s*=\s*(.+?)\s*$/gm;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(content)) !== null) {
			paths.add(match[1].trim());
		}
		return paths;
	} catch {
		return new Set();
	}
}

/** Walks a repository and reports every package manifest it holds. */
function detect(root: string): Package[] {
	const absRoot = resolve(root);
	const submodules = submodulePaths(absRoot);
	const found: Package[] = [];

	function walk(current: string, depth: number) {
		if (depth > MAX_DEPTH) return;
		const entries = globSync("*", { cwd: current, nodir: false, dot: false });
		for (const entry of entries) {
			if (PRUNED.has(entry) || entry.startsWith(".")) continue;
			const relPath = relative(absRoot, resolve(current, entry)).replace(/\\/g, "/");
			if (submodules.has(relPath)) continue;
			const fullPath = resolve(current, entry);
			if (!existsSync(fullPath)) continue;
			const stat = require("node:fs").statSync(fullPath);
			if (!stat.isDirectory()) continue;
			walk(fullPath, depth + 1);
		}

		// Check for manifests in this directory
		const relDir = relative(absRoot, current).replace(/\\/g, "/");
		for (const filename of Object.keys(MANIFESTS)) {
			const manifestPath = resolve(current, filename);
			if (existsSync(manifestPath)) {
				const pkg = readPackage(absRoot, relDir === "." ? "." : relDir, filename);
				if (pkg) found.push(pkg);
			}
		}
	}

	walk(absRoot, 0);

	// Deduplicate: A directory with both pyproject.toml and setup.py is one Python package, not two.
	const deduplicated = new Map<string, Package>();
	for (const pkg of found) {
		const key = `${pkg.path}:${pkg.ecosystem}`;
		const existing = deduplicated.get(key);
		if (!existing || (existing.name === null && pkg.name !== null)) {
			deduplicated.set(key, pkg);
		}
	}

	const packages = [...deduplicated.values()].sort((a, b) => {
		if (a.path === "." && b.path !== ".") return -1;
		if (b.path === "." && a.path !== ".") return 1;
		return a.path.localeCompare(b.path);
	});

	const pnpm = readPnpmMembers(absRoot);
	if (pnpm.length > 0) {
		for (const pkg of packages) {
			if (pkg.path === "." && pkg.ecosystem === "node") {
				pkg.members = pkg.members.length > 0 ? pkg.members : pnpm;
				pkg.isWorkspaceRoot = true;
			}
		}
	}

	return packages;
}

/** Configures the environment: detects the repository's shape, then applies the manifest's declared overrides. */
export function configure(root: string): Environment {
	const absRoot = resolve(root);
	const manifest = loadRepoManifest(absRoot);
	const declared = (manifest.environment ?? {}) as Record<string, unknown>;

	let packages = detect(absRoot);

	// Apply ignore patterns
	const ignore = (declared.ignore as string[] | undefined) ?? [];
	if (ignore.length > 0) {
		const micromatch = require("micromatch");
		packages = packages.filter((pkg) => !ignore.some((pattern) => micromatch.isMatch(pkg.path, pattern)));
	}

	// Apply declared packages
	for (const entry of (declared.packages as Array<Record<string, unknown>> | undefined) ?? []) {
		const path = String(entry.path ?? ".");
		const ecosystem = String(entry.ecosystem ?? "");
		const existing = packages.find((p) => p.path === path && p.ecosystem === ecosystem);
		if (existing) {
			for (const field of ["name", "version", "manifest"] as const) {
				if (entry[field]) (existing as Record<string, unknown>)[field] = entry[field];
			}
		} else {
			packages.push({
				path,
				ecosystem,
				domain: DOMAINS[ecosystem] ?? DEFAULT_DOMAIN,
				manifest: String(entry.manifest ?? ""),
				name: entry.name as string | null,
				version: entry.version as string | null,
				isWorkspaceRoot: false,
				members: [],
			});
		}
	}

	packages.sort((a, b) => {
		if (a.path !== "." && b.path === ".") return 1;
		if (b.path !== "." && a.path === ".") return -1;
		if (a.path !== b.path) return a.path.localeCompare(b.path);
		return a.ecosystem.localeCompare(b.ecosystem);
	});

	const ecosystems = new Set(packages.map((p) => p.ecosystem));
	const domains = new Set(packages.map((p) => p.domain));
	const isMonorepo =
		packages.some((p) => p.isWorkspaceRoot && p.members.length > 0) || new Set(packages.map((p) => p.path)).size > 1;
	const isMultiDomain = domains.size > 1;

	return {
		root: absRoot,
		packages,
		declared,
		ecosystems,
		domains,
		isMonorepo,
		isMultiDomain,
		packagesIn(domain: string) {
			return packages.filter((p) => p.domain === domain);
		},
		hasDomain(domain: string) {
			return domains.has(domain);
		},
		packagesFor(ecosystem: string) {
			return packages.filter((p) => p.ecosystem === ecosystem);
		},
		has(ecosystem: string) {
			return ecosystems.has(ecosystem);
		},
		packageManager(ecosystem: string) {
			const declaredManagers = (declared.package_managers as Record<string, string> | undefined) ?? {};
			if (declaredManagers[ecosystem]) return declaredManagers[ecosystem];
			const candidates = LOCKFILES[ecosystem] ?? [];
			for (const pkg of packages.filter((p) => p.ecosystem === ecosystem)) {
				const dir = resolve(absRoot, pkg.path);
				for (const [filename, manager] of candidates) {
					if (existsSync(resolve(dir, filename))) return manager;
				}
			}
			return null;
		},
		buildPlan() {
			const plan: Record<string, { command: string | undefined; versions: string[]; manager: string | null; artifacts: string[] }> = {};
			const declaredRelease = (declared.release as Record<string, unknown> | undefined) ?? {};

			for (const ecosystem of [...ecosystems].sort()) {
				const settings = (declaredRelease[ecosystem] as Record<string, unknown> | undefined) ?? {};
				if (settings.enabled === false) continue;

				const manager = this.packageManager(ecosystem);
				const commands = BUILD_COMMANDS[ecosystem] ?? {};
				let command = settings.command as string | undefined;

				// Check for formatter markers (only for formatting block, but keep for consistency)
				if (!command) {
					for (const [markerFile, markerEcosystem, markerCommand] of FORMATTER_MARKERS) {
						if (markerEcosystem !== ecosystem) continue;
						for (const pkg of packages.filter((p) => p.ecosystem === ecosystem)) {
							if (existsSync(resolve(absRoot, pkg.path, markerFile))) {
								command = markerCommand;
								break;
							}
						}
						if (command) break;
					}
				}

				command = command ?? commands[manager ?? null] ?? commands[null];

				let versions = settings.versions as string[] | undefined;
				if (!versions) versions = [];

				const artifacts = [
					...(settings.artifacts as string[] | undefined ?? []),
					...(ARTIFACT_GLOBS[ecosystem] ?? []),
				];

				plan[ecosystem] = { command, versions, manager, artifacts };
			}

			// Add declared ecosystems not in detection
			for (const [ecosystem, settings] of Object.entries(declaredRelease)) {
				if (ecosystem.startsWith("$")) continue;
				if (!plan[ecosystem] && settings && typeof settings === "object" && settings.enabled !== false) {
					if (settings.command) {
						plan[ecosystem] = {
							command: String(settings.command),
							versions: (settings.versions as string[] ?? []).map(String),
							manager: null,
							artifacts: (settings.artifacts as string[] ?? []).map(String),
						};
					}
				}
			}

			return plan;
		},
	};
}