import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { type Package, type TaskKind } from "@darkfactory/protocol/model";

/**
 * Ecosystem-to-domain mapping.
 */
export const DOMAINS: Record<string, string> = {
	python: "code",
	node: "code",
	deno: "code",
	rust: "code",
	go: "code",
	typst: "paper",
	latex: "paper",
	lean: "math",
};

/**
 * Default domain for unknown ecosystems.
 */
export const DEFAULT_DOMAIN = "code";

/**
 * Manifest filename to ecosystem mapping.
 */
export const MANIFESTS: Record<string, string> = {
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

/**
 * Directories to prune during detection.
 */
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

/**
 * Lockfiles for ecosystem-specific package manager detection.
 */
export const LOCKFILES: Record<string, Array<[string, string]>> = {
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

/**
 * Default test commands by ecosystem and manager.
 */
export const TEST_COMMANDS: Record<string, Record<string | "default", string>> = {
	python: {
		uv: "uv run pytest",
		poetry: "poetry run pytest",
		default: "pytest",
	},
	node: {
		bun: "bun test",
		pnpm: "pnpm test",
		yarn: "yarn test",
		npm: "npm test",
		default: "npm test",
	},
	deno: { default: "deno test -A" },
	rust: { default: "cargo test --all-features --workspace" },
	go: { default: "go test ./..." },
	typst: { default: "typst compile main.typ out/paper.pdf" },
	latex: { default: "latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex" },
	lean: { default: "lake build" },
};

/**
 * Default formatter commands by ecosystem and manager.
 */
export const FORMAT_COMMANDS: Record<string, Record<string | "default", string>> = {
	python: {
		uv: "uv run black .",
		poetry: "poetry run black .",
		default: "black .",
	},
	node: {
		bun: "bun run format",
		pnpm: "pnpm run format",
		yarn: "yarn format",
		npm: "npm run format",
		default: "npx prettier --write .",
	},
	deno: { default: "deno fmt" },
	rust: { default: "cargo fmt --all" },
	go: { default: "gofmt -w ." },
	typst: { default: "typstyle --inplace ." },
	latex: { default: "latexindent --overwrite --silent main.tex" },
};

/**
 * Ecosystem-to-doc-source mapping.
 */
export const DOC_SOURCES: Record<string, string> = {
	python: "docstrings",
	node: "tsdoc",
	deno: "jsdoc",
	rust: "rustdoc",
	go: "godoc",
};

/**
 * Default documentation commands by ecosystem and manager.
 */
export const DOC_COMMANDS: Record<string, Record<string | "default", string>> = {
	python: {
		uv: "uv run properdocs build --strict",
		default: "properdocs build --strict",
	},
	node: {
		bun: "bun run docs",
		pnpm: "pnpm run docs",
		yarn: "yarn docs",
		npm: "npm run docs",
		default: "npx typedoc",
	},
	deno: { default: "deno doc --html" },
	rust: { default: "cargo doc --no-deps --all-features" },
	go: { default: "go doc ./..." },
};

/**
 * Formatter markers that override defaults.
 */
export const FORMATTER_MARKERS: Array<[string, string, string]> = [
	["biome.json", "node", "npx @biomejs/biome format --write ."],
	["biome.jsonc", "node", "npx @biomejs/biome format --write ."],
	["ruff.toml", "python", "ruff format ."],
	[".ruff.toml", "python", "ruff format ."],
];

/**
 * Environment-resolved package details.
 */
export interface ResolvedPackage extends Package {
	manager?: string;
	domain: string;
}

/**
 * Resolved command plan for a task.
 */
export interface CommandPlan {
	command: string;
	versions: string[];
	manager?: string;
	source?: string;
	artifacts?: string[];
}

/**
 * Repository-wide environment and capabilities.
 */
export class Environment {
	constructor(
		public readonly root: string,
		public readonly packages: ResolvedPackage[],
		public readonly declared: Record<string, any>,
	) {}

	/**
	 * Returns distinct ecosystems present in the repository.
	 */
	get ecosystems(): Set<string> {
		return new Set(this.packages.map((p) => p.ecosystem));
	}

	/**
	 * Returns distinct domains present in the repository.
	 */
	get domains(): Set<string> {
		return new Set(this.packages.map((p) => p.domain));
	}

	/**
	 * Works out the command plan for a given task kind.
	 */
	plan(kind: TaskKind | "formatting" | "documentation" | "release"): Record<string, CommandPlan> {
		const blockKey = kind === "test" ? "testing" : kind;
		const declared = this.declared[blockKey] ?? {};
		const defaults = this.getDefaults(kind);
		const matrix = kind === "test" ? { python: ["3.10", "3.11", "3.12", "3.13"] } : {};

		const result: Record<string, CommandPlan> = {};

		for (const ecosystem of this.ecosystems) {
			const settings = declared[ecosystem] ?? {};
			if (settings.enabled === false) continue;

			const manager = this.getPackageManager(ecosystem);
			let command = settings.command ?? this.getMarkerCommand(ecosystem, kind);
			command = command ?? defaults[ecosystem]?.[manager ?? "default"] ?? defaults[ecosystem]?.default;

			if (!command) continue;

			const plan: CommandPlan = {
				command,
				versions: settings.versions ?? (matrix as any)[ecosystem] ?? [],
				manager: manager ?? undefined,
			};

			if (kind === "documentation") {
				plan.source = settings.source ?? DOC_SOURCES[ecosystem];
			}

			result[ecosystem] = plan;
		}

		// Handle explicitly declared but undetectable suites
		for (const [ecosystem, settings] of Object.entries(declared)) {
			if (ecosystem.startsWith("$") || typeof settings !== "object" || settings === null) continue;
			if (result[ecosystem] || (settings as any).enabled === false) continue;

			if ((settings as any).command) {
				result[ecosystem] = {
					command: (settings as any).command,
					versions: (settings as any).versions ?? [],
				};
			}
		}

		return result;
	}

	private getDefaults(kind: string): Record<string, Record<string | "default", string>> {
		if (kind === "test") return TEST_COMMANDS;
		if (kind === "formatting") return FORMAT_COMMANDS;
		if (kind === "documentation") return DOC_COMMANDS;
		return {};
	}

	private getPackageManager(ecosystem: string): string | undefined {
		if (this.declared.package_managers?.[ecosystem]) return this.declared.package_managers[ecosystem];
		const candidates = LOCKFILES[ecosystem] ?? [];
		for (const pkg of this.packages) {
			if (pkg.ecosystem !== ecosystem) continue;
			for (const [file, manager] of candidates) {
				if (existsSync(join(this.root, pkg.path, file))) return manager;
			}
		}
		return undefined;
	}

	private getMarkerCommand(ecosystem: string, kind: string): string | undefined {
		if (kind !== "formatting") return undefined;
		for (const [file, markerEcosystem, command] of FORMATTER_MARKERS) {
			if (markerEcosystem !== ecosystem) continue;
			for (const pkg of this.packages) {
				if (pkg.ecosystem === ecosystem && existsSync(join(this.root, pkg.path, file))) return command;
			}
		}
		return undefined;
	}
}

/**
 * Detects the repository's shape and resolves it into an Environment.
 */
export async function detectEnvironment(root: string): Promise<Environment> {
	const absoluteRoot = resolve(root);
	const packages = walk(absoluteRoot);

	// Load manifest
	let declared: Record<string, any> = {};
	const manifestPaths = [join(absoluteRoot, ".darkfactory", "repo.df"), join(absoluteRoot, "repo.df")];
	for (const path of manifestPaths) {
		if (existsSync(path)) {
			try {
				declared = JSON.parse(readFileSync(path, "utf-8")).environment ?? {};
				break;
			} catch {
				// skip malformed
			}
		}
	}

	// Apply ignore
	const ignore = (declared.ignore ?? []).map((p: string) => p.replace(/\/$/u, ""));
	const filteredPackages = packages.filter((pkg) => !ignore.some((pattern: string) => pkg.path === pattern));

	// Apply declared packages
	const resolved: ResolvedPackage[] = filteredPackages.map((p) => ({
		...p,
		domain: DOMAINS[p.ecosystem] ?? DEFAULT_DOMAIN,
	}));

	for (const entry of declared.packages ?? []) {
		const path = entry.path ?? ".";
		const ecosystem = entry.ecosystem;
		const existing = resolved.find((p) => p.path === path && p.ecosystem === ecosystem);
		if (existing) {
			if (entry.name) existing.name = entry.name;
			if (entry.version) existing.version = entry.version;
			if (entry.manifest) existing.manifest = entry.manifest;
		} else {
			resolved.push({
				path,
				ecosystem,
				manifest: entry.manifest ?? "",
				name: entry.name,
				version: entry.version,
				domain: DOMAINS[ecosystem] ?? DEFAULT_DOMAIN,
			});
		}
	}

	return new Environment(
		absoluteRoot,
		resolved.sort((a, b) => (a.path === "." ? -1 : b.path === "." ? 1 : a.path.localeCompare(b.path))),
		declared,
	);
}

function walk(root: string): Package[] {
	const found: Package[] = [];
	const submodules = getSubmodules(root);

	function scan(dir: string) {
		const relativeDir = relative(root, dir).replace(/\\/gu, "/") || ".";
		if (submodules.has(relativeDir)) return;

		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				if (PRUNED.has(entry.name) || entry.name.startsWith(".")) continue;
				scan(join(dir, entry.name));
			} else if (MANIFESTS[entry.name]) {
				const pkg = readPackage(root, relativeDir, entry.name);
				if (pkg) found.push(pkg);
			}
		}
	}

	scan(root);

	// Deduplicate by (path, ecosystem)
	const seen = new Set<string>();
	return found.filter((p) => {
		const key = `${p.path}:${p.ecosystem}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function readPackage(root: string, directory: string, filename: string): Package | undefined {
	const ecosystem = MANIFESTS[filename];
	const relPath = directory === "." ? filename : `${directory}/${filename}`;
	const absPath = join(root, relPath);

	let name: string | undefined;
	let version: string | undefined;

	try {
		if (filename === "package.json") {
			const data = JSON.parse(readFileSync(absPath, "utf-8"));
			name = data.name;
			version = data.version;
		} else if (filename === "pyproject.toml") {
			const content = readFileSync(absPath, "utf-8");
			// Simple regex for name/version to avoid TOML dependency in core if possible
			name = content.match(/^name\s*=\s*["'](.+?)["']/mu)?.[1];
			version = content.match(/^version\s*=\s*["'](.+?)["']/mu)?.[1];
			if (!name) {
				const projectMatch = content.match(/\[project\][^]*?name\s*=\s*["'](.+?)["']/mu);
				name = projectMatch?.[1];
				version = version ?? content.match(/\[project\][^]*?version\s*=\s*["'](.+?)["']/mu)?.[1];
			}
		}
		// ... other ecosystems can be added as needed, matching environment.py logic
	} catch {
		// ignore read errors
	}

	return {
		path: directory,
		ecosystem,
		manifest: relPath,
		name,
		version,
	};
}

function getSubmodules(root: string): Set<string> {
	const path = join(root, ".gitmodules");
	if (!existsSync(path)) return new Set();
	const content = readFileSync(path, "utf-8");
	const matches = content.matchAll(/^\s*path\s*=\s*(.+?)\s*$/gmu);
	return new Set([...matches].map((m) => m[1].trim()));
}
