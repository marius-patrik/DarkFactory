import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { discoverPlugins, relativeToRepo, type Plugin } from "./discover.ts";

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/u;
const MAX_NAME = 64;
const MAX_DESCRIPTION = 1024;

/**
 * Frontmatter keys only Claude Code honours. Codex, opencode and pi ignore unknown keys, but
 * claude.ai upload and `package_skill.py` hard-error on them, so a shared skill carrying one cannot
 * be published.
 */
const CLAUDE_ONLY_KEYS = new Set([
	"agent",
	"argument-hint",
	"arguments",
	"background",
	"context",
	"disable-model-invocation",
	"disallowed-tools",
	"effort",
	"hooks",
	"model",
	"paths",
	"shell",
	"user-invocable",
	"when_to_use",
]);

/** Names Claude Code refuses to load outside a plugin. */
const RESERVED_NAMES = new Set(["synced"]);

export interface Finding {
	level: "error" | "warning";
	/** Path relative to the repository root, so a finding names one file. */
	path: string;
	rule: string;
	detail: string;
}

interface Frontmatter {
	fields: Map<string, string>;
	closed: boolean;
}

/** Reads flat `key: value` front matter. Enough for a skill; a plugin manifest is JSON, not YAML. */
function readFrontmatter(body: string): Frontmatter {
	const fields = new Map<string, string>();
	const lines = body.split("\n");
	if (lines[0]?.trim() !== "---") return { fields, closed: false };
	for (let index = 1; index < lines.length; index++) {
		const line = lines[index] as string;
		if (line.trim() === "---") return { fields, closed: true };
		if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
		const match = /^\s*([A-Za-z0-9_-]+):\s*(.*)$/u.exec(line);
		if (match) fields.set(match[1] as string, (match[2] as string).trim());
	}
	return { fields, closed: false };
}

function validateSkill(skillPath: string, dirName: string, repoRoot: string): Finding[] {
	const findings: Finding[] = [];
	const path = relativeToRepo(repoRoot, skillPath);
	const body = readFileSync(skillPath, "utf-8");
	const { fields, closed } = readFrontmatter(body);

	if (!closed) {
		findings.push({
			level: "error",
			path,
			rule: "skill/frontmatter",
			detail: "front matter is not closed by a second ---",
		});
		return findings;
	}

	const name = fields.get("name") ?? "";
	const description = fields.get("description") ?? "";

	if (name === "") {
		findings.push({ level: "error", path, rule: "skill/name", detail: "front matter has no name" });
	} else {
		if (name.length > MAX_NAME) {
			findings.push({
				level: "error",
				path,
				rule: "skill/name-length",
				detail: `${name.length} chars, max ${MAX_NAME}`,
			});
		}
		if (!NAME_PATTERN.test(name)) {
			findings.push({ level: "error", path, rule: "skill/name-pattern", detail: `"${name}" is not kebab-case` });
		}
		// opencode documents the requirement and Claude Code defaults the name to the directory, so a
		// mismatch makes `/skill:<name>` disagree with the host's own listing.
		if (name !== dirName) {
			findings.push({
				level: "error",
				path,
				rule: "skill/name-dir-match",
				detail: `name "${name}" != directory "${dirName}"`,
			});
		}
		if (RESERVED_NAMES.has(name) || name.startsWith("anthropic-skills")) {
			findings.push({
				level: "error",
				path,
				rule: "skill/reserved-name",
				detail: `"${name}" is reserved by Claude Code`,
			});
		}
	}

	if (description.trim() === "") {
		// Codex and pi refuse to load a skill without one. This is the rule that actually breaks.
		findings.push({
			level: "error",
			path,
			rule: "skill/description",
			detail: "no description; Codex and pi will not load it",
		});
	} else if (description.length > MAX_DESCRIPTION) {
		findings.push({
			level: "error",
			path,
			rule: "skill/description-length",
			detail: `${description.length} chars, max ${MAX_DESCRIPTION}`,
		});
	} else if (!/^use when\b/iu.test(description)) {
		findings.push({
			level: "warning",
			path,
			rule: "skill/description-when",
			detail: 'description does not start with "Use when", so a host has little to match the request against',
		});
	}

	for (const [key] of fields) {
		if (CLAUDE_ONLY_KEYS.has(key)) {
			findings.push({
				level: "error",
				path,
				rule: "skill/shared-key",
				detail: `"${key}" is honoured only by Claude Code and hard-errors on claude.ai upload`,
			});
		}
	}

	return findings;
}

function validateManifest(plugin: Plugin, manifestPath: string, host: string, repoRoot: string): Finding[] {
	const findings: Finding[] = [];
	const path = relativeToRepo(repoRoot, manifestPath);
	let parsed: { name?: string };
	try {
		parsed = JSON.parse(readFileSync(manifestPath, "utf-8")) as { name?: string };
	} catch (error) {
		return [{ level: "error", path, rule: `manifest/${host}-json`, detail: String(error) }];
	}
	if (parsed.name !== plugin.name) {
		findings.push({
			level: "error",
			path,
			rule: `manifest/${host}-name`,
			detail: `name "${parsed.name ?? ""}" != plugin directory "${plugin.name}"`,
		});
	}
	return findings;
}

/**
 * Checks every plugin and skill the four hosts can load.
 *
 * The rules are the intersection of what Claude Code, Codex, opencode and pi require, so a skill that
 * passes here loads in all four. Exits 1 rather than 0 when there is nothing to check, because a
 * clean report for a check that examined nothing is the outcome worse than a failure.
 */
export function validatePlugins(repoRoot = process.cwd()): {
	findings: Finding[];
	pluginCount: number;
	skillCount: number;
} {
	const findings: Finding[] = [];
	const plugins = discoverPlugins(repoRoot);
	const declared = new Map<string, string>();

	for (const plugin of plugins) {
		if (!plugin.claudeManifest) {
			findings.push({
				level: "warning",
				path: relativeToRepo(repoRoot, plugin.path),
				rule: "manifest/claude-missing",
				detail: "no .claude-plugin/plugin.json, so Claude Code cannot load it as a plugin",
			});
		} else {
			findings.push(...validateManifest(plugin, plugin.claudeManifest, "claude", repoRoot));
		}
		if (!plugin.codexManifest) {
			findings.push({
				level: "warning",
				path: relativeToRepo(repoRoot, plugin.path),
				rule: "manifest/codex-missing",
				detail: "no .codex-plugin/plugin.json, so Codex cannot load it as a plugin",
			});
		} else {
			findings.push(...validateManifest(plugin, plugin.codexManifest, "codex", repoRoot));
		}

		for (const skill of plugin.skills) {
			findings.push(...validateSkill(skill.path, skill.name, repoRoot));
			const previous = declared.get(skill.name);
			const where = relativeToRepo(repoRoot, skill.path);
			if (previous) {
				// The failure #1216 fixed: two declarations of one skill, neither gate reporting it.
				findings.push({
					level: "error",
					path: where,
					rule: "plugin/single-declaration",
					detail: `skill "${skill.name}" is also declared at ${previous}`,
				});
			} else {
				declared.set(skill.name, where);
			}
		}
	}

	// A directory beside the plugins that is neither a manifest nor a skill directory is invisible to
	// discovery, so it is reported rather than left to be wondered about.
	const root = join(repoRoot, ".darkfactory", "plugins");
	if (existsSync(root)) {
		for (const entry of readdirSync(root, { withFileTypes: true })) {
			if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
			const known = plugins.some((plugin) => plugin.name === entry.name);
			if (known) continue;
			findings.push({
				level: "error",
				path: relativeToRepo(repoRoot, join(root, entry.name)),
				rule: "plugin/unknown",
				detail: "no manifest and no skills/ directory, so no host will load it",
			});
		}
	}

	return { findings, pluginCount: plugins.length, skillCount: declared.size };
}
