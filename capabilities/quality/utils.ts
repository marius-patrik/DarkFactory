import { join } from "node:path";
import { readFile, access, constants } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolveDfFile } from "../../harness/src/utils/resolver";

export const DEFAULT_MANIFESTS = {
	"package.json": "javascript",
	"pyproject.toml": "python",
	"go.mod": "go",
	"Cargo.toml": "rust",
	"pom.xml": "java",
	"build.gradle": "java",
};

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
	if (Array.isArray(cmd)) return { tool: cmd[0], args: cmd.slice(1) };
	// Simple split for now, replace with proper shell-quote if needed
	const parts = cmd.split(" ");
	return { tool: parts[0], args: parts.slice(1) };
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
