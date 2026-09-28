/**
 * opencode port of the plugin-builder guard.
 *
 * opencode has no declarative hook system: a hook is a TypeScript plugin returning an object. The
 * rule therefore exists twice, and the two copies must agree - `guard.sh` for Claude Code and
 * Codex, this file for opencode. The regex is the same; if you change one, change both.
 *
 * Install by symlinking, because opencode only reads a fixed location:
 *
 *   mkdir -p .opencode/plugins
 *   ln -sfn ../../.darkfactory/plugins/plugin-builder/hooks/ports/opencode.ts \
 *     .opencode/plugins/plugin-builder.ts
 *
 * The hook shape is declared locally rather than imported from `@opencode-ai/plugin`: a portable
 * plugin must not depend on a host's type package, and a missing one would break typecheck in every
 * repository that merely carries the plugin.
 */
interface HookInput {
	tool: string;
}

interface HookOutput {
	args?: Record<string, unknown>;
}

type BeforeTool = (input: HookInput, output: HookOutput) => Promise<void> | void;

/** A blind add. The separator matters: `git add .darkfactory/x` is an explicit path, not this. */
const BLIND_ADD = /git\s+add\s+(-A|--all|-a)([\s]|;|&|\||\)|$)|git\s+add\s+\.([\s]|;|&|\||\)|$|")/;

const REASON = [
	"Refusing a blind git add. It swept a parallel session's work into a commit here.",
	"",
	"Stage explicit paths, so a commit contains only what you meant:",
	"",
	"    git add path/to/file.ts",
].join("\n");

export const PluginBuilderGuard = async (): Promise<{ "tool.execute.before": BeforeTool }> => ({
	"tool.execute.before": async (input, output) => {
		if (input.tool !== "bash") return;
		const command = String(output.args?.command ?? "");
		if (!BLIND_ADD.test(command)) return;
		throw new Error(REASON);
	},
});
