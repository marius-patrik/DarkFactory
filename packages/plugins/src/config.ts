import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
	darkFactoryDirectory,
	parseConfigDocument,
	resolveConfigDocumentPath,
} from "@darkfactory/protocol/config-document";

/** Manifest locations and the skill directory name, all declared rather than assumed. */
export interface PluginLayout {
	/** Directories, relative to a plugin, that hold a manifest the named host reads. */
	manifests: Record<string, string>;
	/** Directory, relative to a plugin, holding its skills. */
	skills: string;
	/** Directory, relative to a plugin, holding its hooks manifest. */
	hooks: string;
	/** Directory, relative to a plugin, holding its scripts. */
	scripts: string;
}

/** One host's constraints on a skill's front matter. */
export interface HostSkillRules {
	/** Front matter keys this host alone honours, and rejects when publishing to the other three. */
	claude_only_keys?: string[];
	/** Skill names the host refuses to load. */
	reserved_names?: string[];
	/** Prefixes the host reserves. */
	reserved_prefixes?: string[];
	/** Longest permitted name, in characters. */
	max_name_length?: number;
	/** Longest permitted description, in characters. */
	max_description_length?: number;
	/** Source the pattern is a regular expression, anchored by the validator. */
	name_pattern?: string;
	/** The front matter must carry a description, because Codex and pi refuse to load without one. */
	require_description?: boolean;
	/** The declared name must equal the skill directory name. */
	name_must_match_directory?: boolean;
	/** A description must begin with this, case-insensitively, for a host to match a request. */
	description_must_start_with?: string;
	/** The front matter must be closed by a second ---. */
	require_closed_frontmatter?: boolean;
}

/** The `plugins` configuration block: where plugins live and what the hosts require of them. */
export interface PluginsConfig {
	/** Roots scanned for plugin directories, relative to the repository root. */
	roots?: string[];
	/** Directory names inside a plugin that discovery treats as the host manifest locations. */
	layout?: PluginLayout;
	/** Per-host skill constraints, keyed by host name. */
	hosts?: Record<string, HostSkillRules>;
}

/** Where a host keeps its plugin manifest, and the directory names that are host conventions. */
const DEFAULT_LAYOUT: PluginLayout = {
	manifests: { claude: ".claude-plugin/plugin.json", codex: ".codex-plugin/plugin.json" },
	skills: "skills",
	hooks: "hooks/hooks.json",
	scripts: "scripts",
};

/**
 * Reads the `plugins` block, falling back to the host conventions when a repository declares none.
 *
 * The layout defaults are what Claude Code and Codex actually read today, so an unconfigured
 * repository keeps working. They are defaults rather than constants so a repository whose hosts
 * differ, or which wants a rule dropped, says so in configuration instead of editing this package.
 */
export function loadPluginsConfig(repoRoot = process.cwd()): PluginsConfig {
	const declared = readPluginsBlock(repoRoot);
	return {
		roots: declared?.roots ?? [join(darkFactoryDirectory(), "plugins")],
		layout: {
			...DEFAULT_LAYOUT,
			...declared?.layout,
			manifests: { ...DEFAULT_LAYOUT.manifests, ...declared?.layout?.manifests },
		},
		hosts: declared?.hosts,
	};
}

/** The `plugins` block exactly as declared, with no defaults merged in. */
function readPluginsBlock(repoRoot: string): PluginsConfig | undefined {
	const path = resolveConfigDocumentPath(repoRoot);
	if (path === undefined) return undefined;
	try {
		return parseConfigDocument(readFileSync(path, "utf-8"), path).plugins as PluginsConfig | undefined;
	} catch {
		// A malformed document is the config validator's finding to make, not discovery's to throw on.
		return undefined;
	}
}

export function pluginRootsFromConfig(config: PluginsConfig, repoRoot: string, execDir: string): string[] {
	const roots = config.roots?.length ? config.roots : [join(darkFactoryDirectory(), "plugins")];
	return [...roots.map((root) => resolve(repoRoot, root)), resolve(execDir, "plugins")].filter((candidate) =>
		existsSync(candidate),
	);
}
