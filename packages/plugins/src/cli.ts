import { discoverPlugins, discoverPluginSkills, relativeToRepo } from "./discover.ts";
import { validatePlugins } from "./validate.ts";

export interface PluginCliContext {
	log?: (msg: string) => void;
	error?: (msg: string) => void;
}

const USAGE = `df plugin - discover and check the repository's agent plugins

  df plugin list [--json]              every plugin, with its skills
  df plugin describe <name> [--json]   one plugin, its manifests and components
  df plugin validate [--json] [--strict]
                                     check the rules the four hosts enforce

Plugins are read from .darkfactory/plugins/. Nothing here writes to the tree.`;

function hasFlag(args: string[], ...names: string[]): boolean {
	return names.some((name) => args.includes(name));
}

export function runPluginCli(args: string[], repoDir = process.cwd(), context: PluginCliContext = {}): number {
	const log = context.log ?? console.log;
	const error = context.error ?? console.error;
	const isJson = hasFlag(args, "--json");
	const subcommand = args.find((arg) => !arg.startsWith("-"));

	if (!subcommand || subcommand === "help" || hasFlag(args, "--help", "-h")) {
		log(USAGE);
		return subcommand ? 0 : 1;
	}

	switch (subcommand) {
		case "list":
			return listPlugins(repoDir, { log, isJson });
		case "describe":
			return describePlugin(args, repoDir, { log, error, isJson });
		case "validate":
			return validateCommand(args, repoDir, { log, error, isJson });
		default:
			error(`unknown plugin subcommand: ${subcommand}`);
			error(USAGE);
			return 1;
	}
}

function listPlugins(repoDir: string, io: { log: (msg: string) => void; isJson: boolean }): number {
	const plugins = discoverPlugins(repoDir);
	if (io.isJson) {
		io.log(
			JSON.stringify(
				plugins.map((plugin) => ({
					name: plugin.name,
					path: relativeToRepo(repoDir, plugin.path),
					claude: Boolean(plugin.claudeManifest),
					codex: Boolean(plugin.codexManifest),
					hooks: plugin.hasHooks,
					scripts: plugin.hasScripts,
					skills: plugin.skills.map((skill) => skill.name),
				})),
				null,
				2,
			),
		);
		return 0;
	}

	if (plugins.length === 0) {
		io.log("no plugins found under .darkfactory/plugins/");
		return 1;
	}

	const width = Math.max(...plugins.map((plugin) => plugin.name.length));
	for (const plugin of plugins) {
		const hosts = [plugin.claudeManifest && "claude", plugin.codexManifest && "codex"].filter(Boolean).join("+");
		io.log(
			`${plugin.name.padEnd(width)}  ${String(plugin.skills.length).padStart(2)} skill(s)  ` +
				`${hosts || "no manifest"}${plugin.hasHooks ? "  hooks" : ""}${plugin.hasScripts ? "  scripts" : ""}`,
		);
	}
	io.log(`\n${plugins.length} plugin(s), ${discoverPluginSkills(repoDir).length} skill declaration(s)`);
	return 0;
}

function describePlugin(
	args: string[],
	repoDir: string,
	io: { log: (msg: string) => void; error: (msg: string) => void; isJson: boolean },
): number {
	const name = args.find((arg) => arg !== "describe" && !arg.startsWith("-"));
	if (!name) {
		io.error("which plugin? pass its name");
		return 2;
	}
	const plugin = discoverPlugins(repoDir).find((candidate) => candidate.name === name);
	if (!plugin) {
		io.error(`no plugin named "${name}"`);
		return 1;
	}

	if (io.isJson) {
		io.log(
			JSON.stringify(
				{
					name: plugin.name,
					path: relativeToRepo(repoDir, plugin.path),
					claudeManifest: plugin.claudeManifest && relativeToRepo(repoDir, plugin.claudeManifest),
					codexManifest: plugin.codexManifest && relativeToRepo(repoDir, plugin.codexManifest),
					hooks: plugin.hasHooks,
					scripts: plugin.hasScripts,
					skills: plugin.skills.map((skill) => ({
						name: skill.name,
						path: relativeToRepo(repoDir, skill.path),
					})),
				},
				null,
				2,
			),
		);
		return 0;
	}

	io.log(plugin.name);
	io.log(`  path    ${relativeToRepo(repoDir, plugin.path)}`);
	io.log(`  claude  ${plugin.claudeManifest ? relativeToRepo(repoDir, plugin.claudeManifest) : "none"}`);
	io.log(`  codex   ${plugin.codexManifest ? relativeToRepo(repoDir, plugin.codexManifest) : "none"}`);
	io.log(`  hooks   ${plugin.hasHooks ? "hooks/hooks.json" : "none"}`);
	io.log(`  scripts ${plugin.hasScripts ? "yes" : "none"}`);
	if (plugin.skills.length === 0) io.log("  skills  none");
	for (const skill of plugin.skills) io.log(`          ${skill.name}`);
	return 0;
}

function validateCommand(
	args: string[],
	repoDir: string,
	io: { log: (msg: string) => void; error: (msg: string) => void; isJson: boolean },
): number {
	const result = validatePlugins(repoDir);
	const errors = result.findings.filter((finding) => finding.level === "error");
	const warnings = result.findings.filter((finding) => finding.level === "warning");

	if (io.isJson) {
		io.log(
			JSON.stringify(
				{
					plugins: result.pluginCount,
					skills: result.skillCount,
					errors: errors.length,
					warnings: warnings.length,
					findings: result.findings,
				},
				null,
				2,
			),
		);
		return errors.length > 0 || (hasFlag(args, "--strict") && warnings.length > 0) ? 1 : 0;
	}

	if (result.pluginCount === 0) {
		io.error("no plugins found; a clean report over nothing is not a pass");
		return 1;
	}

	for (const finding of result.findings) {
		(finding.level === "error" ? io.error : io.log)(
			`${finding.level === "error" ? "error" : "warn "} ${finding.rule} ${finding.path}: ${finding.detail}`,
		);
	}
	io.log(
		`\n${result.skillCount} skill(s) across ${result.pluginCount} plugin(s): ` +
			`${errors.length} error(s), ${warnings.length} warning(s)`,
	);
	return errors.length > 0 || (hasFlag(args, "--strict") && warnings.length > 0) ? 1 : 0;
}
