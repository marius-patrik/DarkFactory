import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPluginsConfig, type HostSkillRules, type PluginsConfig } from "./config.ts";
import { discoverPluginSkills, discoverPlugins, pluginRoots, relativeToRepo, type Plugin } from "./discover.ts";

/**
 * What Claude Code, Codex, opencode and pi require of a skill, as declared data.
 *
 * These were constants, which made them both unchangeable and silently wrong the moment a host
 * changed its rules. A repository declares its own in the `plugins` block; these defaults are what
 * the four hosts require today, so an unconfigured repository keeps the same checks, and one that
 * wants a rule dropped or a limit raised says so instead of editing this package.
 */
const DEFAULT_HOSTS: Record<string, HostSkillRules> = {
	claude: {
		claude_only_keys: [
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
		],
		reserved_names: ["synced"],
		reserved_prefixes: ["anthropic-skills"],
	},
	shared: {
		max_name_length: 64,
		max_description_length: 1024,
		name_pattern: "^[a-z0-9]+(-[a-z0-9]+)*$",
		require_description: true,
		name_must_match_directory: true,
		description_must_start_with: "use when",
		require_closed_frontmatter: true,
	},
};

/**
 * Frontmatter keys only Claude Code honours. Codex, opencode and pi ignore unknown keys, but
 * claude.ai upload and `package_skill.py` hard-error on them, so a shared skill carrying one cannot
 * be published.
 */

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

/** True when any configured host enables a boolean rule. With nothing configured, nothing is enabled. */
function anyEnabled(
	rules: Record<string, HostSkillRules>,
	rule: "name_must_match_directory" | "require_description" | "require_closed_frontmatter",
): boolean {
	return Object.values(rules).some((host) => host[rule] === true);
}

/** The first declared description prefix a host requires, so the message names what was wanted. */
function requiredDescriptionPrefix(rules: Record<string, HostSkillRules>): string | undefined {
	return Object.values(rules)
		.map((host) => host.description_must_start_with)
		.filter(isPresent)
		.sort((a, b) => b.length - a.length)[0];
}

function isPositive(value: number | undefined): value is number {
	return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isPresent(value: string | undefined): value is string {
	return typeof value === "string" && value.length > 0;
}

/** The tightest declared description limit, since a description must satisfy every host. */
function maxDescriptionLength(rules: Record<string, HostSkillRules>): number | undefined {
	const limits = Object.values(rules)
		.map((rule) => rule.max_description_length)
		.filter(isPositive);
	return limits.length === 0 ? undefined : Math.min(...limits);
}

/**
 * The host rules to enforce.
 *
 * A repository that declares no `hosts` gets the four hosts' documented requirements, so an
 * unconfigured repository still gets the checks. A repository that declares `hosts` gets exactly
 * what it declared and nothing more: declaring an empty object means no host enforces anything,
 * because a repository is allowed to check less than the hosts require and get what it asked for.
 */
function hostRules(hosts: Record<string, HostSkillRules> | undefined): Record<string, HostSkillRules> {
	if (hosts === undefined) return DEFAULT_HOSTS;
	return hosts;
}

function validateSkill(
	skillPath: string,
	dirName: string,
	repoRoot: string,
	rules: Record<string, HostSkillRules>,
): Finding[] {
	const findings: Finding[] = [];
	const path = relativeToRepo(repoRoot, skillPath);
	const body = readFileSync(skillPath, "utf-8");
	const { fields, closed } = readFrontmatter(body);

	if (!closed && anyEnabled(rules, "require_closed_frontmatter")) {
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
		for (const max of Object.values(rules)
			.map((rule) => rule.max_name_length)
			.filter(isPositive)) {
			if (name.length > max) {
				findings.push({
					level: "error",
					path,
					rule: "skill/name-length",
					detail: `${name.length} chars, max ${max}`,
				});
				break;
			}
		}
		for (const source of Object.values(rules)
			.map((rule) => rule.name_pattern)
			.filter(isPresent)) {
			if (new RegExp(source, "u").test(name)) continue;
			findings.push({ level: "error", path, rule: "skill/name-pattern", detail: `"${name}" does not match ${source}` });
			break;
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
		const reserved = new Set(Object.values(rules).flatMap((rule) => rule.reserved_names ?? []));
		const reservedPrefixes = Object.values(rules).flatMap((rule) => rule.reserved_prefixes ?? []);
		if (reserved.has(name) || reservedPrefixes.some((prefix) => name.startsWith(prefix))) {
			findings.push({
				level: "error",
				path,
				rule: "skill/reserved-name",
				detail: `"${name}" is reserved by a configured host`,
			});
		}
	}

	if (description.trim() === "") {
		// Codex and pi refuse to load a skill without one. This is the rule that actually breaks.
		if (anyEnabled(rules, "require_description")) {
			findings.push({
				level: "error",
				path,
				rule: "skill/description",
				detail: "no description; Codex and pi will not load it",
			});
		}
	} else if (
		maxDescriptionLength(rules) !== undefined &&
		description.length > (maxDescriptionLength(rules) as number)
	) {
		findings.push({
			level: "error",
			path,
			rule: "skill/description-length",
			detail: `${description.length} chars, max ${maxDescriptionLength(rules)}`,
		});
	} else {
		const requiredPrefix = requiredDescriptionPrefix(rules);
		if (requiredPrefix !== undefined && !new RegExp(`^${requiredPrefix}\\b`, "iu").test(description)) {
			findings.push({
				level: "warning",
				path,
				rule: "skill/description-when",
				detail: `description does not start with "${requiredPrefix}", so a host has little to match the request against`,
			});
		}
	}

	for (const [key] of fields) {
		if (Object.values(rules).some((rule) => rule.claude_only_keys?.includes(key) === true)) {
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
 * What is checked is the repository. declared policy: undeclared, this checks what Claude Code,
 * Codex, opencode and pi require today, and declared, it checks exactly what the `plugins` block
 * says, down to checking nothing. Exits 1 rather than 0 when there is nothing to check, because a
 * clean report for a check that examined nothing is the outcome worse than a failure.
 */
export function validatePlugins(
	repoRoot = process.cwd(),
	options: { config?: PluginsConfig } = {},
): {
	findings: Finding[];
	pluginCount: number;
	skillCount: number;
} {
	const config = options.config ?? loadPluginsConfig(repoRoot);
	const rules = hostRules(config.hosts);
	const findings: Finding[] = [];
	const plugins = discoverPlugins(repoRoot, config);
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
	}

	// Skills are checked from the flat discovery list rather than from each plugin's `skills`, which
	// has already had a repeated name collapsed. Reading the deduped list made the check below
	// unreachable: one name could never appear twice, so two declarations of one skill went
	// unreported, which is the failure #1216 was filed for.
	for (const skill of discoverPluginSkills(repoRoot)) {
		findings.push(...validateSkill(skill.path, skill.name, repoRoot, rules));
		const where = relativeToRepo(repoRoot, skill.path);
		const previous = declared.get(skill.name);
		if (previous === undefined) {
			declared.set(skill.name, where);
			continue;
		}
		findings.push({
			level: "error",
			path: where,
			rule: "plugin/single-declaration",
			detail: `skill "${skill.name}" is also declared at ${previous}`,
		});
	}

	// A directory beside the plugins that is neither a manifest nor a skill directory is invisible to
	// discovery, so it is reported rather than left to be wondered about. The directory comes from
	// pluginRoots rather than being spelled again, so DF_CONFIG_DIR is honoured here too, and
	// pluginRoots filters to directories that exist, so an absent entry means nothing to scan.
	const root = pluginRoots(repoRoot, config)[0];
	if (root !== undefined) {
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
