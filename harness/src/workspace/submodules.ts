import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runGit } from "../workspace/git.ts";

/** One submodule as declared in `.gitmodules`. */
export interface Submodule {
	/** Section name, which is the path unless it was renamed. */
	name: string;
	/** Working-tree path. */
	path: string;
	/** Remote the submodule is cloned from. */
	url: string;
	/** Branch it follows, or `undefined` when none is pinned. */
	branch?: string;
}

/** A submodule pointer that moved. */
export interface SubmoduleMovement {
	/** Working-tree path. */
	path: string;
	/** Branch that was followed. */
	branch: string;
	/** Commit recorded before the update. */
	before: string;
	/** Commit recorded after it. */
	after: string;
}

/**
 * Reads the submodules declared in `.gitmodules`.
 *
 * Hand-parsed rather than read through `git config` because the file is a small, fixed INI shape
 * and this keeps the read free of a subprocess.
 *
 * @param root Repository root.
 * @returns Declared submodules in file order; empty when the repository has none.
 */
export function readSubmodules(root: string): Submodule[] {
	const path = join(root, ".gitmodules");
	if (!existsSync(path)) return [];

	const sections = new Map<string, Record<string, string>>();
	let current: string | undefined;
	for (const line of readFileSync(path, "utf8").split("\n")) {
		const header = /^\s*\[submodule\s+"(.+)"\]\s*$/.exec(line);
		if (header) {
			current = header[1]!;
			if (!sections.has(current)) sections.set(current, {});
			continue;
		}
		const entry = current ? /^\s*(\w+)\s*=\s*(.+?)\s*$/.exec(line) : null;
		if (entry?.[1] && entry[2] && current) sections.get(current)![entry[1]] = entry[2];
	}

	const found: Submodule[] = [];
	for (const [name, values] of sections) {
		const path = values.path;
		const url = values.url;
		if (!path || !url) continue;
		found.push({ name, path, url, branch: values.branch });
	}
	return found;
}

/**
 * Asks a remote which branch it considers default.
 *
 * @param url Remote url.
 * @param root Directory to run the lookup from.
 * @returns The branch name, or `undefined` when the remote could not be read.
 */
export function remoteDefaultBranch(url: string, root: string): string | undefined {
	try {
		const output = runGit(root, ["ls-remote", "--symref", url, "HEAD"]);
		return /^ref:\s+refs\/heads\/(\S+)\s+HEAD$/m.exec(output)?.[1];
	} catch {
		return undefined;
	}
}

/**
 * Writes a branch pin for every submodule that lacks one.
 *
 * `git submodule update --remote` consults `submodule.<name>.branch` and silently falls back to the
 * remote's default branch when it is missing, so the pin is worth writing down rather than leaving
 * the pointer to follow whatever the remote happens to call HEAD.
 *
 * @param root Repository root.
 * @param log Progress sink.
 * @returns Paths of the submodules that were newly pinned.
 */
export function pinSubmoduleBranches(root: string, log: (message: string) => void = () => {}): string[] {
	const pinned: string[] = [];
	for (const module of readSubmodules(root)) {
		if (module.branch) continue;
		const branch = remoteDefaultBranch(module.url, root);
		if (!branch) {
			log(`Could not read the default branch of ${module.url}`);
			continue;
		}
		runGit(root, ["config", "-f", ".gitmodules", `submodule.${module.name}.branch`, branch]);
		log(`Pinned ${module.path} to ${branch}`);
		pinned.push(module.path);
	}
	return pinned;
}

/** The commit the super-repository records for a submodule, or an empty string when unreadable. */
function recordedCommit(root: string, path: string): string {
	try {
		return runGit(root, ["ls-tree", "HEAD", path]).split(/\s+/)[2] ?? "";
	} catch {
		return "";
	}
}

/**
 * Moves every submodule to the tip of the branch it follows.
 *
 * Idempotent: a submodule already at its branch tip reports no movement, so a scheduled run on an
 * unchanged repository produces no commit.
 *
 * @param root Repository root.
 * @returns The submodules whose recorded commit changed.
 */
export function updateSubmodules(root: string): SubmoduleMovement[] {
	const modules = readSubmodules(root);
	if (modules.length === 0) return [];

	const before = new Map(modules.map((module) => [module.path, recordedCommit(root, module.path)]));
	runGit(root, ["submodule", "update", "--init", "--remote", "--recursive"]);

	const moved: SubmoduleMovement[] = [];
	for (const module of readSubmodules(root)) {
		const after = runGit(join(root, module.path), ["rev-parse", "HEAD"]);
		if (after !== before.get(module.path)) {
			moved.push({
				path: module.path,
				branch: module.branch ?? "(default)",
				before: (before.get(module.path) ?? "").slice(0, 8),
				after: after.slice(0, 8),
			});
		}
	}
	return moved;
}

/**
 * Renders movements as markdown for a commit or pull request body.
 *
 * @param moved Movements to describe.
 * @returns A markdown table, or a sentence saying nothing moved.
 */
export function describeSubmoduleMovement(moved: readonly SubmoduleMovement[]): string {
	if (moved.length === 0) return "No submodule moved; every pointer already matched its branch.";
	const rows = moved.map((m) => `| \`${m.path}\` | \`${m.branch}\` | \`${m.before}\` | \`${m.after}\` |`);
	return ["| Submodule | Branch | From | To |", "| :--- | :--- | :--- | :--- |", ...rows].join("\n");
}
