import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runGit } from "./git.ts";

/**
 * Preservation of exact provenance for imported recovery work.
 */
export interface RecoveryProvenance {
	/** Target Request(s) that this imported work is bound to (e.g. ["#388"]). */
	targetRequests: string[];
	/** Path to the original local repository or worktree. */
	originalPath: string;
	/** Original branch name or reference imported from. */
	originalRef: string;
	/** HEAD SHA of the imported work at the time of import. */
	originalHEAD: string;
	/** Identity/hash for dirty or untracked state snapshot (if any). */
	dirtyUntrackedSnapshotId?: string;
	/** Name of the recovery branch or SHA created to preserve the work. */
	recoveryBranch: string;
	/** SHA of the recovery branch/snapshot commit. */
	recoverySHA: string;
	/** The canonical base commit on the target base branch that was current during import. */
	currentCanonicalBase: string;
}

/**
 * Holds options for intaking local recovery work.
 */
export interface IntakeOptions {
	/** Path to the local repository or worktree to import from. */
	repo: string;
	/** Original branch name or reference to import (e.g., "my-feature-branch"). */
	sourceRef: string;
	/** One or more Request IDs bound to this recovery work (e.g., [#388]). */
	targetRequests: string[];
	/** Base branch in the remote repository (e.g., "main"). */
	base: string;
	/** Root directory under which worktrees or temporary work can be created. */
	workRoot: string;
}

const RECOVERY_IDENTITY = {
	GIT_AUTHOR_NAME: "DarkFactory Recovery",
	GIT_AUTHOR_EMAIL: "recovery@users.noreply.example",
	GIT_COMMITTER_NAME: "DarkFactory Recovery",
	GIT_COMMITTER_EMAIL: "recovery@users.noreply.example",
};

/**
 * Scan content for secret patterns before remote publication.
 *
 * @param content - String file content to check.
 * @returns True if the content contains a high-confidence secret pattern.
 */
export function scanForSecrets(content: string): boolean {
	const SECRET_PATTERNS = [
		/bearer\s+[A-Za-z0-9._~+/=-]+/i,
		/(?:token|secret|password|api[-_ ]?key|authorization)\s*[:=]/i,
		/sk-live-[A-Za-z0-9_-]+/,
		/-----BEGIN (?:RSA|EC|PGP|OPENSSH) PRIVATE KEY-----/,
	];
	return SECRET_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * Recursively scans directory for any files containing secrets.
 *
 * @param dir - Directory to scan.
 * @returns Array of file paths with secrets.
 */
function scanDirectoryForSecrets(dir: string): string[] {
	const filesWithSecrets: string[] = [];
	function scan(currentDir: string) {
		if (currentDir.includes(".git") || currentDir.includes("node_modules")) return;
		const entries = readdirSync(currentDir);
		for (const entry of entries) {
			const fullPath = join(currentDir, entry);
			try {
				const stat = statSync(fullPath);
				if (stat.isDirectory()) {
					scan(fullPath);
				} else if (stat.isFile()) {
					const content = readFileSync(fullPath, "utf8");
					if (scanForSecrets(content)) {
						filesWithSecrets.push(fullPath);
					}
				}
			} catch {
				// Ignore file access or encoding errors
			}
		}
	}
	scan(dir);
	return filesWithSecrets;
}

/**
 * Intake an existing local worktree, branch, or ref, and save it to a recovery branch.
 * Preserves exact bytes, checks for sensitive data before allowing pushes, and records
 * rich provenance.
 *
 * @param options - Intake options.
 * @returns Recovery provenance.
 * @throws Error if secret-bearing local material is detected or git operation fails.
 */
export async function intakeRecoveryWork(options: IntakeOptions): Promise<RecoveryProvenance> {
	const { repo, sourceRef, targetRequests, base, workRoot } = options;

	// Determine current canonical base
	let currentCanonicalBase = "";
	try {
		currentCanonicalBase = runGit(repo, ["rev-parse", `origin/${base}`]);
	} catch {
		currentCanonicalBase = runGit(repo, ["rev-parse", base]);
	}

	const originalHEAD = runGit(repo, ["rev-parse", sourceRef]);

	// Check for dirty tracked/untracked files in repo
	const status = runGit(repo, ["status", "--porcelain=v1"]);
	const isDirty = status.trim().length > 0;

	// We'll create a new recovery branch for durability and preservation
	const recoveryBranch = `recovery/${targetRequests.join("-").replace(/#/g, "")}-${Date.now()}`;

	// Create a recovery worktree to safely assemble the snapshot without changing original files
	const tempWorktreePath = join(workRoot, `temp-${recoveryBranch}`);
	runGit(repo, ["worktree", "add", "-b", recoveryBranch, tempWorktreePath, sourceRef]);

	let dirtyUntrackedSnapshotId: string | undefined;

	try {
		if (isDirty) {
			const porcelain = runGit(repo, ["status", "--porcelain=v1"]);
			const lines = porcelain.split(/\r?\n/).filter(Boolean);
			for (const line of lines) {
				const filePath = line.slice(3).trim();
				const srcPath = join(repo, filePath);
				const destPath = join(tempWorktreePath, filePath);
				if (existsSync(srcPath)) {
					const stat = statSync(srcPath);
					if (stat.isFile()) {
						mkdirSync(join(destPath, ".."), { recursive: true });
						writeFileSync(destPath, readFileSync(srcPath));
					}
				}
			}
			runGit(tempWorktreePath, ["add", "-A"]);
			runGit(tempWorktreePath, ["commit", "-m", `df recovery snapshot for ${targetRequests.join(", ")}`], {
				env: RECOVERY_IDENTITY,
			});
			dirtyUntrackedSnapshotId = runGit(tempWorktreePath, ["rev-parse", "HEAD"]);
		}

		// Perform safety/secret scan on the temp worktree before any push or remote use
		const filesWithSecrets = scanDirectoryForSecrets(tempWorktreePath);
		if (filesWithSecrets.length > 0) {
			throw new Error(
				`Secret/sensitive-data check BLOCKED push: Material in files [${filesWithSecrets.join(", ")}] cannot safely be pushed. Preserved locally.`,
			);
		}

		const recoverySHA = runGit(tempWorktreePath, ["rev-parse", "HEAD"]);

		const provenance: RecoveryProvenance = {
			targetRequests,
			originalPath: repo,
			originalRef: sourceRef,
			originalHEAD,
			dirtyUntrackedSnapshotId,
			recoveryBranch,
			recoverySHA,
			currentCanonicalBase,
		};

		return provenance;
	} finally {
		// Clean up the temporary worktree metadata from git, but keep the branch
		try {
			runGit(repo, ["worktree", "remove", "--force", tempWorktreePath]);
		} catch {
			// Best-effort cleanup
		}
	}
}

/**
 * Proves if existing plan is still applicable to the recovery provenance and current base.
 *
 * @param provenance - Imported work provenance.
 * @param existingPlan - The existing planning record with baseSHA and recoverySHA details.
 * @returns True if the plan still applies, false if it must be regenerated.
 */
export function provePlanApplies(
	provenance: RecoveryProvenance,
	existingPlan: { baseSHA: string; recoverySHA: string },
): boolean {
	return (
		provenance.currentCanonicalBase === existingPlan.baseSHA && provenance.recoverySHA === existingPlan.recoverySHA
	);
}
