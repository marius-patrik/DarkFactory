import { existsSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

/** A skill as declared by a plugin. */
export interface PluginSkill {
	/** Skill directory name, which every host requires to equal the frontmatter `name`. */
	name: string;
	/** Plugin declaring the skill. */
	plugin: string;
	/** Root the declaration came from. */
	root: string;
	/** Absolute path to the declaring `SKILL.md`. */
	path: string;
}

/** A plugin directory, the manifests it carries, and the skills it declares. */
export interface Plugin {
	name: string;
	/** Absolute path to the plugin directory. */
	path: string;
	/** Manifest Claude Code reads, or undefined when the plugin declares none. */
	claudeManifest?: string;
	/** Manifest Codex reads, or undefined when the plugin declares none. */
	codexManifest?: string;
	skills: PluginSkill[];
	hasHooks: boolean;
	hasScripts: boolean;
}

/**
 * Roots holding plugin declarations, most authoritative first: this repository's
 * `.darkfactory/plugins/`, then a `plugins/` directory beside the compiled `df` binary.
 *
 * A plugin appears in both when df runs from a checkout of the repository that declares it, so the
 * first root wins and the second is treated as the derived copy it is.
 */
export function pluginRoots(repoRoot = process.cwd()): string[] {
	return [resolve(repoRoot, ".darkfactory", "plugins"), resolve(dirname(process.execPath), "plugins")].filter(
		(candidate) => existsSync(candidate),
	);
}

function isPluginDirectory(path: string): boolean {
	return (
		existsSync(join(path, ".claude-plugin", "plugin.json")) ||
		existsSync(join(path, ".codex-plugin", "plugin.json")) ||
		existsSync(join(path, "skills"))
	);
}

/** Every `<plugin>/skills/<skill>/SKILL.md` under every root, including one name declared in two roots. */
export function discoverPluginSkills(repoRoot = process.cwd()): PluginSkill[] {
	const found: PluginSkill[] = [];
	for (const root of pluginRoots(repoRoot)) {
		for (const entry of readdirSync(root, { withFileTypes: true })) {
			// `.claude-plugin` and `.codex-plugin` hold a plugin's manifests, never a skill.
			if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
			const skills = join(root, entry.name, "skills");
			if (!existsSync(skills)) continue;
			for (const skill of readdirSync(skills, { withFileTypes: true })) {
				if (!skill.isDirectory()) continue;
				const path = join(skills, skill.name, "SKILL.md");
				if (existsSync(path)) found.push({ name: skill.name, plugin: entry.name, root, path });
			}
		}
	}
	// A total order. Two skills of one name in the same root tie on `name` and `root`, so without the
	// plugin and path tiebreaks the winner would be whichever `readdirSync` happened to return first,
	// and the same repository would report a different owner on a different filesystem.
	return found.sort(
		(a, b) =>
			a.name.localeCompare(b.name) ||
			a.root.localeCompare(b.root) ||
			a.plugin.localeCompare(b.plugin) ||
			a.path.localeCompare(b.path),
	);
}

/**
 * Every plugin, with the skills it declares.
 *
 * A plugin reports the skills under its own directory rather than a deduplicated view. When two roots
 * carry a plugin of the same name the first root wins outright, and so do the skills it declares; a
 * repeated *skill* name across two different plugins is a reportable conflict, and neither plugin
 * may lose the declaration over it, so `df plugin list` and `describe` both keep showing it.
 */
export function discoverPlugins(repoRoot = process.cwd()): Plugin[] {
	const all = discoverPluginSkills(repoRoot);
	const plugins: Plugin[] = [];
	const seen = new Set<string>();
	for (const root of pluginRoots(repoRoot)) {
		for (const entry of readdirSync(root, { withFileTypes: true })) {
			if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
			const path = join(root, entry.name);
			// A directory is a plugin when it carries a manifest or a skills directory: the shapes the
			// hosts recognise. Anything else beside them is reported by validate rather than guessed at.
			if (!isPluginDirectory(path) || seen.has(entry.name)) continue;
			const claude = join(path, ".claude-plugin", "plugin.json");
			const codex = join(path, ".codex-plugin", "plugin.json");
			seen.add(entry.name);
			plugins.push({
				name: entry.name,
				path,
				claudeManifest: existsSync(claude) ? claude : undefined,
				codexManifest: existsSync(codex) ? codex : undefined,
				skills: all.filter((skill) => skill.plugin === entry.name && skill.root === root),
				hasHooks: existsSync(join(path, "hooks", "hooks.json")),
				hasScripts: existsSync(join(path, "scripts")),
			});
		}
	}
	return plugins.sort((a, b) => a.name.localeCompare(b.name));
}

export function relativeToRepo(repoRoot: string, path: string): string {
	return relative(repoRoot, path).split(sep).join("/");
}
