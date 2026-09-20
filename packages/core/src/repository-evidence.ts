/** @packageDocumentation
 * Repository/package/domain evidence discovery owned by the DarkFactory core mechanism.
 */

import { access, readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

export type RepositoryEcosystem = "node" | "python" | "rust" | "go";
export type PackageManager = "bun" | "npm" | "pnpm" | "yarn" | "pip" | "cargo" | "go";

/** One package discovered in repository evidence. */
export interface RepositoryPackageEvidence {
	id: string;
	path: string;
	name: string;
	ecosystem: RepositoryEcosystem;
	packageManager: PackageManager;
	manifest: string;
	domains: readonly string[];
	scripts: readonly string[];
	apiEntryPoints: readonly string[];
}

/** Explicit quality-action override declared in repo.df. */
export interface RepositoryActionOverride {
	command?: string;
	enabled?: boolean;
	versions?: readonly string[];
}

/** Minimal repo.df fields used by repository evidence. Unknown product fields are preserved as opaque input. */
export interface RepositoryDfEvidence {
	identity?: { default_branch?: string; [key: string]: unknown };
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

/** Normalized repository evidence consumed by capability resolution and all quality/docs consumers. */
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

/** Resolves one final .df config file from .darkfactory/<name>.df or root <name>.df. Both present is invalid. */
export async function resolveDfFile(rootDir: string, name: "repo" | "config" | "docs"): Promise<string | undefined> {
	const root = resolve(rootDir);
	const nested = join(root, ".darkfactory", `${name}.df`);
	const top = join(root, `${name}.df`);
	const [hasNested, hasTop] = await Promise.all([exists(nested), exists(top)]);
	if (hasNested && hasTop) throw new Error(`Both .darkfactory/${name}.df and ${name}.df exist`);
	if (hasNested) return nested;
	if (hasTop) return top;
	return undefined;
}

function normalizeExplicitPackageManager(value: string | undefined, ecosystem: string): PackageManager {
	if (value === "npm" || value === "pnpm" || value === "yarn" || value === "bun" || value === "pip" || value === "cargo" || value === "go")
		return value;
	if (ecosystem === "python") return "pip";
	if (ecosystem === "rust") return "cargo";
	if (ecosystem === "go") return "go";
	return "bun";
}

function normalizeEcosystem(value: string): RepositoryEcosystem {
	if (value === "python") return "python";
	if (value === "rust") return "rust";
	if (value === "go") return "go";
	return "node";
}

async function nodePackageManager(directory: string, packageJson: Record<string, unknown>): Promise<PackageManager> {
	const declared = typeof packageJson.packageManager === "string" ? packageJson.packageManager.split("@")[0] : undefined;
	if (declared === "bun" || declared === "npm" || declared === "pnpm" || declared === "yarn") return declared;
	if (await exists(join(directory, "bun.lock"))) return "bun";
	if (await exists(join(directory, "pnpm-lock.yaml"))) return "pnpm";
	if (await exists(join(directory, "yarn.lock"))) return "yarn";
	return "npm";
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

async function discoveredPackage(directory: string, root: string): Promise<RepositoryPackageEvidence[]> {
	const packagePath = (relative(root, directory) || ".").replaceAll("\\", "/");
	const found: RepositoryPackageEvidence[] = [];
	const packageJsonPath = join(directory, "package.json");
	if (await exists(packageJsonPath)) {
		let parsed: Record<string, unknown> = {};
		try { parsed = JSON.parse(await readFile(packageJsonPath, "utf8")) as Record<string, unknown>; } catch {}
		const manager = await nodePackageManager(directory, parsed);
		const name = typeof parsed.name === "string" ? parsed.name : (packagePath === "." ? "root" : basename(directory));
		const scriptsValue = parsed.scripts && typeof parsed.scripts === "object" && !Array.isArray(parsed.scripts)
			? Object.keys(parsed.scripts as Record<string, unknown>)
			: [];
		found.push({
			id: `node:${packagePath}`,
			path: packagePath,
			name,
			ecosystem: "node",
			packageManager: manager,
			manifest: "package.json",
			domains: ["code"],
			scripts: scriptsValue.sort(),
			apiEntryPoints: nodeApiEntryPoints(packagePath, parsed),
		});
	}
	const pyprojectPath = join(directory, "pyproject.toml");
	const requirementsPath = join(directory, "requirements.txt");
	if ((await exists(pyprojectPath)) || (await exists(requirementsPath))) {
		let name = packagePath === "." ? "root" : basename(directory);
		if (await exists(pyprojectPath)) {
			try {
				const match = (await readFile(pyprojectPath, "utf8")).match(/^\s*name\s*=\s*["']([^"']+)["']/mu);
				if (match?.[1]) name = match[1];
			} catch {}
		}
		found.push({
			id: `python:${packagePath}`,
			path: packagePath,
			name,
			ecosystem: "python",
			packageManager: "pip",
			manifest: await exists(pyprojectPath) ? "pyproject.toml" : "requirements.txt",
			domains: ["code"],
			scripts: [],
			apiEntryPoints: [],
		});
	}
	if (await exists(join(directory, "Cargo.toml"))) {
		found.push({
			id: `rust:${packagePath}`, path: packagePath, name: packagePath === "." ? "root" : basename(directory),
			ecosystem: "rust", packageManager: "cargo", manifest: "Cargo.toml", domains: ["code"], scripts: [], apiEntryPoints: [],
		});
	}
	if (await exists(join(directory, "go.mod"))) {
		found.push({
			id: `go:${packagePath}`, path: packagePath, name: packagePath === "." ? "root" : basename(directory),
			ecosystem: "go", packageManager: "go", manifest: "go.mod", domains: ["code"], scripts: [], apiEntryPoints: [],
		});
	}
	return found;
}

async function scan(directory: string, root: string, ignored: ReadonlySet<string>, output: RepositoryPackageEvidence[]): Promise<void> {
	const rel = (relative(root, directory) || ".").replaceAll("\\", "/");
	if (rel !== "." && (ignored.has(rel) || rel.split("/").some((part) => ignored.has(part)))) return;
	output.push(...await discoveredPackage(directory, root));
	let entries;
	try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; }
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		if ([".git", ".darkfactory", "node_modules", "dist", "build", ".venv", "venv", "site"].includes(entry.name)) continue;
		await scan(join(directory, entry.name), root, ignored, output);
	}
}

function explicitPackages(repoDf: RepositoryDfEvidence): RepositoryPackageEvidence[] {
	return (repoDf.environment?.packages ?? []).map((pkg) => {
		const ecosystem = normalizeEcosystem(pkg.ecosystem);
		return {
			id: `${ecosystem}:${pkg.path}`,
			path: pkg.path,
			name: pkg.name,
			ecosystem,
			packageManager: normalizeExplicitPackageManager(pkg.package_manager, pkg.ecosystem),
			manifest: pkg.manifest,
			domains: ["code"],
			scripts: [],
			apiEntryPoints: [],
		};
	});
}

/** Detects repository/package/domain evidence using final .df resolution plus filesystem manifests. */
export async function detectRepositoryEvidence(rootDir = process.cwd()): Promise<RepositoryEvidence> {
	const root = resolve(rootDir);
	const repoDfPath = await resolveDfFile(root, "repo");
	let repoDf: RepositoryDfEvidence = {};
	if (repoDfPath) {
		try { repoDf = JSON.parse(await readFile(repoDfPath, "utf8")) as RepositoryDfEvidence; }
		catch (error) { throw new Error(`Invalid repo.df: ${error instanceof Error ? error.message : String(error)}`); }
	}
	const ignored = new Set(repoDf.environment?.ignore ?? []);
	const packages = explicitPackages(repoDf);
	await scan(root, root, ignored, packages);
	const unique = new Map<string, RepositoryPackageEvidence>();
	for (const pkg of packages) unique.set(pkg.id, pkg);

	const domains = new Set<string>();
	for (const pkg of unique.values()) for (const domain of pkg.domains) domains.add(domain);
	const rootNames = await readdir(root).catch(() => [] as string[]);
	if (rootNames.some((name) => /\.(?:tex|typ)$/u.test(name)) || rootNames.includes("paper")) domains.add("paper");
	if (rootNames.some((name) => /\.(?:lean)$/u.test(name)) || rootNames.includes("proofs")) domains.add("math");

	return {
		root,
		...(repoDfPath ? { repoDfPath } : {}),
		repoDf,
		packages: [...unique.values()].sort((a, b) => a.id.localeCompare(b.id)),
		ecosystems: [...new Set([...unique.values()].map((pkg) => pkg.ecosystem))].sort(),
		domains: [...domains].sort(),
	};
}
