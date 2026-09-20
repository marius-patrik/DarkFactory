import { existsSync } from "node:fs";
import { join } from "node:path";
import { readFile, access, constants } from "node:fs/promises";
import { spawn } from "node:child_process";

import { readdir } from "node:fs/promises";
import { relative as relpath, sep } from "node:path";

export interface PackageEntry {
	name?: string;
	path?: string;
	ecosystem?: string;
}

/** Reusable helper to detect repository packages and their ecosystems. */
export async function detectRepositoryPackages(root: string, auditLog?: (event: any) => void): Promise<{ detected: Required<PackageEntry>[]; status: "complete" | "pruned"; diagnostics: string[] }> {
	const repoConfig = await readRepoConfig(root);
	const environment = repoConfig.environment || {};
	const diagnostics: string[] = [];

	if (environment.packages && Array.isArray(environment.packages)) {
		return {
			detected: environment.packages.map((p: PackageEntry) => ({
				name: String(p.name || p.path || ""),
				ecosystem: String(p.ecosystem || ""),
				path: String(p.path || ""),
			})),
			status: "complete",
			diagnostics,
		};
	}

	const packages: Required<PackageEntry>[] = [];
	const defaultPruned = [
		".git",
		".venv",
		"venv",
		"node_modules",
		"target",
		"dist",
		"build",
		"vendor",
		"__pycache__",
	];
	const ignoreList = environment.ignore || [];
	const pruned = new Set<string>();
	for (const item of defaultPruned) {
		if (!ignoreList.includes(`!${item}`)) {
			pruned.add(item);
		}
	}
	for (const item of ignoreList) {
		if (typeof item === "string" && !item.startsWith("!")) {
			pruned.add(item);
		}
	}

	const manifests: Record<string, string> = {
		...DEFAULT_MANIFESTS,
		...(environment.manifests || repoConfig.manifests || {}),
	};

	const MAX_DEPTH = Number.isInteger(environment.maxDepth) ? environment.maxDepth : 8;
	let maxDepthReached = false;
	let scannedCount = 0;
	const MAX_SCANNED = 2000;

	async function scan(dir: string, depth = 0) {
		if (depth > MAX_DEPTH || scannedCount > MAX_SCANNED) {
			maxDepthReached = true;
			return;
		}
		scannedCount++;
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch (e: any) {
			const msg = `Failed to read directory during package detection at ${dir}: ${e?.message || e}`;
			diagnostics.push(msg);
			auditLog?.({ capability: "detection", action: "warning", details: { message: msg } });
			return;
		}
		const files = entries.filter((e) => e.isFile()).map((e) => e.name);

		for (const [manifest, ecosystem] of Object.entries(manifests)) {
			if (files.includes(manifest)) {
				const rel = relpath(root, dir).split(sep).join("/") || ".";
				let pkgName = rel === "." ? "root" : rel.replace(/[^a-zA-Z0-9-]/g, "-");

				if (manifest === "package.json") {
					try {
						const rawPkg = await readFile(join(dir, manifest), "utf8");
						const parsed = JSON.parse(rawPkg);
						if (parsed.name && typeof parsed.name === "string") {
							pkgName = parsed.name;
						}
					} catch (err: unknown) {
						const msg = err instanceof SyntaxError
							? `Failed to parse ${manifest} at ${dir}: malformed JSON.`
							: `Failed to read ${manifest} at ${dir}: ${(err as Error)?.message || err}`;
						diagnostics.push(msg);
						auditLog?.({ capability: "detection", action: "warning", details: { message: msg } });
					}
				}

				packages.push({
					name: pkgName,
					ecosystem,
					path: rel,
				});
				break;
			}
		}

		const subDirs: string[] = [];
		for (const entry of entries) {
			if (entry.isSymbolicLink()) continue;
			if (entry.isDirectory() && !entry.name.startsWith(".") && !pruned.has(entry.name)) {
				subDirs.push(join(dir, entry.name));
			}
		}
		await Promise.all(subDirs.map((fullPath) => scan(fullPath, depth + 1)));
	}

	await scan(root);

	return {
		detected: packages,
		status: maxDepthReached ? "pruned" : "complete",
		diagnostics,
	};
}

export const DEFAULT_MANIFESTS = {
	"package.json": "javascript",
	"pyproject.toml": "python",
	"go.mod": "go",
	"Cargo.toml": "rust",
	"pom.xml": "java",
	"build.gradle": "java",
};

export function resolveDfFile(root: string, name: string): string {
	const dfPath = join(root, ".darkfactory", `${name}.df`);
	const rootPath = join(root, `${name}.df`);
	return existsSync(dfPath) ? dfPath : rootPath;
}

export async function readRepoConfig(root: string) {

	try {
		const repoDfPath = resolveDfFile(root, "repo");
		const raw = await readFile(repoDfPath, "utf8");
		return JSON.parse(raw);
	} catch (e: any) {
		if (e.code === 'ENOENT') return {};
		console.warn(`Warning: repo.df found but malformed, ignoring configuration:`, e?.message || e);
		return {};
	}
}

export async function checkToolExists(tool: string): Promise<boolean> {
	const pathEnv = process.env.PATH || "";
	const paths = pathEnv.split(process.platform === "win32" ? ";" : ":");
	const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];

	for (const p of paths) {
		for (const ext of extensions) {
			const fullPath = join(p, tool + ext);
			try {
				await access(fullPath, constants.X_OK);
				return true;
			} catch {
				// continue
			}
		}
	}
	return false;
}

export function parseShellCommand(cmd: string | string[]): { tool: string; args: string[] } {
	const parsed = Array.isArray(cmd) ? { tool: cmd[0], args: cmd.slice(1) } : (() => {
		const args: string[] = [];
		let current = "";
		let inSingleQuote = false;
		let inDoubleQuote = false;
		let escaped = false;

		for (let i = 0; i < cmd.length; i++) {
			const char = cmd[i];
			if (escaped) {
				current += char;
				escaped = false;
			} else if (char === "\\") {
				escaped = true;
			} else if (char === "'" && !inDoubleQuote) {
				inSingleQuote = !inSingleQuote;
			} else if (char === '"' && !inSingleQuote) {
				inDoubleQuote = !inDoubleQuote;
			} else if (char === " " && !inSingleQuote && !inDoubleQuote) {
				if (current.length > 0) {
					args.push(current);
					current = "";
				}
			} else {
				current += char;
			}
		}
		if (current.length > 0) args.push(current);
		return { tool: args[0] ?? "", args: args.slice(1) };
	})();

	// Strict validation: Reject commands with shell metacharacters
	const metacharacters = [";", "&", "|", "<", ">", "$", "(", ")", "`", "{", "}", "[", "]", "*", "?", "~", "!", "\n"];
	if (metacharacters.some((m) => parsed.tool.includes(m) || parsed.args.some((a) => a.includes(m)))) {
		throw new Error(`Security Violation: Command contains prohibited shell metacharacters: ${parsed.tool} ${parsed.args.join(" ")}`);
	}
	return parsed;
}


export interface QualityCommand {
	executable: string;
	args: string[];
}

/**
 * Creates a type-safe quality command structure for array-based spawning (child_process.spawn).
 */
export function createQualityCommand(tool: string, args: string[]): QualityCommand {
	return { executable: tool, args };
}

/**
 * Helper executor wrapper enforcing array-based spawning (child_process.spawn) to prevent injection.
 */
export async function runQualityCommand(cmd: QualityCommand, cwd?: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	return new Promise((resolve) => {
		const child = spawn(cmd.executable, cmd.args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		child.stdout?.on("data", (data) => { stdout += data.toString(); });
		child.stderr?.on("data", (data) => { stderr += data.toString(); });
		child.on("close", (code) => {
			resolve({ exitCode: code ?? 1, stdout, stderr });
		});
		child.on("error", (err) => {
			stderr += err.message;
			resolve({ exitCode: 1, stdout, stderr });
		});
	});
}
