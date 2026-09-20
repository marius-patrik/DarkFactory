/** @packageDocumentation
 * Core DarkFactory Repository Evidence and Domain Detection.
 * Autodetects ecosystems, packages, and semantic domains without relying on hardcoded lists.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { resolveDfFile } from "../utils/resolver.ts";

/** Represeents a discovered package within the repository. */
export interface DiscoveredPackage {
	/** Relative path from repository root to package folder (e.g., "." or "packages/core"). */
	path: string;
	/** Ecosystem of the package (e.g., "python", "bun", "rust", "go"). */
	ecosystem: "python" | "bun" | "rust" | "go" | "unsupported";
	/** Name of the package parsed from its manifest, or directory name. */
	name: string;
	/** Manifest file name (e.g., "pyproject.toml", "package.json"). */
	manifest: string;
}

/** Parsed identity section of repo.df. */
export interface RepoIdentity {
	owner: string;
	repo: string;
	display_name?: string;
	project_title?: string;
	agent_slug?: string;
	default_branch?: string;
	description?: string;
	topics?: string[];
}

/** Parsed repo.df layout. */
export interface RepoDf {
	identity: RepoIdentity;
	environment?: {
		ignore?: string[];
		packages?: Array<{
			path: string;
			ecosystem: string;
			manifest: string;
			name: string;
		}>;
		testing?: Record<string, { command: string }>;
		linting?: Record<string, { command: string }>;
		formatting?: Record<string, { command: string }>;
		docs_check?: Record<string, { command: string }>;
		docs_extract?: Record<string, { command: string }>;
		setup?: Record<string, { command: string }>;
		release?: Record<string, { command: string }>;
	};
	[key: string]: unknown;
}

/** Normalized outcome of repository evidence detection. */
export interface RepositoryEvidence {
	/** Absolute path to the repository root. */
	root: string;
	/** Discovered packages/modules. */
	packages: DiscoveredPackage[];
	/** Detected semantic domains (e.g. "code", "paper", "math"). */
	domains: string[];
	/** Detected ecosystems (e.g. "bun", "python"). */
	ecosystems: string[];
	/** Parsed repo.df configuration. */
	repoDf: RepoDf;
}

/** Helper to recursively find package manifests while respecting ignore lists. */
async function scanDirectory(
	currentDir: string,
	rootDir: string,
	ignoredDirs: Set<string>,
	packages: DiscoveredPackage[],
): Promise<void> {
	let entries;
	try {
		entries = await readdir(currentDir, { withFileTypes: true });
	} catch (error: any) {
		console.warn(`Failed to scan directory ${currentDir}: ${error.message}`);
		return;
	}
	const relPath = relative(rootDir, currentDir) || ".";
	const normalizedRelPath = relPath.replace(/\\/g, "/");

	if (ignoredDirs.has(normalizedRelPath) || normalizedRelPath.split("/").some((part) => ignoredDirs.has(part))) {
		return;
	}

	// Check if manifest files exist in this folder
	let hasPackageJson = false;
	let hasPyprojectToml = false;
	let hasRequirementsTxt = false;
	let hasCargoToml = false;
	let hasGoMod = false;

	for (const entry of entries) {
		if (entry.isFile()) {
			if (entry.name === "package.json") hasPackageJson = true;
			else if (entry.name === "pyproject.toml") hasPyprojectToml = true;
			else if (entry.name === "requirements.txt") hasRequirementsTxt = true;
			else if (entry.name === "Cargo.toml") hasCargoToml = true;
			else if (entry.name === "go.mod") hasGoMod = true;
		}
	}

	if (hasPackageJson) {
		let name = normalizedRelPath === "." ? "root" : normalizedRelPath.split("/").pop()!;
		try {
			const content = await readFile(join(currentDir, "package.json"), "utf8");
			const parsed = JSON.parse(content) as { name?: string };
			if (parsed.name) name = parsed.name;
		} catch {}
		packages.push({
			path: normalizedRelPath,
			ecosystem: "bun",
			name,
			manifest: "package.json",
		});
	}
	if (hasPyprojectToml || hasRequirementsTxt) {
		let name = normalizedRelPath === "." ? "root" : normalizedRelPath.split("/").pop()!;
		if (hasPyprojectToml) {
			try {
				const content = await readFile(join(currentDir, "pyproject.toml"), "utf8");
				const match = content.match(/^\s*name\s*=\s*['"]([^'"]+)['"]/m);
				if (match?.[1]) name = match[1];
			} catch {}
		}
		packages.push({
			path: normalizedRelPath,
			ecosystem: "python",
			name,
			manifest: hasPyprojectToml ? "pyproject.toml" : "requirements.txt",
		});
	}
	if (hasCargoToml) {
		let name = normalizedRelPath === "." ? "root" : normalizedRelPath.split("/").pop()!;
		try {
			const content = await readFile(join(currentDir, "Cargo.toml"), "utf8");
			const match = content.match(/^\s*name\s*=\s*['"]([^'"]+)['"]/m);
			if (match?.[1]) name = match[1];
		} catch {}
		packages.push({
			path: normalizedRelPath,
			ecosystem: "rust",
			name,
			manifest: "Cargo.toml",
		});
	}
	if (hasGoMod) {
		let name = normalizedRelPath === "." ? "root" : normalizedRelPath.split("/").pop()!;
		try {
			const content = await readFile(join(currentDir, "go.mod"), "utf8");
			const match = content.match(/^\s*module\s+([^\s\n\r]+)/m);
			if (match?.[1]) {
				name = match[1].split("/").pop()!;
			}
		} catch {}
		packages.push({
			path: normalizedRelPath,
			ecosystem: "go",
			name,
			manifest: "go.mod",
		});
	}

	// Recursively scan subfolders
	for (const entry of entries) {
		if (entry.isDirectory()) {
			const name = entry.name;
			if (name === "node_modules" || name === ".git" || name === ".darkfactory" || name === "dist" || name === "build" || name === ".venv" || name === "venv") {
				continue;
			}
			await scanDirectory(join(currentDir, name), rootDir, ignoredDirs, packages);
		}
	}
}

/**
 * Robustly detects and normalizes repository and package evidence.
 * Consumes config.df / repo.df to resolve configuration.
 *
 * @param rootDir The repository root directory.
 */
export async function detectRepositoryEvidence(rootDir = process.cwd()): Promise<RepositoryEvidence> {
	const root = resolve(rootDir);
	let repoDf: RepoDf = { identity: { owner: "unknown", repo: "unknown" } };

	try {
		const dfPath = resolveDfFile(root, "repo");
		const content = await readFile(dfPath, "utf8");
		repoDf = JSON.parse(content) as RepoDf;
	} catch {}

	const ignoreList = new Set<string>(repoDf.environment?.ignore ?? []);
	const packages: DiscoveredPackage[] = [];

	// If explicit packages are defined in repo.df, we can bootstrap/use them
	if (repoDf.environment?.packages && repoDf.environment.packages.length > 0) {
		for (const pkg of repoDf.environment.packages) {
			packages.push({
				path: pkg.path,
				ecosystem: (pkg.ecosystem === "node" || pkg.ecosystem === "bun" ? "bun" : pkg.ecosystem) as DiscoveredPackage["ecosystem"],
				name: pkg.name,
				manifest: pkg.manifest,
			});
		}
	}

	// Always run auto-discovery to find other packages in the repo
	await scanDirectory(root, root, ignoreList, packages);

	// Ensure unique packages (by path)
	const uniquePackages = new Map<string, DiscoveredPackage>();
	for (const pkg of packages) {
		uniquePackages.set(pkg.path, pkg);
	}
	packages.length = 0;
	packages.push(...uniquePackages.values());

	// Unique ecosystems
	const ecosystems = [...new Set(packages.map((p) => p.ecosystem))].sort();

	// Deduce semantic domains
	const domains: string[] = [];
	if (packages.length > 0) {
		domains.push("code");
	}
	// Add other domains as evidence is found (e.g. latex/paper, etc.)
	const latexOrDocs = await readdir(root).then(
		(files) => files.some((f) => f.endsWith(".tex") || f === "paper" || f === "docs"),
		() => false,
	);
	if (latexOrDocs) {
		domains.push("paper");
	}

	return {
		root,
		packages,
		domains: [...new Set(domains)].sort(),
		ecosystems,
		repoDf,
	};
}
