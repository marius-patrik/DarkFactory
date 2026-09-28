#!/usr/bin/env bun
/**
 * Validates every skill and plugin under `.agents/plugins/`.
 *
 * One rule implementation, shared by the harness test, the pre-commit hook and any agent
 * authoring a skill. The rules are the intersection of what the four hosts enforce, so a skill
 * that passes here loads in Claude Code, Codex, opencode and pi.
 *
 * Exit codes: 0 clean, 1 findings, 2 bad invocation.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_NAME = 64;
const MAX_DESCRIPTION = 1024;

/**
 * Frontmatter keys only Claude Code honours. Codex, opencode and pi ignore unknown keys, but
 * claude.ai upload and `package_skill.py` hard-error on them, so a shared skill carrying one
 * cannot be published. Reference: references/four-hosts.md.
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

interface Finding {
	level: "error" | "warning";
	path: string;
	rule: string;
	detail: string;
}

/** A plugin is a directory carrying a manifest; a `skills/` without one is a plugin missing its manifest. */
function looksLikePlugin(dir: string): boolean {
	return existsSync(join(dir, "plugin.json")) || existsSync(join(dir, ".claude-plugin"));
}

function findPlugins(root: string, findings: Finding[] = []): string[] {
	if (!existsSync(root)) return [];
	const plugins: string[] = [];
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		// `.claude-plugin` is a manifest directory inside a plugin, never a plugin itself.
		if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
		const dir = join(root, entry.name);
		if (looksLikePlugin(dir)) {
			plugins.push(dir);
		} else if (existsSync(join(dir, "skills"))) {
			findings.push({
				level: "error",
				path: relative(root, dir).split(sep).join("/"),
				rule: "plugin/manifest",
				detail: "has skills/ but no plugin.json or .claude-plugin/",
			});
		}
	}
	return plugins;
}

/** Minimal frontmatter reader: enough for flat `key: value` plus one level of nesting. */
function readFrontmatter(body: string): { fields: Map<string, string>; raw: string[]; closed: boolean } {
	const fields = new Map<string, string>();
	const raw: string[] = [];
	const lines = body.split("\n");
	if (lines[0]?.trim() !== "---") return { fields, raw, closed: false };

	const parentKeys: string[] = [];
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i] as string;
		if (line.trim() === "---") return { fields, raw, closed: true };
		if (line.trim() === "" || line.trimStart().startsWith("#")) continue;

		const indent = line.length - line.trimStart().length;
		const match = /^\s*([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
		if (!match) continue;
		const key = match[1] as string;
		const value = (match[2] as string).trim();
		raw.push(line);

		if (indent === 0) {
			parentKeys.length = 0;
			if (value === "") parentKeys.push(key);
			fields.set(key, value);
		} else if (parentKeys.length > 0) {
			// Nested keys (`allowed-tools:` with list items) are recorded under the parent so the
			// Claude-only check still sees them.
			fields.set(`${parentKeys[parentKeys.length - 1]}.${key}`, value);
		}
	}
	return { fields, raw, closed: false };
}

function validateSkill(skillDir: string, repoRoot: string, findings: Finding[]): { name: string } | undefined {
	const rel = (path: string) => relative(repoRoot, path).split(sep).join("/");
	const skillFile = join(skillDir, "SKILL.md");
	const dirName = skillDir.split(sep).pop() as string;

	if (!existsSync(skillFile)) {
		findings.push({ level: "error", path: rel(skillDir), rule: "skill/skill-file", detail: "no SKILL.md" });
		return undefined;
	}

	const body = readFileSync(skillFile, "utf-8");
	const { fields, raw, closed } = readFrontmatter(body);
	const path = rel(skillFile);

	if (!closed) {
		findings.push({ level: "error", path, rule: "skill/frontmatter", detail: "frontmatter is not closed by a second ---" });
		return undefined;
	}

	const name = fields.get("name") ?? "";
	const description = fields.get("description") ?? "";

	if (name === "") {
		findings.push({ level: "error", path, rule: "skill/name", detail: "frontmatter has no name" });
	} else {
		if (name.length > MAX_NAME) {
			findings.push({ level: "error", path, rule: "skill/name-length", detail: `${name.length} chars, max ${MAX_NAME}` });
		}
		if (!NAME_PATTERN.test(name)) {
			findings.push({ level: "error", path, rule: "skill/name-pattern", detail: `"${name}" is not kebab-case` });
		}
		if (name !== dirName) {
			// opencode documents the requirement and pi warns; Claude Code defaults the name to the
			// directory. Divergence makes `/skill:<name>` and the listing disagree across hosts.
			findings.push({ level: "error", path, rule: "skill/name-dir-match", detail: `name "${name}" != directory "${dirName}"` });
		}
		if (RESERVED_NAMES.has(name) || name.startsWith("anthropic-skills")) {
			findings.push({ level: "error", path, rule: "skill/reserved-name", detail: `"${name}" is reserved by Claude Code` });
		}
	}

	if (description.trim() === "") {
		// Codex and pi refuse to load a skill without one; this is the rule that actually breaks.
		findings.push({ level: "error", path, rule: "skill/description", detail: "frontmatter has no description; Codex and pi will not load it" });
	} else if (description.length > MAX_DESCRIPTION) {
		findings.push({ level: "error", path, rule: "skill/description-length", detail: `${description.length} chars, max ${MAX_DESCRIPTION}` });
	} else if (!/^use when\b/i.test(description)) {
		findings.push({
			level: "warning",
			path,
			rule: "skill/description-when",
			detail: 'description does not start with "Use when", so the host has little to match the request against',
		});
	}

	for (const line of raw) {
		const match = /^\s*([A-Za-z0-9_.-]+):/.exec(line);
		const key = match?.[1];
		if (key && CLAUDE_ONLY_KEYS.has(key)) {
			findings.push({
				level: "error",
				path,
				rule: "skill/shared-key",
				detail: `"${key}" is honoured only by Claude Code and hard-errors on claude.ai upload`,
			});
		}
	}

	return { name };
}

function validatePlugin(pluginDir: string, repoRoot: string, findings: Finding[]): void {
	const rel = (path: string) => relative(repoRoot, path).split(sep).join("/");
	const name = pluginDir.split(sep).pop() as string;

	for (const manifest of ["plugin.json", ".claude-plugin/plugin.json"]) {
		const file = join(pluginDir, manifest);
		if (!existsSync(file)) {
			findings.push({ level: "error", path: rel(pluginDir), rule: "plugin/manifest", detail: `missing ${manifest}` });
			continue;
		}
		try {
			const parsed = JSON.parse(readFileSync(file, "utf-8")) as { name?: string };
			if (parsed.name !== name) {
				findings.push({
					level: "error",
					path: rel(file),
					rule: "plugin/manifest-name",
					detail: `name "${parsed.name ?? ""}" != directory "${name}"`,
				});
			}
		} catch (error) {
			findings.push({ level: "error", path: rel(file), rule: "plugin/manifest-json", detail: String(error) });
		}
	}

	const skillsDir = join(pluginDir, "skills");
	const manifest = existsSync(join(pluginDir, "plugin.json"))
		? (JSON.parse(readFileSync(join(pluginDir, "plugin.json"), "utf-8")) as { shipped?: unknown })
		: {};
	// A plugin with no skills is legitimate when it is a declaration only - a capability is runtime
	// code that happens to live beside the skills. It is not legitimate when df would ship it, since
	// a released plugin with nothing for an agent to load is dead weight in every install.
	if (manifest.shipped === true && !existsSync(skillsDir) && !existsSync(join(pluginDir, "hooks"))) {
		findings.push({
			level: "warning",
			path: rel(pluginDir),
			rule: "plugin/shipped-empty",
			detail: "marked shipped but declares no skills and no hooks",
		});
	}
}

const args = process.argv.slice(2);
const rootArg = args.find((arg) => !arg.startsWith("-"));
const strict = args.includes("--strict");

if (args.includes("--help") || args.includes("-h")) {
	process.stdout.write("usage: validate-skills.ts [plugins-root] [--strict]\n");
	process.exit(0);
}

const repoRoot = process.cwd();
// `resolve`, not `join`: an absolute path handed in by a person or a hook would otherwise be
// concatenated onto the working directory and reported as a missing directory.
const pluginsRoot = rootArg ? resolve(repoRoot, rootArg) : resolve(repoRoot, ".darkfactory", "plugins");

if (!existsSync(pluginsRoot)) {
	process.stderr.write(`no plugins directory at ${pluginsRoot}\n`);
	process.exit(2);
}

const findings: Finding[] = [];
const declared = new Map<string, string>();

// Accept either a directory of plugins or a single plugin, because passing the plugin itself is the
// obvious thing to do and must not look like a clean run over nothing.
const pluginDirs = looksLikePlugin(pluginsRoot) ? [pluginsRoot] : findPlugins(pluginsRoot, findings);

if (pluginDirs.length === 0) {
	// Exit 0 here would report success for a check that examined nothing, which is the one outcome
	// worse than a failure.
	process.stderr.write(`no plugins found under ${pluginsRoot}\n`);
	process.exit(1);
}

for (const pluginDir of pluginDirs) {
	validatePlugin(pluginDir, repoRoot, findings);

	const skillsDir = join(pluginDir, "skills");
	if (!existsSync(skillsDir)) continue;

	for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const skillDir = join(skillsDir, entry.name);
		const result = validateSkill(skillDir, repoRoot, findings);
		if (!result || result.name === "") continue;

		const previous = declared.get(result.name);
		if (previous) {
			// The failure #1216 fixed: two byte-identical declarations of one skill, neither gate
			// reporting the divergence.
			findings.push({
				level: "error",
				path: relative(repoRoot, skillDir).split(sep).join("/"),
				rule: "plugin/single-declaration",
				detail: `skill "${result.name}" is also declared at ${previous}`,
			});
		} else {
			declared.set(result.name, relative(repoRoot, skillDir).split(sep).join("/"));
		}
	}
}

const errors = findings.filter((f) => f.level === "error");
const warnings = findings.filter((f) => f.level === "warning");

for (const finding of findings) {
	process.stdout.write(`${finding.level === "error" ? "error" : "warn "} ${finding.rule} ${finding.path}: ${finding.detail}\n`);
}

	process.stdout.write(
		`\n${declared.size} skill(s) across ${pluginDirs.length} plugin(s): ` +
			`${errors.length} error(s), ${warnings.length} warning(s)\n`,
	);

process.exit(errors.length > 0 || (strict && warnings.length > 0) ? 1 : 0);
