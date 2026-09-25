/** @packageDocumentation
 * Repository/package/domain evidence discovery owned by the DarkFactory core mechanism.
 */

import { configBlock, parseConfigDocument, resolveConfigDocumentPath } from "@darkfactory/protocol/config-document";
import { access, readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

export type RepositoryEcosystem = "node" | "python" | "rust" | "go" | "deno" | "typst" | "latex" | "lean";

export type PackageManager =
	| "bun"
	| "npm"
	| "pnpm"
	| "yarn"
	| "pip"
	| "uv"
	| "poetry"
	| "pipenv"
	| "cargo"
	| "go"
	| "deno"
	| "typst"
	| "latexmk"
	| "lake";

const ECOSYSTEM_DOMAIN: Readonly<Record<RepositoryEcosystem, string>> = {
	node: "code",
	python: "code",
	rust: "code",
	go: "code",
	deno: "code",
	typst: "paper",
	latex: "paper",
	lean: "math",
};

/** One package discovered in repository evidence. */
export interface RepositoryPackageEvidence {
	id: string;
	path: string;
	name: string;
	ecosystem: RepositoryEcosystem;
	packageManager: PackageManager;
	/** Repository-relative directory where dependency installation should run. */
	packageManagerRoot: string;
	manifest: string;
	domains: readonly string[];
	scripts: readonly string[];
	apiEntryPoints: readonly string[];
}

/** Explicit deterministic-action override declared in the combined configuration's repo block. */
export interface RepositoryActionOverride {
	command?: string;
	enabled?: boolean;
	versions?: readonly string[];
	[key: string]: unknown;
}

/** Minimal repository fields used by evidence. Unknown product fields remain opaque. */
export interface RepositoryDfEvidence {
	identity?: { default_branch?: string; [key: string]: unknown };
	upstream?: { repo?: string | null; ref?: string | null; [key: string]: unknown };
	environment?: {
		ignore?: readonly string[];
		packages?: readonly {
			path: string;
			ecosystem: string;
			manifest: string;
			name: string;
			package_manager?: string;
		}[];
		testing?: Readonly<Record<string, RepositoryActionOverride>>;
		linting?: Readonly<Record<string, RepositoryActionOverride>>;
		formatting?: Readonly<Record<string, RepositoryActionOverride>>;
		docs_check?: Readonly<Record<string, RepositoryActionOverride>>;
		docs_extract?: Readonly<Record<string, RepositoryActionOverride>>;
		setup?: Readonly<Record<string, RepositoryActionOverride>>;
		release?: Readonly<Record<string, RepositoryActionOverride>>;
	};
	[key: string]: unknown;
}

/** Normalized repository evidence consumed by capability resolution and all deterministic consumers. */
export interface RepositoryEvidence {
	root: string;
	repoDfPath?: string;
	repoDf: RepositoryDfEvidence;
	packages: readonly RepositoryPackageEvidence[];
	ecosystems: readonly RepositoryEcosystem[];
	domains: readonly string[];
}

async function exists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

function normalizeEcosystem(value: string): RepositoryEcosystem {
	switch (value) {
		case "python":
		case "rust":
		case "go":
		case "deno":
		case "typst":
		case "latex":
		case "lean":
			return value;
		default:
			return "node";
	}
}

function normalizeExplicitPackageManager(value: string | undefined, ecosystem: RepositoryEcosystem): PackageManager {
	switch (value) {
		case "bun":
		case "npm":
		case "pnpm":
		case "yarn":
		case "pip":
		case "uv":
		case "poetry":
		case "pipenv":
		case "cargo":
		case "go":
		case "deno":
		case "typst":
		case "latexmk":
		case "lake":
			return value;
	}
	switch (ecosystem) {
		case "python":
			return "pip";
		case "rust":
			return "cargo";
		case "go":
			return "go";
		case "deno":
			return "deno";
		case "typst":
			return "typst";
		case "latex":
			return "latexmk";
		case "lean":
			return "lake";
		default:
			return "bun";
	}
}

function repoPath(root: string, directory: string): string {
	return (relative(root, directory) || ".").replaceAll("\\", "/");
}

async function nodeManager(
	directory: string,
	root: string,
	packageJson: Record<string, unknown>,
): Promise<{ manager: PackageManager; managerRoot: string }> {
	const declared =
		typeof packageJson.packageManager === "string" ? packageJson.packageManager.split("@")[0] : undefined;
	if (declared === "bun" || declared === "npm" || declared === "pnpm" || declared === "yarn")
		return { manager: declared, managerRoot: repoPath(root, directory) };

	let cursor = directory;
	for (;;) {
		if ((await exists(join(cursor, "bun.lock"))) || (await exists(join(cursor, "bun.lockb"))))
			return { manager: "bun", managerRoot: repoPath(root, cursor) };
		if (await exists(join(cursor, "pnpm-lock.yaml"))) return { manager: "pnpm", managerRoot: repoPath(root, cursor) };
		if (await exists(join(cursor, "yarn.lock"))) return { manager: "yarn", managerRoot: repoPath(root, cursor) };
		if (await exists(join(cursor, "package-lock.json"))) return { manager: "npm", managerRoot: repoPath(root, cursor) };
		if (cursor === root) break;
		const parent = dirname(cursor);
		if (parent === cursor || !parent.startsWith(root)) break;
		cursor = parent;
	}
	return { manager: "npm", managerRoot: repoPath(root, directory) };
}

async function pythonManager(
	directory: string,
	root: string,
): Promise<{ manager: PackageManager; managerRoot: string }> {
	let cursor = directory;
	for (;;) {
		if (await exists(join(cursor, "uv.lock"))) return { manager: "uv", managerRoot: repoPath(root, cursor) };
		if (await exists(join(cursor, "poetry.lock"))) return { manager: "poetry", managerRoot: repoPath(root, cursor) };
		if (await exists(join(cursor, "Pipfile.lock"))) return { manager: "pipenv", managerRoot: repoPath(root, cursor) };
		if (cursor === root) break;
		const parent = dirname(cursor);
		if (parent === cursor || !parent.startsWith(root)) break;
		cursor = parent;
	}
	return { manager: "pip", managerRoot: repoPath(root, directory) };
}

function nodeApiEntryPoints(packagePath: string, parsed: Record<string, unknown>): string[] {
	const candidates: string[] = [];
	const add = (value: unknown): void => {
		if (typeof value === "string") {
			if (!/\.(?:ts|tsx)$/u.test(value)) return;
			const clean = value.replace(/^\.\//u, "");
			candidates.push(packagePath === "." ? clean : `${packagePath}/${clean}`);
			return;
		}
		if (!value || typeof value !== "object" || Array.isArray(value)) return;
		for (const nested of Object.values(value as Record<string, unknown>)) add(nested);
	};
	add(parsed.types);
	add(parsed.typings);
	add(parsed.exports);
	return [...new Set(candidates)].sort();
}

function evidence(
	root: string,
	directory: string,
	ecosystem: RepositoryEcosystem,
	manifest: string,
	name: string,
	packageManager: PackageManager,
	packageManagerRoot: string,
	options: { scripts?: readonly string[]; apiEntryPoints?: readonly string[] } = {},
): RepositoryPackageEvidence {
	const path = repoPath(root, directory);
	return {
		id: `${ecosystem}:${path}`,
		path,
		name,
		ecosystem,
		packageManager,
		packageManagerRoot,
		manifest,
		domains: [ECOSYSTEM_DOMAIN[ecosystem]],
		scripts: options.scripts ?? [],
		apiEntryPoints: options.apiEntryPoints ?? [],
	};
}

async function discoveredPackages(directory: string, root: string): Promise<RepositoryPackageEvidence[]> {
	const path = repoPath(root, directory);
	const fallbackName = path === "." ? "root" : basename(directory);
	const found: RepositoryPackageEvidence[] = [];

	const packageJsonPath = join(directory, "package.json");
	if (await exists(packageJsonPath)) {
		let parsed: Record<string, unknown> = {};
		try {
			parsed = JSON.parse(await readFile(packageJsonPath, "utf8")) as Record<string, unknown>;
		} catch {}
		const { manager, managerRoot } = await nodeManager(directory, root, parsed);
		const scripts =
			parsed.scripts && typeof parsed.scripts === "object" && !Array.isArray(parsed.scripts)
				? Object.keys(parsed.scripts as Record<string, unknown>).sort()
				: [];
		found.push(
			evidence(
				root,
				directory,
				"node",
				"package.json",
				typeof parsed.name === "string" ? parsed.name : fallbackName,
				manager,
				managerRoot,
				{ scripts, apiEntryPoints: nodeApiEntryPoints(path, parsed) },
			),
		);
	}

	const pyproject = join(directory, "pyproject.toml");
	const pythonManifest = (await exists(pyproject))
		? "pyproject.toml"
		: (await exists(join(directory, "setup.py")))
			? "setup.py"
			: (await exists(join(directory, "setup.cfg")))
				? "setup.cfg"
				: (await exists(join(directory, "requirements.txt")))
					? "requirements.txt"
					: undefined;
	if (pythonManifest) {
		let name = fallbackName;
		if (pythonManifest === "pyproject.toml") {
			try {
				const match = (await readFile(pyproject, "utf8")).match(/^\s*name\s*=\s*["']([^"']+)["']/mu);
				if (match?.[1]) name = match[1];
			} catch {}
		}
		const { manager, managerRoot } = await pythonManager(directory, root);
		found.push(evidence(root, directory, "python", pythonManifest, name, manager, managerRoot));
	}

	if (await exists(join(directory, "Cargo.toml")))
		found.push(evidence(root, directory, "rust", "Cargo.toml", fallbackName, "cargo", path));
	if (await exists(join(directory, "go.mod")))
		found.push(evidence(root, directory, "go", "go.mod", fallbackName, "go", path));
	if ((await exists(join(directory, "deno.json"))) || (await exists(join(directory, "deno.jsonc"))))
		found.push(
			evidence(
				root,
				directory,
				"deno",
				(await exists(join(directory, "deno.json"))) ? "deno.json" : "deno.jsonc",
				fallbackName,
				"deno",
				path,
			),
		);
	if (await exists(join(directory, "typst.toml")))
		found.push(evidence(root, directory, "typst", "typst.toml", fallbackName, "typst", path));
	if (await exists(join(directory, ".latexmkrc")))
		found.push(evidence(root, directory, "latex", ".latexmkrc", fallbackName, "latexmk", path));
	if ((await exists(join(directory, "lakefile.lean"))) || (await exists(join(directory, "lakefile.toml"))))
		found.push(
			evidence(
				root,
				directory,
				"lean",
				(await exists(join(directory, "lakefile.lean"))) ? "lakefile.lean" : "lakefile.toml",
				fallbackName,
				"lake",
				path,
			),
		);

	return found;
}

async function scan(
	directory: string,
	root: string,
	ignored: ReadonlySet<string>,
	output: RepositoryPackageEvidence[],
): Promise<void> {
	const rel = repoPath(root, directory);
	if (rel !== "." && (ignored.has(rel) || rel.split("/").some((part) => ignored.has(part)))) return;
	output.push(...(await discoveredPackages(directory, root)));
	let entries;
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		if (
			[
				".git",
				".darkfactory",
				"node_modules",
				"target",
				"dist",
				"build",
				".venv",
				"venv",
				"site",
				"__pycache__",
			].includes(entry.name)
		)
			continue;
		await scan(join(directory, entry.name), root, ignored, output);
	}
}

function explicitPackages(repoDf: RepositoryDfEvidence): RepositoryPackageEvidence[] {
	return (repoDf.environment?.packages ?? []).map((pkg) => {
		const ecosystem = normalizeEcosystem(pkg.ecosystem);
		const manager = normalizeExplicitPackageManager(pkg.package_manager, ecosystem);
		return {
			id: `${ecosystem}:${pkg.path}`,
			path: pkg.path,
			name: pkg.name,
			ecosystem,
			packageManager: manager,
			packageManagerRoot: pkg.path,
			manifest: pkg.manifest,
			domains: [ECOSYSTEM_DOMAIN[ecosystem]],
			scripts: [],
			apiEntryPoints: [],
		};
	});
}

/** Detects repository/package/domain evidence using combined configuration resolution plus filesystem manifests. */
export async function detectRepositoryEvidence(rootDir = process.cwd()): Promise<RepositoryEvidence> {
	const root = resolve(rootDir);
	const repoDfPath = resolveConfigDocumentPath(root);
	let repoDf: RepositoryDfEvidence = {};
	if (repoDfPath) {
		try {
			const document = parseConfigDocument(await readFile(repoDfPath, "utf8"), repoDfPath);
			repoDf = (configBlock(document, "repo", repoDfPath) ?? {}) as RepositoryDfEvidence;
		} catch (error) {
			throw new Error(`Invalid repo block: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	const packages = explicitPackages(repoDf);
	await scan(root, root, new Set(repoDf.environment?.ignore ?? []), packages);

	const unique = new Map<string, RepositoryPackageEvidence>();
	for (const pkg of packages) {
		const existing = unique.get(pkg.id);
		if (!existing) {
			unique.set(pkg.id, pkg);
			continue;
		}
		// repo-block packages are inserted before filesystem evidence: declarations own identity/manifest
		// while detection fills scripts, API exports and concrete toolchain roots.
		unique.set(pkg.id, {
			...pkg,
			...existing,
			packageManagerRoot: pkg.packageManagerRoot,
			scripts: pkg.scripts.length > 0 ? pkg.scripts : existing.scripts,
			apiEntryPoints: pkg.apiEntryPoints.length > 0 ? pkg.apiEntryPoints : existing.apiEntryPoints,
		});
	}

	const normalized = [...unique.values()].sort((a, b) => a.id.localeCompare(b.id));
	return {
		root,
		...(repoDfPath ? { repoDfPath } : {}),
		repoDf,
		packages: normalized,
		ecosystems: [...new Set(normalized.map((pkg) => pkg.ecosystem))].sort(),
		domains: [...new Set(normalized.flatMap((pkg) => pkg.domains))].sort(),
	};
}
